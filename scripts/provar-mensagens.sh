#!/usr/bin/env bash
#
# E19 — a fila de mensagens e o relatório.
#
# ── Os dois pontos da régua que esta fatia carrega ────────────────────────
#
# «Reenviar a mesma mensagem não a entrega duas vezes» e «a definição escrita ao
# lado do número, no ecrã». O terceiro é o que se esquece, e por isso é um
# controlo próprio: **uma mensagem DIFERENTE para a mesma reserva é enviada**.
# Sem essa metade, «engole tudo o que se parece» passa os dois primeiros.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

GRUPOS_ESPERADOS=5
CASOS_ESPERADOS=12
falhas=0

MSG=packages/db/src/mensagens.ts
HOST=packages/db/src/host.ts
ORIG_MSG=$(mktemp); ORIG_HOST=$(mktemp)
cp "$MSG" "$ORIG_MSG"; cp "$HOST" "$ORIG_HOST"
BASE_MEXIDA=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── Repor SEMPRE as duas garantias da base ────────────────────────────────
#
# Sem elas, uma mensagem pode ficar «entregue» sem saber quando, e o conector
# pode ficar activo sem provedor — que é o «a fingir que enviou» do enunciado.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "reservation_messages" DROP CONSTRAINT IF EXISTS "mensagem_entregue_tem_carimbo";
ALTER TABLE "reservation_messages"
  ADD CONSTRAINT "mensagem_entregue_tem_carimbo" CHECK (
    ("estado" <> 'ENVIADA' OR "entregue_em" IS NOT NULL));
ALTER TABLE "messaging_connectors" DROP CONSTRAINT IF EXISTS "conector_activo_exige_provedor";
ALTER TABLE "messaging_connectors"
  ADD CONSTRAINT "conector_activo_exige_provedor" CHECK (
    "activo" = false OR "provedor" IS NOT NULL);
DROP INDEX IF EXISTS "uma_mensagem_por_reserva_e_tipo";
CREATE UNIQUE INDEX "uma_mensagem_por_reserva_e_tipo"
  ON "reservation_messages"("reservation_id", "tipo");
PSQL
}

restaurar() {
  cp "$ORIG_MSG" "$MSG"; cp "$ORIG_HOST" "$HOST"
  rm -f "$ORIG_MSG" "$ORIG_HOST"
  if [[ "$BASE_MEXIDA" == "1" ]]; then
    repor_base; BASE_MEXIDA=0
    printf '  (as restrições da base foram repostas)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/mensagens.test.ts >"$1" 2>&1
}

analisar() {
  local f="$1" grupos casos
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  casos=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$casos" ]] || return 2
  echo "$grupos $casos"
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3" nao_esperado="${4:-}"
  if correr "$ficheiro"; then vermelho "$nome: ficou VERDE com o defeito plantado"; return; fi
  if ! grep -qE "^ *not ok .*$marcador" "$ficheiro"; then
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '^ *not ok' "$ficheiro" | head -4; return
  fi
  if [[ -n "$nao_esperado" ]] && grep -qE "^ *not ok .*$nao_esperado" "$ficheiro"; then
    vermelho "$nome: derrubou também o que NÃO devia cair ($nao_esperado)"; return
  fi
  verde "$nome"
}

echo "0. Fixtures"
if node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; then
  verde "semeadas"
else vermelho "não foi possível semear"; exit 1; fi

echo
echo "1. Com tudo ligado"
if correr /tmp/bossaos-msg-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-msg-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos, $casos casos"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-msg-ligado.txt | head -10; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o reenvio ENTREGA outra vez"
# O defeito que a régua nomeia. O cliente recebe duas confirmações da mesma
# reserva, e ninguém vê erro nenhum: os dois envios correram bem.
python3 - <<'PYDUPLO'
import io
p = 'packages/db/src/mensagens.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (mensagem.entregueEm) {"
assert antigo in s, 'a guarda da entrega repetida nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  if (false && mensagem.entregueEm) {", 1))
PYDUPLO
exigir_vermelho "caiu a deduplicação: o cliente recebeu duas vezes" \
  'SEGUNDA não chega ao transporte' /tmp/bossaos-msg-duplo.txt \
  'mensagem DIFERENTE para a mesma reserva'
cp "$ORIG_MSG" "$MSG"

echo
echo "3. CONTROLO NEGATIVO — a deduplicação ENGOLE tudo o que se parece"
# A outra metade, e a que se esquece: a chave passa a ser só a reserva, e o
# lembrete nunca é enviado porque a confirmação já foi.
python3 - <<'PYENGOLE'
import io
p = 'packages/db/src/mensagens.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    where: { uma_mensagem_por_reserva_e_tipo: { reservationId: reservaId, tipo } },"
assert antigo in s, 'a chave da deduplicacao nao esta onde se esperava'
novo = "    where: { uma_mensagem_por_reserva_e_tipo: { reservationId: reservaId, tipo: 'confirmacao' } },"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYENGOLE
exigir_vermelho "caiu o par: a segunda mensagem foi engolida pela primeira" \
  'mensagem DIFERENTE para a mesma reserva' /tmp/bossaos-msg-engole.txt
cp "$ORIG_MSG" "$MSG"

echo
echo "4. CONTROLO NEGATIVO — sem provedor, finge que ENVIOU"
# «Não a fingir que enviou.» É o que a régua reprova à cabeça.
python3 - <<'PYFINGE'
import io
p = 'packages/db/src/mensagens.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (!conector.activo || !conector.provedor) {"
assert antigo in s, 'a verificacao do conector nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  if (false) {", 1))
PYFINGE
exigir_vermelho "caiu a honestidade: marcou como enviada sem provedor nenhum" \
  'não finge que enviou' /tmp/bossaos-msg-finge.txt
cp "$ORIG_MSG" "$MSG"

echo
echo "5. CONTROLO NEGATIVO — a base aceita o conector ACTIVO sem provedor"
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "messaging_connectors" DROP CONSTRAINT IF EXISTS "conector_activo_exige_provedor";
PSQL
exigir_vermelho "caiu a garantia: o conector pode ligar-se sem dizer quem entrega" \
  'ligar SEM provedor é recusado' /tmp/bossaos-msg-conector.txt
repor_base; BASE_MEXIDA=0

echo
echo "6. CONTROLO NEGATIVO — a base aceita uma ENVIADA sem carimbo"
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "reservation_messages" DROP CONSTRAINT IF EXISTS "mensagem_entregue_tem_carimbo";
PSQL
exigir_vermelho "caiu o carimbo: um histórico que diz entregue sem saber quando" \
  'marcar entregue sem hora' /tmp/bossaos-msg-carimbo.txt
repor_base; BASE_MEXIDA=0

echo
echo "7. CONTROLO NEGATIVO — a falha do provedor deixa de ser registada"
# «O resultado do provedor é guardado.» Sem a tentativa, ninguém sabe porque é
# que o cliente não recebeu — e a resposta a essa pergunta é a razão do histórico.
python3 - <<'PYSEMERRO'
import io
p = 'packages/db/src/mensagens.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      erro: r.ok ? null : (r.erro ?? null),"
assert antigo in s, 'o registo do erro do provedor nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "      erro: null,", 1))
PYSEMERRO
exigir_vermelho "caiu o registo: a falha do provedor não deixou rasto" \
  'falha do provedor fica registada' /tmp/bossaos-msg-erro.txt
cp "$ORIG_MSG" "$MSG"

echo
echo "8. CONTROLO NEGATIVO — o reenvio de uma FALHADA passa a ser recusado"
# A deduplicação é sobre a ENTREGA, e não sobre a tentativa. Quem falhou ainda
# não recebeu, e recusar-lhe o reenvio deixava o cliente sem mensagem nenhuma.
python3 - <<'PYFALHADA'
import io
p = 'packages/db/src/mensagens.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (mensagem.entregueEm) {"
assert antigo in s, 'a guarda da entrega nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "  if (mensagem.entregueEm || mensagem.estado === 'FALHADA') {", 1))
PYFALHADA
exigir_vermelho "caiu o reenvio: quem falhou ficou sem mensagem para sempre" \
  'reenvio TENTA outra vez' /tmp/bossaos-msg-falhada.txt
cp "$ORIG_MSG" "$MSG"

echo
echo "9. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-msg-reposto.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-msg-reposto.txt)"
  if (( casos != CASOS_ESPERADOS )); then
    vermelho "reposto mas com $casos casos (esperados $CASOS_ESPERADOS)"
  else verde "reposto: $grupos grupos, $casos casos"; fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '^ *not ok' /tmp/bossaos-msg-reposto.txt | head -5
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))

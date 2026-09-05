#!/usr/bin/env bash
#
# E23 fatia 1 — a fronteira, com o defeito plantado no artefacto REAL.
#
# ── O que a régua reprova à cabeça ────────────────────────────────────────
#
# «Uma prova que só use o caminho feliz do fornecedor. Se não houver simulação de
# resposta lenta, repetida e fora de ordem, não está provado — está demonstrado.»
#
# O controlo que mais vale é o 4: tirar a ordenação pelo instante do PROVEDOR e
# deixá-la pela chegada. Nada estoira, nada dá erro — e o estorno que chegou cedo
# passa a decidir o estado. É o defeito que só aparece em produção, num dia mau
# da rede do adquirente.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

ADQ=packages/db/src/adquirente.ts
PROVA=provas/adquirente.test.ts
MIGRACAO=packages/db/prisma/migrations/20260908600000_e23_pagamentos_e_webhooks/migration.sql
FICHEIROS=("$ADQ" "$PROVA")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
DROP TRIGGER IF EXISTS "eventos_do_provedor_sao_imutaveis" ON "provider_events";
DROP INDEX IF EXISTS "um_acontecimento_por_provedor";
PSQL
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
CREATE UNIQUE INDEX IF NOT EXISTS "um_acontecimento_por_provedor"
  ON "provider_events" ("provedor", "evento_id");
CREATE TRIGGER "eventos_do_provedor_sao_imutaveis"
  BEFORE UPDATE OR DELETE ON "provider_events"
  FOR EACH ROW EXECUTE FUNCTION registo_imutavel();
PSQL
}

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  repor_base
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { node --test --test-reporter=tap --experimental-strip-types "$PROVA" >"$1" 2>&1; }

plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

exigir_vermelho() {
  local nome="$1" caso="$2" erro="$3" ficheiro="$4"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  if grep -qE "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX|SyntaxError|Cannot find" <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — é um ficheiro partido"
    grep -E "SyntaxError|Cannot find" <<<"$limpo" | head -3; return
  fi
  if ! grep -qE '^# fail [1-9]' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qE "not ok [0-9]+ - .*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E "^ +not ok [0-9]+ - " <<<"$limpo" | head -4; return
  fi
  if ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E "error: '" <<<"$limpo" | head -3; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-adq-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-adq-ligado.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "as provas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-adq-ligado.txt \
    | grep -E "^ +not ok|error: '" | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a assinatura deixa de ser verificada"
plantar <<'PYSIG' || true
import io
p = 'packages/db/src/adquirente.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (!assinaturaConfere(dados.corpoCru, dados.assinatura, dados.segredo)) {
    throw new RecusaDeWebhook('ASSINATURA_INVALIDA');
  }
"""
assert antigo in s, 'a verificacao da assinatura nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYSIG
correr /tmp/bossaos-adq-sig.txt
exigir_vermelho "caiu a assinatura: um estranho passou a poder dizer que pagaram" \
  'uma assinatura errada não produz efeito nenhum' 'Missing expected rejection' \
  /tmp/bossaos-adq-sig.txt
cp "${COPIAS[0]}" "$ADQ"

echo
echo "3. CONTROLO NEGATIVO — a assinatura passa a ser verificada DEPOIS do efeito"
# ── O plante anterior não era o defeito ─────────────────────────────────
#
# A primeira versão só trocava duas LEITURAS de sítio: a assinatura continuava a
# ser verificada antes de escrever, e por isso o caso que mede «um estranho não
# escreve no nosso registo» passava — com razão. Um plante que não cria o defeito
# que descreve não é um controlo.
#
# O defeito é verificar DEPOIS de o efeito já ter acontecido.
plantar <<'PYORDEM' || true
import io
p = 'packages/db/src/adquirente.ts'
s = io.open(p, encoding='utf-8').read()
guarda = """  if (!assinaturaConfere(dados.corpoCru, dados.assinatura, dados.segredo)) {
    throw new RecusaDeWebhook('ASSINATURA_INVALIDA');
  }
"""
assert guarda in s, 'a verificacao da assinatura nao esta onde se esperava'
depois = "  return { eventoId: evento.eventoId, repetido: false };"
assert depois in s
io.open(p, 'w', encoding='utf-8').write(
    s.replace(guarda, "", 1).replace(depois, guarda + depois, 1))
PYORDEM
correr /tmp/bossaos-adq-ordem.txt
# ── O que cai, e porque NÃO é a escrita ─────────────────────────────────
#
# Medido: com a verificação tardia, a escrita chega a acontecer — mas o `throw`
# desfaz a transacção do `comEscopo` e a linha não fica. A transacção protege-nos
# por acidente, e o acidente não é desenho.
#
# O que cai de facto é a RECUSA: um corpo ilegível de um estranho passa a ser
# lido antes da assinatura, e a resposta deixa de ser «assinatura inválida» para
# passar a dizer que o corpo não se percebeu — que é contar-lhe que o lemos.
exigir_vermelho "caiu a ordem: a recusa passou a contar ao estranho o que fizemos com o corpo dele" \
  'a recusa NÃO diz porquê a quem a enviou' '' /tmp/bossaos-adq-ordem.txt
cp "${COPIAS[0]}" "$ADQ"

echo
echo "4. CONTROLO NEGATIVO — a ordenação passa a ser pela CHEGADA"
plantar <<'PYCHEGADA' || true
import io
p = 'packages/db/src/adquirente.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    orderBy: [{ ocorridoEm: 'asc' }, { eventoId: 'asc' }],\n    select: { estadoProvedor: true, montanteMenor: true },"
assert antigo in s, 'a ordenacao do estado autorizado nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo,
    "    orderBy: [{ recebidoEm: 'asc' }],\n    select: { estadoProvedor: true, montanteMenor: true },", 1))
PYCHEGADA
correr /tmp/bossaos-adq-chegada.txt
exigir_vermelho "caiu a ordenação: a chegada passou a decidir o estado do dinheiro" \
  'ordenação é pelo instante do PROVEDOR' 'a ordenação está a usar a chegada' \
  /tmp/bossaos-adq-chegada.txt
cp "${COPIAS[0]}" "$ADQ"

echo
echo "5. CONTROLO NEGATIVO — o índice do acontecimento desaparece"
psql "$MIGRATION_DATABASE_URL" -q -c 'DROP INDEX IF EXISTS "um_acontecimento_por_provedor"' >/dev/null 2>&1
correr /tmp/bossaos-adq-indice.txt
exigir_vermelho "caiu a identidade: o reenvio normal do adquirente entrou duas vezes" \
  'MESMO acontecimento duas vezes tem UM efeito' \
  'o reenvio normal do adquirente foi tratado como novo' /tmp/bossaos-adq-indice.txt
repor_base

echo
echo "6. CONTROLO NEGATIVO — a devolução deixa de esperar pela captura"
plantar <<'PYDEV' || true
import io
p = 'packages/db/src/adquirente.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    if (pagamento) {"
assert antigo in s, 'a guarda da devolucao sem captura nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "    if (true) {\n      void pagamento;", 1))
PYDEV
correr /tmp/bossaos-adq-dev.txt
exigir_vermelho "caiu a espera: devolveu-se sobre uma captura que não existe" \
  'devolução que chega antes da captura' '' /tmp/bossaos-adq-dev.txt
cp "${COPIAS[0]}" "$ADQ"

echo
echo "7. CONTROLO NEGATIVO — o conector liga sem titularidade"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'ALTER TABLE "payment_connectors" DROP CONSTRAINT IF EXISTS "ligado_exige_titularidade"' >/dev/null 2>&1
correr /tmp/bossaos-adq-conector.txt
exigir_vermelho "caiu a titularidade: declarou-se pagamento real pronto sem merchant" \
  'não liga sem provedor E merchant' 'Missing expected rejection' \
  /tmp/bossaos-adq-conector.txt
psql "$MIGRATION_DATABASE_URL" -q -c \
  'ALTER TABLE "payment_connectors" ADD CONSTRAINT "ligado_exige_titularidade" CHECK ("activo" = false OR ("provedor" IS NOT NULL AND "merchant_id" IS NOT NULL))' >/dev/null 2>&1

echo
echo "8. CONTROLO NEGATIVO — a varredura da ordem passa a correr numa ordem só"
# A guarda de leitor cego desta suite: sem as DUAS ordens, «a ordem não decide»
# é uma frase que nunca foi posta à prova.
plantar <<'PYVARR' || true
import io
p = 'provas/adquirente.test.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    for (const e of [...historia].reverse()) {"
assert antigo in s, 'a segunda ordem nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    for (const e of historia) {", 1))
PYVARR
correr /tmp/bossaos-adq-varr.txt
exigir_vermelho "caiu a varredura: as duas ordens passaram a ser a mesma" \
  'o estorno que chega ANTES da captura não se perde' '' /tmp/bossaos-adq-varr.txt
cp "${COPIAS[1]}" "$PROVA"

echo
echo "9. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-adq-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-adq-reposto.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-adq-reposto.txt \
    | grep -E "^ +not ok|error: '" | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

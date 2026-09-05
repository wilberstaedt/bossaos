#!/usr/bin/env bash
#
# E19 — o que o PRODUTO faz, e não o que as funções sabem fazer.
#
# ── Porque é que este guião existe ────────────────────────────────────────
#
# Duas máquinas foram construídas, provadas com controlo negativo, e ficaram sem
# ninguém que as chamasse: o resolvedor de fuso e a fila de mensagens. As provas
# alcançavam-nas directamente; o produto não.
#
# **Todos os controlos aqui apagam a CHAMADA no produto**, e não a função. É o
# teste que o sénior impôs: se a asserção continuar verde depois de a chamada
# desaparecer, ela não está a medir o produto.
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

GRUPOS_ESPERADOS=4
CASOS_ESPERADOS=11
falhas=0

PORTA=packages/db/src/reserva-publica.ts
ESPERA=packages/db/src/espera.ts
MSG=packages/db/src/mensagens.ts
ORIG_PORTA=$(mktemp); ORIG_ESPERA=$(mktemp); ORIG_MSG=$(mktemp)
cp "$PORTA" "$ORIG_PORTA"; cp "$ESPERA" "$ORIG_ESPERA"; cp "$MSG" "$ORIG_MSG"

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  cp "$ORIG_PORTA" "$PORTA"; cp "$ORIG_ESPERA" "$ESPERA"; cp "$ORIG_MSG" "$MSG"
  rm -f "$ORIG_PORTA" "$ORIG_ESPERA" "$ORIG_MSG"
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types \
    provas/produto-fuso-e-mensagens.test.ts >"$1" 2>&1
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
  if correr "$ficheiro"; then vermelho "$nome: ficou VERDE com a chamada apagada"; return; fi
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
if correr /tmp/bossaos-produto-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-produto-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos, $casos casos"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-produto-ligado.txt | head -10; exit 1
fi

echo
echo "2. A CHAMADA a resolverHoraLocal desaparece da porta"
# ── É este o controlo que a retenção 1 pedia ──────────────────────────────
#
# A função continua lá, provada e correcta. O que desaparece é quem a chama — que
# era exactamente o estado em que a etapa foi retida.
python3 - <<'PYFUSO'
import io
p = 'packages/db/src/reserva-publica.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const horaEntendida = await comEscopo(
    prisma, { organizationId: unidade.organizationId },
    (db) => resolverHoraLocal(db, unidade.fuso!, `${pedido.dia} ${pedido.hora}:00`));"""
assert antigo in s, 'a chamada ao resolvedor nao esta onde se esperava'
# Volta ao que estava: hora de parede lida como UTC.
novo = """  const horaEntendida = {
    instante: new Date(`${pedido.dia}T${pedido.hora}:00Z`),
    estado: 'NORMAL' as const,
  };"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYFUSO
exigir_vermelho "caiu o fuso: a porta voltou a gravar hora de parede como UTC" \
  'instante do fuso, e não com hora de parede' /tmp/bossaos-produto-fuso.txt \
  'reservar pela porta enche o histórico'
cp "$ORIG_PORTA" "$PORTA"

echo
echo "3. A CHAMADA a enfileirar desaparece da porta"
# A retenção 2. A fila continua provada; ninguém a chama.
python3 - <<'PYFILA'
import io
p = 'packages/db/src/reserva-publica.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (!r.repetida) {"
assert antigo in s, 'o enfileirar da porta nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  if (false && !r.repetida) {", 1))
PYFILA
exigir_vermelho "caiu a fila: confirmar uma reserva deixou de avisar ninguém" \
  'enche o histórico' /tmp/bossaos-produto-fila.txt \
  'instante do fuso, e não com hora de parede'
cp "$ORIG_PORTA" "$PORTA"

echo
echo "4. A CHAMADA a enfileirar desaparece da chamada da espera"
python3 - <<'PYPRONTA'
import io
p = 'packages/db/src/espera.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (espera.reservationId) {"
assert antigo in s, 'o aviso da mesa pronta nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  if (false && espera.reservationId) {", 1))
PYPRONTA
exigir_vermelho "caiu o aviso: a mesa ficou pronta e ninguém soube" \
  'segunda chamada da mesma noite' /tmp/bossaos-produto-pronta.txt
cp "$ORIG_ESPERA" "$ESPERA"

echo
echo "5. A chave volta a ser (reserva, tipo) — e engole a segunda chamada"
# ── A resposta fácil que o contrato nomeia ────────────────────────────────
#
# «A sua mesa está pronta» pode ter de sair duas vezes na mesma noite. Com esta
# chave a segunda desaparece em silêncio, e a mesa fica vazia com gente à porta.
python3 - <<'PYCHAVE'
import io
p = 'packages/db/src/mensagens.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    where: { eventoId },"
assert antigo in s, 'a chave do acontecimento nao esta onde se esperava'
novo = """    where: { eventoId: (await db.reservationMessage.findFirst({
      where: { reservationId: reservaId, tipo }, select: { eventoId: true },
    }))?.eventoId ?? eventoId },"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYCHAVE
exigir_vermelho "caiu a identidade: a segunda chamada foi engolida pela primeira" \
  'segunda chamada da mesma noite' /tmp/bossaos-produto-chave.txt \
  'confirmação continua a ser UMA'
cp "$ORIG_MSG" "$MSG"

echo
echo "6. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-produto-reposto.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-produto-reposto.txt)"
  if (( casos != CASOS_ESPERADOS )); then
    vermelho "reposto mas com $casos casos (esperados $CASOS_ESPERADOS)"
  else verde "reposto: $grupos grupos, $casos casos"; fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '^ *not ok' /tmp/bossaos-produto-reposto.txt | head -5
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))

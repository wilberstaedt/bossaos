#!/usr/bin/env bash
#
# A prova do E05: planos, quotas, entitlements e tema Starter.
#
# O alvo está em `docs/architecture/planos-e-limites.md`, escrito no E00 antes
# desta etapa.
#
# O controlo negativo é o que a régua manda: **desligar a verificação de plano e
# ver os casos de recusa ficarem verdes**. Se continuarem verdes com ela ligada e
# desligada, o que está a recusar é outra coisa — provavelmente a autorização do
# E04 — e o teste do plano nunca existiu.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

# Versão do Node verificada à cabeça. A razão está por extenso em
# `provar-isolamento.sh`: o formato do relatório muda com a versão, e uma
# contagem que não encontra o formato que espera conta zero — e zero, sem esta
# guarda, lê-se como "tudo bem".
NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  echo "Corra \`fnm use\` antes." >&2
  exit 2
fi

ALVO="packages/db/src/planos.ts"
falhas=0
verificacoes=0
MINIMO_VERIFICACOES=5
ALTERADO=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; verificacoes=$((verificacoes + 1)); }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); verificacoes=$((verificacoes + 1)); }

# Repor SEMPRE. Um script morto a meio com a verificação de plano desligada
# deixa um furo comercial a viver no repositório — e é o tipo de coisa que
# sobrevive a um commit distraído.
restaurar() {
  if [[ "$ALTERADO" == "1" ]]; then
    cp /tmp/bossaos-planos.bom "$ALVO"
    ALTERADO=0
    printf '  (verificação de plano reposta)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/planos.test.ts >"$1" 2>&1
}

analisar() {
  local f="$1" grupos assercoes
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  assercoes=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$assercoes" ]] || return 2
  echo "$grupos $assercoes"
}

echo "0. Fixtures"
if node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; then
  verde "semeadas"
else
  vermelho "não foi possível semear"; exit 1
fi

echo
echo "1. Com a verificação de plano LIGADA"
if correr /tmp/bossaos-planos-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-planos-ligado.txt); then
    vermelho "a prova saiu a zero mas o relatório não é TAP legível — não se mediu nada"
    exit 1
  fi
  read -r grupos assercoes <<<"$leitura"
  if (( grupos == 0 )) || (( assercoes == 0 )); then
    vermelho "VERDE COM ZERO MEDIDO: $grupos grupos, $assercoes asserções."
    exit 1
  fi
  if (( grupos < 3 )) || (( assercoes < 15 )); then
    vermelho "medido a menos: $grupos grupos (esperados 3), $assercoes asserções (esperadas 15)"
    exit 1
  fi
  verde "$grupos grupos, $assercoes asserções"
else
  vermelho "a prova falhou com a verificação ligada"
  grep -E 'not ok|AssertionError' /tmp/bossaos-planos-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — verificação de plano DESLIGADA"
cp "$ALVO" /tmp/bossaos-planos.bom
ALTERADO=1
python3 - <<'PY'
p = 'packages/db/src/planos.ts'
s = open(p, encoding='utf-8').read()
# O defeito exacto: o portão passa a deixar passar tudo. É o que alguém escreve
# a resolver "o cliente diz que não consegue usar" sem perceber porquê.
alvo = "  return decidirCapacidade({"
assert alvo in s
s = s.replace(alvo, "  return { permitido: true } as ResultadoDeCapacidade;\n  return decidirCapacidade({", 1)
open(p, 'w', encoding='utf-8').write(s)
PY

if correr /tmp/bossaos-planos-desligado.txt; then
  vermelho "a prova PASSOU com a verificação de plano desligada — não é o plano que ela mede"
else
  if ! analisar /tmp/bossaos-planos-desligado.txt >/dev/null; then
    vermelho "o relatório do controlo negativo não é TAP legível"
  else
    verde "a prova ficou vermelha, como tem de ficar"

    # Não basta ficar vermelha em qualquer sítio: os casos de RECUSA são os que
    # medem o plano. Se o par da quota continuasse verde, o que recusa é outra
    # coisa.
    if grep -q '^not ok .*quota: o par que decide' /tmp/bossaos-planos-desligado.txt; then
      verde "o par da quota caiu (é ele que mede o plano)"
    else
      vermelho "o par da quota continuou verde sem verificação — não estava a medir o plano"
    fi

    # O discriminador que a régua nomeia: com a verificação desligada, o Starter
    # TEM de conseguir gravar cores. Se continuar bloqueado, o que bloqueava era
    # a autorização do E04 e não o plano.
    if grep -q '^not ok .*tema Starter' /tmp/bossaos-planos-desligado.txt; then
      verde "o Starter passou a gravar cores — era mesmo o plano que bloqueava"
    else
      vermelho "o Starter continuou bloqueado sem verificação de plano — era outra coisa a recusar"
    fi
  fi
fi

cp /tmp/bossaos-planos.bom "$ALVO"
ALTERADO=0

echo
echo "3. Reposta — tem de voltar ao verde"
if correr /tmp/bossaos-planos-religado.txt; then
  verde "de volta ao verde"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E 'not ok|AssertionError' /tmp/bossaos-planos-religado.txt | head -8
fi

echo
if (( verificacoes < MINIMO_VERIFICACOES )); then
  echo "VERDE COM ZERO MEDIDO: só $verificacoes verificações, esperadas $MINIMO_VERIFICACOES."
  exit 1
fi
if (( falhas == 0 )); then
  echo "Planos provados: 0 falhas."
else
  echo "Planos NÃO provados: $falhas falha(s)."
  exit 1
fi

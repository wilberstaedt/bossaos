#!/usr/bin/env bash
# ── O caso extremo dos alérgenos, na carta que o cliente lê ────────────────
#
# Achado RV100-022: o §9.2 manda testar alérgenos extensos e o caso extremo
# nunca foi renderizado. O domínio prova-o; a interface nunca viu mais do que um
# punhado — na base semeada, o máximo declarado por prato é UM.
#
# Esta guarda declara os CATORZE do `ALERGENIOS_UE` num prato da carta pública e
# mede-o em cinco larguras: quantos aparecem, se algum é cortado, se o texto é
# legível, se os alvos de toque chegam, e se a nota «pergunte à equipa»
# continua lá e inteira.
#
# ── E são catorze, não treze ──────────────────────────────────────────────
#
# O `ALERGENIOS_UE` tem catorze entradas, que é o número do regulamento. A prova
# conta o que o domínio diz em vez de fixar o número.
#
# ── Na carta PÚBLICA, e não no catálogo interno ───────────────────────────
#
# São superfícies diferentes com utilizadores diferentes. O ecrã que decide se
# alguém come é o que o cliente lê.
#
# ── O que se perde se o cartão ficar ilegível ─────────────────────────────
#
# A regra do produto é que NÃO DECLARADO não é NÃO CONTÉM, e a nota diz ao
# cliente para perguntar à equipa. Um cartão ilegível não perde só estética:
# perde a distinção entre «contém» e «ninguém sabe». Por isso a nota é medida
# como conteúdo obrigatório.
#
# Três respostas:
#   OK (0)        os catorze cabem e lêem-se nas cinco larguras
#   FALHOU (1)    algum não aparece, é cortado, é miúdo, ou a nota caiu
#   NÃO MEDI (2)  sonda cega, população vazia, ou servidor em baixo
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "O caso extremo dos alérgenos aguenta na carta pública?"

if [ -f .env ]; then set -a; . ./.env; set +a; fi

# ── 1. A carta pública precisa de PORTA ────────────────────────────────────
#
# A semente publica `insp-marina-oropesa` na unidade `puerto` — e de propósito
# na SEGUNDA unidade, para duas provas não disputarem a coluna `public_slug`.
# Sem semente não há endereço público, e isso é NÃO MEDI e não um verde.
if ! bash scripts/arnes-pronto.sh >/tmp/bossaos-alergenios-arnes.txt 2>&1; then
  naomedi "não consegui preparar o arnês — sem ele a carta pública não tem porta."
  tail -4 /tmp/bossaos-alergenios-arnes.txt | sed 's/^/           /'
  exit "$NAO_MEDI"
fi
verde "arnês pronto — a unidade publicada existe"

PORTA_DA_PROVA="${PORTA_INSPECCAO:-3018}"
if lsof -nP -iTCP:"$PORTA_DA_PROVA" -sTCP:LISTEN >/dev/null 2>&1; then
  naomedi "a porta $PORTA_DA_PROVA já está ocupada — outra inspecção a correr?"
  exit "$NAO_MEDI"
fi

arranque_falhou() {
  grep -qE 'config.webServer was not able to start|Could not find a production build' "$1"
}

correr() {
  PORTA_INSPECCAO="$PORTA_DA_PROVA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA_DA_PROVA" \
    pnpm exec playwright test --project=chromium alergenios-na-carta.spec.ts \
    --reporter=line "$@" 2>&1
}

# ── 2. AS SONDAS, na sua invocação e contadas por MARCADOR ────────────────
#
# Duas, e a primeira é a que a armadilha pede: um detector que dissesse «há
# alérgenos na página» passava com quatro e passava com catorze, e era esse
# exactamente o buraco. A sonda planta catorze e exige catorze, planta quatro e
# exige quatro — prova que o detector CONTA, e não que detecta presença.
SAIDA_SONDAS=/tmp/bossaos-alergenios-sondas.txt
correr -g 'SONDA' >"$SAIDA_SONDAS"
ESTADO_SONDAS=$?
if arranque_falhou "$SAIDA_SONDAS"; then
  naomedi "o servidor da inspecção não arrancou — o \`.next\` em reconstrução noutro processo?"
  exit "$NAO_MEDI"
fi
QUANTAS=$(grep -c 'SONDA-ACENDEU' "$SAIDA_SONDAS" || true)
if [ "$ESTADO_SONDAS" -ne 0 ]; then
  naomedi "uma sonda não acendeu — sem ela, «catorze» é o que o detector diz, não o que a página mostra:"
  grep -E '^ *Error: ' "$SAIDA_SONDAS" | grep -v 'Error Context' | head -3 | sed 's/^ */           /'
  exit "$NAO_MEDI"
fi
if [ "${QUANTAS:-0}" -lt 2 ]; then
  naomedi "só ${QUANTAS:-0} sonda(s) correram, e são duas — o detector que falta não está provado."
  exit "$NAO_MEDI"
fi
verde "as $QUANTAS sondas acenderam: o contador conta, e o corte vê-se"

# ── 3. E só agora a medição ────────────────────────────────────────────────
SAIDA=/tmp/bossaos-alergenios.txt
correr --grep-invert 'SONDA' >"$SAIDA"
ESTADO=$?

if arranque_falhou "$SAIDA"; then
  naomedi "o servidor da inspecção caiu a meio — nada foi medido."
  exit "$NAO_MEDI"
fi
if grep -q 'No tests found' "$SAIDA"; then
  naomedi "o Playwright não encontrou a prova — nada foi medido."
  exit "$NAO_MEDI"
fi
# `Error: POPULACAO-ZERO`, e não `POPULACAO-ZERO` solto: o Playwright imprime
# no rastreio a LINHA DE CÓDIGO da asserção, e essa linha contém o texto da
# mensagem. Com o grep largo, uma falha normal de contagem saía como NÃO MEDI —
# o diagnóstico errado, e apanhei-o com o controlo negativo.
if grep -q 'Error: POPULACAO-ZERO' "$SAIDA"; then
  naomedi "não houve o que medir:"
  grep -o 'Error: POPULACAO-ZERO:[^"]*' "$SAIDA" | head -2 | sed 's/^/           /'
  exit "$NAO_MEDI"
fi

AMBITO=$(grep -o 'AMBITO .*' "$SAIDA" | tail -1)
campo() { sed -n "s/.*$1=\([0-9]*\).*/\1/p" <<<"$AMBITO"; }
texto() { sed -n "s/.*$1=\"\([^\"]*\)\".*/\1/p" <<<"$AMBITO"; }
ambito() {
  echo "  âmbito:  $(campo alergenios) alérgenos declarados num prato — a lista inteira do"
  echo "           \`ALERGENIOS_UE\`, contada do domínio e não fixada aqui."
  echo "           prato «$(texto prato)» na carta pública «$(texto slug)», $(campo larguras) larguras."
  echo "           FORA: o catálogo interno (outra superfície, outro utilizador) e os"
  echo "           modificadores extensos, que o §9.2 pede e ficam por medir."
  local n; n=$(campo alvosDaPagina)
  if [ "${n:-0}" -gt 0 ]; then
    echo "           DECLARADO, e não reprovado: $n alvo(s) de toque abaixo de 44 px FORA do"
    echo "           cartão — achado verdadeiro, de outra dona. Reprovar por ele fazia esta"
    echo "           guarda nascer vermelha por uma razão que não é a dela."
    grep -o 'ALVO-DA-PAGINA .*' "$SAIDA" | sort -u | head -3 | sed 's/^/             /'
  fi
}

if [ "$ESTADO" -ne 0 ]; then
  vermelho "o caso extremo dos alérgenos não aguenta:"
  # Sem as ALVO-DA-PAGINA, que sao declaracao e nao falha: com elas a lista de
  # falhas comecava pelo que a guarda decidiu NAO reprovar.
  grep -E '[0-9]+px · ' "$SAIDA" | grep -v 'ALVO-DA-PAGINA' | head -8 | sed 's/^ */           /' 
  ambito
  exit "$FALHOU"
fi

verde "os $(campo alergenios) aparecem, cabem, lêem-se, e a nota continua inteira"
echo
ambito
exit "$OK"

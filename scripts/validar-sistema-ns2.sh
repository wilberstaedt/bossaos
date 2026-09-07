#!/usr/bin/env bash
# ── Corredor da suite `ns2-visual.spec.ts` ──────────────────────────────────────
#
# Mede o sistema visual da Fase 1 do North Star.
#
# Existe porque a `validar-suites-com-guiao.sh` recusa uma suite que ninguem
# nomeia: *«uma suite assim nao da verde nem vermelho — desaparece»*. Escrever
# a suite e nao lhe dar corredor e' deixa-la a medir para ninguem, que e' o
# mesmo que nao a ter.
#
# Tres respostas:
#   OK (0)        a suite passou
#   FALHOU (1)    a suite reprovou
#   NAO MEDI (2)  a porta estava ocupada, a suite nao foi encontrada, ou ela
#                 propria declarou POPULACAO-ZERO
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NAO MEDI $1"; }

echo "o sistema visual da Fase 1 do North Star"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

PORTA="${PORTA_INSPECCAO:-3040}"
if lsof -nP -iTCP:"$PORTA" -sTCP:LISTEN >/dev/null 2>&1; then
  naomedi "a porta $PORTA ja esta ocupada — outra inspeccao a correr?"
  exit "$NAO_MEDI"
fi
[ -f "inspeccao/ns2-visual.spec.ts" ] || { naomedi "a suite nao esta em inspeccao/"; exit "$NAO_MEDI"; }

SAIDA=/tmp/bossaos-sistema-ns2.txt
PORTA_INSPECCAO="$PORTA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA" \
  pnpm exec playwright test --project=chromium "ns2-visual" --reporter=line >"$SAIDA" 2>&1
ESTADO=$?

if grep -q 'No tests found' "$SAIDA"; then
  naomedi "o Playwright nao encontrou a suite — nada foi medido."
  exit "$NAO_MEDI"
fi
if grep -q 'POPULACAO-ZERO' "$SAIDA"; then
  naomedi "a suite declarou populacao vazia:"
  grep -o 'POPULACAO-ZERO[^"]*' "$SAIDA" | head -2 | sed 's/^/           /'
  exit "$NAO_MEDI"
fi

ambito() {
  echo "  ambito:  $(grep -o 'AMBITO.*' "$SAIDA" | tail -1)"
  echo "           A suite mede a PAGINA RENDERIZADA. Ler o codigo nao prova o"
  echo "           que o navegador pintou — e' a regra desta casa desde 07/09."
}

if [ "$ESTADO" -ne 0 ]; then
  vermelho "a suite reprovou:"
  sed 's/\x1b\[[0-9;]*m//g' "$SAIDA" | grep -E '^FALHA' | head -8 | sed 's/^/           /'
  ambito; exit "$FALHOU"
fi
verde "a suite passou"
echo
ambito
exit "$OK"

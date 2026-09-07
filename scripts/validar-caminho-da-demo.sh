#!/usr/bin/env bash
# ── Corredor da suite `caminho-da-demo.spec.ts` ──────────────────────────────────────
#
# Mede o percurso de quem clica para ver o produto.
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

echo "o percurso de quem clica para ver o produto"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

PORTA="${PORTA_INSPECCAO:-3042}"
if lsof -nP -iTCP:"$PORTA" -sTCP:LISTEN >/dev/null 2>&1; then
  naomedi "a porta $PORTA ja esta ocupada — outra inspeccao a correr?"
  exit "$NAO_MEDI"
fi
[ -f "inspeccao/caminho-da-demo.spec.ts" ] || { naomedi "a suite nao esta em inspeccao/"; exit "$NAO_MEDI"; }

SAIDA=/tmp/bossaos-caminho-da-demo.txt
PORTA_INSPECCAO="$PORTA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA" \
  pnpm exec playwright test --project=chromium "caminho-da-demo" --reporter=line >"$SAIDA" 2>&1
ESTADO=$?

if grep -qE 'config.webServer was not able to start|Could not find a production build|ERR_MODULE_NOT_FOUND|Cannot find module|Executable doesn.t exist' "$SAIDA"; then
  # NAO MEDI e nao FALHOU, e a diferenca importa: aqui o servidor nao arrancou
  # ou o arnes nao estava montado. Chamar falha a isto seria acusar o produto de
  # um defeito que ninguem mediu — e foi assim que esta guarda ficou vermelha
  # contra o HEAD, num checkout sem build.
  naomedi "o servidor da inspeccao nao arrancou — sem build ou sem arnes montado."
  exit "$NAO_MEDI"
fi
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

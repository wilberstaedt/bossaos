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
# ── As QUATRO suites do North Star v2, e nao so a primeira ─────────────────
#
# Este corredor nasceu a correr `ns2-visual` sozinha. A Fase 2 acrescentou tres
# suites — as capturas da landing, as das mesas e a das tres linguas — e um
# `validar-suites-com-guiao` apanhou-as: uma suite que nenhum guiao nomeia nao
# da verde nem vermelho, DESAPARECE. Ficariam a correr so quando alguem se
# lembrasse delas a mao.
#
# Sao dois projectos porque sao duas naturezas: a landing mede-se SEM sessao
# (com sessao o cabecalho troca a chamada e a captura deixa de ser a que o
# visitante ve), e a sala nao existe sem sessao nenhuma.
for f in ns2-visual ns2-capturas ns2-mesas ns2-idiomas; do
  [ -f "inspeccao/$f.spec.ts" ] || { naomedi "a suite $f nao esta em inspeccao/"; exit "$NAO_MEDI"; }
done

SAIDA=/tmp/bossaos-sistema-ns2.txt
: >"$SAIDA"
ESTADO=0
for par in "chromium:ns2-visual ns2-capturas" "painel:ns2-mesas ns2-idiomas"; do
  PROJECTO="${par%%:*}"; SUITES="${par#*:}"
  echo "== projecto $PROJECTO: $SUITES ==" >>"$SAIDA"
  # shellcheck disable=SC2086
  PORTA_INSPECCAO="$PORTA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA" \
    pnpm exec playwright test --project="$PROJECTO" $SUITES --reporter=line >>"$SAIDA" 2>&1
  E=$?
  [ "$E" -eq 0 ] || ESTADO="$E"
done

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

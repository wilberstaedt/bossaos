#!/usr/bin/env bash
# ── Nada de corpo abaixo de 14 px, medido na POPULAÇÃO ─────────────────────
#
# A régua do manual fixa rótulos em 14/20 e diz que nada de corpo desce abaixo
# de 14. Recebi duas classes para corrigir, generalizei o critério — medi todo o
# texto em vez das duas classes — e escrevi «0». Era 0 em TRÊS ROTAS, e são 382
# telas.
#
# **Generalizar o critério e amostrar a população são movimentos opostos, e
# fazer o primeiro bem esconde que se fez o segundo.** O predicado ficou certo e
# emprestou confiança a um número que era de uma amostra.
#
# Por isso a população vem do mapa de alcance e o número sai com ela dentro da
# frase: «0 em 164 endereços» e «0» não são a mesma afirmação.
#
# Três respostas:
#   OK (0)        nenhum texto de corpo abaixo de 14 px nos endereços que abrem
#   FALHOU (1)    há texto abaixo de 14 px
#   NÃO MEDI (2)  o mapa não deu endereços, ou nenhum abriu, ou o servidor caiu
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "Há texto de corpo abaixo de 14 px?"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

PORTA_DA_PROVA="${PORTA_INSPECCAO:-3018}"
if lsof -nP -iTCP:"$PORTA_DA_PROVA" -sTCP:LISTEN >/dev/null 2>&1; then
  naomedi "a porta $PORTA_DA_PROVA já está ocupada — outra inspecção a correr?"
  exit "$NAO_MEDI"
fi
if ! bash scripts/arnes-pronto.sh >/tmp/bossaos-tipografia-arnes.txt 2>&1; then
  naomedi "não consegui preparar o arnês — sem alvos o mapa de alcance não resolve."
  exit "$NAO_MEDI"
fi
verde "arnês pronto"

SAIDA=/tmp/bossaos-tipografia.txt
PORTA_INSPECCAO="$PORTA_DA_PROVA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA_DA_PROVA" \
  pnpm exec playwright test --project=preparar --project=painel tipografia-minima.spec.ts \
  --reporter=line >"$SAIDA" 2>&1
ESTADO=$?

if grep -qE 'config.webServer was not able to start|Could not find a production build' "$SAIDA"; then
  naomedi "o servidor da inspecção não arrancou — o \`.next\` em reconstrução noutro processo?"
  exit "$NAO_MEDI"
fi
# «Nenhum teste encontrado» é falta de medição e não vermelho. Apanhou-me: uma
# sonda anterior fez `git checkout` ao playwright.config.ts e levou a entrada
# desta suite; a guarda leu o código 1 como «há texto pequeno».
if grep -q 'No tests found' "$SAIDA"; then
  naomedi "o Playwright não encontrou a suite — nada foi medido."
  exit "$NAO_MEDI"
fi
if grep -q 'Error: POPULACAO-ZERO' "$SAIDA"; then
  naomedi "não houve população que medir:"
  grep -o 'Error: POPULACAO-ZERO:[^"]*' "$SAIDA" | head -2 | sed 's/^/           /'
  exit "$NAO_MEDI"
fi

AMBITO=$(grep -o 'AMBITO .*' "$SAIDA" | tail -1)
campo() { sed -n "s/.*$1=\([0-9]*\).*/\1/p" <<<"$AMBITO"; }
ambito() {
  echo "  âmbito:  $(campo visitados) endereços visitados de $(campo enderecos) que o mapa de alcance resolve."
  echo "           FORA: os pontos de \`api/\` (devolvem ficheiros, não telas), os"
  echo "           endereços com parâmetro por resolver, e o texto marcado"
  echo "           \`aria-hidden\` — que é glifo e não se lê."
}

if [ "$ESTADO" -ne 0 ]; then
  vermelho "há texto de corpo abaixo de 14 px:"
  sed 's/\x1b\[[0-9;]*m//g' "$SAIDA" | grep -E '· «' | head -8 | sed 's/^ */           /'
  ambito
  exit "$FALHOU"
fi

verde "nenhum texto de corpo abaixo de 14 px em $(campo visitados) endereços"
echo
ambito
exit "$OK"

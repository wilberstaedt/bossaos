#!/usr/bin/env bash
# ── Foco em diálogo, medido nos momentos que custam dinheiro ───────────────
#
# O `foco.spec.ts` estava certo e media no sítio errado: os cinco casos corriam
# todos contra `/es-ES/interno/catalogo`, o catálogo de desenho — a página que
# existe para MOSTRAR os componentes a servir de produto.
#
# O que este guião corre mede as três promessas do `<dialog>` nativo (foco preso
# dentro, Escape a fechar, foco de volta a quem abriu) e vai bater aos 20 IDs
# que o atlas classifica como diálogo: cancelar a subscrição, pedir a conta,
# revogar o acesso de um aparelho.
#
# Três respostas:
#   OK (0)        as promessas seguram e a dívida de momentos não subiu
#   FALHOU (1)    uma promessa do nativo deixou de valer, ou a dívida subiu
#   NÃO MEDI (2)  a sonda não encontrou diálogo onde ele existe (instrumento
#                 cego), população errada, ou o servidor sem arrancar
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "O foco em diálogo segura nos momentos reais?"

if [ -f .env ]; then set -a; . ./.env; set +a; fi

if ! bash scripts/arnes-pronto.sh >/tmp/bossaos-foco-arnes.txt 2>&1; then
  naomedi "não consegui preparar o arnês — sem alvos, nenhum momento resolve."
  tail -4 /tmp/bossaos-foco-arnes.txt | sed 's/^/           /'
  exit "$NAO_MEDI"
fi
verde "arnês pronto"

PORTA_DA_PROVA="${PORTA_INSPECCAO:-3018}"
if lsof -nP -iTCP:"$PORTA_DA_PROVA" -sTCP:LISTEN >/dev/null 2>&1; then
  naomedi "a porta $PORTA_DA_PROVA já está ocupada — outra inspecção a correr?"
  exit "$NAO_MEDI"
fi

arranque_falhou() {
  grep -qE 'config.webServer was not able to start|Could not find a production build' "$1"
}

# ── A SONDA na sua própria invocação, julgada pelo CÓDIGO DE SAÍDA ────────
#
# A primeira versão disto procurava `SONDA:` no relatório. Apanhava o TÍTULO do
# caso, que o `--reporter=line` imprime sempre que o corre — e a guarda dava
# NÃO MEDI com a sonda verde. É a mesma armadilha do glifo `✘` na guarda de
# expansão, e é a segunda vez: um veredicto lido no relatório é um veredicto
# emprestado. O que não mente é o código de saída.
correr() {
  PORTA_INSPECCAO="$PORTA_DA_PROVA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA_DA_PROVA" \
    pnpm exec playwright test --project=preparar --project=painel foco.spec.ts \
    --reporter=line "$@" 2>&1
}

SAIDA_SONDA=/tmp/bossaos-foco-sonda.txt
correr -g 'SONDA' >"$SAIDA_SONDA"
ESTADO_SONDA=$?
if arranque_falhou "$SAIDA_SONDA"; then
  naomedi "o servidor da inspecção não arrancou — o \`.next\` em reconstrução noutro processo?"
  exit "$NAO_MEDI"
fi
if [ "$ESTADO_SONDA" -ne 0 ]; then
  naomedi "a sonda não encontrou diálogo onde ele existe — o «0 em 20» seria do instrumento:"
  # A mensagem, não o título: o relator imprime o título de todo o caso que corre.
  grep -E '^ *Error: ' "$SAIDA_SONDA" | grep -v 'Error Context' | head -3 | sed 's/^ */           /'
  exit "$NAO_MEDI"
fi
verde "a sonda encontrou o diálogo do catálogo e as três promessas seguraram lá"

SAIDA=/tmp/bossaos-foco.txt
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

AMBITO=$(grep -o 'AMBITO .*' "$SAIDA" | tail -1)
campo() { sed -n "s/.*$1=\([0-9]*\).*/\1/p" <<<"$AMBITO"; }
ambito() {
  if [ -z "$AMBITO" ]; then
    echo "  âmbito:  desconhecido — a prova não declarou o que mediu"
    return
  fi
  local tot com sem nao tecto
  tot=$(campo momentos); com=$(campo comDialogo); sem=$(campo semDialogo)
  nao=$(campo naoAlcancados); tecto=$(campo tecto)
  echo "  âmbito:  as três promessas do <dialog> estão medidas NO COMPONENTE, no catálogo de desenho."
  echo "           Dos $tot momentos que o atlas chama diálogo, $com passam por um <dialog>."
  echo "           $sem não têm diálogo nenhum; $nao não se alcançam hoje (tecto $tecto)."
  echo "           O produto não tem modais: \`Dialogo\` é importado por um ficheiro só"
  echo "           (DemoInteractiva), usado por uma página só (o catálogo), e há zero"
  echo "           <dialog> cru. Este verde NÃO diz «os diálogos do produto estão bem»."
  grep -o 'NAO-ALCANCADO .*' "$SAIDA" | sed 's/^/           /'
}

if grep -q 'POPULACAO-ZERO' "$SAIDA"; then
  naomedi "a população não é a esperada:"
  grep -o 'POPULACAO-ZERO:[^"]*' "$SAIDA" | head -2 | sed 's/^/           /'
  exit "$NAO_MEDI"
fi


if [ "$ESTADO" -ne 0 ]; then
  vermelho "uma promessa do nativo deixou de valer, ou a dívida de momentos subiu:"
  grep -E 'Error:|momentos sem diálogo subiram|o foco|Escape' "$SAIDA" | head -6 | sed 's/^/           /'
  ambito
  exit "$FALHOU"
fi

verde "foco preso, Escape a fechar e foco de volta ao accionador — as três seguram"
echo
ambito
echo
grep -o 'SEM-DIALOGO .*' "$SAIDA" | sed 's/^/  sem diálogo: /'
exit "$OK"

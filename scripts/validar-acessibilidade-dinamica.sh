#!/usr/bin/env bash
# ── A metade dinâmica da acessibilidade ────────────────────────────────────
#
# A metade estática está feita e conforme no `07_INDICE_DE_EVIDENCIAS.md`
# (rótulos, `lang`, um `h1` por render). Esta é a que exige navegador, e era o
# único buraco do dossiê que não esperava por aprovação nenhuma — aparecia como
# NÃO MEDI declarado em quatro lotes seguidos.
#
# Mede quatro coisas, por ordem de valor:
#   1. o menu móvel devolve o foco ao botão que o abriu (o ÚNICO caso real de
#      foco no produto: já ficou medido que não há um único `<dialog>`)
#   2. o anel de foco vê-se contra o fundo que está mesmo por trás dele
#   3. as acções principais alcançam-se só com Tab
#   4. a 200% de zoom nada exige rolar na horizontal
#
# ── E porque é que cada uma tem sonda ──────────────────────────────────────
#
# Um detector de coral construído há uma hora dava ZERO POR CONSTRUÇÃO, e o zero
# era plausível porque a hipótese que ele media dizia que o coral estava
# ausente. Um detector partido a concordar com a hipótese que devia testar.
# **Uma prova de acessibilidade que não encontra problemas tem exactamente essa
# forma** — por isso aqui um zero só conta depois de a sonda do respectivo
# detector ter acendido na mesma corrida.
#
# Três respostas:
#   OK (0)        as quatro medições correram e não acharam defeito
#   FALHOU (1)    achou defeito de acessibilidade
#   NÃO MEDI (2)  alguma sonda não acendeu, população vazia, ou servidor em baixo
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

DOSSIE="docs/visual/rv100/2026-09-06/evidence/accessibility"

echo "A acessibilidade dinâmica: o que só o navegador mede"

if [ -f .env ]; then set -a; . ./.env; set +a; fi

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
    pnpm exec playwright test --project=chromium acessibilidade-dinamica.spec.ts \
    --reporter=line "$@" 2>&1
}

# ── 1. AS SONDAS PRIMEIRO, e pelo código de saída ──────────────────────────
#
# Na sua própria invocação, porque um veredicto lido no relatório é um veredicto
# emprestado: o `--reporter=line` imprime o TÍTULO de cada caso que corre, e
# procurar «SONDA» na saída dá NÃO MEDI com as sondas verdes. Já me apanhou.
SAIDA_SONDAS=/tmp/bossaos-a11y-sondas.txt
correr -g 'SONDA' >"$SAIDA_SONDAS"
ESTADO_SONDAS=$?
if arranque_falhou "$SAIDA_SONDAS"; then
  naomedi "o servidor da inspecção não arrancou — o \`.next\` em reconstrução noutro processo?"
  exit "$NAO_MEDI"
fi
# Conta os MARCADORES que cada sonda imprime ao chegar ao fim, e não os casos
# que o relatório diz terem passado: o projecto `preparar` corre como
# dependência do `chromium` e os seus três casos apareciam na conta — dava
# «7 sondas» quando são quatro.
QUANTAS=$(grep -c 'SONDA-ACENDEU' "$SAIDA_SONDAS" || true)
if [ "$ESTADO_SONDAS" -ne 0 ]; then
  naomedi "uma sonda não acendeu — sem ela, um zero não distingue «não há defeito» de «não vejo defeitos»:"
  grep -E '^ *Error: ' "$SAIDA_SONDAS" | grep -v 'Error Context' | head -3 | sed 's/^ */           /'
  exit "$NAO_MEDI"
fi
# As quatro sondas TÊM de ter corrido: uma sonda que não corre não prova nada, e
# «0 falhados de 0 corridos» é verde por vazio.
if [ "${QUANTAS:-0}" -lt 4 ]; then
  naomedi "só ${QUANTAS:-0} sonda(s) correram, e são quatro — os detectores que faltam não estão provados."
  exit "$NAO_MEDI"
fi
verde "as $QUANTAS sondas acenderam: cada detector viu o defeito que devia ver"

# ── 2. E só agora a medição ────────────────────────────────────────────────
SAIDA=/tmp/bossaos-a11y.txt
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
if grep -q 'POPULACAO-ZERO' "$SAIDA"; then
  naomedi "não houve o que medir:"
  grep -o 'POPULACAO-ZERO:[^"]*' "$SAIDA" | head -3 | sed 's/^/           /'
  exit "$NAO_MEDI"
fi

campo() { sed -n "s/.*$2=\([0-9]*\).*/\1/p" <<<"$(grep -o "AMBITO-$1 .*" "$SAIDA" | tail -1)"; }
ANEL_MEDIDOS=$(campo ANEL medidos); ANEL_SUP=$(campo ANEL superficies)
TECLADO_TOTAL=$(campo TECLADO principais); TECLADO_OK=$(campo TECLADO alcancadas)
ZOOM_SUP=$(campo ZOOM superficies)

ambito() {
  echo "  âmbito:  medido em ${ANEL_SUP:-?} superfícies públicas — a landing, a /product e o login,"
  echo "           que é a única superfície \`.bo-inverso\` do produto."
  echo "           anel de foco: ${ANEL_MEDIDOS:-?} focáveis aferidos contra o fundo de trás do anel"
  echo "           teclado: ${TECLADO_OK:-?}/${TECLADO_TOTAL:-?} acções principais alcançadas só com Tab"
  echo "           zoom: ${ZOOM_SUP:-?} superfícies a 200% (640px de janela útil)"
  echo "           FORA: as superfícies com sessão (painel, TPV, KDS) não entram aqui;"
  echo "           o foco preso em modal não se mede porque o produto não tem modais."
}

if [ "$ESTADO" -ne 0 ]; then
  vermelho "a acessibilidade dinâmica achou defeito:"
  grep -E '^ *Error: |·.*·' "$SAIDA" | grep -v 'Error Context' | head -8 | sed 's/^ */           /'
  ambito
  exit "$FALHOU"
fi

verde "menu móvel devolve o foco · anel com contraste · Tab alcança · 200% não rola"

# ── 3. A evidência, que é o que o dossiê esperava ──────────────────────────
mkdir -p "$DOSSIE"
{
  echo "# Acessibilidade dinâmica — medida no navegador"
  echo
  echo "Gerado por \`scripts/validar-acessibilidade-dinamica.sh\` em $(date '+%Y-%m-%d %H:%M')."
  echo "A metade estática está no \`07_INDICE_DE_EVIDENCIAS.md\`; esta é a que exige navegador."
  echo
  echo "| o quê | medida | resultado |"
  echo "| --- | --- | --- |"
  echo "| menu móvel devolve o foco ao accionador | 1 menu (o único do produto) | conforme |"
  echo "| anel de foco vs. fundo de trás do anel | ${ANEL_MEDIDOS:-?} focáveis, ${ANEL_SUP:-?} superfícies | conforme, mínimo 3:1 |"
  echo "| acções principais alcançáveis com Tab | ${TECLADO_OK:-?}/${TECLADO_TOTAL:-?} | conforme |"
  echo "| 200% de zoom sem rolar na horizontal | ${ZOOM_SUP:-?} superfícies | conforme |"
  echo
  echo "## O que NÃO está aqui"
  echo
  echo "- Superfícies com sessão (painel, TPV, KDS): esta prova corre no projecto"
  echo "  \`chromium\`, sem sessão. É dívida declarada, não cobertura."
  echo "- Foco preso em modal: **o produto não tem modais.** O \`Dialogo\` é importado"
  echo "  por um ficheiro só, o catálogo de desenho. Medido em \`docs/reviews/RV100-FOCO.md\`."
  echo
  echo "## Porque é que se pode acreditar nos zeros"
  echo
  echo "Cada um dos quatro detectores tem sonda própria, que lhe planta na página o"
  echo "defeito que ele deve encontrar e exige que o encontre — um menu que não"
  echo "devolve o foco, um anel branco sobre branco, uma acção com \`tabindex=-1\`, e"
  echo "2000 px numa janela de 640. As quatro acenderam nesta corrida."
} > "$DOSSIE/README.md"
verde "evidência escrita em $DOSSIE/README.md"

echo
ambito
exit "$OK"

#!/usr/bin/env bash
# ── Nada desaparece dentro do seu fundo ────────────────────────────────────
#
# A doença apareceu TRÊS vezes, sempre com a mesma assinatura — 1.00:1:
#   E07   um `var()` inexistente pintou #102E35 sobre #102E35
#   KDS   as peças claras dentro da superfície escura
#   KDS   o botão primário, que é a acção mais repetida da cozinha
#
# As duas primeiras foram curadas com 39 linhas de `.bo-kds .x { … }`: uma lista
# de pares componente×superfície, escrita sempre DEPOIS de alguém dar pelo
# defeito. A terceira apareceu na mesma, porque uma lista não previne — regista.
#
# A cura é o CONTRATO DA SUPERFÍCIE (`--bo-accao`, `--bo-sobre-accao`,
# `--bo-sobre-superficie`): a superfície declara o que promete a quem for
# desenhado nela, e o componente pede o papel em vez de adivinhar a cor. Esta
# guarda é a outra metade — mede o RESULTADO em cada superfície.
#
# Três respostas:
#   OK (0)        nada desaparece nas superfícies medidas
#   FALHOU (1)    há texto ou controlo indistinguível do fundo
#   NÃO MEDI (2)  alguma superfície não abriu, ou o servidor caiu
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "Alguma coisa desaparece dentro do seu fundo?"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

PORTA_DA_PROVA="${PORTA_INSPECCAO:-3018}"
if lsof -nP -iTCP:"$PORTA_DA_PROVA" -sTCP:LISTEN >/dev/null 2>&1; then
  naomedi "a porta $PORTA_DA_PROVA já está ocupada — outra inspecção a correr?"
  exit "$NAO_MEDI"
fi
if ! bash scripts/arnes-pronto.sh >/tmp/bossaos-superficies-arnes.txt 2>&1; then
  naomedi "não consegui preparar o arnês — sem alvos o KDS não resolve."
  exit "$NAO_MEDI"
fi
verde "arnês pronto"

SAIDA=/tmp/bossaos-superficies.txt
PORTA_INSPECCAO="$PORTA_DA_PROVA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA_DA_PROVA" \
  pnpm exec playwright test --project=preparar --project=painel superficies.spec.ts \
  --reporter=line >"$SAIDA" 2>&1
ESTADO=$?

if grep -qE 'config.webServer was not able to start|Could not find a production build' "$SAIDA"; then
  naomedi "o servidor da inspecção não arrancou — o \`.next\` em reconstrução noutro processo?"
  exit "$NAO_MEDI"
fi
if grep -q 'No tests found' "$SAIDA"; then
  naomedi "o Playwright não encontrou a suite — nada foi medido."
  exit "$NAO_MEDI"
fi
if grep -q 'Error: POPULACAO-ZERO' "$SAIDA"; then
  naomedi "alguma superfície não abriu:"
  grep -o 'Error: POPULACAO-ZERO:[^"]*' "$SAIDA" | head -2 | sed 's/^/           /'
  exit "$NAO_MEDI"
fi

AMBITO=$(grep -o 'AMBITO .*' "$SAIDA" | tail -1)
campo() { sed -n "s/.*$1=\([0-9]*\).*/\1/p" <<<"$AMBITO"; }
ambito() {
  # A lista vem da MEDIÇÃO e não escrita aqui. A versão anterior dizia à mão
  # «duas escuras do KDS, o login e uma do painel claro» — e era verdade, e foi
  # essa frase que deixou a landing de fora à vista de todos durante um dia.
  # Uma resposta escrita envelhece sozinha; uma pergunta feita, não.
  echo "  âmbito:  $(campo medidas) superfícies de $(campo superficies):"
  echo "           $(grep -o 'SUPERFICIES-LISTA .*' "$SAIDA" | tail -1 | sed 's/SUPERFICIES-LISTA //')"
  echo "           Mede texto a 4,5:1 e controlo SEM CONTORNO a 3:1 contra o"
  echo "           primeiro fundo OPACO — um fundo com alfa é uma camada, não um"
  echo "           fundo, e mede-se uma cor contra si própria."
  echo "           FORA: o que está fora do ecrã e o que leva \`aria-hidden\`."
  echo "           Contornos fracos (RV100-025), medidos por superfície e não por total:"
  grep -o 'TECTO .*' "$SAIDA" | sed 's/TECTO /           /'
  echo "           E mede o CORAL nas $(sed -n 's/.*CORAL escuras=\([0-9]*\).*/\1/p' "$SAIDA" | tail -1) superfícies escuras:"
  echo "           $(grep -o 'CORAL .*' "$SAIDA" | tail -1). O manual diz que o coral não"
  echo "           disputa atenção com o estado dos pedidos, e mede-se a cor RESOLVIDA"
  echo "           — as duas regras que disputavam tinham a mesma especificidade."
}

# Duas regras, dois títulos. A primeira versão anunciava sempre «desaparece
# dentro do fundo», e o controlo negativo do coral saía com o diagnóstico da
# outra regra — o código de saída certo pelo motivo mal contado.
if [ "$ESTADO" -ne 0 ]; then
  if grep -q 'o coral está nas superfícies do serviço' "$SAIDA"; then
    vermelho "o coral está na navegação do serviço, a disputar com o estado dos pedidos:"
    sed 's/\x1b\[[0-9;]*m//g' "$SAIDA" | grep -oE 'CORAL-[A-Z]+ .*|· [A-Z]+\.bo-[a-z_-]*' | head -6 | sed 's/^/           /'
  else
    vermelho "há coisas a desaparecer dentro do seu fundo:"
    sed 's/\x1b\[[0-9;]*m//g' "$SAIDA" | grep -E '· .*:1$' | head -8 | sed 's/^ */           /'
  fi
  ambito
  exit "$FALHOU"
fi

verde "nada desaparece em $(campo medidas) superfícies"
echo
ambito
exit "$OK"

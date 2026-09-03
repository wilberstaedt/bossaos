#!/bin/zsh
# O estado da BossaOS, medido e nao estimado.
#
# Duas percentagens porque uma sozinha mente: as etapas dizem onde vamos no
# caminho, as telas dizem quanto do produto existe. No inicio as etapas andam e
# as telas ficam a zero (E00-E03 nao entregam vista nenhuma), e isso e verdade,
# nao um erro do medidor.
cd "$(dirname "$0")/.."
ETAPAS_TOTAL=36
# `grep -c` imprime 0 E devolve codigo 1 quando nao acha: um `|| echo 0` aqui
# acrescentava um SEGUNDO zero e a aritmetica rebentava. Usa-se `|| true`.
# So VALIDADO conta como entregue. Contar tambem "aguardando validacao" inflava a
# percentagem com trabalho que ainda ninguem conferiu - e foi o que aconteceu: o
# medidor saltou para 2% antes de eu ter revisto uma linha. Quem aguarda conta a
# parte, para se ver que existe sem se dizer que esta feito.
ETAPAS_FEITAS=$(grep -cE '^\| E[0-9]{2} \| validado' docs/progress/ETAPAS.md 2>/dev/null || true)
AGUARDA=$(grep -cE '^\| E[0-9]{2} \| implementado aguardando' docs/progress/ETAPAS.md 2>/dev/null || true)
AGUARDA=${AGUARDA:-0}
ETAPAS_FEITAS=${ETAPAS_FEITAS:-0}
TELAS_TOTAL=$(tail -n +2 docs/progress/coverage.csv | wc -l | tr -d ' ')
TELAS_FEITAS=$(tail -n +2 docs/progress/coverage.csv | awk -F, '{print $(NF-2)}' | grep -cE 'validado|implementado' || true)
TELAS_FEITAS=${TELAS_FEITAS:-0}
PCT_ETAPA=$(( ETAPAS_FEITAS * 100 / ETAPAS_TOTAL ))
PCT_TELA=$(( TELAS_FEITAS * 100 / TELAS_TOTAL ))
ATUAL=$(grep -m1 -oE '^\*\*Etapa atual:\*\* .*' docs/progress/HANDOFF.md 2>/dev/null | sed 's/\*\*Etapa atual:\*\* //' || echo "E00")
echo "PCT_ETAPA=$PCT_ETAPA ETAPAS=$ETAPAS_FEITAS/$ETAPAS_TOTAL AGUARDA=$AGUARDA PCT_TELA=$PCT_TELA TELAS=$TELAS_FEITAS/$TELAS_TOTAL ATUAL=$ATUAL"

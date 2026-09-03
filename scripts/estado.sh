#!/usr/bin/env bash
# bash, nao zsh: o runner do GitHub nao tem zsh e o shebang dava 127.
# O estado da BossaOS, medido e nao estimado.
#
# Duas percentagens porque uma sozinha mente: as etapas dizem onde vamos no
# caminho, as telas dizem quanto do produto existe. No inicio as etapas andam e
# as telas ficam a zero (E00-E03 nao entregam vista nenhuma), e isso e verdade,
# nao um erro do medidor.
cd "$(dirname "$0")/.."
# O denominador MEDE-SE, nao se escreve. Se a matriz passar a ter 34 ou 38 linhas,
# um 36 fixo aqui mente em silencio e a percentagem fica errada nos dois sentidos.
ETAPAS_TOTAL=$(grep -cE '^\| E[0-9]{2} \| ' docs/progress/ETAPAS.md 2>/dev/null || true)
ETAPAS_TOTAL=${ETAPAS_TOTAL:-0}
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
# DEFEITO MEU, apanhado a 2026-09-03 ao auditar-me com a regua que exigi ao JR:
# isto era `grep -cE 'validado|implementado'`, e "implementado aguardando validacao"
# contem as DUAS palavras - ou seja contava como entregue exactamente aquilo que eu
# tinha dito ter corrigido do lado das etapas. Estava adormecido so porque as seis
# telas de agora estao todas validadas. Agora e igualdade exacta, como em cima.
TELAS_FEITAS=$(tail -n +2 docs/progress/coverage.csv | awk -F, '$(NF-2)=="validado"' | wc -l | tr -d ' ')
TELAS_AGUARDA=$(tail -n +2 docs/progress/coverage.csv | awk -F, '$(NF-2)=="implementado aguardando validação"' | wc -l | tr -d ' ')
TELAS_FEITAS=${TELAS_FEITAS:-0}
TELAS_AGUARDA=${TELAS_AGUARDA:-0}
# A guarda que exigi ao JR no E03, aplicada a mim: um leitor que nao le nada devolve
# zero, e zero e indistinguivel de "ainda nao ha nada feito" - que ate era verdade no
# inicio. Uma percentagem sem populacao nao e uma percentagem, e um silencio.
if [ "$ETAPAS_TOTAL" -lt 30 ]; then
  echo "ERRO: li $ETAPAS_TOTAL etapas em docs/progress/ETAPAS.md - o leitor esta cego" >&2
  exit 1
fi
if [ "$TELAS_TOTAL" -lt 300 ]; then
  echo "ERRO: li $TELAS_TOTAL telas em docs/progress/coverage.csv - o leitor esta cego" >&2
  exit 1
fi
PCT_ETAPA=$(( ETAPAS_FEITAS * 100 / ETAPAS_TOTAL ))
PCT_TELA=$(( TELAS_FEITAS * 100 / TELAS_TOTAL ))
ATUAL=$(grep -m1 -oE '^\*\*Etapa atual:\*\* .*' docs/progress/HANDOFF.md 2>/dev/null | sed 's/\*\*Etapa atual:\*\* //' || echo "E00")
echo "PCT_ETAPA=$PCT_ETAPA ETAPAS=$ETAPAS_FEITAS/$ETAPAS_TOTAL AGUARDA=$AGUARDA PCT_TELA=$PCT_TELA TELAS=$TELAS_FEITAS/$TELAS_TOTAL TELAS_AGUARDA=$TELAS_AGUARDA ATUAL=$ATUAL"

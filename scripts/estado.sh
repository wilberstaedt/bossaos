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
# A coluna do estado le-se NORMALIZADA: sem negrito, sem crases, sem espacos a
# volta. A 2026-09-03 as 22h48 o JR escreveu "| E08 | **em curso** |" - disciplina
# boa dele, e a minha leitura e que nao aguentava. Testei: com "**validado**" o
# medidor passava a contar 6 de 36 em vez de 7, e o ATUAL RECUAVA para o E07, ou
# seja mandava-o refazer uma etapa ja validada. Mesma familia do awk contra o CSV:
# funcionava ate o formato mudar, e o formato mudou por um par de asteriscos.
estados_de_etapa() { # imprime "E##<TAB>estado normalizado" por linha da matriz
  python3 -c '
import re, sys
for l in open("docs/progress/ETAPAS.md", encoding="utf-8"):
    m = re.match(r"\|\s*(E\d{2})\s*\|([^|]*)\|", l)
    if m:
        estado = re.sub(r"[*_`]", "", m.group(2)).strip().lower()
        print(m.group(1) + "\t" + estado)'
}

ETAPAS_TOTAL=$(estados_de_etapa | grep -c . || true)
ETAPAS_TOTAL=${ETAPAS_TOTAL:-0}
# `grep -c` imprime 0 E devolve codigo 1 quando nao acha: um `|| echo 0` aqui
# acrescentava um SEGUNDO zero e a aritmetica rebentava. Usa-se `|| true`.
# So VALIDADO conta como entregue. Contar tambem "aguardando validacao" inflava a
# percentagem com trabalho que ainda ninguem conferiu - e foi o que aconteceu: o
# medidor saltou para 2% antes de eu ter revisto uma linha. Quem aguarda conta a
# parte, para se ver que existe sem se dizer que esta feito.
ETAPAS_FEITAS=$(estados_de_etapa | awk -F'\t' '$2=="validado"' | grep -c . || true)
AGUARDA=$(estados_de_etapa | awk -F'\t' '$2 ~ /^implementado aguardando/' | grep -c . || true)
AGUARDA=${AGUARDA:-0}
ETAPAS_FEITAS=${ETAPAS_FEITAS:-0}
# O denominador tambem se conta com o leitor de CSV. `wc -l` conta LINHAS, e um
# campo com quebra de linha dentro de aspas vale duas - o denominador inflava e a
# percentagem descia sozinha, sem ninguem dar por ela. Hoje bate (396 = 396), mas
# batia por acidente dos dados e nao por construcao, que e a forma exacta do
# defeito do `awk -F,` que me apanhou uma hora antes: funcionou ate um campo
# ganhar uma virgula.
TELAS_TOTAL=$(python3 -c '
import csv, io
print(len(list(csv.reader(io.open("docs/progress/coverage.csv", encoding="utf-8-sig", newline="")))) - 1)')
# DEFEITO MEU, apanhado a 2026-09-03 ao auditar-me com a regua que exigi ao JR:
# isto era `grep -cE 'validado|implementado'`, e "implementado aguardando validacao"
# contem as DUAS palavras - ou seja contava como entregue exactamente aquilo que eu
# tinha dito ter corrigido do lado das etapas. Estava adormecido so porque as seis
# telas de agora estao todas validadas. Agora e igualdade exacta, como em cima.
# Leitor de CSV a serio, nao `awk -F,`. Um campo com virgula dentro de aspas faz o
# awk contar um campo a mais, e `$(NF-2)` passa a apontar para outra coluna - a
# 2026-09-03 uma nota do E05 com virgula fez isto contar 11 telas a aguardar onde
# eram 12, e a percentagem que eu reporto sai daqui. O mesmo defeito estava no
# validar-cobertura.sh e foi o LUMEN JR que o encontrou e corrigiu la; eu so o
# descobri aqui por reproduzir o awk a mao e ver os dois discordarem.
contar_telas() { # $1 = estado exacto
  python3 -c '
import csv, io, sys
linhas = list(csv.reader(io.open("docs/progress/coverage.csv", encoding="utf-8-sig", newline="")))
col = len(linhas[0]) - 3
print(sum(1 for l in linhas[1:] if l and l[col] == sys.argv[1]))' "$1"
}
TELAS_FEITAS=$(contar_telas "validado")
TELAS_AGUARDA=$(contar_telas "implementado aguardando validação")
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
# A etapa actual DERIVA-SE da matriz: e a primeira que ainda nao esta validada,
# saltando o E00 (que so se valida no E11, por desenho - quem escreve os contratos
# nao os valida). Antes vinha de uma linha em prosa do HANDOFF.md, e a 2026-09-03
# essa linha dizia E03 durante quase uma hora enquanto o JR trabalhava no E04:
# depende de alguem se lembrar de a actualizar, e ninguem se lembra a meio de uma
# etapa. Isto nao depende de ninguem.
# Usa a mesma leitura normalizada da contagem. A versao anterior comparava
# '| validado |' com os pipes e os espacos exactos, e por isso um "**validado**"
# fazia o ATUAL RECUAR para uma etapa ja fechada - que e pior do que contar mal,
# porque manda refazer trabalho feito.
ATUAL=$(estados_de_etapa | awk -F'\t' '$1!="E00" && $2!="validado" {print $1; exit}')
if [ -z "${ATUAL:-}" ]; then
  echo "ERRO: nao consegui derivar a etapa actual de docs/progress/ETAPAS.md" >&2
  exit 1
fi
echo "PCT_ETAPA=$PCT_ETAPA ETAPAS=$ETAPAS_FEITAS/$ETAPAS_TOTAL AGUARDA=$AGUARDA PCT_TELA=$PCT_TELA TELAS=$TELAS_FEITAS/$TELAS_TOTAL TELAS_AGUARDA=$TELAS_AGUARDA ATUAL=$ATUAL"

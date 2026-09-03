#!/usr/bin/env bash
# bash, nao zsh: o runner do GitHub nao tem zsh e o shebang dava 127.
# A matriz de cobertura nao pode perder um ID nem ganhar um estado inventado.
#
# CT-20 e CT-15 dizem que as fontes nao desaparecem por reagrupamento: um ID pode
# virar aba, dialogo ou estado de outra rota, mas continua a existir na matriz. Um
# ID que some nao aparece como erro em lado nenhum - some, e a percentagem sobe
# porque o denominador encolheu. Este script existe para isso nao passar.
cd "$(dirname "$0")/.."
REF="docs/bossaos/COBERTURA_TELAS.csv"      # referencia, nunca se edita
TRAB="docs/progress/coverage.csv"           # copia de trabalho
ESTADOS="planejado|em execução|implementado aguardando validação|validado|bloqueado por dependência"
falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

# ── O leitor de colunas, e porque deixou de ser `awk -F,` ──────────────────
#
# `awk -F, '{print $(NF-2)}'` conta campos a partir do fim. Um campo com virgula
# ENTRE ASPAS - que e CSV perfeitamente legal - desloca a contagem e o script
# passa a imprimir outra coluna. Aconteceu no E05: uma evidencia com "…
# decidirCapacidade, nao de texto fixo" fez o guarda acusar um estado invalido
# que nao existia, e o estado real desse ID nunca chegou a ser verificado.
#
# Um guarda que le a coluna errada nao e um guarda mais fraco: e um que da
# veredictos sobre outra coisa. Passa a ler com o modulo `csv`, que sabe o que
# sao aspas. O Python 3 ja e dependencia deste repositorio (obter-fontes.py).
coluna() { # $1 = ficheiro, $2 = nome da coluna
  python3 -c '
import csv, io, sys
linhas = list(csv.reader(io.open(sys.argv[1], encoding="utf-8-sig", newline="")))
i = linhas[0].index(sys.argv[2])
for l in linhas[1:]:
    if l: print(l[i])
' "$1" "$2"
}

ids_ref=$(coluna "$REF"  id | sort)
ids_tra=$(coluna "$TRAB" id | sort)
n_ref=$(echo "$ids_ref" | wc -l | tr -d ' ')
n_tra=$(echo "$ids_tra" | wc -l | tr -d ' ')

# Controlo negativo embutido: se o leitor nao ler nada, tudo "bate" e o verde e vacuo.
if [ "$n_ref" -lt 300 ]; then erro "so li $n_ref IDs da referencia - o leitor esta cego"; else ok "referencia com $n_ref IDs"; fi

sumidos=$(comm -23 <(echo "$ids_ref") <(echo "$ids_tra"))
if [ -n "$sumidos" ]; then erro "IDs que desapareceram da copia de trabalho: $(echo $sumidos | tr '\n' ' ')"; else ok "nenhum ID perdido ($n_tra de $n_ref)"; fi

inventados=$(comm -13 <(echo "$ids_ref") <(echo "$ids_tra"))
if [ -n "$inventados" ]; then erro "IDs que nao existem na referencia: $(echo $inventados | tr '\n' ' ')"; else ok "nenhum ID inventado"; fi

maus=$(coluna "$TRAB" status | grep -vE "^($ESTADOS)$" | sort -u)
if [ -n "$maus" ]; then erro "estados fora da lista permitida: $(echo $maus | tr '\n' ' ')"; else ok "todos os estados sao dos cinco permitidos"; fi

echo
estados_lidos=$(coluna "$TRAB" status)
# Controlo negativo do proprio leitor de estados: se ele devolver menos linhas
# do que ha IDs, alguma coisa se partiu e a contagem por estado nao vale nada.
n_estados=$(echo "$estados_lidos" | grep -c .)
if [ "$n_estados" -ne "$n_tra" ]; then
  erro "li $n_estados estados para $n_tra IDs - o leitor de colunas partiu-se"
fi
echo "$estados_lidos" | sort | uniq -c | sed 's/^/  /'
echo
[ "$falhas" -eq 0 ] && echo "  Cobertura integra." || echo "  $falhas FALHA(S)."
exit $falhas

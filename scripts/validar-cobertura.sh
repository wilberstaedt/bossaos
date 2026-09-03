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

ids_ref=$(tail -n +2 "$REF"  | cut -d, -f1 | sort)
ids_tra=$(tail -n +2 "$TRAB" | cut -d, -f1 | sort)
n_ref=$(echo "$ids_ref" | wc -l | tr -d ' ')
n_tra=$(echo "$ids_tra" | wc -l | tr -d ' ')

# Controlo negativo embutido: se o leitor nao ler nada, tudo "bate" e o verde e vacuo.
if [ "$n_ref" -lt 300 ]; then erro "so li $n_ref IDs da referencia - o leitor esta cego"; else ok "referencia com $n_ref IDs"; fi

sumidos=$(comm -23 <(echo "$ids_ref") <(echo "$ids_tra"))
if [ -n "$sumidos" ]; then erro "IDs que desapareceram da copia de trabalho: $(echo $sumidos | tr '\n' ' ')"; else ok "nenhum ID perdido ($n_tra de $n_ref)"; fi

inventados=$(comm -13 <(echo "$ids_ref") <(echo "$ids_tra"))
if [ -n "$inventados" ]; then erro "IDs que nao existem na referencia: $(echo $inventados | tr '\n' ' ')"; else ok "nenhum ID inventado"; fi

maus=$(tail -n +2 "$TRAB" | awk -F, -v OFS=, '{print $(NF-2)}' | grep -vE "^($ESTADOS)$" | sort -u)
if [ -n "$maus" ]; then erro "estados fora da lista permitida: $(echo $maus | tr '\n' ' ')"; else ok "todos os estados sao dos cinco permitidos"; fi

echo
tail -n +2 "$TRAB" | awk -F, '{print $(NF-2)}' | sort | uniq -c | sed 's/^/  /'
echo
[ "$falhas" -eq 0 ] && echo "  Cobertura integra." || echo "  $falhas FALHA(S)."
exit $falhas

#!/usr/bin/env bash
# Prova da frase final do validar-no-commit.sh, com controlo negativo.
# O positivo mostra que o NOVO distingue; o negativo mostra que o VELHO nao
# distinguia - senao a prova nao diz que a mudanca serviu para alguma coisa.
falhou=0
verifica() { if [ "$2" = "$3" ]; then echo "  ok    $1"; else echo "  FALHA $1: esperado [$3] veio [$2]"; falhou=1; fi }

novo() { local falhas=$1 abstencoes=$2
  if [ "$falhas" -ne 0 ]; then echo "$falhas FALHA(S)."
  elif [ "$abstencoes" -eq 0 ]; then echo "O que se publica esta medido: 0 falhas, e nenhuma guarda se absteve."
  else echo "0 falhas ENTRE AS QUE MEDIRAM. $abstencoes guarda(s) nao mediram."; fi }

velho() { local falhas=$1 abstencoes=$2
  [ "$falhas" -eq 0 ] && echo "O que se publica esta medido: 0 falhas." || echo "$falhas FALHA(S)."; }

echo "positivo: o novo diz coisas diferentes conforme houve ou nao abstencoes"
verifica "sem abstencoes"  "$(novo 0 0)"  "O que se publica esta medido: 0 falhas, e nenhuma guarda se absteve."
verifica "com treze"       "$(novo 0 13)" "0 falhas ENTRE AS QUE MEDIRAM. 13 guarda(s) nao mediram."
verifica "com falhas"      "$(novo 2 13)" "2 FALHA(S)."

echo "controlo negativo: o velho dava a MESMA frase nos dois casos"
a=$(velho 0 0); b=$(velho 0 13)
if [ "$a" = "$b" ]; then echo "  ok    o velho nao distinguia (é o defeito que se cura)"
else echo "  FALHA o velho ja distinguia - entao esta mudanca nao curou nada"; falhou=1; fi

echo "controlo do proprio controlo: se o novo tambem nao distinguisse, isto acusava"
c=$(novo 0 0); d=$(novo 0 13)
if [ "$c" != "$d" ]; then echo "  ok    o novo distingue"; else echo "  FALHA o novo nao distingue"; falhou=1; fi

exit $falhou

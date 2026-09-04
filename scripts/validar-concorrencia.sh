#!/usr/bin/env bash
#
# Concorrência provada em SEQUÊNCIA não prova nada.
#
# O aceite 1 do E13 diz «duas aberturas CONCORRENTES da mesma mesa produzem uma
# única sessão activa». Um teste que abre, **espera pela resposta**, e abre outra
# vez testa que o segundo pedido viu o primeiro já gravado — isso é sequência, e
# passa mesmo numa implementação que só faz `SELECT` antes do `INSERT`.
#
# E essa implementação é pior do que nenhuma: é uma corrida com a janela mais
# estreita, portanto passa a maior parte das vezes. Um defeito que falha em 1 de
# 50 arranques é mais caro do que um que falha sempre.
#
# Escrita a 04/09 com o E13 a arrancar e antes de existir a prova. O endereço
# público do E09 já tinha acertado nisto: *«não se consulta antes; duas pessoas a
# escolher no mesmo segundo leem ambas que está livre»*.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
pendentes=0
erro() { echo "  FALHA    $1"; falhas=$((falhas + 1)); }
ok()   { echo "  ok       $1"; }
pend() { echo "  PENDENTE $1"; pendentes=$((pendentes + 1)); }

# Vários nomes, porque adivinhar UM e falhar em silêncio quando chegar com outro
# e a familia de defeito que este projecto passou o dia a corrigir.
# A busca exige a palavra E o assunto. A primeira versao procurava so
# "concorrente" e apanhou tres ficheiros que a MENCIONAM de passagem - o teste do
# ambiente, o do catalogo e o do tema -, e acusou-os de nao provarem concorrencia
# que nunca prometeram. Uma guarda que acusa quem passa ao lado gasta o credito
# que precisa de ter quando acusar a serio.
FICHEIROS=$(git ls-files 'provas/*.ts' 'packages/*/src/*.test.ts' 2>/dev/null \
  | xargs grep -lE 'concorrent|simultân' 2>/dev/null \
  | xargs grep -lE 'mesa|sess[aã]o|floor|table' 2>/dev/null || true)

echo "1. Existe prova de concorrência?"
if [ -z "$FICHEIROS" ]; then
  pend "ainda não há prova de concorrência — o E13 é a primeira etapa que precisa dela"
  echo
  echo "  Nada medido: 0 falhas, 1 pendência declarada."
  exit 0
fi
ok "encontrada: $(echo "$FICHEIROS" | tr '\n' ' ')"

echo
echo "2. As duas chamadas partem juntas, ou uma espera pela outra?"
# `Promise.all`, `Promise.allSettled` ou dois `const p1 = f()` sem await sao
# despacho paralelo. Um `await` seguido de outro `await` no mesmo par nao e.
sem_paralelo=""
for f in $FICHEIROS; do
  if ! grep -qE 'Promise\.(all|allSettled)|\.map\([^)]*=>[^)]*\(\)\)' "$f"; then
    sem_paralelo="$sem_paralelo $f"
  fi
done
if [ -n "$sem_paralelo" ]; then
  erro "prova(s) de concorrência sem despacho paralelo:$sem_paralelo"
  echo '           Duas chamadas com await entre elas medem SEQUENCIA. Dispara as'
  echo '           duas sem esperar pela primeira - Promise.all ou equivalente.'
else
  ok "as provas de concorrência disparam em paralelo"
fi

echo
echo "3. A unicidade vem da BASE, e não de uma consulta prévia?"
# Um indice unico na migracao e a unica coisa que fecha a janela. Procura-se nas
# migracoes da etapa, e nao no codigo de aplicacao.
if git ls-files 'packages/db/prisma/migrations/*/migration.sql' 2>/dev/null \
   | xargs grep -liE 'CREATE UNIQUE INDEX.*(sess|mesa|floor|table)' >/dev/null 2>&1; then
  ok "há índice único na base para a sessão de mesa"
else
  erro "não achei índice único da sessão de mesa nas migrações"
  echo "           Sem ele, a unicidade vem de um SELECT antes do INSERT — uma corrida"
  echo "           com janela mais estreita, que passa a maior parte das vezes."
fi

echo
[ "$falhas" -eq 0 ] && [ "$pendentes" -eq 0 ] && echo "  A concorrência prova-se a sério: 0 falhas."
[ "$falhas" -gt 0 ] && echo "  $falhas FALHA(S)."
exit "$falhas"

#!/usr/bin/env bash
# Dinheiro em inteiros de unidade minima. Nunca virgula flutuante.
#
# `docs/architecture/dinheiro.md` exige isto desde o E00 e nada o verificava. Ha
# um comentario no packages/domain/src/dinheiro.ts que diz porque, e diz melhor do
# que eu diria: `parseFloat('8.07') * 100` da 806.9999999999999, e o Math.round
# disfarca-o ate ao valor onde deixa de disfarcar.
#
# Construida a 2026-09-03 com a arvore LIMPA, de proposito: uma guarda que nasce
# sobre codigo certo prova-se com um defeito plantado, em vez de ser calibrada
# contra os defeitos que ja la estao - que e como se acaba com uma guarda que so
# reconhece os erros de ontem.
#
# O E22 ao E24 - TPV, caixa, pagamentos, fiscal - vao encher o schema de campos de
# dinheiro. E la que isto paga.
set -uo pipefail
cd "$(dirname "$0")/.."

SCHEMA="packages/db/prisma/schema.prisma"
NOME_DINHEIRO="preco|Preco|valor|Valor|total|Total|montante|Montante|amount|Amount|price|Price|custo|Custo|troco|Troco|taxa|Taxa"
falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

echo "1. Campos de dinheiro no schema"
campos=$(grep -nE "^[[:space:]]+[a-zA-Z]*(${NOME_DINHEIRO})[a-zA-Z]*[[:space:]]+" "$SCHEMA" 2>/dev/null \
  | grep -vE "\[\]" || true)
n=$(printf '%s\n' "$campos" | grep -c . || true)
# Controlo negativo do leitor: sem campos, tudo "passa" e o verde e vacuo.
if [ "${n:-0}" -lt 2 ]; then
  erro "so vi ${n:-0} campos com cara de dinheiro - o leitor esta cego"
else
  ok "${n} campos com cara de dinheiro"
fi

maus=$(printf '%s\n' "$campos" | grep -E "[[:space:]](Float|Decimal|Real|Double)[[:space:]?]" || true)
if [ -n "$maus" ]; then
  erro "dinheiro em virgula flutuante no schema:"
  printf '%s\n' "$maus" | sed 's/^/          /'
else
  ok "nenhum Float, Decimal, Real ou Double num campo de dinheiro"
fi

echo
echo "2. parseFloat em codigo de produto"
# Tira comentarios antes de procurar: o dinheiro.ts MENCIONA parseFloat para
# explicar porque nao o usa, e uma guarda que nao distingue codigo de comentario
# obriga a uma lista de excepcoes que depois cresce.
# `inspeccao/` fica de fora com a razao dita, e nao por conveniencia: sao ajudas de
# Playwright que leem CSS - opacidade, tamanho de letra, largura de borda - e esses
# sao decimais a serio. Excluir uma pasta inteira e como as guardas ficam cegas, por
# isso a lista e curta e cada entrada tem motivo: testes, provas, e inspeccao.
achados=$(git ls-files '*.ts' '*.tsx' | grep -vE "\.test\.|^provas/|^inspeccao/" | while IFS= read -r f; do
  sed -E 's|//.*$||; s|^[[:space:]]*\*.*$||' "$f" | grep -nE "parseFloat" | sed "s|^|${f}:|"
done)
if [ -n "$achados" ]; then
  erro "parseFloat em codigo de produto:"
  printf '%s\n' "$achados" | head -5 | sed 's/^/          /'
else
  ok "nenhum parseFloat fora de comentarios e testes"
fi

echo
[ "$falhas" -eq 0 ] && echo "  Dinheiro em inteiros: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

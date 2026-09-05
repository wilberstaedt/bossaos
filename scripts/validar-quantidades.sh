#!/usr/bin/env bash
# Quantidades em inteiros de unidade minima. Nunca virgula flutuante.
#
# ── Porque e' que esta guarda existe ────────────────────────────────────────
#
# A regua do E25 disse-o por palavras: «a guarda do dinheiro cobre dinheiro; as
# quantidades precisam da mesma disciplina e ainda nao tem guarda».
#
# `0,1 + 0,2` nao e `0,3`, e tres gramas por prato viram um quilo por mes. O
# sintoma nao e um erro: e uma contagem que nao bate ao fim do mes.
#
# ── E porque e' que nao a meti na validar-dinheiro.sh ───────────────────────
#
# Porque as duas tem VOCABULARIOS diferentes e uma so lista tornaria as duas
# menos precisas. O dinheiro reconhece-se por `Menor`; a quantidade por `Mili`.
# Juntar as listas faria a guarda do dinheiro acusar gramas, e a das gramas
# acusar centimos — e uma guarda com falsos positivos gasta o credito depressa.
set -uo pipefail
cd "$(dirname "$0")/.."

SCHEMA="packages/db/prisma/schema.prisma"
falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

# ── O sufixo `Mili` e o reconhecedor, e e' ESTRUTURAL ──────────────────────
#
# A mesma licao que a guarda do dinheiro aprendeu no E22: uma lista de
# substantivos tem de crescer a cada etapa, e o que nao cresce fica invisivel em
# silencio. `Mili` diz a escala no proprio nome.
SUFIXO="[a-zA-Z]+Mili"
TIPOS_MAUS="[[:space:]](Float|Decimal|Real|Double)([[:space:]?]|$)"

echo "1. Campos de quantidade no schema"
campos=$(grep -nE "^[[:space:]]+${SUFIXO}[[:space:]]+" "$SCHEMA" 2>/dev/null | grep -vE "\[\]" || true)
n=$(printf '%s\n' "$campos" | grep -c . || true)
# Controlo do leitor: sem campos, tudo "passa" e o verde e' vacuo.
if [ "${n:-0}" -lt 2 ]; then
  erro "so vi ${n:-0} campos com cara de quantidade - o leitor esta cego"
else
  ok "${n} campos com cara de quantidade"
fi

maus=$(printf '%s\n' "$campos" | grep -E "$TIPOS_MAUS" || true)
if [ -n "$maus" ]; then
  erro "quantidade em virgula flutuante no schema:"
  printf '%s\n' "$maus" | sed 's/^/          /'
else
  ok "nenhum Float, Decimal, Real ou Double num campo de quantidade"
fi

echo
echo "2. Conversoes para virgula flutuante sobre nome de quantidade"
# `Number(x)` sobre um nome que declara milesimos e' exacto — o valor e' inteiro
# por construcao. O que se procura e' `parseFloat`, que nunca e' exacto, e
# divisoes escritas a mao sobre esses nomes.
achados=$(git ls-files '*.ts' '*.tsx' | grep -vE "\.test\.|^provas/|^inspeccao/" \
  | xargs python3 scripts/sem-comentarios.py 2>/dev/null \
  | grep -E "parseFloat\s*\(\s*[A-Za-z_$.]*[a-zA-Z]Mili" || true)
if [ -n "$achados" ]; then
  erro "parseFloat sobre nome de quantidade:"
  printf '%s\n' "$achados" | head -5 | sed 's/^/          /'
else
  ok "nenhum parseFloat sobre nome de quantidade"
fi

# ── O controlo negativo, nas duas direccoes ────────────────────────────────
#
# Uma guarda que so mostra verde sobre codigo limpo nao mostra nada. E uma que
# so mostra que acusa podia estar a acusar tudo.
echo
SONDA="$(mktemp -d)"; trap 'rm -rf "$SONDA"' EXIT
ve_schema() {
  printf 'model Sonda {\n%s\n}\n' "$1" > "$SONDA/schema.prisma"
  grep -nE "^[[:space:]]+${SUFIXO}[[:space:]]+" "$SONDA/schema.prisma" \
    | grep -vE "\[\]" | grep -qE "$TIPOS_MAUS"
}
c=0
for mau in '  quantidadeMili Float' '  saldoMili Decimal @map("s")' '  rendeMili Float?'; do
  ve_schema "$mau" || { echo "  FALHA controlo: schema deixou passar$mau"; c=1; }
done
for bom in '  quantidadeMili BigInt' '  pesoEmGramas Decimal' '  saldoMili Int'; do
  ve_schema "$bom" && { echo "  FALHA controlo: schema acusou$bom, que e legitimo"; c=1; }
done
if [ "$c" -eq 0 ]; then
  ok "controlo negativo: apanha as tres quantidades em virgula flutuante e nao acusa as tres legitimas"
else
  falhas=$((falhas+1))
fi

echo
[ "$falhas" -eq 0 ] && echo "  Quantidades em inteiros: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

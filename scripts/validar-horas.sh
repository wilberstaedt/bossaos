#!/usr/bin/env bash
# As horas sao MINUTOS INTEIROS. Nunca floats de horas.
#
# ── Porque e' que esta guarda e' separada das outras duas ─────────────────
#
# Ha' tres dimensoes neste produto e cada uma tem a sua unidade minima: o
# dinheiro em `Menor`, as quantidades em `Mili`, e o tempo de trabalho em
# `Minutos`. Junta-las numa guarda so' daria uma expressao que ninguem consegue
# afinar sem partir as outras duas — foi a decisao do E25 e mantem-se.
#
# O que isto impede tem nome: uma jornada de 8,116666666666667 horas. No
# dinheiro a virgula flutuante rouba centimos; aqui rouba MINUTOS DE TRABALHO de
# uma pessoa, e a pessoa so' da' por isso no recibo.
set -uo pipefail
cd "$(dirname "$0")/.."

SCHEMA=packages/db/prisma/schema.prisma
falhas=0
ok()       { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

SUFIXO="[a-zA-Z]+Minutos"
TIPOS_MAUS="[[:space:]](Float|Decimal|Real|Double)([[:space:]?]|$)"

echo "1. Os campos de tempo no schema sao inteiros?"
campos=$(grep -nE "^[[:space:]]+${SUFIXO}[[:space:]]+" "$SCHEMA" 2>/dev/null | grep -vE "\[\]" || true)
n=$(printf '%s\n' "$campos" | grep -c . || true)
if [ "$n" -lt 2 ]; then
  # Controlo do proprio leitor: zero campos e' cegueira, nao e' limpeza.
  vermelho "so' encontrei $n campos com sufixo Minutos — o leitor esta cego"
else
  maus=$(printf '%s\n' "$campos" | grep -E "$TIPOS_MAUS" || true)
  if [ -n "$maus" ]; then
    vermelho "campos de tempo em virgula flutuante:"; printf '%s\n' "$maus"
  else
    ok "$n campos com sufixo Minutos, todos inteiros"
  fi
fi

echo
echo "2. Alguem converte tempo com parseFloat?"
achados=$(git ls-files '*.ts' '*.tsx' | grep -vE "\.test\.|^provas/|^inspeccao/|^scripts/" \
  | xargs grep -nE "parseFloat\s*\(\s*[A-Za-z_$.]*[a-zA-Z]Minutos" 2>/dev/null || true)
if [ -n "$achados" ]; then
  vermelho "conversao de tempo com parseFloat:"; printf '%s\n' "$achados"
else
  ok "nenhuma conversao de tempo em virgula flutuante"
fi

echo
echo "3. Alguem guarda HORAS em vez de minutos?"
# `horas` como nome de campo no schema e' o sintoma directo do defeito.
horas=$(grep -nE "^[[:space:]]+[a-zA-Z]*[Hh]oras[[:space:]]+(Float|Decimal|Real|Double)" "$SCHEMA" || true)
if [ -n "$horas" ]; then
  vermelho "ha' campos de HORAS em virgula flutuante:"; printf '%s\n' "$horas"
else
  ok "nenhum campo de horas em virgula flutuante"
fi

echo
echo "4. Controlo negativo: a guarda apanha o que diz apanhar?"
SONDA=$(mktemp -d)
cp "$SCHEMA" "$SONDA/schema.prisma"
cat >> "$SONDA/schema.prisma" <<'FIM'
model SondaDoTempo {
  id             String @id
  jornadaMinutos Float
  pausaMinutos   Decimal
  extraMinutos   Int
}
FIM
apanhou=$(grep -nE "^[[:space:]]+${SUFIXO}[[:space:]]+" "$SONDA/schema.prisma" \
  | grep -vE "\[\]" | grep -cE "$TIPOS_MAUS" || true)
legitimos=$(grep -nE "^[[:space:]]+${SUFIXO}[[:space:]]+Int" "$SONDA/schema.prisma" | grep -c . || true)
rm -rf "$SONDA"
if [ "$apanhou" -eq 2 ] && [ "$legitimos" -ge 3 ]; then
  ok "controlo negativo: apanha os dois plantados e nao acusa os inteiros"
else
  vermelho "o controlo negativo nao mediu: apanhou $apanhou de 2, legitimos $legitimos"
fi

echo
if [ "$falhas" -eq 0 ]; then printf '  \033[32mTempo em minutos inteiros: 0 falhas.\033[0m\n'; exit 0; fi
printf '  \033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

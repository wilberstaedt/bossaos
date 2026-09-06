#!/usr/bin/env bash
# Nada de fabricado pode chegar a uma experiencia real.
#
# Aceite 4 do E34: "ausencia de dados ficticios em experiencias reais". Isto
# mede-o em vez de o afirmar.
#
# DUAS ARMADILHAS APANHADAS AO ESCREVER ISTO, e as duas ficam aqui porque a
# segunda quase me fez inventar um achado:
#
#   1. Procurei "lorem" sem distincao de maiusculas e deu DOZE ficheiros. Nenhum
#      tem Lorem Ipsum: `valorEm` contem "lorEm". Por isso o padrao aqui exige
#      "lorem ipsum" COM O ESPACO - o espaco e o que separa o texto de encher do
#      identificador legitimo. Foi a terceira substring a passar-se por facto no
#      mesmo dia (a outra foi `publico.spec.ts` dentro de `crm-publico.spec.ts`).
#
#   2. Procurei arrays literais com `= \[\s*\{` e deu ZERO. O `git grep` casa
#      LINHA A LINHA, e um array literal escreve-se com o `{` na linha seguinte.
#      O zero vinha da fronteira de linha, nao do codigo. Nao se guarda aqui
#      porque array literal nao e defeito - navegacao e matriz de planos sao
#      literais legitimos - mas fica o aviso para quem quiser medir isso.
#
# O QUE ISTO PROIBE: dominios de fantasia (@*.example) e texto de encher, em
# codigo que EMBARCA. Comentarios nao contam: `packages/domain/src/plataforma.ts`
# explica em prosa a diferenca entre uma pessoa e um endereco de equipa, e isso e
# documentacao, nao dado.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
naomedi() { echo "  NAO MEDI $1"; exit 2; }

# ── O detector, isolado para que os controlos o possam exercitar ─────────────
#
# Salta linhas cujo inicio e comentario. Nao e um parser de TypeScript e nao
# tenta ser: linha que comeca por // ou * e prosa, e a prosa fica de fora.
detectar_em() { # $1 ficheiro; imprime "linha:texto" por cada ocorrencia
  grep -nE "@[a-z][a-z0-9]*\.example|[Ll]orem [Ii]psum" "$1" 2>/dev/null \
    | grep -vE "^[0-9]+: *(//|\*|/\*)"
}

# ── CONTROLOS, antes de medir ───────────────────────────────────────────────
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

printf 'const a = "ana@fake.example";\nconst b = "Lorem ipsum dolor sit";\n' > "$tmp/deve-acender.ts"
n=$(detectar_em "$tmp/deve-acender.ts" | wc -l | tr -d ' ')
if [ "$n" -eq 2 ]; then echo "  ok    controlo positivo: apanha o dominio de fantasia E o texto de encher"
else naomedi "o controlo POSITIVO deu $n de 2 - o detector nao ve o que tem de ver"; fi

printf 'const valorEm = hoje;\n// suporte@bossa.example nao e ninguem\n * ana@suporte.example e uma pessoa\n' > "$tmp/nao-pode-acender.ts"
n=$(detectar_em "$tmp/nao-pode-acender.ts" | wc -l | tr -d ' ')
if [ "$n" -eq 0 ]; then echo "  ok    controlo negativo: valorEm nao e lorem, e comentario nao e dado"
else naomedi "o controlo NEGATIVO acendeu $n vezes - o detector confunde substring com facto, ou le comentarios como dados"; fi

# ── O que embarca ───────────────────────────────────────────────────────────
lista=$(git ls-files 'apps/web/app/*' 'apps/web/src/*' 'apps/api/src/*' 'apps/worker/src/*' 'packages/*/src/*' \
        | grep -E '\.(ts|tsx)$' | grep -vE '\.(test|spec)\.tsx?$')
total=$(printf '%s\n' "$lista" | grep -c . || true)
[ "$total" -gt 100 ] || naomedi "so $total ficheiros a embarcar - o pathspec nao esta a alcancar o codigo"
echo "  ok    $total ficheiros que embarcam, alcancados"

echo "codigo que embarca:"
achados=0
for f in $lista; do
  saida=$(detectar_em "$f")
  if [ -n "$saida" ]; then
    printf '%s\n' "$saida" | while IFS= read -r l; do echo "  FALHA $f:$l"; done
    achados=$((achados+1))
  fi
done
# O subshell do `while` nao propaga o contador; reconto fora dele.
achados=$(for f in $lista; do detectar_em "$f"; done | grep -c . || true)
[ "$achados" -gt 0 ] && falhas=$((falhas+achados))

if [ "$falhas" -gt 0 ]; then echo "FALHOU: $falhas"; exit 1; fi
echo "  ok    nenhum dominio de fantasia nem texto de encher"
echo "OK"

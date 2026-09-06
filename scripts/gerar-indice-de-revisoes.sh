#!/usr/bin/env bash
#
# O indice dos documentos de revisao — GERADO, nunca escrito a mao.
#
# Existe por causa de 06/09 as 12h10. Passei varios ticks a redescobrir uma
# taxonomia que eu proprio tinha escrito as 02h29 no `E34-ALCANCE-TOTAL.md`.
# Nao a esqueci: nunca abri o ficheiro. Estava a trabalhar no `E34.md` e o outro
# nao aparecia em lado nenhum.
#
# Sao 79 documentos e catorze estao fora do padrao `E##.md`/`ALVO-E##.md`. Um
# indice escrito a mao teria o mesmo defeito das listas que este projecto passou
# a noite a apanhar: envelhece no dia em que alguem acrescenta um ficheiro.
set -uo pipefail
cd "$(dirname "$0")/.."
D=docs/reviews
S=$D/INDICE.md

{
  echo "# Índice das revisões — GERADO, não editar"
  echo
  echo "> \`bash scripts/gerar-indice-de-revisoes.sh\`. Escrever aqui à mão é"
  echo "> perder o trabalho na próxima corrida — e reintroduzir a lista que"
  echo "> envelhece, que é o defeito que este ficheiro existe para não ter."
  echo
  echo "## Fora do padrão \`E##.md\` / \`ALVO-E##.md\`"
  echo
  echo "**São estes que se perdem.** Um documento chamado \`E34.md\` encontra-se"
  echo "sozinho; um chamado \`E34-ALCANCE-TOTAL.md\` só se encontra se alguém"
  echo "souber que existe."
  echo
  echo "| documento | linhas | primeira linha |"
  echo "| --- | ---: | --- |"
  for f in "$D"/*.md; do
    n=$(basename "$f")
    case "$n" in
      INDICE.md) continue ;;
      ALVO-E[0-9][0-9].md|E[0-9][0-9].md) continue ;;
    esac
    l=$(wc -l < "$f" | tr -d ' ')
    t=$(grep -m1 -E '^# ' "$f" | sed 's/^# //' | cut -c1-84)
    printf '| [`%s`](%s) | %s | %s |\n' "$n" "$n" "$l" "${t:-—}"
  done
  echo
  echo "## No padrão"
  echo
  for f in "$D"/E[0-9][0-9].md; do
    [ -f "$f" ] || continue
    n=$(basename "$f")
    printf -- '- [`%s`](%s) — %s\n' "$n" "$n" "$(grep -m1 -E '^# ' "$f" | sed 's/^# //' | cut -c1-70)"
  done
  echo
  echo "## Réguas (escritas ANTES da entrega)"
  echo
  printf '%s\n' "$(ls "$D"/ALVO-E[0-9][0-9].md 2>/dev/null | xargs -n1 basename | tr '\n' ' ')"
} > "$S"

echo "  $S: $(grep -c '^| \[' "$S" 2>/dev/null || echo 0) fora do padrão, $(grep -c '^- \[' "$S") no padrão"

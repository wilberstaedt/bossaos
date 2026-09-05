#!/usr/bin/env bash
# Diz QUAIS provas correm em que trabalho da CI — derivando a categoria do
# CONTEÚDO do ficheiro, nunca do nome.
#
# Nasceu a 05/09 de um erro que quase cometi. Ia classificar pelo sufixo
# `-no-navegador.sh`, que parecia uma convenção sólida: dezasseis provas o usam.
# Mas QUATRO usam Playwright sem o sufixo — provar-alvos-e-matriz,
# provar-isolamento-no-produto, provar-marco-e11 e provar-portas. Pelo nome, as
# quatro iriam para um trabalho sem navegador instalado e falhariam por falta de
# ambiente, não por defeito de produto. É a mesma armadilha do dia inteiro: a
# categoria estava AFIRMADA no nome em vez de DERIVADA do que o ficheiro faz.
#
# Os `provar-marco-*` ficam de fora: são agregadores que chamam outras provas, e
# corrê-los aqui repete o trabalho. Ficam a precisar de decisão explícita na CI,
# e a validar-provas-na-ci cobra-a.
set -euo pipefail
cd "$(dirname "$0")/.."

categoria="${1:-}"
case "$categoria" in
  navegador|app|base) ;;
  *) echo "uso: $0 <navegador|app|base>" >&2; exit 2 ;;
esac

# O que faz uma prova precisar de navegador. Lê-se o ficheiro; um nome não prova
# nada sobre o que ele executa.
PADRAO_NAVEGADOR='playwright|chromium|inspeccionar|PORTA_INSPECCAO'
# E o que faz uma prova precisar da APLICACAO DE PE, que nao e o mesmo que
# precisar de navegador: bate num endereco HTTP do proprio produto. Cinco caem
# aqui, e QUATRO delas ja estavam listadas a mao nos trabalhos que levantam a
# aplicacao — a derivacao por conteudo concorda com o que a CI ja fazia a mao,
# que e a melhor confirmacao de que a regra le a coisa certa.
PADRAO_APP='localhost:3|127\.0\.0\.1:3|pnpm +dev|arrancar|next start|curl .*http'

achadas=0
for s in scripts/provar-*.sh; do
  [ -x "$s" ] || continue
  nome=$(basename "$s")
  [ "$nome" = "provar-tudo.sh" ] && continue
  case "$nome" in provar-marco-*) continue ;; esac
  if grep -qiE "$PADRAO_NAVEGADOR" "$s"; then esta=navegador
  elif grep -qiE "$PADRAO_APP" "$s"; then esta=app
  else esta=base; fi
  if [ "$esta" = "$categoria" ]; then echo "$s"; achadas=$((achadas+1)); fi
done

# Guarda do próprio corredor: uma lista vazia sai a zero e o `for` de quem chama
# corre zero vezes em silêncio — verde sobre população vazia, que é a forma de
# verde que mais me enganou este mês.
if [ "$achadas" -eq 0 ]; then
  echo "NENHUMA prova na categoria '$categoria' — o glob não casou nada." >&2
  exit 3
fi

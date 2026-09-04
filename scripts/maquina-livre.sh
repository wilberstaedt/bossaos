#!/usr/bin/env bash
# Ha outra suite de navegador a correr nesta maquina?
#
# ── PORQUE ISTO EXISTE ───────────────────────────────────────────────────────
#
# Separamos o porto, a base de dados e a arvore entre quem escreve e quem reve.
# Nenhuma dessas separacoes resolve a quarta: **o CPU e' um so**. A 04/09 corri a
# prova das 23 telas do E15 enquanto o JR corria a dele, e tres casos falharam -
# todos a ~11,7s, que e' tempo esgotado e nao assercao. Sozinha, a mesma prova
# deu 16 verdes. Estive a um passo de reportar um defeito que nao existia.
#
# Duas suites de navegador ao mesmo tempo num Mac de 16 GB nao medem o produto:
# medem quem chegou primeiro ao processador.
#
# Nao bloqueia: avisa. Medir a meio continua legitimo; concluir e' que nao.
set -uo pipefail

outros=$(ps -eo pid,etime,command | grep -iE "playwright|next start" | grep -v grep | grep -v "$$" || true)

if [ -z "$outros" ]; then
  echo "  maquina livre: nenhuma suite de navegador a correr"
  exit 0
fi

echo "  ATENCAO: ja ha navegador a correr nesta maquina"
echo "$outros" | awk '{printf "    ha %s  %s\n", $2, substr($0, index($0,$3), 70)}'
echo
echo "  Um vermelho medido agora pode ser tempo esgotado por disputa de CPU,"
echo "  nao um defeito. Espera que acabe, ou nao concluas nada do que vier."
exit 1

#!/usr/bin/env bash
# Corre TODAS as guardas e TODAS as provas, e diz o que correu.
#
# Existe por dois motivos, e o segundo e o que interessa.
#
# 1. Eu fazia isto a mao, com um for-loop escrito de novo em cada revisao. Um
#    ritual reescrito de cada vez e um ritual que um dia sai diferente.
# 2. Os prompts de retoma - RETOMAR-JR.md e RETOMAR-SENIOR.md - listavam os
#    scripts A MAO. A 2026-09-03 as 21h40 fui verificar: scripts/ tinha 24
#    ficheiros e o RETOMAR-JR listava 6. Derivou em seis horas. E um documento de
#    emergencia so e lido na emergencia, que e o pior momento para descobrir que
#    esta desactualizado.
#
# DESCOBRE em vez de listar. Acrescentar um `provar-*.sh` ou um `validar-*.sh`
# passa a bastar - nao ha lista para actualizar, e por isso nao ha lista para
# esquecer.
set -uo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] && { set -a; . ./.env; set +a; }

# AVISO DE ARVORE SUJA. A 2026-09-03 as 15h15 escrevi no protocolo que medir uma
# arvore que outro esta a escrever nao e medicao - um teste deu vermelho e verde em
# trinta segundos sem eu tocar em nada. As 23h15 repeti o erro: corri isto com sete
# ficheiros do JR a meio, o build nao compilou de um estado parcial, e eu fui
# investigar uma "falha" que era so o relogio.
#
# Escrever a licao nao me impediu de a repetir. Um aviso no proprio comando talvez
# impeca - e nao BLOQUEIA, porque medir a meio e legitimo para orientar; o que nao
# e legitimo e concluir a partir disso.
sujos=$(git status --porcelain 2>/dev/null | grep -c . || true)
if [ "${sujos:-0}" -gt 0 ]; then
  echo "AVISO: ${sujos} ficheiro(s) por versionar."
  echo "  Se for outro agente a escrever, isto ORIENTA mas nao CONCLUI - um vermelho"
  echo "  pode ser o relogio e um verde pode nao valer nada. A medicao que conta e a"
  echo "  de depois da declaracao, com a arvore parada."
  echo
fi

falhados=""
n=0
echo "GUARDAS (rapidas, sem base)"
for s in scripts/validar-*.sh; do
  [ -x "$s" ] || continue
  n=$((n+1)); nome=$(basename "$s")
  if "$s" >/dev/null 2>&1; then printf "  ok    %s\n" "$nome"
  else printf "  FALHA %s\n" "$nome"; falhados="$falhados $nome"; fi
done

echo
echo "PROVAS (base, browser, ponta a ponta)"
for s in scripts/provar-*.sh; do
  [ -x "$s" ] || continue
  [ "$(basename "$s")" = "provar-tudo.sh" ] && continue
  n=$((n+1)); nome=$(basename "$s")
  if "$s" >/dev/null 2>&1; then printf "  ok    %s\n" "$nome"
  else printf "  FALHA %s\n" "$nome"; falhados="$falhados $nome"; fi
done

echo
# Controlo negativo do proprio leitor: se descobrir poucos, nao esta a descobrir.
if [ "$n" -lt 10 ]; then
  echo "  FALHA so encontrei $n scripts - o descobridor esta cego"
  exit 1
fi
echo "  $n scripts corridos"

if [ -n "$falhados" ]; then
  echo "  FALHARAM:$falhados"
  echo
  echo "  Correr o que falhou a mao para ver a saida inteira."
  exit 1
fi
echo "  Todos verdes."

#!/usr/bin/env bash
# Nenhuma etapa comeca antes de a anterior estar validada.
#
# NAO e um detector de culpa: e um detector de ESTADO. Nasceu a 2026-09-03, quando o commit `adde253` comecou o E05
# - com implementacao a serio - enquanto o E04 estava em "aguardando validacao", o
# E05 estava "planejado" na matriz e nao existia E05.md. A minha devolucao dizia
# "voltar a declarar; revejo outra vez".
#
# O CT-16 proibe as duas coisas: "nao avance automaticamente" e "nao executar
# etapas dependentes sobre bases reprovadas".
#
# Duas consequencias reais, e nenhuma e disciplina por disciplina:
#   1. a revisao deixa de poder medir a arvore, porque passa a ter codigo nao
#      revisto misturado com o que se esta a validar;
#   2. se a etapa em revisao for REPROVADA, o que se construiu por cima assenta
#      numa base reprovada.
#
# Porque e que a regra nao chegou: estava em prosa, no prompt de retoma e na minha
# mensagem. O contexto do JR reiniciou e a prosa foi-se. Uma verificacao nao se vai.
set -uo pipefail
cd "$(dirname "$0")/.."

MATRIZ="docs/progress/ETAPAS.md"
falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

# A etapa autorizada e a primeira nao validada, saltando o E00 (que so se valida
# no E11, por desenho). Mesma derivacao do scripts/estado.sh.
total=$(grep -cE '^\| E[0-9]{2} \| ' "$MATRIZ" 2>/dev/null || true)
if [ "${total:-0}" -lt 30 ]; then
  erro "li ${total:-0} etapas em $MATRIZ - o leitor esta cego"
  echo; echo "  $falhas FALHA(S)."; exit "$falhas"
fi
ok "$total etapas na matriz"

atual=$(grep -E '^\| E[0-9]{2} \| ' "$MATRIZ" | grep -v '^| E00 ' | grep -v '| validado |' \
  | head -1 | awk -F'|' '{print $2}' | tr -d ' ')
if [ -z "${atual:-}" ]; then
  erro "nao consegui derivar a etapa autorizada"
  echo; echo "  $falhas FALHA(S)."; exit "$falhas"
fi
n_atual=$(echo "$atual" | tr -dc '0-9')
ok "etapa autorizada: $atual"

# Commits de etapa usam o prefixo "E##:" por convencao. Olha aos ultimos 40.
#
# PONTO CEGO, dito em voz alta a 2026-09-03: isto depende do PREFIXO EXACTO. O
# commit d270b18 chama-se "E07 PARADO: o motor de alergenos" - e trabalho de E07
# a serio, e esta guarda NAO o apanhou, porque "E07 PARADO:" nao casa com "E07:".
# Deu a resposta certa (aquele commit era o JR a parar como eu pedi, nao a avancar)
# mas deu-a pelo motivo errado. Nao aperto o padrao porque apanhar os commits de
# paragem limpa seria um falso positivo pior do que o buraco - mas quem confiar
# nesta guarda tem de saber que ela le uma convencao, nao le codigo.
echo
adiantados=$(git log -40 --format='%h %s' 2>/dev/null \
  | grep -E '^[0-9a-f]+ E[0-9]{2}:' \
  | while read -r sha resto; do
      n=$(echo "$resto" | sed -E 's/^E([0-9]{2}):.*/\1/')
      [ "$((10#$n))" -gt "$((10#$n_atual))" ] && echo "$sha E$n"
    done)

if [ -n "$adiantados" ]; then
  erro "ha commits de etapas a frente da autorizada ($atual):"
  echo "$adiantados" | sed 's/^/          /'
  echo "        Nao desfazer: o trabalho fica e entra na revisao da etapa certa."
  echo "        Se o revisor estiver indisponivel, a saida certa nao e parar nem"
  echo "        avancar por cima: e trabalho que NAO dependa da etapa em revisao."
else
  ok "nenhum commit a frente de $atual"
fi

echo
[ "$falhas" -eq 0 ] && echo "  Ordem respeitada: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

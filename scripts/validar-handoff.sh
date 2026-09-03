#!/usr/bin/env bash
#
# O handoff é o único fio quando uma sessão morre — e por três vezes em dois dias
# esteve errado exactamente no momento em que era preciso. A causa é estrutural e
# não é falta de cuidado: quem o escreve não o lê no dia a dia, por isso o erro
# instala-se e ninguém tropeça nele até à emergência.
#
# O invariante é simples: a etapa que o handoff diz ser a actual tem de ser a que
# o medidor calcula a partir da matriz. Quando se valida uma etapa, o ATUAL anda
# — e é nesse instante que o handoff fica velho.
set -euo pipefail
cd "$(dirname "$0")/.."

HANDOFF=docs/progress/HANDOFF.md
falhas=0
ok()   { echo "  ok    $1"; }
erro() { echo "  FALHA $1"; falhas=$((falhas + 1)); }

# A etapa que o handoff declara, lida do mesmo modo em que está escrita.
etapa_do_handoff() {
  grep -m1 -oE '\*\*Etapa atual:\*\*[[:space:]]*E[0-9]{2}' "${1:-$HANDOFF}" \
    | grep -oE 'E[0-9]{2}' || true
}

echo "1. O handoff aponta para a etapa que o medidor calcula"
ATUAL=$(bash scripts/estado.sh | tr ' ' '\n' | grep '^ATUAL=' | cut -d= -f2)
DIZ=$(etapa_do_handoff)

if [ -z "$DIZ" ]; then
  erro "o handoff nao declara 'Etapa atual: E##' de forma legivel"
elif [ "$DIZ" != "$ATUAL" ]; then
  erro "o handoff diz $DIZ e o medidor diz $ATUAL - uma sessao nova repetiria ou pararia"
else
  ok "handoff e medidor concordam em $ATUAL"
fi

# ── controlo negativo ────────────────────────────────────────────────────────
# Com o handoff a apontar para outra etapa, esta guarda TEM de acusar. Sem isto
# seria mais um documento a dizer que está tudo bem.
SONDA="$(mktemp -d)"; trap 'rm -rf "$SONDA"' EXIT
# Substitui-se o que o handoff DIZ, nao o que o medidor calcula. A primeira
# versao trocava $ATUAL, e quando o handoff ja estava errado o $ATUAL nao estava
# la para ser trocado: a sonda saia intacta e o controlo acusava o leitor de nao
# ler, quando o leitor estava bom. Um controlo que grita sem motivo gasta o
# credito de que a guarda vive.
OUTRA=$([ "$DIZ" = "E01" ] && echo "E02" || echo "E01")
sed "s/\*\*Etapa atual:\*\*[[:space:]]*$DIZ/**Etapa atual:** $OUTRA/" "$HANDOFF" > "$SONDA/h.md"
if [ "$(etapa_do_handoff "$SONDA/h.md")" = "$DIZ" ]; then
  erro "CONTROLO NEGATIVO: a sonda nao mudou nada - o leitor nao esta a ler"
elif [ "$(etapa_do_handoff "$SONDA/h.md")" != "$OUTRA" ]; then
  erro "CONTROLO NEGATIVO: o leitor nao viu a etapa trocada"
else
  ok "controlo negativo: com a etapa trocada, o leitor ve a diferenca"
fi

echo
[ "$falhas" -eq 0 ] && echo "  O fio da retoma esta direito: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

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

echo
echo "2. O prompt de retoma nao mente sobre a divida de movel"
# A quinta vez que um documento so lido na emergencia estava errado quando era
# preciso. A 04/09 o RETOMAR-JR dizia "77 estao assinadas sem essa prova" com a
# divida ja VAZIA - um sucessor herdava trabalho que nao existe.
#
# O invariante e crisp e cobre a deriva exacta que aconteceu: se a divida esta
# vazia, o documento tem de o dizer; se tem itens, nao pode dizer que esta vazia.
# `grep -c` imprime 0 E sai com codigo 1 quando nao acha, portanto um `|| echo 0`
# aqui produz DOIS zeros e a comparacao numerica rebenta. Ja me apanhou no
# estado.sh a 03/09 e voltou a apanhar-me aqui.
DIVIDA_ITENS=$(grep -cE '^[A-Z]{2,8}-[0-9]{3}$' docs/progress/DIVIDA-MOVEL.txt 2>/dev/null || true)
DIZ_VAZIA=$(grep -ciE 'divida esta VAZIA|dívida está VAZIA' docs/progress/RETOMAR-JR.md 2>/dev/null || true)
DIVIDA_ITENS=${DIVIDA_ITENS:-0}
DIZ_VAZIA=${DIZ_VAZIA:-0}
if [ "${DIVIDA_ITENS:-0}" -eq 0 ] && [ "${DIZ_VAZIA:-0}" -eq 0 ]; then
  erro "a divida de movel esta vazia e o RETOMAR-JR nao o diz — um sucessor herda trabalho que nao existe"
elif [ "${DIVIDA_ITENS:-0}" -gt 0 ] && [ "${DIZ_VAZIA:-0}" -gt 0 ]; then
  erro "o RETOMAR-JR diz que a divida esta vazia e ela tem $DIVIDA_ITENS itens"
else
  ok "o prompt de retoma bate com a divida real ($DIVIDA_ITENS itens)"
fi

echo
echo "3. Declarar e convidar a rever — e nao se revê arvore suja"
# ── Numa arvore ligada esta pergunta e feita a arvore ERRADA ───────────────
#
# Uma arvore criada por `git worktree` a partir de um commit e limpa por
# construcao: perguntar-lhe se a bancada tem trabalho por commitar nao mede a
# bancada, mede a definicao de arvore nova. E foi pior do que inutil a 06/09 -
# o `validar-no-commit.sh` liga os `node_modules` por symlink, o `.gitignore`
# diz `node_modules/` COM BARRA (que so casa directorios) e os links apareceram
# como doze ficheiros por commitar. A guarda acusou o instrumento que a chamava.
#
# Declara-se, como o `validar-ci-verde` faz dentro da CI. Ha tres respostas.
if [ "$(git rev-parse --git-dir 2>/dev/null)" != "$(git rev-parse --git-common-dir 2>/dev/null)" ]; then
  echo "  NAO MEDI  numa arvore ligada — limpa por construcao; esta pergunta e para a bancada"
  echo
  echo "  Nada medido aqui: 0 falhas, 1 declaracao."
  exit 0
fi
# Nasceu de agora, 04/09: o handoff dizia "implementado, aguardando validacao" com
# 47 ficheiros por commitar. Uma declaracao e um convite ao revisor, e rever uma
# arvore a meio mede um estado que ninguem vai entregar - ja me custou duas
# corridas hoje, e a segunda vez foi depois de eu ter escrito a regra.
#
# So morde LOCALMENTE: na CI a arvore e sempre limpa e isto passa por construcao.
# Digo-o em vez de fingir que cobre os dois sitios.
# Dentro da CI NAO se pergunta, e agora e a codigo e nao so em comentario.
#
# Eu tinha escrito "so morde localmente" e nao o implementei: a CI reprovou com
# "1 ficheiro por commitar", porque o checkout tem sempre uma normalizacao de fim
# de linha - o mesmo ruido do COBERTURA_TELAS.csv que ja me tinha mordido hoje.
# Uma guarda que falha por ruido de ambiente ensina a ignorar a guarda.
#
# E o invariante e mesmo local: e sobre alguem declarar ANTES de commitar, o que
# so acontece na maquina de quem declara.
if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  ok "dentro da CI a arvore e do checkout — esta verificacao e para quem declara"
# So a PRIMEIRA linha de Estado conta: e a declaracao corrente. As outras vivem
# na seccao de pendencia externa e sao registos historicos - a guarda lia-as e
# nunca mais poderia ficar verde, que e o ruido que ela propria avisa acima que
# ensina a ignora-la. Estreitada a 05/09, com controlo negativo por baixo.
elif [ "$(grep -iE '^\*\*Estado:\*\*' docs/progress/HANDOFF.md 2>/dev/null | head -1 | grep -ciE 'aguardando valida' || true)" != "0" ]; then
  sujos=$(git status --porcelain 2>/dev/null | grep -cvE 'capturas/|\.png$' || true)
  sujos=${sujos:-0}
  if [ "$sujos" -gt 0 ]; then
    erro "o handoff declara 'aguardando validacao' com $sujos ficheiro(s) por commitar"
    echo "        O revisor nao pode medir o que ainda esta a mudar. Commita antes de declarar."
  else
    ok "declarado com a arvore limpa — da para rever"
  fi
else
  ok "o handoff nao esta em estado de espera; nada a exigir da arvore"
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

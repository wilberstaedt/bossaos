#!/usr/bin/env bash
#
# Nao se assina uma etapa com a CI vermelha.
#
# Escrita a 04/09, uma hora depois de eu ter feito exactamente isso. Validei o
# E12 com 21 casos verdes NESTA maquina; a CI reprovava-o havia tres corridas,
# sempre na mesma frase. Tive de retirar a assinatura.
#
# Um verde que so existe numa maquina nao e uma medicao: e a versao mais cara do
# "na minha maquina funciona", porque vem com assinatura. E eu ja tinha escrito
# esta noite que uma guarda vermelha durante horas ensina a ignorar o vermelho -
# e depois fui eu a ignora-lo.
#
# Prometer olhar falhou duas vezes. Isto olha.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
erro() { echo "  FALHA    $1"; falhas=$((falhas + 1)); }
ok()   { echo "  ok       $1"; }
pend() { echo "  PENDENTE $1"; }

echo "1. A CI do que esta empurrado esta verde?"

# Dentro da propria CI isto nao se pergunta - a corrida ainda esta a decorrer e
# perguntar-lhe por si propria e uma cobra a morder a cauda. Declara-se e sai.
if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  pend "a correr DENTRO da CI — nao me pergunto a mim proprio"
  echo
  echo "  Nada medido aqui: esta verificacao e para a maquina de quem assina."
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  pend "sem o 'gh' instalado — nao consigo ver a CI, e nao invento o estado dela"
  echo
  echo "  NAO MEDI. Isto e diferente de verde: quem assinar tem de ver o semaforo."
  exit 0
fi

# ── Antes de ler o semaforo: ele cobre o que eu tenho? ──────────────────────
#
# A 04/09 li a CI vermelha durante tres ticks e a correccao ja existia - estava
# COMMITADA e por empurrar. O semaforo falava de um passado que ja nao era o
# presente, e eu tratava a leitura como actual.
#
# Um verde que nao inclui o meu trabalho nao me diz nada sobre ele; um vermelho
# tambem nao. As duas leituras sao NAO MEDI enquanto houver commits por empurrar.
a_frente=$(git rev-list --count '@{upstream}..HEAD' 2>/dev/null || true)
a_frente=${a_frente:-0}
if [ "$a_frente" -gt 0 ] 2>/dev/null; then
  pend "ha $a_frente commit(s) por empurrar — o semaforo nao os viu"
  echo "           Empurra antes de o ler: a corrida que existe fala de outro codigo."
  echo
  echo "  NAO MEDI o que interessa."
  exit 0
fi

# A corrida mais recente do ramo. Nao filtro pelo SHA de proposito: se ha uma
# corrida vermelha mais nova do que o meu commit, o problema existe na mesma.
id_corrida=$(gh run list --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || true)
estado=$(gh run list --limit 1 --json conclusion,status,displayTitle 2>/dev/null \
  | python3 -c 'import json,sys
try:
    r = json.load(sys.stdin)
except Exception:
    print("SEM_DADOS"); raise SystemExit(0)
if not r:
    print("SEM_DADOS"); raise SystemExit(0)
x = r[0]
print((x.get("conclusion") or x.get("status") or "?") + "|" + (x.get("displayTitle") or "")[:48])')

caso=${estado%%|*}
titulo=${estado#*|}
case "$caso" in
  success)      ok "a ultima corrida passou — $titulo" ;;
  SEM_DADOS|"") pend "nao consegui ler a lista de corridas — NAO MEDI" ;;
  in_progress|queued|pending)
                pend "a corrida ainda decorre ($caso) — espera por ela antes de assinar" ;;
  failure)
    # ── Falhou, ou NAO MEDIU? A guarda tem de distinguir ────────────────────
    #
    # A 04/09 uma corrida falhou DUAS vezes com zero passos falhados e sem log
    # nenhum. Isso nao e o codigo vermelho: e o corredor a nao arrancar. E a
    # minha propria guarda, escrita para exigir a distincao entre falha e "nao
    # medi", tratava as duas como a mesma coisa - e passava a bloquear qualquer
    # validacao futura por um motivo que nao e sobre o codigo.
    #
    # O sinal e claro e barato: uma corrida que falha sem NENHUM passo falhado
    # nao chegou a medir. Dizer que reprovou seria inventar um resultado.
    passos=$(gh run view "$id_corrida" --json jobs \
      -q '[.jobs[].steps[] | select(.conclusion=="failure")] | length' 2>/dev/null || true)
    if [ "${passos:-0}" -eq 0 ] 2>/dev/null; then
      pend "a corrida falhou sem NENHUM passo falhado — nao mediu nada, e isso nao e reprovar"
      echo "           Sintoma de bloqueio externo (quota, corredor, permissoes)."
      echo "           Ve o semaforo tu proprio antes de assinar: eu nao consigo."
    else
      erro "a ultima corrida falhou em $passos passo(s) — $titulo"
      echo "           Nao assines nada enquanto isto for verdade."
    fi ;;
  *)            erro "a ultima corrida esta '$caso' — $titulo"
                echo "           Nao assines nada enquanto isto for verdade. Um verde local"
                echo "           que a CI contradiz nao e uma medicao, e ja me custou uma"
                echo "           assinatura retirada a 04/09." ;;
esac

echo
[ "$falhas" -eq 0 ] && echo "  Semaforo visto: $falhas falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

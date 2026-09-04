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

# A corrida mais recente do ramo. Nao filtro pelo SHA de proposito: se ha uma
# corrida vermelha mais nova do que o meu commit, o problema existe na mesma.
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
  *)            erro "a ultima corrida esta '$caso' — $titulo"
                echo "           Nao assines nada enquanto isto for verdade. Um verde local"
                echo "           que a CI contradiz nao e uma medicao, e ja me custou uma"
                echo "           assinatura retirada a 04/09." ;;
esac

echo
[ "$falhas" -eq 0 ] && echo "  Semaforo visto: $falhas falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

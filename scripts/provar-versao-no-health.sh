#!/usr/bin/env bash
#
# A versão do build responde no `/api/health`?
#
# Até aqui a única forma de saber que versão estava no ar era `docker inspect` à
# etiqueta `bossaos.versao` — o que exige o Docker à mão, e quem faz a pergunta
# «entrou?» costuma estar no telemóvel.
#
# ── Isto NÃO substitui a etiqueta ─────────────────────────────────────────
#
# O campo é o que o build DIZ que é: o `ARG VERSAO` do Dockerfile promovido a
# `ENV`. O portão 4 do `publicar.sh` continua a ler a etiqueta, que é o que
# compara o construído com o que está no ar. Isto responde de fora; aquilo mede.
#
# ── Porque é pela porta e não por importação ──────────────────────────────
#
# A primeira versão desta prova importava a rota num teste de nó. Não corre: o
# `next/server` não resolve fora do build. E ainda bem — o terceiro controlo é
# «o health continua a responder», e isso só se sabe pedindo.
set -uo pipefail
cd "$(dirname "$0")/.."

verde()    { echo "  ok    $1"; }
vermelho() { echo "  FALHA $1"; FALHAS=$((FALHAS + 1)); }
FALHAS=0
PORTA="${PORTA_VERSAO:-3086}"

echo "A versao do build responde no /api/health?"

if lsof -nP -iTCP:"$PORTA" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "  NAO MEDI  a porta $PORTA ja esta ocupada"; exit 2
fi
if ! fnm exec --using=22.23.2 pnpm --filter @bossaos/web exec next build >/tmp/versao-build.log 2>&1; then
  echo "  NAO MEDI  o build falhou — sem build nao ha o que perguntar"
  tail -5 /tmp/versao-build.log; exit 2
fi

# Um arranque por caso, sobre o MESMO build: o que muda é o ambiente do
# processo, que é exactamente onde a variável vive.
perguntar() {
  local valor="$1" ficheiro="$2"
  if [ "$valor" = '(sem)' ]; then unset BOSSAOS_VERSAO; else export BOSSAOS_VERSAO="$valor"; fi
  PORT="$PORTA" fnm exec --using=22.23.2 pnpm --filter @bossaos/web exec next start -p "$PORTA" \
    >/tmp/versao-servidor.log 2>&1 &
  local pid=$!
  local i
  for i in $(seq 1 60); do curl -sf -o /dev/null "http://127.0.0.1:$PORTA/api/health" && break; sleep 1; done
  curl -s -o "$ficheiro" -w '%{http_code}' "http://127.0.0.1:$PORTA/api/health" > "$ficheiro.codigo"
  kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
  lsof -ti tcp:"$PORTA" | xargs kill 2>/dev/null
  unset BOSSAOS_VERSAO
}

campo() { python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('versao_do_build','(AUSENTE)'))" "$1" 2>/dev/null; }

# ── 1 · Com VERSAO definida ───────────────────────────────────────────────
perguntar 'a1b2c3d' /tmp/versao-com.json
C=$(cat /tmp/versao-com.json.codigo 2>/dev/null)
V=$(campo /tmp/versao-com.json)
if [ "$C" = 200 ] && [ "$V" = 'a1b2c3d' ]; then
  verde "com VERSAO definida: HTTP $C e versao_do_build=$V"
else
  vermelho "com VERSAO definida deu HTTP $C e campo '$V'"
fi

# ── 2 · Sem VERSAO ────────────────────────────────────────────────────────
perguntar '(sem)' /tmp/versao-sem.json
C=$(cat /tmp/versao-sem.json.codigo 2>/dev/null)
V=$(campo /tmp/versao-sem.json)
if [ "$C" != 200 ]; then
  vermelho "sem VERSAO o health deixou de responder (HTTP $C) — trocou uma pergunta por um problema"
elif [ "$V" = '(AUSENTE)' ]; then
  vermelho "sem VERSAO o campo DESAPARECEU — ausente le-se como «build antigo», nao como «nao sei»"
elif [ "$V" != 'desconhecida' ]; then
  vermelho "sem VERSAO o campo diz '$V' e devia dizer 'desconhecida'"
else
  verde "sem VERSAO: HTTP $C e versao_do_build=desconhecida (nao desapareceu)"
fi

# ── 3 · O resto da resposta sobreviveu ────────────────────────────────────
if python3 -c "
import json,sys
d=json.load(open('/tmp/versao-sem.json'))
sys.exit(0 if d.get('estado')=='vivo' and d.get('ts') else 1)" 2>/dev/null; then
  verde "o health continua a trazer o que ja trazia (estado e ts)"
else
  vermelho "o campo novo comeu o resto da resposta"
fi

echo
[ "$FALHAS" -eq 0 ] && { echo "  A versao responde de fora: 0 falhas."; exit 0; }
echo "  $FALHAS FALHA(S)."; exit 1

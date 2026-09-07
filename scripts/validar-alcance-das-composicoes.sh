#!/usr/bin/env bash
# ── Por onde se chega às 792 composições ───────────────────────────────────
#
# 792 = 396 IDs × duas superfícies (AF100 linha 130). Isto ENUMERA e CLASSIFICA;
# não captura. O §8 da RV100 propaga o redesenho a todas as telas depois da
# aprovação humana, e uma captura de hoje é a fotografia de um desenho que vai
# mudar. O mapa e o arnês sobrevivem ao redesenho; as imagens não.
#
# Três respostas, e a terceira é a que costuma faltar:
#   OK (0)        o mapa foi levantado e as portas que abriam continuam a abrir
#   FALHOU (1)    portas fecharam, ou a partição deixou de fechar em 396
#   NÃO MEDI (2)  não houve levantamento — arnês em baixo, sonda calada,
#                 população vazia, ou o servidor da inspecção sem arrancar
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "Por onde se chega às 792 composições?"

# O `.env` traz o `MIGRATION_DATABASE_URL`, sem o qual o arnês não resolve alvos.
if [ -f .env ]; then set -a; . ./.env; set +a; fi

# ── 1. População, ANTES de subir o navegador ───────────────────────────────
#
# Se o atlas não tem 396 linhas, não há mapa a levantar. Isto é NÃO MEDI e não
# um mapa curto: um levantamento com menos linhas do que o território parece um
# levantamento e é uma amputação.
LINHAS=$(python3 - <<'PY' 2>/dev/null
import csv, sys
try:
    with open('docs/progress/coverage.csv', encoding='utf-8-sig') as f:
        print(sum(1 for l in csv.DictReader(f) if (l.get('id') or '').strip()))
except Exception:
    print(0)
PY
)
if [ "${LINHAS:-0}" -ne 396 ]; then
  naomedi "o atlas deu ${LINHAS:-0} composições e não 396 — não há território para mapear."
  exit "$NAO_MEDI"
fi
verde "$LINHAS composições no atlas — há território a mapear"

if ! bash scripts/arnes-pronto.sh >/tmp/bossaos-alcance-arnes.txt 2>&1; then
  naomedi "não consegui preparar o arnês — sem alvos, nenhum endereço resolve."
  tail -4 /tmp/bossaos-alcance-arnes.txt | sed 's/^/           /'
  exit "$NAO_MEDI"
fi
verde "arnês pronto"

PORTA_DA_PROVA="${PORTA_INSPECCAO:-3018}"
if lsof -nP -iTCP:"$PORTA_DA_PROVA" -sTCP:LISTEN >/dev/null 2>&1; then
  naomedi "a porta $PORTA_DA_PROVA já está ocupada — outra inspecção a correr?"
  exit "$NAO_MEDI"
fi

# ── 2. Um vermelho de ARRANQUE não é uma medição ───────────────────────────
#
# Aprendido ao vivo na guarda de expansão: o `.next` foi reconstruído por outro
# processo a meio da corrida, o Playwright saiu com 1, e sem esta linha isso
# lia-se como «o produto partiu-se». O `.next` é recurso partilhado como a
# árvore, a base e a porta.
arranque_falhou() {
  grep -qE 'config.webServer was not able to start|Could not find a production build' "$1"
}

SAIDA=/tmp/bossaos-alcance.txt
PORTA_INSPECCAO="$PORTA_DA_PROVA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA_DA_PROVA" \
  pnpm exec playwright test --project=preparar --project=painel alcance.spec.ts \
  --reporter=line >"$SAIDA" 2>&1
ESTADO=$?

if arranque_falhou "$SAIDA"; then
  naomedi "o servidor da inspecção não arrancou — o \`.next\` está em reconstrução noutro processo?"
  grep -oE 'Could not find a production build[^"]*|Exit code: [0-9]*' "$SAIDA" | head -2 | sed 's/^/           /'
  exit "$NAO_MEDI"
fi
if grep -q 'No tests found' "$SAIDA"; then
  naomedi "o Playwright não encontrou a prova — nada foi levantado."
  exit "$NAO_MEDI"
fi

# ── 3. O ÂMBITO, lido da prova e repetido em TODAS as saídas ───────────────
#
# Um verde chamado `validar-alcance-das-composicoes` lê-se como «as 792 estão
# alcançadas». Significa outra coisa, e a diferença é o trabalho todo que falta.
# Numa varredura de 36 guardas o nome e o código de saída atravessam, o
# qualificador não.
AMBITO=$(grep -o 'AMBITO .*' "$SAIDA" | tail -1)
campo() { sed -n "s/.*$1=\([0-9]*\).*/\1/p" <<<"$AMBITO"; }
ambito() {
  if [ -z "$AMBITO" ]; then
    echo "  âmbito:  desconhecido — a prova não declarou o que levantou"
    return
  fi
  local ids sourl part prov abertas idsq prontos bloq
  ids=$(campo ids); sourl=$(campo soUrl); part=$(campo partilhado); prov=$(campo provocar)
  abertas=$(sed -n 's/.*portasAbertas=\([0-9]*\/[0-9]*\).*/\1/p' <<<"$AMBITO")
  idsq=$(campo idsQueAbrem); prontos=$(campo prontosJa); bloq=$(campo bloqueados)
  echo "  âmbito:  $ids composições · $sourl só-URL · $part estado-partilhado · $prov provocar"
  echo "           $abertas endereços abrem · $idsq composições atrás de porta aberta"
  echo "           PRONTAS A CAPTURAR HOJE: $prontos — as só-URL cuja porta abre"
  echo "           por resolver: $bloq bloqueadas por parâmetro, $part precisam de estado lá dentro"
  grep -o 'SEM-RESOLUCAO .*' "$SAIDA" | head -1 | sed 's/^/           /'
}

# A sonda e a população saem por 2, e não por 1: nenhuma delas é «o produto
# partiu-se», e chamar-lhes isso era acusar o inocente.
if grep -q 'SONDA:' "$SAIDA"; then
  naomedi "a sonda do detector de portas não provou o vermelho:"
  grep -o 'SONDA:[^"]*' "$SAIDA" | head -2 | sed 's/^/           /'
  ambito
  exit "$NAO_MEDI"
fi
if grep -q 'POPULACAO-ZERO' "$SAIDA"; then
  naomedi "não houve levantamento:"
  grep -o 'POPULACAO-ZERO:[^"]*' "$SAIDA" | head -2 | sed 's/^/           /'
  ambito
  exit "$NAO_MEDI"
fi
verde "a sonda fechou um endereço inventado — o detector de portas sabe dizer «fechada»"

if [ "$ESTADO" -ne 0 ]; then
  vermelho "o mapa piorou desde a última medição:"
  grep -E 'portas abertas caíram|Received|Expected' "$SAIDA" | head -4 | sed 's/^/           /'
  grep 'PORTA-FECHADA' "$SAIDA" | head -8 | sed 's/^/           /'
  ambito
  exit "$FALHOU"
fi

verde "o mapa foi levantado e as portas que abriam continuam a abrir"
if [ -s docs/progress/alcance-das-composicoes.csv ]; then
  verde "mapa escrito: docs/progress/alcance-das-composicoes.csv"
else
  naomedi "a prova passou mas não deixou mapa — um levantamento sem mapa não serve a ninguém."
  exit "$NAO_MEDI"
fi
echo
ambito
echo
grep 'PORTA-FECHADA' "$SAIDA" | sed 's/^/  fechada: /'
exit "$OK"

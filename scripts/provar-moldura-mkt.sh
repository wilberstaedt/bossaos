#!/usr/bin/env bash
#
# A MOLDURA comercial, medida antes e depois — o guião que corre o instrumento.
#
# ── Porque é que este ficheiro existe ──────────────────────────────────────
#
# Não por burocracia. A `validar-suites-com-guiao.sh` reprova qualquer suite de
# navegador que nenhum `provar-*.sh` nomeie, e a razão está escrita lá: uma
# suite sem guião **não dá verde nem vermelho, DESAPARECE**. Foi assim que o
# `divida-movel` esteve partido sem ninguém saber.
#
# O `rv100-moldura.spec.ts` nasceu hoje, no lote L1 do §6 da RV100. Sem este
# guião nascia já fora do corredor, e um instrumento fora do corredor mede uma
# vez e nunca mais.
#
# ── Duas fases, e a segunda não vale sozinha ──────────────────────────────
#
#   ./scripts/provar-moldura-mkt.sh antes    grava o estado ANTES da mudança
#   ./scripts/provar-moldura-mkt.sh depois   grava o estado DEPOIS
#   ./scripts/provar-moldura-mkt.sh          corre sem gravar (regressão)
#
# Sem argumento o instrumento salta-se de propósito: correr o corredor não pode
# reescrever por cima de uma fase que já foi tirada. O que este guião garante
# nesse caso é que a suite **carrega e é vista** — que é a propriedade que a
# guarda das suites mede.
#
# ── Três respostas, não duas ──────────────────────────────────────────────
#
# OK, FALHOU e NÃO MEDI (saída 2). A terceira é para o dia em que faltar o
# ambiente da base ou o Playwright: um guião que não consegue medir tem de o
# dizer, e não devolver verde por não ter encontrado nada para reprovar.
set -uo pipefail
cd "$(dirname "$0")/.."

FASE="${1:-}"
DESTINO="docs/visual/rv100/2026-09-06/evidence/moldura"

naomedi() { printf '  NAO MEDI %s\n' "$1"; exit 2; }

case "$FASE" in
  ''|antes|depois) ;;
  *) naomedi "fase '$FASE' desconhecida — use 'antes', 'depois' ou nada" ;;
esac

[ -f inspeccao/rv100-moldura.spec.ts ] || naomedi "o instrumento nao esta em inspeccao/"

# O ambiente da base tem de estar carregado: o `globalSetup` do Playwright semeia
# antes de o navegador arrancar, e sem credencial de migração morre com um erro
# que não fala de ambiente nenhum.
if [ -z "${MIGRATION_DATABASE_URL:-}${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    set -a; . ./.env; set +a
  else
    naomedi "sem MIGRATION_DATABASE_URL e sem .env — o arnes nao consegue semear"
  fi
fi

# Porta própria, pelo mesmo motivo que o `playwright.config.ts` explica: o
# revisor e o executor a medirem na mesma porta produzem leituras que não
# distinguem o produto do arnês.
PORTA="${PORTA_INSPECCAO:-3013}"

echo "1. O instrumento da moldura corre${FASE:+ (fase: $FASE)}"
RV100_FASE="$FASE" PORTA_INSPECCAO="$PORTA" \
  npx playwright test inspeccao/rv100-moldura.spec.ts --project=chromium --workers=1
saida=$?

if [ "$saida" -ne 0 ]; then
  printf '  FALHA o instrumento da moldura reprovou (saida %s)\n' "$saida"
  exit 1
fi

if [ -n "$FASE" ]; then
  echo
  echo "2. E a evidencia ficou escrita — senao isto correu para nada"
  em_falta=0
  for L in 360 390 768 1280 1440; do
    if [ -s "$DESTINO/$FASE-$L.json" ]; then
      printf '  ok    %s\n' "$DESTINO/$FASE-$L.json"
    else
      printf '  FALHA %s nao foi escrito ou esta vazio\n' "$DESTINO/$FASE-$L.json"
      em_falta=$((em_falta+1))
    fi
  done
  [ "$em_falta" -eq 0 ] || { echo "FALHOU: $em_falta ficheiros de evidencia em falta"; exit 1; }
fi

echo
echo "OK"

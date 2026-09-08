#!/usr/bin/env bash
#
# A HOME comercial (MKT-001/002/003), medida antes e depois.
#
# Existe pela mesma razão que o `provar-moldura-mkt.sh`: a
# `validar-suites-com-guiao.sh` reprova qualquer suite de navegador que nenhum
# guião nomeie, porque uma suite sem guião **não dá verde nem vermelho,
# DESAPARECE**. O `rv100-home.spec.ts` nasceu no lote L1b e sem isto nascia já
# fora do corredor.
#
#   ./scripts/provar-home-mkt.sh antes     grava o estado ANTES da mudança
#   ./scripts/provar-home-mkt.sh depois    grava o estado DEPOIS
#   ./scripts/provar-home-mkt.sh           corre sem gravar (regressão)
#
# Três respostas: OK, FALHOU e NAO MEDI (saída 2).
set -uo pipefail
cd "$(dirname "$0")/.."

FASE="${1:-}"
DESTINO="docs/visual/rv100/2026-09-06/evidence/home"

naomedi() { printf '  NAO MEDI %s\n' "$1"; exit 2; }

case "$FASE" in
  ''|antes|depois) ;;
  *) naomedi "fase '$FASE' desconhecida — use 'antes', 'depois' ou nada" ;;
esac

[ -f inspeccao/rv100-home.spec.ts ] || naomedi "o instrumento nao esta em inspeccao/"

if [ -z "${MIGRATION_DATABASE_URL:-}${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then set -a; . ./.env; set +a
  else naomedi "sem MIGRATION_DATABASE_URL e sem .env — o arnes nao consegue semear"; fi
fi

PORTA="${PORTA_INSPECCAO:-3013}"

echo "1. O instrumento da home corre${FASE:+ (fase: $FASE)}"
RV100_FASE="$FASE" PORTA_INSPECCAO="$PORTA" \
  npx playwright test inspeccao/rv100-home.spec.ts --project=chromium --workers=1
saida=$?
[ "$saida" -eq 0 ] || { printf '  FALHA o instrumento reprovou (saida %s)\n' "$saida"; exit 1; }

if [ -n "$FASE" ]; then
  echo
  echo "2. E a evidencia ficou escrita"
  em_falta=0
  for f in "$FASE-home.json" "$FASE-seccoes.json"; do
    if [ -s "$DESTINO/$f" ]; then printf '  ok    %s\n' "$DESTINO/$f"
    else printf '  FALHA %s nao foi escrito\n' "$DESTINO/$f"; em_falta=$((em_falta+1)); fi
  done
  [ "$em_falta" -eq 0 ] || { echo "FALHOU: $em_falta ficheiros em falta"; exit 1; }
fi

echo
echo "OK"

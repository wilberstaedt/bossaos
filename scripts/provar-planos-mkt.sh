#!/usr/bin/env bash
#
# A pagina de PLANOS (MKT-005), medida antes e depois.
#
# Existe pela mesma razao que os outros dois guioes da RV100: a
# `validar-suites-com-guiao.sh` reprova qualquer suite de navegador que nenhum
# guiao nomeie, porque uma suite sem guiao nao da verde nem vermelho, DESAPARECE.
#
#   ./scripts/provar-planos-mkt.sh antes | depois | (nada)
#
# Tres respostas: OK, FALHOU e NAO MEDI (saida 2).
set -uo pipefail
cd "$(dirname "$0")/.."

FASE="${1:-}"
DESTINO="docs/visual/rv100/2026-09-06/evidence/planos"
naomedi() { printf '  NAO MEDI %s\n' "$1"; exit 2; }

case "$FASE" in ''|antes|depois) ;; *) naomedi "fase '$FASE' desconhecida" ;; esac
[ -f inspeccao/rv100-planos.spec.ts ] || naomedi "o instrumento nao esta em inspeccao/"

if [ -z "${MIGRATION_DATABASE_URL:-}${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then set -a; . ./.env; set +a
  else naomedi "sem MIGRATION_DATABASE_URL e sem .env"; fi
fi

PORTA="${PORTA_INSPECCAO:-3013}"
echo "1. O instrumento dos planos corre${FASE:+ (fase: $FASE)}"
RV100_FASE="$FASE" PORTA_INSPECCAO="$PORTA" \
  npx playwright test inspeccao/rv100-planos.spec.ts --project=chromium --workers=1
saida=$?
[ "$saida" -eq 0 ] || { printf '  FALHA o instrumento reprovou (saida %s)\n' "$saida"; exit 1; }

if [ -n "$FASE" ]; then
  echo; echo "2. E a evidencia ficou escrita"
  [ -s "$DESTINO/$FASE-planos.json" ] \
    && printf '  ok    %s\n' "$DESTINO/$FASE-planos.json" \
    || { printf '  FALHA %s nao foi escrito\n' "$DESTINO/$FASE-planos.json"; exit 1; }
fi
echo; echo "OK"

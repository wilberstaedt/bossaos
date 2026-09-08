#!/usr/bin/env bash
#
# A pagina de IMPLANTACAO (MKT-006) e os equipamentos, medidos antes e depois.
#
# Existe pela mesma razao que os outros guioes da RV100: a
# `validar-suites-com-guiao.sh` reprova qualquer suite de navegador que nenhum
# guiao nomeie, porque uma suite sem guiao nao da verde nem vermelho, DESAPARECE.
#
#   ./scripts/provar-implantacao-mkt.sh antes | depois | (nada)
#
# Tres respostas: OK, FALHOU e NAO MEDI (saida 2).
#
# ── A pasta do build tambem e' desta corrida, e nao so a porta ─────────────
#
# A `playwright.config.ts` parametrizou a PORTA para o revisor e o executor nao
# medirem no mesmo sitio. Faltava a outra metade: com `.next` partilhado, dois
# processos com portas diferentes continuam a escrever nos mesmos ficheiros — e
# a 07/09 isso deu `/es-ES/getting-started` a responder 200 e a seguir 500 com o
# codigo igual nos dois pedidos. O 500 nao era da pagina, era o build do outro
# processo a passar por baixo deste servidor.
#
# `NEXT_DIST_DIR` (apps/web/next.config.ts) fecha essa metade.
set -uo pipefail
cd "$(dirname "$0")/.."

# O build com `NEXT_DIST_DIR` reescreve o `next-env.d.ts`, que é versionado.
# Este guião repõe-no ao sair, por qualquer via — ver `next-env-intacto.sh`.
. "$(dirname "$0")/next-env-intacto.sh"
guardar_next_env
trap repor_next_env EXIT INT TERM

FASE="${1:-}"
DESTINO="docs/visual/rv100/2026-09-06/evidence/implantacao"
naomedi() { printf '  NAO MEDI %s\n' "$1"; exit 2; }

case "$FASE" in ''|antes|depois) ;; *) naomedi "fase '$FASE' desconhecida" ;; esac
[ -f inspeccao/rv100-implantacao.spec.ts ] || naomedi "o instrumento nao esta em inspeccao/"

if [ -z "${MIGRATION_DATABASE_URL:-}${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then set -a; . ./.env; set +a
  else naomedi "sem MIGRATION_DATABASE_URL e sem .env"; fi
fi

PORTA="${PORTA_INSPECCAO:-3013}"
echo "1. O instrumento da implantacao corre${FASE:+ (fase: $FASE)}"
RV100_FASE="$FASE" PORTA_INSPECCAO="$PORTA" NEXT_DIST_DIR="${NEXT_DIST_DIR:-.next}" \
  npx playwright test inspeccao/rv100-implantacao.spec.ts --project=chromium --workers=1
saida=$?
[ "$saida" -eq 0 ] || { printf '  FALHA o instrumento reprovou (saida %s)\n' "$saida"; exit 1; }

if [ -n "$FASE" ]; then
  echo; echo "2. E a evidencia ficou escrita"
  [ -s "$DESTINO/$FASE-implantacao.json" ] \
    && printf '  ok    %s\n' "$DESTINO/$FASE-implantacao.json" \
    || { printf '  FALHA %s nao foi escrito\n' "$DESTINO/$FASE-implantacao.json"; exit 1; }
fi
echo; echo "OK"

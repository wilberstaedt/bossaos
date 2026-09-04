#!/usr/bin/env bash
#
# Sobe uma pré-visualização com dados reais, para alguém OLHAR.
#
# Existe porque a 04/09 dei ao Matheus os endereços de um preview e ele partiu-se
# sozinho meia hora depois: corri a prova de isolamento, e a limpeza dela — que
# está certa, quem faz a sujidade apanha-a — apagou a semeadura de que o preview
# dependia. A landing continuou a responder e o site do restaurante passou a 404,
# sem um aviso. Uma demonstração que se desfaz em silêncio é pior do que não a dar.
#
# Porta 3011 de propósito: a 3010 é do arnês de inspecção, e disputá-la interrompe
# quem está a medir.
set -uo pipefail
cd "$(dirname "$0")/.."

PORTA="${PORTA:-3011}"
set -a; [ -f .env ] && . ./.env; set +a

if [ ! -f apps/web/.next/BUILD_ID ]; then
  echo "==> Sem build servível. A construir…"
  pnpm build || { echo "ERRO: o build falhou — não subo um preview de nada." >&2; exit 1; }
fi

echo "==> A semear os dados da demonstração"
node --experimental-strip-types packages/db/prisma/semente-inspeccao.ts || {
  echo "ERRO: a semeadura falhou. Sem dados, o site do restaurante dá 404 e" >&2
  echo "      quem olhar conclui que o produto está partido." >&2
  exit 1
}

echo "==> A servir em http://127.0.0.1:$PORTA"
npx next start apps/web -p "$PORTA" &
SERVIDOR=$!
trap 'kill "$SERVIDOR" 2>/dev/null' EXIT INT TERM

# Espera pela porta em vez de dormir um número inventado.
for _ in $(seq 1 30); do
  curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:$PORTA/api/health" && break
  sleep 1
done

echo
echo "  Landing ................ http://127.0.0.1:$PORTA/es-ES        (e /pt-BR, /en)"
echo "  Pedir demonstração ..... http://127.0.0.1:$PORTA/es-ES/demo"
echo "  Site do restaurante .... http://127.0.0.1:$PORTA/r/insp-marina-oropesa/es-ES"
echo "  Carta pública (do QR) .. http://127.0.0.1:$PORTA/r/insp-marina-oropesa/es-ES/menu"
echo "  Contacto com formulário  http://127.0.0.1:$PORTA/r/insp-marina-oropesa/es-ES/contact"
echo
echo "  AVISO: correr a inspecção de navegador APAGA estes dados na limpeza dela."
echo "  Se o restaurante passar a 404, é isso — volta a correr este script."
echo
wait "$SERVIDOR"

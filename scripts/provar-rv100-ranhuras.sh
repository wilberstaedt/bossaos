#!/usr/bin/env bash
# ── A spec das ranhuras sabe recusar, ou só está verde? ────────────────────
#
# Enquanto os quatro sítios estavam vermelhos, a `rv100-ranhuras.spec.ts` provava
# que sabia recusar por estar a recusar. **No dia em que os quatro ficaram curados
# essa justificação morreu** — passou a ser um verde sobre treze sítios que nunca
# recusou nada, que é exactamente a forma que o guião dos papéis teve de corrigir
# quando os recortes calaram a acusação da legibilidade.
#
# O plante é o simétrico do defeito que ela existe para apanhar: **um mestre de
# ecrã inteiro numa ranhura abençoada.** E a metade que a torna prova e não
# alarme é a segunda: **não pode acusar os outros doze.** Uma guarda que acusa
# tudo quando se mexe em qualquer coisa está a reagir ao plante e não ao defeito.
set -uo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi

ALVO='apps/web/app/[idioma]/interno/ns2/page.tsx'
GUARDADO="$(mktemp)"
cp -p "$ALVO" "$GUARDADO"
falhas=0

repor() {
  cp -p "$GUARDADO" "$ALVO"
  if cmp -s "$GUARDADO" "$ALVO"; then rm -f "$GUARDADO"; echo "  (a fonte foi reposta)"
  else echo "  FALHA a fonte NÃO voltou ao que era — a cópia está em $GUARDADO"; fi
}
trap repor EXIT INT TERM

correr() {
  pnpm exec playwright test inspeccao/rv100-ranhuras.spec.ts \
    --project=chromium --no-deps --reporter=line 2>&1
}

echo "1. Como está, as treze têm de passar"
BASE="$(correr)"
echo "$BASE" | grep -E 'AMBITO' | sed 's/^/     /'
if echo "$BASE" | grep -qE 'abencoadas_com_defeito=0 por_decidir=0'; then
  echo "  ok    zero defeitos e zero por decidir"
else
  echo "  FALHA já havia defeito antes do plante — o controlo não distinguiria nada"
  falhas=$((falhas + 1))
fi

echo "2. Um mestre de ecrã inteiro numa ranhura abençoada"
python3 - "$ALVO" <<'PLANTE'
import io, sys
p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()
velho = '<Composicao qual="salaRecorte" idioma={idioma} ranhura="larga" />'
novo = '<Composicao qual="sala" idioma={idioma} ranhura="larga" />'
if s.count(velho) != 1:
    sys.stderr.write('PLANTE-MORTO: o ns2 nao esta como o guiao espera\n')
    raise SystemExit(3)
io.open(p, 'w', encoding='utf-8').write(s.replace(velho, novo))
PLANTE
if [ $? -ne 0 ]; then
  echo "  FALHA o plante não pegou — a fonte mudou de forma e isto deixou de exercer"
  falhas=$((falhas + 1))
else
  COM_PLANTE="$(correr)"
  # A acusação sai duas vezes no relatório — na lista e no diff — por isso
  # conta-se com `sort -u`. E a classe aceita maiúsculas: a anterior era
  # `[a-z0-9/-]`, que parava no `ES` de `/es-ES`, e por isso o guião dizia que o
  # plante não tinha mordido quando tinha.
  ACUSADAS=$(echo "$COM_PLANTE" | grep -oE '/[A-Za-z0-9/-]+ #[0-9]+:[^|]*(ILEGÍVEL|AMPLIADO) [0-9.]+' \
    | sort -u | wc -l | tr -d ' ')
  if [ "${ACUSADAS:-0}" -eq 0 ]; then
    echo "  FALHA plantei o mestre de 1440 numa ranhura de 477 e ela NÃO o apanhou"
    falhas=$((falhas + 1))
  else
    echo "  ok    apanhou-o:"
    echo "$COM_PLANTE" | grep -oE '/[A-Za-z0-9/-]+ #[0-9]+:[^|]*(ILEGÍVEL|AMPLIADO) [0-9.]+' \
      | sort -u | head -2 | sed 's/^/           /'
    # ── E a metade que a torna prova ────────────────────────────────────────
    if [ "$ACUSADAS" -eq 1 ]; then
      echo "  ok    e acusa UMA só — os outros doze ficam de fora"
    else
      echo "  FALHA acusou $ACUSADAS composições com um só defeito plantado —"
      echo "           está a reagir ao plante e não ao defeito"
      falhas=$((falhas + 1))
    fi
    if echo "$COM_PLANTE" | grep -q 'interno/ns2 #1'; then
      echo "  ok    e é a que eu plantei, e não outra qualquer"
    else
      echo "  FALHA acusou, mas não o sítio plantado"
      falhas=$((falhas + 1))
    fi
  fi
fi
cp -p "$GUARDADO" "$ALVO"

echo
if [ "$falhas" -gt 0 ]; then
  echo "  âmbito:  o controlo negativo da spec das ranhuras."
  exit 1
fi
echo "  ok    a spec das ranhuras recusa um mestre inteiro e deixa os outros em paz"
echo "  âmbito:  mede que a guarda das treze composições sabe recusar, e que recusa"
echo "           só o que tem defeito. FORA, e declarado: as ranhuras de telemóvel"
echo "           — isto corre a 1280, e a matriz por ecrã estreito é outra medição."
exit 0

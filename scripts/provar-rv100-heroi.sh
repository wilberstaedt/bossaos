#!/usr/bin/env bash
# ── Os critérios VERDES do herói sabem recusar? ───────────────────────────
#
# A prova do §4.2 está vermelha em cinco critérios, e uma guarda a recusar prova
# que sabe recusar — **desses cinco**. Os outros **oito estão verdes e por
# provar**, e um verde que nunca recusou nada é a forma que já corrigi duas vezes
# hoje: no guião dos papéis, quando os recortes calaram a legibilidade, e na spec
# das ranhuras, quando os quatro «por decidir» ficaram curados.
#
# Planta-se num critério VERDE — a sombra do KDS sobreposto, o 7 — e exige-se que
# ele recuse. E a metade que o torna prova: **não pode arrastar os outros sete**.
set -uo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi

ALVO='packages/ui/src/estilos.css'
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
  pnpm exec playwright test inspeccao/rv100-heroi.spec.ts \
    --project=chromium --no-deps --reporter=line 2>&1
}

verdes() { echo "$1" | grep -oE 'CRITERIO [0-9]+ ok' | sort -u | wc -l | tr -d ' '; }

echo "1. Como está: oito verdes e cinco vermelhos, e os vermelhos são o achado"
BASE="$(correr)"
echo "$BASE" | grep -E 'AMBITO_HEROI' | sed 's/^/     /'
VERDES_ANTES=$(verdes "$BASE")
if [ "$VERDES_ANTES" -eq 8 ]; then
  echo "  ok    oito critérios verdes antes do plante"
else
  echo "  FALHA esperava 8 verdes e vi $VERDES_ANTES — o controlo mede outra coisa"
  falhas=$((falhas + 1))
fi
if echo "$BASE" | grep -q 'CRITERIO 7 ok'; then
  echo "  ok    o critério 7 (sombra do KDS) está verde, portanto é plantável"
else
  echo "  FALHA o 7 já estava vermelho — plantar nele não distinguiria nada"
  falhas=$((falhas + 1))
fi

echo "2. Sem a sombra da moldura sobreposta"
python3 - "$ALVO" <<'PLANTE'
import io, sys
p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()
velho = '.ns-moldura--sobreposta { box-shadow: 0 18px 44px rgba(16, 46, 53, 0.34); }'
if s.count(velho) != 1:
    sys.stderr.write('PLANTE-MORTO: a regra da sombra sobreposta nao esta como o guiao espera\n')
    raise SystemExit(3)
io.open(p, 'w', encoding='utf-8').write(
    s.replace(velho, '.ns-moldura--sobreposta { box-shadow: none; }'))
PLANTE
if [ $? -ne 0 ]; then
  echo "  FALHA o plante não pegou — a fonte mudou de forma e isto deixou de exercer"
  falhas=$((falhas + 1))
else
  COM_PLANTE="$(correr)"
  if echo "$COM_PLANTE" | grep -q 'CRITERIO 7 FALHA'; then
    echo "  ok    o 7 recusou:"
    echo "$COM_PLANTE" | grep -oE 'CRITERIO 7 FALHA.*' | head -1 | sed 's/^/           /'
  else
    echo "  FALHA tirei a sombra e o critério 7 continuou verde — nunca a mediu"
    falhas=$((falhas + 1))
  fi
  VERDES_DEPOIS=$(verdes "$COM_PLANTE")
  if [ "$VERDES_DEPOIS" -eq 7 ]; then
    echo "  ok    e arrastou zero: sete verdes ficam verdes"
  else
    echo "  FALHA sobraram $VERDES_DEPOIS verdes e deviam ser 7 — o plante mexeu noutros"
    falhas=$((falhas + 1))
  fi
fi
cp -p "$GUARDADO" "$ALVO"

echo
echo "  DECLARADO: cinco critérios estão VERMELHOS e são achado, não defeito deste"
echo "           guião — o Staff móvel que não existe (8 e 9), o estado que é"
echo "           rótulo fixo (10), o contentor a 1200 (2) e o CTA secundário (13)."
echo "           Mais o lead, que diverge do §4.2. Nenhum se cura por iniciativa"
echo "           nossa: os de texto e o do estado vão ao sénior."
echo
if [ "$falhas" -gt 0 ]; then
  echo "  âmbito:  o controlo dos critérios VERDES do §4.2."
  exit 1
fi
echo "  ok    os critérios verdes do herói sabem recusar, e não se arrastam"
echo "  âmbito:  mede que a metade verde da prova do §4.2 não é verde vazio."
echo "           FORA, e declarado: os cinco vermelhos, que a própria prova nomeia."
exit 0

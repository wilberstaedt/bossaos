#!/usr/bin/env bash
# ── A matriz a 390 sabe recusar? ──────────────────────────────────────────
#
# ── E porque é que o plante do guião de 1280 seria MORTO aqui ─────────────
#
# Lá, o plante é trocar `salaRecorte` pelo mestre `sala`. **A 390 isso não faz
# defeito nenhum**: abaixo de 768 quem serve é o `<source>` estreito, e o `sala`
# tem variante de 390 como todos os outros — o ficheiro que chega é o mesmo e o
# número não se mexe. Um plante que não muda a medição não prova nada, e teria
# passado por controlo exercido.
#
# O plante que morde a 390 é **tirar-lhe a variante estreita**: sem `<source>`, o
# `<img>` serve uma redução do mestre de 560 e o texto cai para 8,9 px. É esse o
# «mestre inteiro numa ranhura abençoada» traduzido para este visor.
#
# A segunda metade é a mesma e é a que o torna prova: **acusa só o plantado.**
set -uo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi

ALVO='apps/web/src/componentes/Demonstracao.tsx'
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
  pnpm exec playwright test inspeccao/rv100-ranhuras-390.spec.ts \
    --project=chromium --no-deps --reporter=line 2>&1
}

echo "1. Como está, as treze têm de passar a 390"
BASE="$(correr)"
echo "$BASE" | grep -E 'AMBITO390' | sed 's/^/     /'
if echo "$BASE" | grep -q 'com_defeito=0'; then
  echo "  ok    zero defeitos a 390"
else
  echo "  FALHA já havia defeito antes do plante — o controlo não distinguiria nada"
  falhas=$((falhas + 1))
fi

echo "2. Sem a variante estreita, o mestre de 560 desce ao telefone"
python3 - "$ALVO" <<'PLANTE'
import io, re, sys
p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()
antes = len(re.findall(r'\n\s*salaRecorte: salaEstreita(?:Es|Pt|En),', s))
if antes != 3:
    sys.stderr.write(f'PLANTE-MORTO: esperava 3 entradas estreitas do salaRecorte e vi {antes}\n')
    raise SystemExit(3)
io.open(p, 'w', encoding='utf-8').write(
    re.sub(r'\n\s*salaRecorte: salaEstreita(?:Es|Pt|En),', '', s))
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
    echo "  FALHA tirei a variante estreita e ela NÃO apanhou o mestre a 390"
    falhas=$((falhas + 1))
  else
    echo "  ok    apanhou-o:"
    echo "$COM_PLANTE" | grep -oE '/[A-Za-z0-9/-]+ #[0-9]+:[^|]*(ILEGÍVEL|AMPLIADO) [0-9.]+' \
      | sort -u | head -2 | sed 's/^/           /'
    if [ "$ACUSADAS" -eq 1 ]; then
      echo "  ok    e acusa UMA só — as outras doze ficam de fora"
    else
      echo "  FALHA acusou $ACUSADAS com um só defeito plantado — reage ao plante"
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
  echo "  âmbito:  o controlo negativo da matriz a 390."
  exit 1
fi
echo "  ok    a matriz a 390 recusa um mestre sem variante e deixa as outras em paz"
echo "  âmbito:  mede as treze composições a UM visor de 390, e que a guarda recusa"
echo "           só o que tem defeito. FORA, e declarado: **um visor não é a matriz**."
echo "           360 e 430 existem e ficam por medir. Isto passou A 390, e dizer"
echo "           «no telemóvel» seria dizer mais do que se mediu."
exit 0

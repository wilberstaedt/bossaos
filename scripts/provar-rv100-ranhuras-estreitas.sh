#!/usr/bin/env bash
# ── A matriz dos visores estreitos sabe recusar? ──────────────────────────
#
# ── E porque é que o plante do guião de 1280 seria MORTO aqui ─────────────
#
# Lá, o plante é trocar `salaRecorte` pelo mestre `sala`. **Nos visores estreitos
# isso não faz defeito nenhum**: abaixo de 768 quem serve é o `<source>`
# estreito, e o `sala` tem variante de 390 como todos os outros — o ficheiro que
# chega é o mesmo e o número não se mexe. Um plante que não muda a medição não
# prova nada, e teria passado por controlo exercido.
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
  pnpm exec playwright test inspeccao/rv100-ranhuras-estreitas.spec.ts \
    --project=chromium --no-deps --reporter=line 2>&1
}

echo "1. Como está, as treze têm de passar nos QUATRO visores"
BASE="$(correr)"
echo "$BASE" | grep -E 'AMBITO_ESTREITO' | sed 's/^/     /'
if echo "$BASE" | grep -q 'AMBITO_ESTREITOS visores=4 com_defeito=0'; then
  echo "  ok    zero defeitos nos quatro"
else
  echo "  FALHA já havia defeito antes do plante — o controlo não distinguiria nada"
  falhas=$((falhas + 1))
fi

echo "2. Sem a variante estreita, o mestre de 560 desce aos telefones"
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
  # Contam-se SÍTIOS e não linhas: com quatro visores o mesmo defeito aparece
  # quatro vezes, e contar linhas diria «4 acusadas» sobre um sítio só. O que a
  # régua exige é que não sejam acusados os OUTROS DOZE.
  # FILTRA-SE primeiro pela acusação e só depois se extrai o sítio. A versão
  # anterior extraía o sítio de qualquer linha e contou **13** — as treze
  # medições — sobre um defeito só. Dizia «reage ao plante» quando quem estava a
  # reagir era o `grep`.
  SO_ACUSACOES=$(echo "$COM_PLANTE" | grep -E '(ILEGÍVEL|AMPLIADO)')
  ACUSADAS=$(echo "$SO_ACUSACOES" | grep -oE '/[A-Za-z0-9/-]+ #[0-9]+:' \
    | sort -u | wc -l | tr -d ' ')
  VISORES_QUE_ACUSAM=$(echo "$SO_ACUSACOES" | grep -oE 'visor [0-9]+ ' \
    | sort -u | wc -l | tr -d ' ')
  if [ "${ACUSADAS:-0}" -eq 0 ]; then
    echo "  FALHA tirei a variante estreita e ela NÃO apanhou o mestre a 390"
    falhas=$((falhas + 1))
  else
    echo "  ok    apanhou-o:"
    echo "$COM_PLANTE" | grep -oE '/[A-Za-z0-9/-]+ #[0-9]+:[^|]*(ILEGÍVEL|AMPLIADO) [0-9.]+' \
      | sort -u | head -2 | sed 's/^/           /'
    if [ "$ACUSADAS" -eq 1 ]; then
      echo "  ok    e acusa UM sítio só — os outros doze ficam de fora"
      echo "        (visto em $VISORES_QUE_ACUSAM dos 4 visores, que é o mesmo defeito)"
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
  echo "  âmbito:  o controlo negativo da matriz dos visores estreitos."
  exit 1
fi
echo "  ok    a matriz estreita recusa um mestre sem variante e deixa as outras em paz"
echo "  âmbito:  mede as treze composições a 360, 375, 390 e 430, e que a guarda"
echo "           recusa só o que tem defeito. FORA, e declarado: **quatro visores"
echo "           não são todos os telefones** — 320, 412 e os dobráveis ficam por"
echo "           medir. Passou NESTES QUATRO, e dizer «no telemóvel» seria dizer"
echo "           mais do que se mediu."
exit 0

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
ALVO2='apps/web/app/[idioma]/page.tsx'
GUARDADO="$(mktemp)"
GUARDADO2="$(mktemp)"
cp -p "$ALVO" "$GUARDADO"
cp -p "$ALVO2" "$GUARDADO2"
falhas=0

repor() {
  cp -p "$GUARDADO" "$ALVO"
  cp -p "$GUARDADO2" "$ALVO2"
  if cmp -s "$GUARDADO" "$ALVO" && cmp -s "$GUARDADO2" "$ALVO2"; then
    rm -f "$GUARDADO" "$GUARDADO2"; echo "  (as fontes foram repostas)"
  else echo "  FALHA alguma fonte NÃO voltou ao que era — cópias em $GUARDADO e $GUARDADO2"; fi
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

# ── 3 · A ESTRUTURA, e este é o plante que faltava ────────────────────────
#
# Os dois de cima plantam DEFEITO: números maus. Este planta o contrário — tira a
# declaração a um sítio cujos números continuam **bons**. Era exactamente aqui
# que a guarda mentia: saltava para o sítio seguinte quando não havia defeito, e
# um sítio sem ranhura abençoada com números bons não era contado em lado nenhum.
#
# Uma guarda que só fala quando os números estão maus não consegue dizer que a
# ESTRUTURA está errada, e a estrutura é o que impede o décimo quarto sítio de
# nascer torto.
echo "3. Estrutura · tirar a declaração a um sítio que está BOM"
python3 - "$ALVO2" <<'PLANTE'
import io, sys
p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()
velho = ('<Composicao qual="catalogoRecorte" idioma={idioma}\n'
         '                              ranhura="larga" />')
novo = ('<Composicao qual="catalogoRecorte" idioma={idioma}\n'
        '                              ranhuraPorDecidir="(min-width: 1024px) 477px, 380px" />')
if s.count(velho) != 1:
    sys.stderr.write('PLANTE-MORTO: o bento do catalogo nao esta como o guiao espera\n')
    raise SystemExit(3)
io.open(p, 'w', encoding='utf-8').write(s.replace(velho, novo))
PLANTE
if [ $? -ne 0 ]; then
  echo "  FALHA o plante da estrutura não pegou — a fonte mudou de forma"
  falhas=$((falhas + 1))
else
  SEM_DECL="$(correr)"
  if echo "$SEM_DECL" | grep -q 'sem_declaracao_nao_assinada=1'; then
    echo "  ok    apanhou a declaração que falta, mesmo com os números bons"
  else
    echo "  FALHA tirei a declaração e a guarda não deu por isso —"
    echo "           é a estrutura a passar despercebida porque os números calham bons"
    echo "$SEM_DECL" | grep -oE 'AMBITO .*' | head -1 | sed 's/^/           /'
    falhas=$((falhas + 1))
  fi
  # E não pode inventar defeito onde não há: os números daquele sítio continuam
  # bons, portanto o `abencoadas_com_defeito` tem de ficar em zero.
  if echo "$SEM_DECL" | grep -q 'abencoadas_com_defeito=0'; then
    echo "  ok    e não inventou defeito nenhum: os números continuam bons"
  else
    echo "  FALHA acusou defeito de números num sítio onde só falta a declaração"
    falhas=$((falhas + 1))
  fi
fi
cp -p "$GUARDADO2" "$ALVO2"

echo
if [ "$falhas" -gt 0 ]; then
  echo "  âmbito:  os três controlos negativos da spec das ranhuras."
  exit 1
fi
echo "  ok    recusa um mestre inteiro, deixa os outros em paz, e apanha a"
echo "        declaração que falta mesmo quando os números estão bons"
echo "  âmbito:  mede que a guarda das treze composições sabe recusar números maus"
echo "           E estrutura errada. FORA, e declarado: as ranhuras estreitas —"
echo "           isto corre a 1280, e a matriz estreita é outra medição."
exit 0

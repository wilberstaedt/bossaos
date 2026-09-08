#!/usr/bin/env bash
# ── Os dois critérios do bloco 4 recusam mesmo, ou só parecem? ─────────────
#
# A régua do bloco 4 diz que o critério 3 (ao trocar de papel troca o ecrã E o
# benefício) e o critério 6 (nunca ampliar) **não se aceitam por inspecção**.
# Este guião planta o defeito exacto de cada um e exige a acusação dele.
#
# ── Porque é que isto mede PRESENÇA DE ACUSAÇÃO, e não verde/vermelho ──────
#
# A primeira versão exigia «verde antes, vermelho depois». Deixou de servir no
# momento em que a prova passou a ter um vermelho VERDADEIRO por outra razão — a
# legibilidade dos três recortes de paisagem. Com a suite já vermelha, um
# controlo verde→vermelho não distingue o defeito que ele planta do que já lá
# estava, e um controlo que não distingue não exerce nada.
#
# Pergunta-se, por critério: **esta acusação aparece só quando o defeito dela lá
# está?** É mais estreito, e é o que um controlo negativo tem de fazer.
set -uo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi

ALVO='apps/web/app/[idioma]/page.tsx'
GUARDADO="$(mktemp)"
cp -p "$ALVO" "$GUARDADO"
falhas=0

repor() {
  cp -p "$GUARDADO" "$ALVO"
  # Compara-se com a CÓPIA e não com o HEAD: `git diff` acusa sempre que houver
  # trabalho por commitar, que é o estado em que este guião corre.
  if cmp -s "$GUARDADO" "$ALVO"; then rm -f "$GUARDADO"; echo "  (a fonte foi reposta)"
  else echo "  FALHA a fonte NÃO voltou ao que era — a cópia está em $GUARDADO"; fi
}
trap repor EXIT INT TERM

correr() {
  pnpm exec playwright test inspeccao/rv100-papeis.spec.ts \
    --project=chromium --no-deps --reporter=line 2>&1
}

ausente() { # $1 = frase  $2 = saída
  if echo "$2" | grep -q "$1"; then
    echo "  FALHA \"$1\" aparece SEM plante — a acusação não distingue nada"
    falhas=$((falhas + 1))
  else
    echo "  ok    \"$1\" ausente quando o defeito não lá está"
  fi
}
presente() { # $1 = frase  $2 = saída
  if echo "$2" | grep -q "$1"; then
    echo "  ok    recusou, e pelo motivo certo:"
    echo "$2" | grep -o ".\{0,24\}$1.\{0,58\}" | head -2 | sed 's/^/           /'
  else
    echo "  FALHA plantei o defeito e \"$1\" NÃO apareceu — este critério nunca recusou nada"
    falhas=$((falhas + 1))
  fi
}

echo "1. Como está: as duas acusações têm de estar AUSENTES"
BASE="$(correr)"
echo "$BASE" | grep -E 'ESCALA es-ES' | sed 's/^/     /'
ausente 'imagens distintas' "$BASE"
ausente 'AMPLIADO' "$BASE"
ausente 'LEGIBILIDADE' "$BASE"

echo "2. Critério 3 · dois papéis com a MESMA composição"
python3 - "$ALVO" <<'PY'
import io, sys
p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()
velho = "{ n: 2, qual: 'tabletRecorte', tamanhos: RANHURA_DO_PAPEL, telefone: false },"
novo = "{ n: 2, qual: 'catalogoRecorte', tamanhos: RANHURA_DO_PAPEL, telefone: false },"
if s.count(velho) != 1:
    sys.stderr.write('PLANTE-MORTO: o papel 2 nao esta como o guiao espera\n')
    raise SystemExit(3)
io.open(p, 'w', encoding='utf-8').write(s.replace(velho, novo))
PY
if [ $? -ne 0 ]; then
  echo "  FALHA o plante do critério 3 não pegou — a fonte mudou de forma"
  falhas=$((falhas + 1))
else
  presente 'imagens distintas' "$(correr)"
fi
cp -p "$GUARDADO" "$ALVO"

echo "3. Critério 6 · o telefone esticado até à ranhura de paisagem"
python3 - "$ALVO" <<'PY'
import io, sys
p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()
velho = "{ n: 4, qual: 'carta', tamanhos: '390px', telefone: true },"
novo = "{ n: 4, qual: 'carta', tamanhos: RANHURA_DO_PAPEL, telefone: false },"
if s.count(velho) != 1:
    sys.stderr.write('PLANTE-MORTO: o papel 4 nao esta como o guiao espera\n')
    raise SystemExit(3)
io.open(p, 'w', encoding='utf-8').write(s.replace(velho, novo))
PY
if [ $? -ne 0 ]; then
  echo "  FALHA o plante do critério 6 não pegou — a fonte mudou de forma"
  falhas=$((falhas + 1))
else
  presente 'AMPLIADO' "$(correr)"
fi
cp -p "$GUARDADO" "$ALVO"

echo "4. Critério 6 · o mestre inteiro de volta na ranhura estreita"
# O terceiro lado. Enquanto os papéis 1-3 mostravam mestres, esta acusação
# disparava de verdade e não precisava de plante. Agora que os recortes a
# calaram, ela TEM de ser plantada — senão passa a ser uma frase que ninguém viu
# recusar. Planta-se o que existia antes: o mestre de 1440 na ranhura de 477.
python3 - "$ALVO" <<'PLANTE'
import io, sys
p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()
velho = "{ n: 1, qual: 'catalogoRecorte', tamanhos: RANHURA_DO_PAPEL, telefone: false },"
novo = "{ n: 1, qual: 'catalogo', tamanhos: RANHURA_DO_PAPEL, telefone: false },"
if s.count(velho) != 1:
    sys.stderr.write('PLANTE-MORTO: o papel 1 nao esta como o guiao espera\n')
    raise SystemExit(3)
io.open(p, 'w', encoding='utf-8').write(s.replace(velho, novo))
PLANTE
if [ $? -ne 0 ]; then
  echo "  FALHA o plante da legibilidade não pegou — a fonte mudou de forma"
  falhas=$((falhas + 1))
else
  SAIDA4="$(correr)"
  presente 'LEGIBILIDADE' "$SAIDA4"
  # E não pode acusar quem está bem: uma acusação que apanha os quatro não
  # distingue o mestre do recorte, e era isso que a tornaria ruído.
  if echo "$SAIDA4" | grep -q 'papel 4: LEGIBILIDADE'; then
    echo "  FALHA acusa também o papel 4, que está a 13,9 px — não distingue"
    falhas=$((falhas + 1))
  else
    echo "  ok    e NÃO acusa o papel 4, que está a 13,9 px"
  fi
fi
cp -p "$GUARDADO" "$ALVO"

echo
echo
if [ "$falhas" -gt 0 ]; then
  echo "  âmbito:  os dois controlos negativos do bloco 4, exercidos por acusação."
  exit 1
fi
echo "  ok    cada critério só acusa quando o defeito dele está plantado"
echo "  âmbito:  mede que o critério 3 e o novo limite do critério 6 recusam quando"
echo "           têm o que recusar, e ficam calados quando não têm. FORA, e"
echo "           declarado: se os quatro papéis são os certos para o negócio."
exit 0

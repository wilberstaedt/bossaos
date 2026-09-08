#!/usr/bin/env bash
# ── O §4.5 troca mesmo o ecrã, ou só parece? ───────────────────────────────
#
# A prova `inspeccao/rv100-papeis.spec.ts` exige quatro imagens distintas e
# quatro benefícios distintos nos quatro papéis. Uma exigência dessas é fácil de
# escrever e fácil de nunca ter recusado nada — e a régua do bloco 4 diz que
# **não se aceita por inspecção**.
#
# Este guião planta o defeito exacto que o critério 3 existe para apanhar: põe as
# **quatro composições iguais**, que é o carrossel de fotografias com legendas
# que o §4.5 proíbe. Se a prova continuar verde com as quatro iguais, então o que
# ela mede não é a troca de ecrã e nunca mediu.
#
# **E confirma o MOTIVO do vermelho.** Um vermelho por outra razão — a página a
# não abrir, a sessão a faltar — provaria só que alguma coisa se partiu. Por isso
# exige-se a frase «imagens distintas» na saída.
set -uo pipefail
cd "$(dirname "$0")/.."

ALVO='apps/web/app/[idioma]/page.tsx'
GUARDADO="$(mktemp)"
cp -p "$ALVO" "$GUARDADO"

repor() {
  cp -p "$GUARDADO" "$ALVO"
  # Compara-se com a CÓPIA e não com o HEAD. A primeira versão perguntava
  # `git diff --quiet`, e isso acusava sempre que o ficheiro tivesse trabalho por
  # commitar — que é precisamente o estado em que este guião corre enquanto o
  # bloco está a ser feito. Acusou à primeira corrida, com a fonte já reposta.
  if cmp -s "$GUARDADO" "$ALVO"; then
    echo "  (a fonte foi reposta)"
  else
    echo "  FALHA a fonte NÃO voltou ao que era — a cópia está em $GUARDADO"
    return
  fi
  rm -f "$GUARDADO"
}
trap repor EXIT INT TERM

correr() { # imprime a saída, devolve o código do playwright
  pnpm exec playwright test inspeccao/rv100-papeis.spec.ts \
    --project=chromium --no-deps --reporter=line 2>&1
}

falhas=0
echo "1. Como está, tem de passar"
SAIDA="$(correr)"; CODIGO=$?
echo "$SAIDA" | grep -E 'AMBITO|TECLADO' | sed 's/^/     /'
if [ "$CODIGO" -eq 0 ]; then echo "  ok    verde antes do plante"
else echo "  FALHA já estava vermelho antes do plante — o controlo não diria nada"; falhas=$((falhas+1)); fi

echo "2. Com as quatro composições IGUAIS, tem de recusar"
python3 - "$ALVO" <<'PY'
import io, sys
p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()
velho = """const PAPEIS = [
  { n: 1, qual: 'catalogo' },
  { n: 2, qual: 'tablet' },
  { n: 3, qual: 'kds' },
  { n: 4, qual: 'carta' },
] as const;"""
novo = """const PAPEIS = [
  // PLANTE: as quatro iguais. O bloco vira uma galeria com legendas.
  { n: 1, qual: 'carta' },
  { n: 2, qual: 'carta' },
  { n: 3, qual: 'carta' },
  { n: 4, qual: 'carta' },
] as const;"""
if s.count(velho) != 1:
    sys.stderr.write(f'PLANTE-MORTO: a tabela PAPEIS nao esta como o guiao espera ({s.count(velho)} ocorrencias)\n')
    raise SystemExit(3)
io.open(p, 'w', encoding='utf-8').write(s.replace(velho, novo))
PY
if [ $? -ne 0 ]; then
  echo "  FALHA o plante não pegou — a fonte mudou de forma e este controlo deixou de exercer nada"
  falhas=$((falhas+1))
else
  SAIDA="$(correr)"; CODIGO=$?
  if [ "$CODIGO" -eq 0 ]; then
    echo "  FALHA continuou VERDE com as quatro imagens iguais — o critério 3 não mede a troca de ecrã"
    falhas=$((falhas+1))
  elif echo "$SAIDA" | grep -q 'imagens distintas'; then
    echo "  ok    recusou, e recusou pelo motivo certo:"
    echo "$SAIDA" | grep -oE '[a-z-]+ · [0-9]+ imagens distintas[^—]*' | head -3 | sed 's/^/           /'
  else
    echo "  FALHA ficou vermelho, mas NÃO por causa das imagens iguais — está a recusar outra coisa"
    echo "$SAIDA" | grep -E 'Error|expect' | head -3 | sed 's/^/           /'
    falhas=$((falhas+1))
  fi
fi

echo
if [ "$falhas" -gt 0 ]; then
  echo "  âmbito:  o critério 3 do bloco 4 (troca o ecrã E o benefício), exercido com plante."
  exit 1
fi
echo "  ok    o critério 3 recusa quando as quatro telas são a mesma"
echo "  âmbito:  mede a TROCA de ecrã e de texto ao mudar de papel, nas três línguas,"
echo "           com o plante a confirmar que a exigência já recusou alguma coisa."
echo "           FORA, e declarado: se os quatro papéis são os certos para o negócio"
echo "           (é do Matheus), e se o bloco é bonito (é da Nathalia)."
exit 0

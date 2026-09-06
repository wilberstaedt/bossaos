#!/usr/bin/env bash
#
# As portas dos módulos entregues — um controlo negativo por módulo.
#
# ── O plante estraga o MENU, nunca a tela ─────────────────────────────────
#
# É a única forma de provar que o que se mede é o CAMINHO. Se o plante
# estragasse uma tela, media outra vez a existência da tela — que já está medida
# vinte etapas atrás, em todas as outras suites.
#
# «Uma tela provada a que ninguém chega é uma tela que não existe.»
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

LAYOUT='apps/web/app/[idioma]/app/[orgSlug]/layout.tsx'
ORIG=$(mktemp); cp "$LAYOUT" "$ORIG"
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  local estado=$?
  cp "$ORIG" "$LAYOUT"; rm -f "$ORIG"
  # Morrer a meio NÃO é passar. Um guião que morre no arranque e sai com 0 é
  # verde sobre nada — aconteceu no E22 com o `declare -A` do bash 3.2.
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel portas.spec.ts \
    --workers=1 --reporter=list >"$1" 2>&1
}

# Um plante que não aplica não é um controlo: o `assert` falha, o guião seguia, e
# a suite corria com o ficheiro intacto. Apanhado no E22.
plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

exigir_vermelho() {
  local nome="$1" caso="$2" erro="$3" ficheiro="$4"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  if grep -q 'config.webServer was not able to start' <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — é um ficheiro partido"
    grep -E 'error TS|Failed to type check' <<<"$limpo" | head -3; return
  fi
  # Ficar verde é o PIOR resultado de um controlo negativo, e diz-se assim.
  if ! grep -qE '[0-9]+ failed' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qE "✘.*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E '✘' <<<"$limpo" | head -4; return
  fi
  if ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E 'Error:' <<<"$limpo" | head -3; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-portas-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-portas-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "as portas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-portas-ligado.txt | grep -E '✘|Error:' | head -8
  exit 1
fi

# ── Um controlo por módulo, e o plante é sempre no MENU ───────────────────
fechar_porta() {
  local modulo="$1" rotulo="$2" caso="$3" ficheiro="$4"
  echo
  echo "CONTROLO NEGATIVO — a porta de ${modulo} volta a ser um #"
  MENU_ROTULO="$rotulo" plantar <<'PYPORTA' || return
import io, os, re
p = 'apps/web/app/[idioma]/app/[orgSlug]/layout.tsx'
rotulo = os.environ['MENU_ROTULO']
s = io.open(p, encoding='utf-8').read()
padrao = re.compile(r"\{ href: `[^`]+`, rotulo: m\.navegacao\.%s, accao: '[^']+' \}," % rotulo)
m = padrao.search(s)
assert m, 'a porta de %s nao esta onde se esperava' % rotulo
io.open(p, 'w', encoding='utf-8').write(
    s[:m.start()] + "{ href: '#', rotulo: m.navegacao.%s, accao: null }," % rotulo + s[m.end():])
PYPORTA
  correr "$ficheiro"
  # ── A mensagem que aparece de facto ─────────────────────────────────────
  #
  # Com `#`, o item CONTINUA a ser um `<a>` visível: a asserção que dispara não é
  # a da visibilidade, é a seguinte — a que compara o `href`. Esperar a primeira
  # dava «o caso certo caiu pela mensagem errada» nos seis controlos.
  exigir_vermelho "caiu a porta de ${modulo}: as telas existem e ninguém lá chega" \
    "$caso" 'a entrada de' "$ficheiro"
  cp "$ORIG" "$LAYOUT"
}

fechar_porta "catálogo"   catalogo    'chega-se a catálogo'           /tmp/bossaos-portas-cat.txt
fechar_porta "reservas"   reservas    'chega-se a reservas'           /tmp/bossaos-portas-res.txt
fechar_porta "sala"       salaPedidos 'chega-se a sala e pedidos'     /tmp/bossaos-portas-sala.txt
fechar_porta "takeaway"   levar       'chega-se a takeaway e entrega' /tmp/bossaos-portas-levar.txt
fechar_porta "relatórios" relatorios  'chega-se a relatórios'         /tmp/bossaos-portas-rep.txt
fechar_porta "caixa"      caixa       'chega-se a caixa'              /tmp/bossaos-portas-pos.txt

echo
echo "CONTROLO NEGATIVO — um marcador PERDE a etapa que o vai construir"
# «Um marcador sem etapa não é marcador, é um resto.»
#
# ── E este controlo ficou SEM MATÉRIA-PRIMA ──────────────────────────────
#
# Plantava em `porConstruir: 'E25' }` no layout da organização. Esse marcador já
# não existe: o E30 fechou a última porta morta do menu de gestão e o E33 fechou
# as três da plataforma. **Não há um único `porConstruir` no produto.**
#
# O plante ficou em letra morta e o guião passou a ACUSAR: o `assert` disparava,
# ninguém lia o código de saída, o `exigir_vermelho` corria contra um produto
# intacto, e o produto era declarado defeituoso por uma asserção que nunca foi
# exercida.
#
# A saída é a mesma da `validar-assinaturas.sh` quando o atlas fechou: **declarar
# em vez de acusar**. E fica dito o que isto significa para a prova — a asserção
# «dizem QUAL etapa» corre hoje sobre ZERO marcadores, o que é verde sobre
# população zero. O dia em que voltar a haver um item por construir, esta
# contagem passa de 0 e o controlo volta a ter o que medir.
# ── E conta-se CÓDIGO, não prosa ──────────────────────────────────────────
#
# A primeira versão desta contagem fazia `grep -r` directo e apanhava **um
# comentário** — a linha do `platform/layout.tsx` que EXPLICA que as três foram
# marcadas `porConstruir: 'E33'` e depois fechadas. Um marcador a mais, e este
# controlo passava a acusar sem haver nada.
#
# É o defeito que a `validar-portas-mortas.sh` já tinha apanhado uma vez — nela
# própria, sobre o meu comentário — e escrevi-o outra vez aqui. Passa pelo
# `sem-comentarios.py`, como ela.
MARCADORES=$(git ls-files 'apps/web/app/**/*.tsx' 2>/dev/null \
  | xargs python3 scripts/sem-comentarios.py 2>/dev/null \
  | grep -cE "porConstruir: '" || true)
if [ "${MARCADORES:-0}" -eq 0 ]; then
  printf '  \033[33mNÃO MEDI\033[0m não há um único `porConstruir` no produto — o E30 e o E33\n'
  echo "           fecharam-nos todos. Sem marcador não há o que plantar, e a"
  echo "           asserção «dizem QUAL etapa» corre sobre ZERO linhas."
else
  vermelho "há $MARCADORES ficheiro(s) com marcador e este controlo ficou por reescrever"
  echo "        Re-ancora o plante ao marcador que existe hoje."
fi

echo
echo "Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-portas-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-portas-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-portas-reposto.txt | grep -E '✘' | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

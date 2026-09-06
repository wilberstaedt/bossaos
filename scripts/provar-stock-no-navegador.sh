#!/usr/bin/env bash
#
# E25 fatia 2 — as 12 telas, no navegador.
#
# O controlo que mais vale é o 2: esconder a lista de dívida. Nada estoira,
# nada dá erro, e o saldo continua a ser negativo na base — só que ninguém o vê.
# É a **terceira saída** que o contrato reprova, e é a única das três que não se
# nota: com «impossível» o serviço trava à frente do cliente, com «visível» a
# equipa vê e corrige; com «silencioso» a contagem mente durante semanas.
set -uo pipefail
cd "$(dirname "$0")/.."

# O arnês antes de tudo. Salta sozinho em zero segundos se já estiver pronto;
# numa base fresca faz os três passos pela ordem certa — fixtures, o utilizador
# do `preparar`, e só depois a semente, que o `preparar` limparia.
#
# Sem isto, uma base sem o utilizador do arnês faz o `alvos.ts` rebentar na
# RECOLHA e o Playwright diz «No tests found» — que não aponta para nada, e me
# custou seis hipóteses a 06/09.
bash "$(dirname "$0")/arnes-pronto.sh" >/dev/null || {
  echo "ERRO: não consegui preparar o arnês — vê scripts/arnes-pronto.sh" >&2
  exit 1
}

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

PAINEL='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/inventory/page.tsx'
CONTAGEM='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/inventory/contagem/page.tsx'
TRANSF='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/inventory/transferencia/page.tsx'
MODULO='apps/web/app/[idioma]/app/[orgSlug]/ir/[modulo]/page.tsx'
MOTOR=packages/db/src/stock.ts
SEMENTE=packages/db/prisma/semente-inspeccao.ts
SPEC=inspeccao/stock.spec.ts
FICHEIROS=("$PAINEL" "$CONTAGEM" "$TRANSF" "$MODULO" "$MOTOR" "$SEMENTE" "$SPEC")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }
repor() {
  local i=0
  for f in "${FICHEIROS[@]}"; do
    [[ "$f" == "$1" ]] && { cp "${COPIAS[$i]}" "$f"; return; }
    i=$((i + 1))
  done
}
restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel stock.spec.ts \
    --workers=1 --reporter=list >"$1" 2>&1
}

# Um plante que não aplica não é um controlo: é um guião a correr sobre o
# artefacto intacto e a dizer «vermelho» por outra razão qualquer.
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
  if ! grep -qE '[0-9]+ failed' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qE "✘.*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E '✘' <<<"$limpo" | head -4; return
  fi
  if [[ -n "$erro" ]] && ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E 'Error:' <<<"$limpo" | head -3; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-snav-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-snav-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "as telas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-snav-ligado.txt | grep -E '✘' | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o negativo deixa de aparecer no ecrã"
plantar <<'PYDIVIDA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/inventory/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      {divida.length === 0 ? <p data-teste="sem-divida">{t.semDivida}</p> : ('
assert antigo in s, 'a lista de divida nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '      {true ? <p data-teste="sem-divida">{t.semDivida}</p> : (', 1))
PYDIVIDA
correr /tmp/bossaos-snav-divida.txt
exigir_vermelho "caiu a visibilidade: negativo silencioso, e o ecrã diz que está tudo bem" \
  'o negativo aparece NA LISTA' 'diz que não há dívida' /tmp/bossaos-snav-divida.txt
repor "$PAINEL"

echo
echo "3. CONTROLO NEGATIVO — a ficha deixa de descer à sub-receita"
plantar <<'PYARVORE' || true
import io
p = 'packages/db/src/stock.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    if (!l.subRecipeId) continue;"""
assert antigo in s, 'a descida nao esta onde se esperava'
novo = """    if (!l.subRecipeId) continue;
    folhas.set(l.subRecipeId, (folhas.get(l.subRecipeId) ?? 0) + quantidade);
    if (profundidade >= 0) continue;"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYARVORE
correr /tmp/bossaos-snav-arvore.txt
exigir_vermelho "caiu a árvore: o prato desconta a receita em vez do frigorífico" \
  'cada folha é um INSUMO' 'não são insumos do frigorífico' /tmp/bossaos-snav-arvore.txt
repor "$MOTOR"

echo
echo "4. CONTROLO NEGATIVO — a contagem passa a escrever o saldo à mão"
plantar <<'PYSALDO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/inventory/contagem/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '              <Campo rotulo={t.contado} name="contado" type="text" inputMode="numeric" required />'
assert antigo in s, 'o campo do contado nao esta onde se esperava'
novo = antigo + '\n              <Campo rotulo={t.saldo} name="saldo" type="text" inputMode="numeric" />'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYSALDO
correr /tmp/bossaos-snav-saldo.txt
exigir_vermelho "caiu a ausência: o saldo voltou a ser uma coluna que se escreve" \
  'a contagem lança um AJUSTE' 'há um campo saldo' /tmp/bossaos-snav-saldo.txt
repor "$CONTAGEM"

echo
echo "5. CONTROLO NEGATIVO — a transferência aceita a própria unidade como destino"
plantar <<'PYTRANSF' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/inventory/transferencia/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '          {unidades.filter((u) => u.id !== base.unidade.id)'
assert antigo in s, 'o filtro do destino nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '          {unidades.filter(() => true)', 1))
PYTRANSF
correr /tmp/bossaos-snav-transf.txt
exigir_vermelho "caiu o destino: transferir para si mesmo, dois movimentos que se anulam" \
  'a transferência escolhe a unidade de DESTINO' 'aparece como destino' \
  /tmp/bossaos-snav-transf.txt
repor "$TRANSF"

echo
echo "6. CONTROLO NEGATIVO — o stock sai da tabela de destinos e fica sem porta"
plantar <<'PYPORTA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/ir/[modulo]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "  stock: { rotulo: (m) => m.navegacao.inventario, caminho: 'inventory' },\n"
assert antigo in s, 'o destino do stock nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPORTA
correr /tmp/bossaos-snav-porta.txt
exigir_vermelho "caiu a porta: doze telas que só se alcançam a escrever o endereço" \
  'chega-se ao stock por cliques' '' /tmp/bossaos-snav-porta.txt
repor "$MODULO"

echo
echo "7. CONTROLO NEGATIVO — a semeadura deixa de plantar a SUB-RECEITA"
plantar <<'PYSUB' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    await prisma.recipeLine.create({
      data: {
        organizationId: IDS.orgA, recipeId: prato.id, subRecipeId: molho.id,
        quantidadeMili: BigInt(500_000),
      },
    });"""
assert antigo in s, 'a linha da sub-receita nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYSUB
correr /tmp/bossaos-snav-sub.txt
# Sem a sub-receita, a ficha medida fica de UM nível — e num nível as linhas e
# as folhas são a mesma lista. O caso da árvore passaria a medir uma igualdade
# trivial, e é isso que este controlo prova que não acontece em silêncio.
exigir_vermelho "caiu o par: sem árvore semeada, a prova da árvore não tem o que medir" \
  'a ficha com sub-receita tem MAIS folhas' 'não tem linhas' /tmp/bossaos-snav-sub.txt
repor "$SEMENTE"

echo
echo "8. CONTROLO NEGATIVO — a semeadura deixa de plantar o AJUSTE"
plantar <<'PYAJUSTE' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """        { organizationId: IDS.orgA, itemId: azeite.id, tipo: 'AJUSTE',
          quantidadeMili: BigInt(120_000), motivo: 'contagem de segunda-feira' },"""
assert antigo in s, 'o ajuste semeado nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYAJUSTE
correr /tmp/bossaos-snav-ajuste.txt
exigir_vermelho "caiu a população: a reconciliação media uma lista vazia a dizer verde" \
  'declara quantos insumos, quantos movimentos e quantas fichas' \
  'não havia ajuste nenhum' /tmp/bossaos-snav-ajuste.txt
repor "$SEMENTE"

echo
echo "9. Reposto"
if correr /tmp/bossaos-snav-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-snav-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "NÃO REPÔS — o artefacto ficou com defeito plantado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-snav-reposto.txt | grep -E '✘' | head -8
fi

CHEGOU_AO_FIM=1
echo
echo "$falhas falhas"
[[ "$falhas" -eq 0 ]]

#!/usr/bin/env bash
#
# E26 fatia 2 — as 6 telas, no navegador.
#
# O controlo que mais vale é o 2: colapsar os três números num só. Nada estoira,
# nada dá erro, e a encomenda parece fechada quando faltam dois sacos — a casa
# paga 10 e recebeu 8, e só descobre se alguém for contar.
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

CONFERIR='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/purchases/[purchaseOrderId]/page.tsx'
NOVA='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/purchases/nova/page.tsx'
FORNECEDOR='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/suppliers/[supplierId]/page.tsx'
CUSTOS='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/purchases/custos/page.tsx'
MODULO='apps/web/app/[idioma]/app/[orgSlug]/ir/[modulo]/page.tsx'
MOTOR=packages/db/src/compras.ts
SEMENTE=packages/db/prisma/semente-inspeccao.ts
SPEC=inspeccao/compras.spec.ts
FICHEIROS=("$CONFERIR" "$NOVA" "$FORNECEDOR" "$CUSTOS" "$MODULO" "$MOTOR" "$SEMENTE" "$SPEC")
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
  pnpm exec playwright test --project=preparar --project=painel compras.spec.ts \
    --workers=1 --reporter=list >"$1" 2>&1
}

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
if correr /tmp/bossaos-cnav-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-cnav-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "as telas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-cnav-ligado.txt | grep -E '✘' | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — os três números colapsam num só"
plantar <<'PYTRES' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/purchases/[purchaseOrderId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '            <span data-teste="recebido">{String(c.recebidoMili)}</span>'
assert antigo in s, 'a coluna do recebido nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, '            <span data-teste="recebido">{String(c.encomendadoMili)}</span>', 1))
PYTRES
correr /tmp/bossaos-cnav-tres.txt
exigir_vermelho "caiu a distinção: a encomenda parece fechada com dois sacos a menos" \
  'mostra encomendado, recebido E facturado' \
  'os três números são um só' /tmp/bossaos-cnav-tres.txt
repor "$CONFERIR"

echo
echo "3. CONTROLO NEGATIVO — a diferença deixa de aparecer no ecrã"
plantar <<'PYDIF' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/purchases/[purchaseOrderId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '            {c.diferencaRecepcao === 0n ? null : ('
assert antigo in s, 'a diferenca da recepcao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '            {true ? null : (', 1))
PYDIF
correr /tmp/bossaos-cnav-dif.txt
exigir_vermelho "caiu a falta: chegou a menos e o ecrã não o diz" \
  'a diferença aparece com o SINAL' \
  'a falta não aparece como falta' /tmp/bossaos-cnav-dif.txt
repor "$CONFERIR"

echo
echo "4. CONTROLO NEGATIVO — o ecrã marca SEMPRE divergência"
plantar <<'PYSEMPRE' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/purchases/[purchaseOrderId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '            {c.diferencaFactura === 0n ? null : ('
assert antigo in s, 'a diferenca da factura nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '            {false ? null : (', 1))
PYSEMPRE
correr /tmp/bossaos-cnav-sempre.txt
exigir_vermelho "caiu o par: a casa reclamava de uma entrega que estava certa" \
  'a linha que BATE não mostra diferença nenhuma' \
  'o produto marca-a sempre' /tmp/bossaos-cnav-sempre.txt
repor "$CONFERIR"

echo
echo "5. CONTROLO NEGATIVO — a tela de encomendar ganha um botão de RECEBER"
# ── É este que a régua pede por nome, do lado do ecrã ──────────────────────
#
# A encomenda passa a poder dar entrada, e a cozinha vê farinha que está dentro
# de um camião. Repare-se que nada estoira: o formulário até funciona.
plantar <<'PYENC' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/purchases/nova/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '        <input type="hidden" name="accao" value="criar_encomenda" />'
assert antigo in s, 'a accao da encomenda nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, antigo + '\n        <input type="hidden" name="accao" value="receber" />', 1))
PYENC
correr /tmp/bossaos-cnav-receber.txt
exigir_vermelho "caiu a porta do stock: a encomenda passou a dar entrada" \
  'NÃO tem botão de dar entrada' \
  'a farinha entrava ainda no camião' /tmp/bossaos-cnav-receber.txt
repor "$NOVA"

echo
echo "6. CONTROLO NEGATIVO — o factor de conversão desaparece do ecrã"
plantar <<'PYFACTOR' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/suppliers/[supplierId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '              <span data-teste="factor">{String(a.factorMili)}</span>'
assert antigo in s, 'a coluna do factor nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, '              <span data-teste="factor">1</span>', 1))
PYFACTOR
correr /tmp/bossaos-cnav-factor.txt
exigir_vermelho "caiu a embalagem: o saco de 25 kg aparece como uma unidade" \
  'o artigo mostra a embalagem E o factor' \
  'o saco entra como uma unidade' /tmp/bossaos-cnav-factor.txt
repor "$FORNECEDOR"

echo
echo "7. CONTROLO NEGATIVO — o custeio deixa de dizer qual é"
plantar <<'PYMETODO' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/purchases/custos/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="metodo">{t.metodo}</p>'
assert antigo in s, 'o metodo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, '      <p data-teste="metodo">{t.custo}</p>', 1))
PYMETODO
correr /tmp/bossaos-cnav-metodo.txt
exigir_vermelho "caiu o método: um custeio implícito não se reproduz" \
  'nomeia a média ponderada' \
  'não diz qual é o método' /tmp/bossaos-cnav-metodo.txt
repor "$CUSTOS"

echo
echo "8. CONTROLO NEGATIVO — as compras saem da tabela de destinos"
plantar <<'PYPORTA' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/ir/[modulo]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "  compras: { rotulo: (m) => m.comprasE26.compras, caminho: 'purchases' },\n"
assert antigo in s, 'o destino das compras nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPORTA
correr /tmp/bossaos-cnav-porta.txt
exigir_vermelho "caiu a porta: seis telas que só se alcançam a escrever o endereço" \
  'chega-se às compras por cliques' '' /tmp/bossaos-cnav-porta.txt
repor "$MODULO"

echo
echo "9. CONTROLO NEGATIVO — a semeadura deixa de plantar a linha que BATE"
plantar <<'PYPAR' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    const recebidaGarrafa = await prisma.receiptLine.create({
      data: {
        organizationId: IDS.orgA, receiptId: recepcao.id,
        purchaseOrderLineId: linhaGarrafa.id,
        recebidoMili: BigInt(4_000_000), custoTotalMenor: BigInt(8_800),
      },
    });"""
assert antigo in s, 'a linha que bate nao esta onde se esperava'
novo = """    const recebidaGarrafa = await prisma.receiptLine.create({
      data: {
        organizationId: IDS.orgA, receiptId: recepcao.id,
        purchaseOrderLineId: linhaGarrafa.id,
        recebidoMili: BigInt(3_000_000), custoTotalMenor: BigInt(8_800),
      },
    });"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYPAR
correr /tmp/bossaos-cnav-par.txt
# Sem uma linha que bate, «marca sempre divergência» passava despercebido: as
# duas linhas divergiriam e o par não teria o que medir.
exigir_vermelho "caiu o par semeado: sem uma linha certa, «diverge sempre» passava" \
  'a linha que BATE não mostra diferença nenhuma' \
  'o produto marca-a sempre' /tmp/bossaos-cnav-par.txt
repor "$SEMENTE"

echo
echo "10. Reposto"
if correr /tmp/bossaos-cnav-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-cnav-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "NÃO REPÔS — o artefacto ficou com defeito plantado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-cnav-reposto.txt | grep -E '✘' | head -8
fi

CHEGOU_AO_FIM=1
echo
echo "$falhas falhas"
[[ "$falhas" -eq 0 ]]

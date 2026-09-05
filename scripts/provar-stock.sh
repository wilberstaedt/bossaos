#!/usr/bin/env bash
#
# E25 fatia 1 — stock e fichas, com o defeito plantado no artefacto REAL.
#
# O controlo que mais vale é o 2: largar o gatilho que repõe o saldo. Nada
# estoira e nada dá erro — e um `UPDATE` à mão passa a ficar. O sintoma não é um
# erro: é uma contagem que não bate ao fim do mês sem ninguém saber desde quando.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

STOCK=packages/db/src/stock.ts
PROVA=provas/stock.test.ts
MIGRACAO=packages/db/prisma/migrations/20260910800000_e25_stock_e_fichas/migration.sql
PRODUCAO=packages/db/src/producao.ts
FICHEIROS=("$STOCK" "$PROVA" "$PRODUCAO")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
DROP TRIGGER IF EXISTS "movimentos_derivam_saldo" ON "stock_movements";
DROP TRIGGER IF EXISTS "saldo_de_stock_nao_se_escreve" ON "stock_items";
DROP TRIGGER IF EXISTS "linhas_de_ficha_recusam_ciclo" ON "recipe_lines";
ALTER TABLE "recipe_lines" DROP CONSTRAINT IF EXISTS "linha_aponta_a_um_so";
PSQL
  # Lido da FONTE, e não de um SQL escrito ao lado — a lição do E19.
  python3 scripts/extrair-sql.py "$MIGRACAO" 'CREATE OR REPLACE FUNCTION|CREATE TRIGGER' \
    | psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 >/dev/null 2>&1
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "recipe_lines" ADD CONSTRAINT "linha_aponta_a_um_so" CHECK (
  ("item_id" IS NOT NULL AND "sub_recipe_id" IS NULL)
  OR ("item_id" IS NULL AND "sub_recipe_id" IS NOT NULL));
PSQL
}

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  repor_base
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { node --test --test-reporter=tap --experimental-strip-types "$PROVA" >"$1" 2>&1; }

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
  if grep -qE "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX|SyntaxError|Cannot find" <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — é um ficheiro partido"
    grep -E "SyntaxError|Cannot find" <<<"$limpo" | head -3; return
  fi
  if ! grep -qE '^# fail [1-9]' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qE "not ok [0-9]+ - .*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E "^ +not ok [0-9]+ - " <<<"$limpo" | head -4; return
  fi
  if [[ -n "$erro" ]] && ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E "error: '" <<<"$limpo" | head -3; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-stock-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-stock-ligado.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "as provas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-stock-ligado.txt \
    | grep -E "^ +not ok|error: '" | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o saldo escrito à mão passa a FICAR"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP TRIGGER IF EXISTS "saldo_de_stock_nao_se_escreve" ON "stock_items"' >/dev/null 2>&1
correr /tmp/bossaos-stock-escrita.txt
exigir_vermelho "caiu a derivação: a contagem passa a mentir sem ninguém saber" \
  'escrever o saldo de fora é SUBSTITUÍDO' 'a contagem passa a mentir' \
  /tmp/bossaos-stock-escrita.txt
repor_base

echo
echo "3. CONTROLO NEGATIVO — o saldo deixa de ser recalculado nos movimentos"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP TRIGGER IF EXISTS "movimentos_derivam_saldo" ON "stock_movements"' >/dev/null 2>&1
correr /tmp/bossaos-stock-saldo.txt
exigir_vermelho "caiu o gatilho: os movimentos deixaram de mover o saldo" \
  'a soma dos movimentos é o saldo' '' /tmp/bossaos-stock-saldo.txt
repor_base

echo
echo "4. CONTROLO NEGATIVO — o consumo deixa de descer às FOLHAS"
plantar <<'PYFOLHAS' || true
import io
p = 'packages/db/src/stock.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    const dentro = await folhasDaFicha(
      db, l.subRecipeId, quantidade / Number(sub.rendeMili), profundidade + 1,
    );
    for (const [item, q] of dentro) folhas.set(item, (folhas.get(item) ?? 0) + q);"""
assert antigo in s, 'a descida da arvore nao esta onde se esperava'
# A sub-receita passa a contar como se fosse um insumo: descontar «1 molho»
# desconta uma coisa que ninguem comprou.
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo,
    """    void sub;
    folhas.set(l.subRecipeId, (folhas.get(l.subRecipeId) ?? 0) + quantidade);""", 1))
PYFOLHAS
correr /tmp/bossaos-stock-folhas.txt
exigir_vermelho "caiu a árvore: a sub-receita entrou como se fosse um insumo" \
  'a sub-receita desconta as FOLHAS' 'entrou como se fosse um insumo' \
  /tmp/bossaos-stock-folhas.txt
cp "${COPIAS[0]}" "$STOCK"

echo
echo "5. CONTROLO NEGATIVO — o ciclo deixa de ser recusado na ESCRITA"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP TRIGGER IF EXISTS "linhas_de_ficha_recusam_ciclo" ON "recipe_lines"' >/dev/null 2>&1
correr /tmp/bossaos-stock-ciclo.txt
exigir_vermelho "caiu a guarda do ciclo: em serviço isto seria o sistema a parar" \
  'ficha que se refere a si própria é recusada' 'Missing expected rejection' \
  /tmp/bossaos-stock-ciclo.txt
repor_base

echo
echo "6. CONTROLO NEGATIVO — a mesma linha passa a consumir DUAS vezes"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP INDEX IF EXISTS "um_consumo_por_linha_e_insumo"' >/dev/null 2>&1
correr /tmp/bossaos-stock-duplo.txt
# ── O que cai, e o que NÃO cai ──────────────────────────────────────────
#
# Sem o índice, o `skipDuplicates` deixa de ter conflito a que se agarrar e o
# segundo consumo entra — mas a asserção que dispara é a do `jaEstava`, e não a
# da contagem. A defesa que se perde é a da IDENTIDADE; o resto do caso continua
# a medir o que media.
exigir_vermelho "caiu a identidade: servir duas vezes descontou duas vezes" \
  'servir DUAS vezes a mesma linha é UM só consumo' '' \
  /tmp/bossaos-stock-duplo.txt
psql "$MIGRATION_DATABASE_URL" -q -c \
  'CREATE UNIQUE INDEX IF NOT EXISTS "um_consumo_por_linha_e_insumo" ON "stock_movements" ("order_line_id", "item_id") WHERE "order_line_id" IS NOT NULL AND "tipo" = '"'"'CONSUMO'"'"'' >/dev/null 2>&1

echo
echo "7. CONTROLO NEGATIVO — o negativo deixa de aparecer na dívida"
plantar <<'PYDIVIDA' || true
import io
p = 'packages/db/src/stock.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    where: { locationId, saldoMili: { lt: 0 } },"
assert antigo in s, 'a lista de divida nao esta onde se esperava'
# O negativo continua a acontecer — deixa e' de se VER. É a terceira saída, a
# única que a régua reprova.
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "    where: { locationId, saldoMili: { lt: -999_999_999 } },", 1))
PYDIVIDA
correr /tmp/bossaos-stock-divida.txt
exigir_vermelho "caiu a visibilidade: negativo silencioso, a saída que a régua reprova" \
  'ele APARECE na lista de dívida' 'não aparece em lado nenhum' \
  /tmp/bossaos-stock-divida.txt
cp "${COPIAS[0]}" "$STOCK"

echo
echo "8. CONTROLO NEGATIVO — a quantidade aceita decimais"
plantar <<'PYQ' || true
import io
p = 'packages/db/src/stock.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (!Number.isInteger(dados.quantidadeMili) || dados.quantidadeMili <= 0) {"
assert antigo in s, 'a guarda da quantidade nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "  if (dados.quantidadeMili <= 0) {", 1))
PYQ
correr /tmp/bossaos-stock-decimal.txt
# ── A recusa continua a acontecer, e PERDE O NOME ───────────────────────
#
# Sem a guarda do motor, o `BigInt(1.5)` atira na conversão e a base recusa na
# mesma. A defesa não desaparece — desaparece a FRASE: quem lê recebe um erro de
# conversão em vez de `QUANTIDADE_INVALIDA`. É a mesma distinção do E24:
# degrada-se a legibilidade do erro, não a segurança.
exigir_vermelho "caiu o nome da recusa: virou erro de conversão em vez de frase" \
  'quantidade não inteira é recusada' '' /tmp/bossaos-stock-decimal.txt
cp "${COPIAS[0]}" "$STOCK"

echo
echo "9. CONTROLO NEGATIVO — o PAR da árvore legítima desaparece da prova"
# Sem o par, «recusa tudo» passava os três casos de ciclo.
plantar <<'PYPAR' || true
import io
p = 'provas/stock.test.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    assert.equal(rows[0].n, 2, 'a guarda do ciclo recusou uma árvore legítima');"
assert antigo in s, 'o par da arvore legitima nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, "    assert.equal(rows[0].n, 0, 'PLANTE');", 1))
PYPAR
correr /tmp/bossaos-stock-par.txt
exigir_vermelho "caiu o par: sem ele «recusa tudo» passava os três ciclos" \
  'árvore legítima e profunda PASSA' 'PLANTE' /tmp/bossaos-stock-par.txt
cp "${COPIAS[1]}" "$PROVA"

echo
echo "10. CONTROLO NEGATIVO — o KDS deixa de CHAMAR o consumo"
# ── Este plante apaga a CHAMADA, e não o comportamento ────────────────────
#
# É a lição do E24, e a dívida que o E23 deixou: uma função certa que ninguém
# chama passa todos os testes da função. A 05/09 a varredura de alcance apanhou
# o `consumirPelaLinha` com ZERO chamadores — o motor de stock estava escrito,
# provado, e desligado. Servir um prato não mexia no frigorífico.
#
# Tirar a chamada tem de fazer o grupo 6 ficar vermelho. Se não fizer, o que o
# grupo 6 está a medir é o consumo directo, e a ligação nunca foi provada.
plantar <<'PYCHAMADA' || true
import io
p = 'packages/db/src/producao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (dados.para === 'ENTREGUE') {"
assert antigo in s, 'a chamada do consumo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "  if (false && dados.para === 'ENTREGUE') {", 1))
PYCHAMADA
correr /tmp/bossaos-stock-chamada.txt
exigir_vermelho "caiu o alcance: o motor de stock ficou desligado do produto" \
  'marcar ENTREGUE desconta as folhas' \
  'o motor está desligado do produto' /tmp/bossaos-stock-chamada.txt
cp "${COPIAS[2]}" "$PRODUCAO"

echo
echo "11. CONTROLO NEGATIVO — o recall passa a descontar outra vez"
plantar <<'PYRECALL' || true
import io
p = 'packages/db/src/stock.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      skipDuplicates: true,"
assert antigo in s, 'o skipDuplicates nao esta onde se esperava'
# Sem `orderLineId` o indice unico parcial nao pega, e o segundo consumo entra.
antigo2 = "        actor: dados.actor ?? null, orderLineId: dados.orderLineId,"
assert antigo2 in s, 'o orderLineId nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo2, "        actor: dados.actor ?? null, orderLineId: null,", 1))
PYRECALL
correr /tmp/bossaos-stock-recall.txt
exigir_vermelho "caiu a identidade: o recall descontou o prato uma segunda vez" \
  'o RECALL não desconta outra vez' \
  'descontou o prato uma segunda vez' /tmp/bossaos-stock-recall.txt
cp "${COPIAS[0]}" "$STOCK"

echo
echo "12. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-stock-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-stock-reposto.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-stock-reposto.txt \
    | grep -E "^ +not ok|error: '" | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

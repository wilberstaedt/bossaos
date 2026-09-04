#!/usr/bin/env bash
#
# E14 — motor de pedidos e entrega confiável.
#
# A régua diz que os três aceites são três formas de a mesma coisa falhar: duas
# escritas que se encontram. E nomeia, para cada uma, o defeito que passa
# despercebido — porque **não dá erro nenhum**:
#
#   1. idempotência por consulta prévia em vez de restrição única;
#   2. ler o pedido, juntar o item, gravar o pedido inteiro — a última escrita
#      ganha e o item do outro desaparece em silêncio;
#   3. preço lido ao fechar a conta, e carrinho limpo ao rejeitar um esgotado.
#
# Sete defeitos plantados, um de cada vez. Nenhum deles produz erro em produção —
# é por isso que têm de produzir vermelho aqui.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

GRUPOS_ESPERADOS=3
CASOS_ESPERADOS=21
falhas=0

PEDIDOS=packages/db/src/pedidos.ts
SQL_E14=packages/db/prisma/migrations/20260904230000_e14_pedidos/migration.sql
ORIG=$(mktemp)
cp "$PEDIDOS" "$ORIG"
BASE_MEXIDA=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# Repor SEMPRE. Um script morto a meio deixaria a base sem o índice único do
# `command_id` — e o reenvio depois do commit passaria a cobrar duas vezes, em
# silêncio, até alguém reparar. Foi assim que uma corrida morta do E13 deixou uma
# função da base com defeito plantado e mandou duas provas para o sítio errado.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
DROP INDEX IF EXISTS "order_submissions_command_id_key";
CREATE UNIQUE INDEX "order_submissions_command_id_key" ON "order_submissions"("command_id");
DROP TRIGGER IF EXISTS linha_aceite_imutavel ON "order_lines";
CREATE TRIGGER linha_aceite_imutavel
  BEFORE UPDATE ON "order_lines"
  FOR EACH ROW EXECUTE FUNCTION linha_aceite_nao_muda_de_preco();
ALTER TABLE "order_lines" DROP CONSTRAINT IF EXISTS "componente_de_combo_nao_tem_preco";
ALTER TABLE "order_lines" ADD CONSTRAINT "componente_de_combo_nao_tem_preco"
  CHECK ("linha_pai_id" IS NULL OR "preco_menor" IS NULL);
PSQL
}

restaurar() {
  cp "$ORIG" "$PEDIDOS"; rm -f "$ORIG"
  if [[ "$BASE_MEXIDA" == "1" ]]; then
    repor_base; BASE_MEXIDA=0
    printf '  (o índice único e o gatilho foram repostos)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() { node --test --test-reporter=tap --experimental-strip-types provas/pedidos.test.ts >"$1" 2>&1; }

analisar() {
  local f="$1" grupos casos
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  casos=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$casos" ]] || return 2
  echo "$grupos $casos"
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    return
  fi
  if grep -qE "^ *not ok .*$marcador" "$ficheiro"; then
    verde "$nome"
  else
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '^ *not ok' "$ficheiro" | head -4
  fi
}

echo "0. Fixtures"
if node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; then
  verde "semeadas"
else
  vermelho "não foi possível semear"; exit 1
fi

echo
echo "1. Com tudo ligado"
if correr /tmp/bossaos-pedidos-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-pedidos-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $casos casos (esperados $CASOS_ESPERADOS)"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-pedidos-ligado.txt | head -12
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o índice único do command_id desaparece"
# É O controlo do aceite 1. Sem o índice, o reenvio depois do commit cria um
# segundo envio — e é isso que mostra que quem garante é a BASE, e não uma
# consulta prévia que o código nem sequer faz.
psql "$MIGRATION_DATABASE_URL" -q -c 'DROP INDEX IF EXISTS "order_submissions_command_id_key";' >/dev/null 2>&1
BASE_MEXIDA=1
exigir_vermelho "caiu o reenvio com a mesma chave" \
  'o mesmo command_id duas vezes' /tmp/bossaos-pedidos-sem-indice.txt
if grep -q 'not ok.*duas chaves DIFERENTES' /tmp/bossaos-pedidos-sem-indice.txt; then
  vermelho "o PAR também caiu — o controlo não distingue as duas regras"
else
  verde "e o PAR aguentou: duas chaves diferentes continuam a criar dois pedidos"
fi
repor_base; BASE_MEXIDA=0

echo
echo "3. CONTROLO NEGATIVO — o resumo do corpo deixa de contar"
# A mesma chave com corpo diferente passaria por repetição, e um pedido legítimo
# desaparecia com um "já tratado".
python3 - <<'PYHASH'
import io
p = 'packages/db/src/pedidos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      if (existente.payloadHash !== resumo) {"
assert antigo in s, 'a comparacao do resumo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "      if (false) {"))
PYHASH
exigir_vermelho "caiu o conflito de chave com corpo diferente" \
  'corpo DIFERENTE é conflito' /tmp/bossaos-pedidos-hash.txt
cp "$ORIG" "$PEDIDOS"

echo
echo "4. CONTROLO NEGATIVO — acrescentar passa a reescrever o pedido inteiro"
# O padrão que perde trabalho em silêncio, e o mais natural de escrever.
python3 - <<'PYADD'
import io
p = 'packages/db/src/pedidos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    await db.orderLine.createMany({
      data: veredictos.map((v) => ({
        organizationId, orderId: pedido.id,"""
assert antigo in s, 'o acrescento nao esta onde se esperava'
novo = """    // ler tudo, juntar, gravar tudo: a ultima escrita ganha
    await db.orderLine.deleteMany({ where: { orderId: pedido.id } });
    await db.orderLine.createMany({
      data: veredictos.map((v) => ({
        organizationId, orderId: pedido.id,"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYADD
exigir_vermelho "caiu o acrescento em paralelo" \
  'os dois itens ficam lá' /tmp/bossaos-pedidos-aditivo.txt
cp "$ORIG" "$PEDIDOS"

echo
echo "5. CONTROLO NEGATIVO — a versão sai da condição e passa a ser lida antes"
# Ler a versão, comparar em JavaScript e depois gravar é a mesma corrida com a
# janela mais estreita — e o conflito recuperável deixa de acontecer.
python3 - <<'PYVER'
import io
p = 'packages/db/src/pedidos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const escrito = await db.order.updateMany({
    where: { id: dados.orderId, versao: dados.versaoEsperada },
    data: alteracoes,
  });"""
assert antigo in s
novo = """  const escrito = await db.order.updateMany({
    where: { id: dados.orderId },
    data: alteracoes,
  });"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYVER
exigir_vermelho "caiu o conflito recuperável" \
  'versão desactualizada dá CONFLITO' /tmp/bossaos-pedidos-versao.txt
cp "$ORIG" "$PEDIDOS"

echo
echo "6. CONTROLO NEGATIVO — o gatilho da linha aceite desaparece"
psql "$MIGRATION_DATABASE_URL" -q -c 'DROP TRIGGER IF EXISTS linha_aceite_imutavel ON "order_lines";' >/dev/null 2>&1
BASE_MEXIDA=1
exigir_vermelho "caiu a imutabilidade do preço da linha aceite" \
  'a BASE recusa mudar o preço' /tmp/bossaos-pedidos-gatilho.txt
repor_base; BASE_MEXIDA=0

echo
echo "7. CONTROLO NEGATIVO — o carrinho é limpo ao rejeitar"
# «Rejeitar limpando o carrinho é o defeito que faz a pessoa desistir — e passa
# qualquer teste que só verifique a rejeição.»
python3 - <<'PYCAR'
import io
p = 'packages/db/src/pedidos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """      await db.orderLine.createMany({
        data: veredictos.map((v) => ({
          organizationId, orderId, submissionId: submission.id,"""
assert antigo in s
novo = """      await db.orderLine.createMany({
        data: veredictos.filter((v) => v.estado === 'ACEITE').map((v) => ({
          organizationId, orderId, submissionId: submission.id,"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYCAR
exigir_vermelho "caiu a preservação do carrinho" \
  'REJEITADO com o carrinho preservado' /tmp/bossaos-pedidos-carrinho.txt
cp "$ORIG" "$PEDIDOS"

echo
echo "8. CONTROLO NEGATIVO — o preço divergente passa a ser aplicado em silêncio"
# É a decisão de dinheiro desta etapa. Aplicar em silêncio cobra 11 a quem pediu
# ao ver 9 — cumpre a letra do «preço do servidor» e falha a pessoa.
python3 - <<'PYPRECO'
import io
p = 'packages/db/src/pedidos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (
    linha.precoPropostoMenor !== undefined &&
    linha.precoPropostoMenor !== oficial.montanteMenor
  ) {"""
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  if (false) {"))
PYPRECO
exigir_vermelho "caiu a recusa do preço divergente" \
  'preço proposto que divergiu é rejeitado' /tmp/bossaos-pedidos-divergente.txt
cp "$ORIG" "$PEDIDOS"

echo
echo "9. CONTROLO NEGATIVO — o total volta a somar os componentes do combo"
# A regra que cobra a dobrar. Cada linha isolada esta certa; a conta vem ao dobro,
# e ninguem repara porque nada da erro.
python3 - <<'PYCOMBO'
import io
p = 'packages/db/src/pedidos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const aceites = linhas.filter(\n    (l) => l.estado === 'ACEITE' && l.precoMenor !== null && !l.linhaPaiId);"
assert antigo in s, 'o filtro dos componentes nao esta onde se esperava'
novo = "  const aceites = linhas.filter((l) => l.estado === 'ACEITE' && l.precoMenor !== null);"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYCOMBO
# O componente semeado pela prova nao tem preco (a base recusa), por isso tirar o
# filtro sozinho nao muda a soma. O que muda e a segunda porta: sem a restricao da
# BASE, um componente COM preco passa a caber - e e esse o caso que se planta.
psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE "order_lines" DROP CONSTRAINT IF EXISTS "componente_de_combo_nao_tem_preco";' >/dev/null 2>&1
BASE_MEXIDA=1
exigir_vermelho "caiu a recusa de preco no componente de combo" \
  'recusa dar preço a um componente' /tmp/bossaos-pedidos-combo.txt
cp "$ORIG" "$PEDIDOS"
psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE "order_lines" ADD CONSTRAINT "componente_de_combo_nao_tem_preco" CHECK ("linha_pai_id" IS NULL OR "preco_menor" IS NULL);' >/dev/null 2>&1
BASE_MEXIDA=0

echo
echo "10. Reposto — tem de voltar ao verde"
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1
if correr /tmp/bossaos-pedidos-reposto.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-pedidos-reposto.txt)"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "reposto com contagem diferente: $grupos grupos, $casos casos"
  else
    verde "reposto: $grupos grupos, $casos casos"
  fi
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-pedidos-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit "$falhas"

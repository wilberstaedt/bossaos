#!/usr/bin/env bash
#
# E26 fatia 1 — o motor de compras.
#
# O controlo que a régua pede por nome é o 2: fazer a ENCOMENDA mover o stock.
# Nada estoira, nada dá erro, e a cozinha passa a ver farinha que está dentro de
# um camião — faz a mise en place a contar com ela e descobre à hora do serviço.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

COMPRAS=packages/db/src/compras.ts
PROVA=provas/compras.test.ts
MIGRACAO=packages/db/prisma/migrations/20260911900000_e26_compras_e_fornecedores/migration.sql
FICHEIROS=("$COMPRAS" "$PROVA")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }
restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  repor_gatilho
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

# ── Repor o gatilho, e falhar ALTO se não repuser ────────────────────────
#
# O `extrair-sql.py` leva DOIS argumentos: o ficheiro e o padrão. Chamado com um
# só, rebenta com `IndexError` — e a primeira versão disto tinha `2>/dev/null`,
# que engoliu o erro e deixou a base sem gatilho. O guião apanhou-o na reposição
# final, que é para o que ela serve.
repor_gatilho() {
  local sql
  sql=$(python3 scripts/extrair-sql.py "$MIGRACAO" 'CREATE OR REPLACE FUNCTION|CREATE TRIGGER') || {
    vermelho "não consegui extrair o gatilho da migração"; return 1; }
  if [[ -z "$sql" ]]; then vermelho "o extractor devolveu VAZIO — nada foi reposto"; return 1; fi
  psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 <<<"DROP TRIGGER IF EXISTS \"compra_so_entra_por_recepcao\" ON \"stock_movements\"; $sql" >/dev/null
}

correr() {
  node --experimental-strip-types --test provas/compras.test.ts >"$1" 2>&1
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
  if grep -qE 'SyntaxError|Cannot find|ERR_MODULE' <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO CARREGA — é um ficheiro partido"
    grep -E 'SyntaxError|Cannot find' <<<"$limpo" | head -2; return
  fi
  if ! grep -qE '^# fail [1-9]' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qE "not ok .*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E '^ +not ok' <<<"$limpo" | head -4; return
  fi
  if [[ -n "$erro" ]] && ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E "error: " <<<"$limpo" | head -3; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-compras-ligado.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-compras-ligado.txt | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "o motor não está verde com tudo ligado"
  grep -E "^ +not ok|error: " /tmp/bossaos-compras-ligado.txt | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a ENCOMENDA passa a mover o stock"
# ── É este que a régua pede por nome ──────────────────────────────────────
#
# «A cozinha vê farinha que está dentro de um camião.» Repare-se que o defeito
# não dá erro nenhum: o stock sobe, os números batem entre si, e só a contagem
# física o desmente — semanas depois.
plantar <<'PYENC' || true
import io
p = 'packages/db/src/compras.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  return db.purchaseOrderLine.create({
    data: {
      organizationId: dados.organizationId, purchaseOrderId: dados.purchaseOrderId,
      supplierItemId: dados.supplierItemId, encomendadoMili: quanto,
    },
  });"""
assert antigo in s, 'a criacao da linha de encomenda nao esta onde se esperava'
novo = """  const criada = await db.purchaseOrderLine.create({
    data: {
      organizationId: dados.organizationId, purchaseOrderId: dados.purchaseOrderId,
      supplierItemId: dados.supplierItemId, encomendadoMili: quanto,
    },
  });
  const art = await db.supplierItem.findUniqueOrThrow({
    where: { id: dados.supplierItemId },
    select: { factorMili: true, itemId: true, organizationId: true },
  });
  await db.stockMovement.create({
    data: {
      organizationId: art.organizationId, itemId: art.itemId, tipo: 'ENTRADA',
      quantidadeMili: converterParaUso(quanto, art.factorMili),
      motivo: 'compra a caminho',
    },
  });
  return criada;"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYENC
correr /tmp/bossaos-compras-encomenda.txt
exigir_vermelho "caiu a porta do stock: a cozinha vê farinha que está num camião" \
  'criar a encomenda não mexe em NADA' \
  'está num camião' /tmp/bossaos-compras-encomenda.txt
cp "${COPIAS[0]}" "$COMPRAS"

echo
echo "3. CONTROLO NEGATIVO — o saco de 25 kg passa a entrar como UMA unidade"
plantar <<'PYFACTOR' || true
import io
p = 'packages/db/src/compras.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const produto = recebidoMili * factorMili;
  return (produto + UMA_UNIDADE / 2n) / UMA_UNIDADE;"""
assert antigo in s, 'a conversao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  return recebidoMili;", 1))
PYFACTOR
correr /tmp/bossaos-compras-factor.txt
exigir_vermelho "caiu a conversão: stock de 1 onde há 25 000 g, e só o mês o revela" \
  'entra como 25 kg, e não como 1' \
  'o saco entrou como uma unidade' /tmp/bossaos-compras-factor.txt
cp "${COPIAS[0]}" "$COMPRAS"

echo
echo "4. CONTROLO NEGATIVO — a diferença da FACTURA deixa de ser calculada"
plantar <<'PYDIF' || true
import io
p = 'packages/db/src/compras.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      diferencaFactura: facturado - recebido,"
assert antigo in s, 'a diferenca da factura nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "      diferencaFactura: 0n,", 1))
PYDIF
correr /tmp/bossaos-compras-dif.txt
exigir_vermelho "caiu a diferença: paga-se o que não chegou e ninguém o vê" \
  'a factura diz 10 — e vê-se' \
  'cobra o que não chegou' /tmp/bossaos-compras-dif.txt
cp "${COPIAS[0]}" "$COMPRAS"

echo
echo "5. CONTROLO NEGATIVO — as recepções param de SOMAR (fica só a última)"
plantar <<'PYSOMA' || true
import io
p = 'packages/db/src/compras.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    const recebido = l.recebidas.reduce((s, r) => s + r.recebidoMili, 0n);"
assert antigo in s, 'a soma das recepcoes nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, "    const recebido = l.recebidas.at(-1)?.recebidoMili ?? 0n;", 1))
PYSOMA
correr /tmp/bossaos-compras-soma.txt
exigir_vermelho "caiu a parcial: a entrega em duas voltas perdeu a primeira" \
  'duas recepções PARCIAIS somam-se' \
  'as duas voltas não somaram' /tmp/bossaos-compras-soma.txt
cp "${COPIAS[0]}" "$COMPRAS"

echo
echo "6. CONTROLO NEGATIVO — o custo passa a média SIMPLES dos preços"
plantar <<'PYCUSTO' || true
import io
p = 'packages/db/src/compras.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    medioPorUnidadeMenor: quantidade === 0n ? null : (custo * UMA_UNIDADE) / quantidade,"
assert antigo in s, 'a media ponderada nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo,
    "    medioPorUnidadeMenor: linhas.length === 0 ? null : custo / BigInt(linhas.length),", 1))
PYCUSTO
correr /tmp/bossaos-compras-custo.txt
exigir_vermelho "caiu a ponderação: a média deixou de saber quanto entrou de cada vez" \
  'dão a média PONDERADA' \
  'não é ponderada pela quantidade' /tmp/bossaos-compras-custo.txt
cp "${COPIAS[0]}" "$COMPRAS"

echo
echo "7. CONTROLO NEGATIVO — cai o CHECK do factor na base"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'ALTER TABLE "supplier_items" DROP CONSTRAINT "factor_de_compra_tem_de_ser_positivo";' \
  >/dev/null 2>&1
correr /tmp/bossaos-compras-check.txt
exigir_vermelho "caiu a guarda da base: o factor zero passa a caber na tabela" \
  'a BASE recusa-o também' '' /tmp/bossaos-compras-check.txt
psql "$MIGRATION_DATABASE_URL" -q -c \
  'ALTER TABLE "supplier_items" ADD CONSTRAINT "factor_de_compra_tem_de_ser_positivo" CHECK ("factor_mili" > 0);' \
  >/dev/null 2>&1

echo
echo "8. CONTROLO NEGATIVO — cai o índice que faz do reenvio UMA entrada"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP INDEX IF EXISTS "uma_entrada_por_linha_de_recepcao";' >/dev/null 2>&1
correr /tmp/bossaos-compras-idx.txt
exigir_vermelho "caiu a identidade: dois carregares no botão, duas entradas" \
  'é UMA entrada, mesmo em dois carregares' '' /tmp/bossaos-compras-idx.txt
psql "$MIGRATION_DATABASE_URL" -q -c \
  'CREATE UNIQUE INDEX "uma_entrada_por_linha_de_recepcao" ON "stock_movements" ("receipt_line_id") WHERE "receipt_line_id" IS NOT NULL AND "tipo" = '"'"'ENTRADA'"'"';' \
  >/dev/null 2>&1

echo
echo "9. CONTROLO NEGATIVO — cai o gatilho que recusa a entrada sem recepção"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP TRIGGER IF EXISTS "compra_so_entra_por_recepcao" ON "stock_movements";' >/dev/null 2>&1
correr /tmp/bossaos-compras-gatilho.txt
exigir_vermelho "caiu a forma: a entrada de compra sem recepção passou a caber" \
  'recusa uma entrada de COMPRA sem recepção' '' /tmp/bossaos-compras-gatilho.txt
repor_gatilho

echo
echo "10. CONTROLO NEGATIVO — o PAR do «quando bate» sai da prova"
# Sem o par, uma implementação que marcasse SEMPRE divergência passava o caso
# dos três números — e ninguém notava até a casa reclamar de uma entrega certa.
plantar <<'PYPAR' || true
import io
p = 'provas/compras.test.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    assert.equal(c!.diferencaRecepcao, 0n);
    assert.equal(c!.diferencaFactura, 0n);
  });"""
assert antigo in s, 'o par do «quando bate» nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, """    assert.equal(c!.diferencaRecepcao, 0n, 'PLANTE');
  });""", 1))
PYPAR
plantar <<'PYSEMPRE' || true
import io
p = 'packages/db/src/compras.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      diferencaRecepcao: recebido - l.encomendadoMili,"
assert antigo in s, 'a diferenca da recepcao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, "      diferencaRecepcao: (recebido - l.encomendadoMili) + 1n,", 1))
PYSEMPRE
correr /tmp/bossaos-compras-par.txt
exigir_vermelho "caiu o par: «marca sempre divergência» era apanhado pelo caso que bate" \
  'quando bate, não há diferença NENHUMA' 'PLANTE' /tmp/bossaos-compras-par.txt
cp "${COPIAS[0]}" "$COMPRAS"
cp "${COPIAS[1]}" "$PROVA"

echo
echo "11. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-compras-reposto.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-compras-reposto.txt | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E "^ +not ok|error: " /tmp/bossaos-compras-reposto.txt | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

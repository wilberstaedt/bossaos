#!/usr/bin/env bash
#
# E22 fatia 1 — contas e pagamentos, com o defeito plantado no artefacto REAL.
#
# ── O que a régua reprova à cabeça ────────────────────────────────────────
#
# «Não conta: um teste que soma três valores que o próprio teste escolheu para
# somarem certo.» Por isso o primeiro controlo não parte a divisão num caso: tira
# a distribuição do resíduo e obriga a varredura inteira a acender.
#
# E o segundo par é o que separa esta etapa de um sistema que cobra duas vezes:
# sem o limite, duas caixas na última parcela passam as duas.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

DINHEIRO=packages/domain/src/dinheiro.ts
CONTAS=packages/db/src/contas.ts
PROVA=provas/contas.test.ts
ORIG_DINHEIRO=$(mktemp); ORIG_CONTAS=$(mktemp); ORIG_PROVA=$(mktemp)
cp "$DINHEIRO" "$ORIG_DINHEIRO"; cp "$CONTAS" "$ORIG_CONTAS"; cp "$PROVA" "$ORIG_PROVA"

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── Um plante tem de VERIFICAR-SE ────────────────────────────────────────────
#
# Se a âncora já não existe, o `assert` do python dispara, o guião segue, e o
# `exigir_vermelho` corre contra um produto INTACTO: o produto passa, e o guião
# conclui que a asserção é vazia. É uma acusação falsa — e cinco das dez falhas
# do corredor de 06/09 eram exactamente isso.
#
# Aqui o código de saída do plante é lido. Se ele não pegou, a falha é do GUIÃO
# e diz-se assim, em vez de se atribuir ao produto.
plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

restaurar() {
  cp "$ORIG_DINHEIRO" "$DINHEIRO"; cp "$ORIG_CONTAS" "$CONTAS"; cp "$ORIG_PROVA" "$PROVA"
  rm -f "$ORIG_DINHEIRO" "$ORIG_CONTAS" "$ORIG_PROVA"
  repor_base >/dev/null 2>&1 || true
}
trap restaurar EXIT INT TERM

correr() { node --test --test-reporter=tap --experimental-strip-types "$PROVA" >"$1" 2>&1; }

# ── Duas perguntas, e não uma ─────────────────────────────────────────────
#
# O TAP põe o NOME do caso na linha do `not ok` e a mensagem da asserção noutra.
# Um padrão só nunca casa com as duas, e acusa «não foi a asserção esperada»
# mesmo quando foi. Aprendido no E20, à terceira.
exigir_vermelho() {
  local nome="$1" caso="$2" erro="$3" ficheiro="$4"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  if grep -qE "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX|SyntaxError|Cannot find" <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — não é um defeito, é um ficheiro partido"
    grep -E "SyntaxError|error TS|Cannot find" <<<"$limpo" | head -3; return
  fi
  if ! grep -qE "not ok [0-9]+ - .*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E "^ +not ok [0-9]+ - " <<<"$limpo" | head -4; return
  fi
  if ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E "error: '" <<<"$limpo" | head -4; return
  fi
  verde "$nome"
}

# ── Repor a base é reaplicar o que a MIGRAÇÃO diz, e não uma cópia dela ───
#
# No E19 um `repor_base` recriou um índice que a migração tinha removido: uma
# restauração calibrada ao schema de ontem. Aqui reaplica-se o ficheiro da
# migração, que é a fonte, e não um SQL escrito à mão ao lado.
MIGRACAO=packages/db/prisma/migrations/20260907500000_e22_contas_e_pagamentos/migration.sql
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 <<'PSQL'
DROP TRIGGER IF EXISTS "payments_sao_imutaveis" ON "payments";
DROP TRIGGER IF EXISTS "refunds_sao_imutaveis" ON "refunds";
DROP TRIGGER IF EXISTS "ajustes_sao_imutaveis" ON "bill_adjustments";
DROP TRIGGER IF EXISTS "linhas_de_conta_paga_nao_se_mexem" ON "bill_lines";
DROP TRIGGER IF EXISTS "bill_lines_derivam_devido" ON "bill_lines";
DROP TRIGGER IF EXISTS "ajustes_derivam_devido" ON "bill_adjustments";
DROP INDEX IF EXISTS "uma_reversao_por_ajuste";
PSQL
  # ── Extrair, e não «da linha X até ao fim» ──────────────────────────────
  #
  # A primeira versão fazia `sed` da primeira definição até ao fim do ficheiro, e
  # com isso reexecutava `CREATE TRIGGER`s que já existem: o psql abortava no
  # primeiro erro e NUNCA chegava à última definição de `conta_recalcula_devido`
  # — a que sabe de reversões. A restauração ficava a meio e as duas provas da
  # reversão caíam no passo «reposto».
  #
  # É a mesma forma do E19, onde um `repor_base` recriou um índice que a migração
  # tinha removido. Uma restauração que não é lida da fonte é uma segunda fonte.
  #
  # Agora extraem-se apenas os blocos pedidos, respeitando os corpos `$$`, e a
  # ÚLTIMA definição de cada função é a que fica — que é o que o Postgres também
  # faria se corresse o ficheiro inteiro.
  python3 scripts/extrair-sql.py "$MIGRACAO" 'CREATE OR REPLACE FUNCTION|CREATE TRIGGER' \
    | psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1
  psql "$MIGRATION_DATABASE_URL" -q -c \
    'CREATE UNIQUE INDEX IF NOT EXISTS "uma_reversao_por_ajuste" ON "bill_adjustments" ("reverte_id") WHERE "reverte_id" IS NOT NULL' 2>/dev/null
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-contas-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-contas-ligado.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "as provas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-contas-ligado.txt \
    | grep -E "^ +not ok|error: '" | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o resíduo da divisão deixa de ser distribuído"
plantar <<'PYDIV' || true
import io
p = 'packages/domain/src/dinheiro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    montanteMenor: base + (i < resto ? 1 : 0),"
assert antigo in s, 'a distribuicao do residuo nao esta onde se esperava'
# O `void resto` mantem a variavel usada: um defeito que nao compila nao e' um
# defeito plantado. Lição do E20.
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "    montanteMenor: base + (i < 0 ? 1 : 0),", 1)
     .replace("  const resto = total.montanteMenor - base * partes;",
              "  const resto = total.montanteMenor - base * partes;\n  void resto;", 1))
PYDIV
correr /tmp/bossaos-contas-div.txt
exigir_vermelho "caiu a divisão: o cêntimo evaporou-se e ninguém somou o total" \
  'a soma das partes é o total' 'somou' /tmp/bossaos-contas-div.txt
cp "$ORIG_DINHEIRO" "$DINHEIRO"

echo
echo "3. CONTROLO NEGATIVO — a varredura passa a ter só divisões exactas"
# A guarda de leitor cego. Sem ela, uma varredura sem restos passava e não media
# nada — que é a forma de verde vazio que a régua nomeia.
plantar <<'PYVARR' || true
import io
p = 'provas/contas.test.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      for (const partes of [2, 3, 7, 11]) {"
assert antigo in s, 'a varredura nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "      for (const partes of [1]) {", 1))
PYVARR
correr /tmp/bossaos-contas-varr.txt
exigir_vermelho "caiu a guarda do leitor cego: a varredura deixou de ter restos" \
  'a soma das partes é o total' 'a varredura é fraca' /tmp/bossaos-contas-varr.txt
cp "$ORIG_PROVA" "$PROVA"

echo
echo "4. CONTROLO NEGATIVO — o devido deixa de descontar os ajustes"
psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 <<'PSQL'
CREATE OR REPLACE FUNCTION conta_recalcula_devido(a_conta UUID)
RETURNS VOID AS $$
DECLARE bruto INTEGER;
BEGIN
  SELECT COALESCE(SUM("quantidade" * "unitario_menor"), 0) INTO bruto
    FROM "bill_lines" WHERE "bill_id" = a_conta;
  UPDATE "bills" SET "devido_menor" = bruto WHERE "id" = a_conta;
END; $$ LANGUAGE plpgsql;
PSQL
correr /tmp/bossaos-contas-ajuste.txt
exigir_vermelho "caiu a derivação: o desconto deixou de chegar ao devido" \
  'o ajuste entra na conta e o devido desce' 'Expected values to be strictly equal' \
  /tmp/bossaos-contas-ajuste.txt
repor_base

echo
echo "5. CONTROLO NEGATIVO — a última parcela deixa de ter limite"
plantar <<'PYLIM' || true
import io
p = 'packages/db/src/contas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const { devidoMenor, pagoMenor } = await somasDaConta(db, dados.billId);
  if (pagoMenor + dados.montanteMenor > devidoMenor) {
    throw new RecusaDaConta('EXCEDE_O_DEVIDO',
      `${pagoMenor} + ${dados.montanteMenor} passa de ${devidoMenor}`);
  }
"""
assert antigo in s, 'o limite do devido nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYLIM
correr /tmp/bossaos-contas-parcela.txt
exigir_vermelho "caiu o limite: as duas caixas cobraram a mesma parcela" \
  'duas cobranças concorrentes' 'a conta foi cobrada duas vezes' \
  /tmp/bossaos-contas-parcela.txt
cp "$ORIG_CONTAS" "$CONTAS"

echo
echo "6. CONTROLO NEGATIVO — deixa de se reconciliar antes de cobrar outra vez"
plantar <<'PYREC' || true
import io
p = 'packages/db/src/contas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (porResolver) {
    throw new RecusaDaConta('TENTATIVA_POR_RECONCILIAR',
      `a tentativa ${porResolver.id} está ${porResolver.estado}`);
  }
"""
assert antigo in s, 'a guarda do indeterminado nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "  void porResolver;\n", 1))
PYREC
correr /tmp/bossaos-contas-indet.txt
exigir_vermelho "caiu a reconciliação: cobrou-se por cima de uma tentativa em aberto" \
  'com uma tentativa por reconciliar, a seguinte é recusada' \
  'Missing expected rejection' /tmp/bossaos-contas-indet.txt
cp "$ORIG_CONTAS" "$CONTAS"

echo
echo "7. CONTROLO NEGATIVO — o pagamento passa a poder ser reescrito"
psql "$MIGRATION_DATABASE_URL" -q -c 'DROP TRIGGER IF EXISTS "payments_sao_imutaveis" ON "payments"'
correr /tmp/bossaos-contas-imut.txt
exigir_vermelho "caiu a imutabilidade: o histórico do dinheiro passou a editar-se" \
  'editar um pagamento é recusado pela base' 'Missing expected rejection' \
  /tmp/bossaos-contas-imut.txt
repor_base

echo
echo "8. CONTROLO NEGATIVO — a devolução deixa de ter limite no capturado"
plantar <<'PYDEV' || true
import io
p = 'packages/db/src/contas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (devolvido + dados.montanteMenor > pagamento.montanteMenor) {
    throw new RecusaDaConta('EXCEDE_O_CAPTURADO',
      `${devolvido} + ${dados.montanteMenor} passa de ${pagamento.montanteMenor}`);
  }
"""
assert antigo in s, 'o limite da devolucao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYDEV
correr /tmp/bossaos-contas-refund.txt
exigir_vermelho "caiu o limite da devolução: devolveu-se mais do que se capturou" \
  'a devolução é limitada ao capturado' 'Missing expected rejection' \
  /tmp/bossaos-contas-refund.txt
cp "$ORIG_CONTAS" "$CONTAS"

echo
echo "9. CONTROLO NEGATIVO — o troco passa a entrar na receita"
plantar <<'PYTROCO' || true
import io
p = 'packages/db/src/contas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      montanteMenor: tentativa.montanteMenor, recebidoMenor: recebido,"
assert antigo in s, 'a gravacao do pagamento nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo,
    "      montanteMenor: recebido ?? tentativa.montanteMenor, recebidoMenor: recebido,", 1))
PYTROCO
correr /tmp/bossaos-contas-troco.txt
exigir_vermelho "caiu o troco: os 6,55 € entraram na conta como se fossem venda" \
  'dá 6,55 € de troco' 'o troco entrou na receita' /tmp/bossaos-contas-troco.txt
cp "$ORIG_CONTAS" "$CONTAS"

echo
echo "10. CONTROLO NEGATIVO — o mesmo ajuste passa a reverter-se duas vezes"
psql "$MIGRATION_DATABASE_URL" -q -c 'DROP INDEX IF EXISTS "uma_reversao_por_ajuste"'
correr /tmp/bossaos-contas-rev.txt
exigir_vermelho "caiu a unicidade: o desconto voltou ao devido a dobrar" \
  'o mesmo ajuste não se reverte duas vezes' 'Missing expected rejection' \
  /tmp/bossaos-contas-rev.txt
repor_base

echo
echo "11. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-contas-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-contas-reposto.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-contas-reposto.txt \
    | grep -E "^ +not ok|error: '" | head -8
fi

echo
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

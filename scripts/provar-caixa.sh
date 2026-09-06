#!/usr/bin/env bash
#
# E22 fatia 2 — a caixa, com o defeito plantado no artefacto REAL.
#
# «A caixa é dinheiro real de gente real, por isso tudo o que abre, fecha ou
# corrige uma caixa tem de deixar rasto que não se apaga.»
#
# O controlo que mais vale é o 4: sem a guarda da contagem desactualizada, contar
# e depois meter dinheiro na gaveta deixa a contagem errada DEPOIS de assinada — e
# o movimento é legítimo em tudo o resto, que é o que torna o erro silencioso.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

CAIXA=packages/db/src/caixa.ts
PROVA=provas/caixa.test.ts
ORIG_CAIXA=$(mktemp); ORIG_PROVA=$(mktemp)
cp "$CAIXA" "$ORIG_CAIXA"; cp "$PROVA" "$ORIG_PROVA"

MIGRACAO=packages/db/prisma/migrations/20260907510000_e22_caixa/migration.sql

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q <<'PSQL' >/dev/null 2>&1
DROP TRIGGER IF EXISTS "movimentos_sao_imutaveis" ON "cash_movements";
DROP TRIGGER IF EXISTS "acontecimentos_de_caixa_sao_imutaveis" ON "cash_register_events";
DROP TRIGGER IF EXISTS "caixa_fechada_nao_recebe" ON "cash_movements";
PSQL
  # Lido da FONTE, e não de um SQL escrito ao lado — a lição do E19 e desta etapa.
  python3 scripts/extrair-sql.py "$MIGRACAO" 'CREATE OR REPLACE FUNCTION|CREATE TRIGGER' \
    | psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1
  psql "$MIGRATION_DATABASE_URL" -q -c \
    'CREATE UNIQUE INDEX IF NOT EXISTS "um_movimento_por_pagamento" ON "cash_movements" ("payment_id") WHERE "payment_id" IS NOT NULL' >/dev/null 2>&1
}

restaurar() {
  cp "$ORIG_CAIXA" "$CAIXA"; cp "$ORIG_PROVA" "$PROVA"
  rm -f "$ORIG_CAIXA" "$ORIG_PROVA"
  repor_base >/dev/null 2>&1 || true
}
trap restaurar EXIT INT TERM

correr() { node --test --test-reporter=tap --experimental-strip-types "$PROVA" >"$1" 2>&1; }

exigir_vermelho() {
  local nome="$1" caso="$2" erro="$3" ficheiro="$4"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  if grep -qE "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX|SyntaxError|Cannot find" <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — é um ficheiro partido, não um defeito"
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

echo "1. Com tudo ligado"
if correr /tmp/bossaos-caixa-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-caixa-ligado.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "as provas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-caixa-ligado.txt \
    | grep -E "^ +not ok|error: '" | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a correcção passa a somar-se por cima do erro"
python3 - <<'PYCORR'
import io
p = 'packages/db/src/caixa.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const contam = anulados.length ? { registerId, id: { notIn: anulados } } : { registerId };"
assert antigo in s, 'o filtro dos corrigidos nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "  void anulados;\n  const contam = { registerId };", 1))
PYCORR
correr /tmp/bossaos-caixa-corr.txt
exigir_vermelho "caiu a correcção: o movimento errado continuou a contar" \
  'a correcção substitui o movimento' 'somou o errado e a correcção' \
  /tmp/bossaos-caixa-corr.txt
cp "$ORIG_CAIXA" "$CAIXA"

echo
echo "3. CONTROLO NEGATIVO — o cartão passa a entrar na gaveta como notas"
python3 - <<'PYCARTAO'
import io
p = 'packages/db/src/caixa.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (pagamento.meio !== 'DINHEIRO') {
    throw new RecusaDaCaixa('PAGAMENTO_NAO_E_DINHEIRO',
      `${pagamento.meio} não entra na gaveta como notas`);
  }
"""
assert antigo in s, 'a guarda do dinheiro fisico nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYCARTAO
correr /tmp/bossaos-caixa-cartao.txt
exigir_vermelho "caiu a separação: o cartão entrou no caixa físico" \
  'um pagamento com cartão é recusado com nome' 'Missing expected rejection' \
  /tmp/bossaos-caixa-cartao.txt
cp "$ORIG_CAIXA" "$CAIXA"

echo
echo "4. CONTROLO NEGATIVO — a contagem deixa de ter de ser a última palavra"
python3 - <<'PYCONT'
import io
p = 'packages/db/src/caixa.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (depois > 0) {
    throw new RecusaDaCaixa('CONTAGEM_DESACTUALIZADA',
      `${depois} movimento(s) depois da contagem`);
  }
"""
assert antigo in s, 'a guarda da contagem desactualizada nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  void depois;\n", 1))
PYCONT
correr /tmp/bossaos-caixa-tarde.txt
exigir_vermelho "caiu o erro silencioso: fechou com dinheiro entrado depois de contar" \
  'não fecha com um movimento DEPOIS da contagem' 'Missing expected rejection' \
  /tmp/bossaos-caixa-tarde.txt
cp "$ORIG_CAIXA" "$CAIXA"

echo
echo "5. CONTROLO NEGATIVO — a divergência deixa de exigir autorização"
python3 - <<'PYDIV'
import io
p = 'packages/db/src/caixa.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (diferencaMenor !== 0 && !dados.autorizadoPor) {
    throw new RecusaDaCaixa('DIVERGENCIA_SEM_AUTORIZACAO',
      `contado ${contadoMenor}, esperado ${esperadoMenor}`);
  }
"""
assert antigo in s, 'a guarda da divergencia nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYDIV
correr /tmp/bossaos-caixa-diverg.txt
exigir_vermelho "caiu a autorização: a caixa fechou a menos e ninguém assinou" \
  'não fecha com diferença sem autorização' 'Missing expected rejection' \
  /tmp/bossaos-caixa-diverg.txt
cp "$ORIG_CAIXA" "$CAIXA"

echo
echo "6. CONTROLO NEGATIVO — fecha com operações por reconciliar"
python3 - <<'PYPEND'
import io
p = 'packages/db/src/caixa.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (pendentes > 0) {
    throw new RecusaDaCaixa('OPERACOES_PENDENTES', `${pendentes} por reconciliar`);
  }
"""
assert antigo in s, 'a guarda das pendentes nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  void pendentes;\n", 1))
PYPEND
correr /tmp/bossaos-caixa-pend.txt
exigir_vermelho "caiu o silêncio: fechou com uma tentativa em aberto na unidade" \
  'não fecha com uma tentativa de pagamento por reconciliar' 'Missing expected rejection' \
  /tmp/bossaos-caixa-pend.txt
cp "$ORIG_CAIXA" "$CAIXA"

echo
echo "7. CONTROLO NEGATIVO — a caixa fechada volta a receber dinheiro"
psql "$MIGRATION_DATABASE_URL" -q -c 'DROP TRIGGER IF EXISTS "caixa_fechada_nao_recebe" ON "cash_movements"' >/dev/null 2>&1
correr /tmp/bossaos-caixa-fechada.txt
exigir_vermelho "caiu a porta: entrou dinheiro numa gaveta já contada e assinada" \
  'uma caixa fechada não recebe dinheiro' 'Missing expected rejection' \
  /tmp/bossaos-caixa-fechada.txt
repor_base

echo
echo "8. CONTROLO NEGATIVO — o movimento passa a poder ser reescrito"
psql "$MIGRATION_DATABASE_URL" -q -c 'DROP TRIGGER IF EXISTS "movimentos_sao_imutaveis" ON "cash_movements"' >/dev/null 2>&1
correr /tmp/bossaos-caixa-imut.txt
exigir_vermelho "caiu a imutabilidade: o movimento de dinheiro passou a editar-se" \
  'um movimento não se edita nem se apaga' 'Missing expected rejection' \
  /tmp/bossaos-caixa-imut.txt
repor_base

echo
echo "9. CONTROLO NEGATIVO — o fecho passa a poder ser apagado do rasto"
psql "$MIGRATION_DATABASE_URL" -q -c 'DROP TRIGGER IF EXISTS "acontecimentos_de_caixa_sao_imutaveis" ON "cash_register_events"' >/dev/null 2>&1
correr /tmp/bossaos-caixa-rasto.txt
exigir_vermelho "caiu o rasto: o fecho de uma caixa passou a apagar-se" \
  'um acontecimento de caixa não se apaga' 'Missing expected rejection' \
  /tmp/bossaos-caixa-rasto.txt
repor_base

echo
echo "10. CONTROLO NEGATIVO — a tranca sai e o fecho deixa de ser recusa de NEGÓCIO"
# ── As duas garantias não são a mesma coisa dita duas vezes ────────────────
#
# Medido: com o gatilho sozinho, o dinheiro fica certo (um único FECHO) e o
# **ecrã fica errado** — quem perde a corrida recebe um
# `PrismaClientKnownRequestError` com `23514` em vez de `RecusaDaCaixa`, e o
# operador vê um erro de sistema onde devia ler «a caixa já está fechada».
python3 - <<'PYTRANCA'
import io
p = 'packages/db/src/caixa.ts'
s = io.open(p, encoding='utf-8').read()
antigo = '  await db.$queryRaw`SELECT 1 FROM "cash_registers" WHERE "id" = ${dados.registerId}::uuid FOR UPDATE`;'
assert antigo in s, 'a tranca nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYTRANCA
correr /tmp/bossaos-caixa-tranca.txt
exigir_vermelho "caiu a tranca: a recusa virou erro de base em vez de recusa de negócio" \
  'dois fechos concorrentes' 'a recusa não foi de negócio' \
  /tmp/bossaos-caixa-tranca.txt
cp "$ORIG_CAIXA" "$CAIXA"

echo
echo "11. CONTROLO NEGATIVO — o gatilho sai e a BASE aceita dois fechos"
# ── E este mede-se em SQL, não pelo motor ─────────────────────────────────
#
# Com a tranca no `fecharCaixa` a prova em TypeScript fica verde à mesma: ela só
# passa por essa função. O que o gatilho protege é **qualquer outro chamador** —
# SQL directo, outra rota, um trabalho de manutenção. Por isso o controlo entra
# pela porta que a tranca não guarda.
#
# Dentro de uma transacção DESFEITA: nada disto fica na base.
sonda_sql() {
  psql "$MIGRATION_DATABASE_URL" -t -A -v ON_ERROR_STOP=0 <<'PSQL' 2>&1
BEGIN;
  SELECT set_config('app.organization_id', (SELECT organization_id::text FROM cash_registers LIMIT 1), true);
  -- ── A caixa da sonda nasce AQUI, aberta ────────────────────────────────
  -- A primeira versão apanhava `cash_registers LIMIT 1` e calhou uma caixa já
  -- FECHADA das provas anteriores: o gatilho recusava logo o primeiro fecho, e
  -- o controlo teria medido «já estava fechada» em vez de «dois fechos». Uma
  -- caixa nova não depende do que ficou de outra corrida.
  CREATE TEMP TABLE alvo ON COMMIT DROP AS
    SELECT gen_random_uuid() AS id, organization_id, location_id FROM cash_registers LIMIT 1;
  INSERT INTO cash_registers (id, organization_id, location_id, nome, moeda, fundo_menor)
    SELECT id, organization_id, location_id, 'sonda-do-controlo-11', 'EUR', 0 FROM alvo;
  INSERT INTO cash_register_events (id, organization_id, register_id, tipo, actor)
    SELECT gen_random_uuid(), organization_id, id, 'ABERTURA',
           (SELECT id FROM users LIMIT 1) FROM alvo;
  INSERT INTO cash_register_events (id, organization_id, register_id, tipo, actor)
    SELECT gen_random_uuid(), organization_id, id, 'FECHO',
           (SELECT id FROM users LIMIT 1) FROM alvo;
  INSERT INTO cash_register_events (id, organization_id, register_id, tipo, actor)
    SELECT gen_random_uuid(), organization_id, id, 'FECHO',
           (SELECT id FROM users LIMIT 1) FROM alvo;
  SELECT 'DOIS_FECHOS_ACEITES';
ROLLBACK;
PSQL
}
psql "$MIGRATION_DATABASE_URL" -q -c 'DROP TRIGGER IF EXISTS "um_fecho_de_caixa_de_cada_vez" ON "cash_register_events"' >/dev/null 2>&1
SEM_GATILHO="$(sonda_sql)"
# Repor ANTES de julgar: um julgamento que rebente não pode deixar a base sem a
# garantia. A lição do E31, onde um guião morto a meio deixou a base sem a
# restrição única que ele próprio tinha removido.
python3 scripts/extrair-sql.py \
  packages/db/prisma/migrations/20260917970000_e34_um_fecho_de_caixa_de_cada_vez/migration.sql \
  'CREATE OR REPLACE FUNCTION|CREATE TRIGGER' \
  | psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1
COM_GATILHO_SQL="$(sonda_sql)"

if grep -q 'DOIS_FECHOS_ACEITES' <<<"$SEM_GATILHO"; then
  if grep -q 'CAIXA_FECHADA' <<<"$COM_GATILHO_SQL"; then
    verde "caiu o gatilho: a base aceitou dois FECHOS por SQL, e com ele recusa"
  else
    vermelho "com o gatilho reposto, a base CONTINUA a aceitar dois fechos por SQL"
  fi
else
  # Sem o gatilho a base tem de aceitar — se não aceitou, o que está a recusar é
  # outra coisa, e este controlo nunca mediu o gatilho.
  vermelho "sem o gatilho a base já recusava: o controlo mede outra coisa"
  printf '%s\n' "$SEM_GATILHO" | head -3 | sed 's/^/           /'
fi

echo
echo "12. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-caixa-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-caixa-reposto.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-caixa-reposto.txt \
    | grep -E "^ +not ok|error: '" | head -8
fi

echo
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

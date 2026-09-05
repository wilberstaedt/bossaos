#!/usr/bin/env bash
#
# E24 fatia 1 — documentos fiscais, com o defeito plantado no artefacto REAL.
#
# ── O que a régua reprova à cabeça ────────────────────────────────────────
#
# «Uma prova que só use o fornecedor a aceitar. Sem rejeição simulada e sem
# reenvio, não está provado — está demonstrado.»
#
# O controlo que mais vale é o 2: fazer `eDocumentoFiscal` devolver verdadeiro
# para qualquer coisa que exista. Nada estoira, nada dá erro — e um PDF por
# enviar passa a aparecer como documento válido, que é o defeito legal desta
# etapa inteira.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

FISCAL=packages/db/src/fiscal.ts
PROVA=provas/fiscal.test.ts
MIGRACAO=packages/db/prisma/migrations/20260909700000_e24_documentos_fiscais/migration.sql
FICHEIROS=("$FISCAL" "$PROVA")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
DROP TRIGGER IF EXISTS "documentos_fiscais_nao_se_reescrevem" ON "fiscal_documents";
ALTER TABLE "fiscal_documents" DROP CONSTRAINT IF EXISTS "aceite_com_numero";
ALTER TABLE "fiscal_documents" DROP CONSTRAINT IF EXISTS "rejeitado_com_motivo";
DROP INDEX IF EXISTS "um_documento_por_acontecimento";
PSQL
  # Lido da FONTE, e não de um SQL escrito ao lado.
  python3 scripts/extrair-sql.py "$MIGRACAO" 'CREATE OR REPLACE FUNCTION|CREATE TRIGGER' \
    | psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 >/dev/null 2>&1
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "aceite_com_numero"
  CHECK ("estado" <> 'ACEITE' OR length(btrim(COALESCE("numero_provedor", ''))) > 0);
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "rejeitado_com_motivo"
  CHECK ("estado" <> 'REJEITADO' OR length(btrim(COALESCE("motivo_rejeicao", ''))) > 0);
CREATE UNIQUE INDEX IF NOT EXISTS "um_documento_por_acontecimento"
  ON "fiscal_documents" ("organization_id", "acontecimento");
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
if correr /tmp/bossaos-fiscal-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-fiscal-ligado.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "as provas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-fiscal-ligado.txt \
    | grep -E "^ +not ok|error: '" | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — um ficheiro por enviar passa por documento fiscal"
plantar <<'PYPDF' || true
import io
p = 'packages/db/src/fiscal.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return doc.estado === 'ACEITE' && !!doc.numeroProvedor;"
assert antigo in s, 'a pergunta do documento fiscal nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "  void doc;\n  return true;", 1))
PYPDF
correr /tmp/bossaos-fiscal-pdf.txt
exigir_vermelho "caiu a distinção: um PDF por enviar apareceu como se fosse válido" \
  'pendente NÃO é documento fiscal' 'apareceu como se fosse válido' \
  /tmp/bossaos-fiscal-pdf.txt
cp "${COPIAS[0]}" "$FISCAL"

echo
echo "3. CONTROLO NEGATIVO — «aceite» deixa de exigir o número do fornecedor"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'ALTER TABLE "fiscal_documents" DROP CONSTRAINT IF EXISTS "aceite_com_numero"' >/dev/null 2>&1
correr /tmp/bossaos-fiscal-numero.txt
exigir_vermelho "caiu a exigência: «aceite» passou a poder ser «achamos que sim»" \
  'sem número do fornecedor é recusado pela base' 'Missing expected rejection' \
  /tmp/bossaos-fiscal-numero.txt
repor_base

echo
echo "4. CONTROLO NEGATIVO — a identidade do acontecimento desaparece"
# ── Tirar SÓ o índice era bruto demais ──────────────────────────────────
#
# Sem índice, o `ON CONFLICT (...)` não tem a que se agarrar e o Postgres recusa
# TODOS os inserts: caía a suite inteira, e não a deduplicação. O vermelho vinha
# de tudo estar partido, o que não isola nada.
#
# O defeito a sério são as duas metades da garantia a desaparecerem juntas: sem
# índice E sem tratamento de conflito, o segundo pedido cria um segundo
# documento. É isso que se planta.
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP INDEX IF EXISTS "um_documento_por_acontecimento"' >/dev/null 2>&1
plantar <<'PYID' || true
import io
p = 'packages/db/src/fiscal.ts'
s = io.open(p, encoding='utf-8').read()
antigo = '    ON CONFLICT ("organization_id", "acontecimento") DO NOTHING\n'
assert antigo in s, 'o tratamento do conflito nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYID
correr /tmp/bossaos-fiscal-id.txt
exigir_vermelho "caiu a identidade: emitir duas vezes emitiu dois documentos" \
  'o mesmo acontecimento devolve o MESMO documento' 'criou um SEGUNDO documento' \
  /tmp/bossaos-fiscal-id.txt
cp "${COPIAS[0]}" "$FISCAL"
repor_base

echo
echo "5. CONTROLO NEGATIVO — a rejeição deixa de exigir motivo"
plantar <<'PYMOTIVO' || true
import io
p = 'packages/db/src/fiscal.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (!dados.aceite && !dados.motivo?.trim()) {
    throw new RecusaDoFiscal('SEM_MOTIVO', 'uma rejeição sem motivo é um beco');
  }
"""
assert antigo in s, 'a guarda do motivo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYMOTIVO
correr /tmp/bossaos-fiscal-motivo.txt
# ── O que cai, e é uma boa notícia sobre a base ─────────────────────────
#
# Sem a guarda do motor, a recusa continua a acontecer — mas vem do `CHECK` da
# base, e deixa de ter NOME. O caso cai porque a validação da rejeição já não
# reconhece `SEM_MOTIVO`, e não porque nada recusou.
#
# Isso diz uma coisa boa: há defesa nas duas camadas. E diz uma má: sem a do
# motor, quem lê o erro recebe uma violação de restrição em vez de uma frase.
exigir_vermelho "caiu o motivo: a recusa deixou de ter nome e virou erro de base" \
  'rejeição sem motivo é recusada' '' /tmp/bossaos-fiscal-motivo.txt
cp "${COPIAS[0]}" "$FISCAL"

echo
echo "6. CONTROLO NEGATIVO — o documento passa a poder ser reescrito"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP TRIGGER IF EXISTS "documentos_fiscais_nao_se_reescrevem" ON "fiscal_documents"' >/dev/null 2>&1
correr /tmp/bossaos-fiscal-imut.txt
exigir_vermelho "caiu a imutabilidade: um documento fiscal passou a apagar-se" \
  'apagar é recusado pela base' 'Missing expected rejection' \
  /tmp/bossaos-fiscal-imut.txt
repor_base

echo
echo "7. CONTROLO NEGATIVO — a emissão deixa de exigir fornecedor ligado"
plantar <<'PYBLOQ' || true
import io
p = 'packages/db/src/fiscal.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (!conector.activo) {
    throw new RecusaDoFiscal('EMISSAO_BLOQUEADA',
      'sem fornecedor homologado ligado — ver ADR 0002');
  }
"""
assert antigo in s, 'a guarda do bloqueio nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYBLOQ
correr /tmp/bossaos-fiscal-bloq.txt
exigir_vermelho "caiu o bloqueio: emitiu-se sem fornecedor homologado" \
  'conector desligado, recusa e diz que está bloqueada' 'Missing expected rejection' \
  /tmp/bossaos-fiscal-bloq.txt
cp "${COPIAS[0]}" "$FISCAL"

echo
echo "8. CONTROLO NEGATIVO — o encadeamento deixa de apontar ao anterior"
plantar <<'PYCADEIA' || true
import io
p = 'packages/db/src/fiscal.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "            ${dados.acontecimento}, ${anterior?.id ?? null}::uuid)"
assert antigo in s, 'a ligacao ao anterior nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, "            ${dados.acontecimento}, ${null}::uuid)\n    -- void anterior", 1))
PYCADEIA
correr /tmp/bossaos-fiscal-cadeia.txt
exigir_vermelho "caiu a cadeia: o art. 10.1.ñ exige a ligação ao anterior" \
  'segundo documento aponta para o primeiro' 'a cadeia não se formou' \
  /tmp/bossaos-fiscal-cadeia.txt
cp "${COPIAS[0]}" "$FISCAL"

echo
echo "9. CONTROLO NEGATIVO — o PAR do aceite desaparece da prova"
# Sem o par, «mostra tudo como pendente» passava os dois primeiros casos. Este
# controlo mede a PROVA, e não o produto.
plantar <<'PYPAR' || true
import io
p = 'provas/fiscal.test.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    assert.equal(eDocumentoFiscal(doc!), true, 'aceite pela autoridade e não conta');"
assert antigo in s, 'o par do aceite nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, "    assert.equal(eDocumentoFiscal(doc!), false, 'PLANTE');", 1))
PYPAR
correr /tmp/bossaos-fiscal-par.txt
exigir_vermelho "caiu o par: sem ele «mostra tudo como pendente» passava" \
  'aceite COM número do fornecedor É documento fiscal' 'PLANTE' \
  /tmp/bossaos-fiscal-par.txt
cp "${COPIAS[1]}" "$PROVA"

echo
echo "10. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-fiscal-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-fiscal-reposto.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-fiscal-reposto.txt \
    | grep -E "^ +not ok|error: '" | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

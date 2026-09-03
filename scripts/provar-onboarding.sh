#!/usr/bin/env bash
#
# O E06: criar sem duplicar, e "por configurar" como terceira resposta.
#
# O alvo está em `docs/architecture/domain-model.md` e `permissions.md`, os dois
# escritos no E00. E a régua que decide esta etapa está no `README.md` dos
# contratos: **desconhecido é uma resposta**.
#
# Quatro controlos negativos, cada um a desligar UMA camada — e cada um a ter de
# fazer cair a asserção certa, não a prova toda. Uma prova que fica vermelha por
# tudo com qualquer defeito plantado não distingue nada.
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

GRUPOS_ESPERADOS=5
ASSERCOES_ESPERADAS=19
falhas=0
MOTOR=packages/domain/src/horarios.ts
SQL_PORTA=packages/db/prisma/migrations/20260903170000_e06_criar_organizacao/migration.sql
ORIG_MOTOR=$(mktemp); cp "$MOTOR" "$ORIG_MOTOR"
PORTA_ABERTA=0
RLS_DESLIGADO=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# Repor SEMPRE. Um script morto a meio deixaria a política de linha DESLIGADA
# numa tabela de inquilino, ou a porta da criação a duplicar organizações — e
# isso sobrevive a um commit distraído.
restaurar() {
  cp "$ORIG_MOTOR" "$MOTOR"; rm -f "$ORIG_MOTOR"
  if [[ "$PORTA_ABERTA" == "1" ]]; then
    psql "$MIGRATION_DATABASE_URL" -q -f "$SQL_PORTA" >/dev/null 2>&1
    PORTA_ABERTA=0; printf '  (a porta da criação foi reposta)\n'
  fi
  if [[ "$RLS_DESLIGADO" == "1" ]]; then
    psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE schedule_days ENABLE ROW LEVEL SECURITY' >/dev/null 2>&1
    RLS_DESLIGADO=0; printf '  (a política de linha foi religada)\n'
  fi
  # As organizações de prova saem sempre, mesmo que a prova morra a meio.
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
DELETE FROM role_assignments WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'prova-%');
DELETE FROM memberships      WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'prova-%');
DELETE FROM onboarding_progress WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'prova-%');
DELETE FROM idempotency_keys WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'prova-%') OR accao LIKE 'prova.%' OR chave LIKE 'prova-%';
DELETE FROM organizations WHERE slug LIKE 'prova-%';
PY
}
trap restaurar EXIT INT TERM

correr() { node --test --test-reporter=tap --experimental-strip-types provas/onboarding.test.ts >"$1" 2>&1; }

analisar() {
  local f="$1" grupos assercoes
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  assercoes=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$assercoes" ]] || return 2
  echo "$grupos $assercoes"
}

# Exige vermelho E que caia a asserção certa. `^ *not ok` e não só o marcador: o
# nome do teste aparece na linha `ok` e na linha `not ok`, e procurar só o nome
# dava verde a uma execução vermelha por outro motivo. É a lição do E05.
exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if grep -qE "^ *not ok .*$marcador" "$ficheiro"; then
    verde "$nome"
  else
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '^ *not ok' "$ficheiro" | head -4
  fi
}

semear() { node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; }

echo "0. Fixtures"
if semear; then verde "semeadas"; else vermelho "não foi possível semear"; exit 1; fi

echo
echo "1. Com tudo ligado"
if correr /tmp/bossaos-onb-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-onb-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos assercoes <<<"$leitura"
  if (( grupos == 0 )) || (( assercoes == 0 )); then
    vermelho "VERDE COM ZERO MEDIDO: $grupos grupos, $assercoes asserções."; exit 1
  fi
  if (( grupos != GRUPOS_ESPERADOS )) || (( assercoes != ASSERCOES_ESPERADAS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $assercoes asserções (esperadas $ASSERCOES_ESPERADAS)"
    exit 1
  fi
  verde "$grupos grupos verdes, $assercoes asserções"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-onb-ligado.txt | head -12
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a chave de idempotência é ignorada"
# A porta passa a criar sempre. Se a prova continuar verde, o que ela media era
# que a criação funciona — não que repetir não duplica.
semear
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
CREATE OR REPLACE FUNCTION criar_organizacao_com_dono(p_chave text, p_slug text, p_nome text)
RETURNS TABLE (organization_id uuid, criada boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor uuid := app_utilizador_actual(); v_org uuid := gen_random_uuid(); v_membership uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'sem identidade'; END IF;
  IF p_chave IS NULL OR length(trim(p_chave)) = 0 THEN RAISE EXCEPTION 'chave de idempotência em falta'; END IF;
  INSERT INTO organizations (id, slug, nome, updated_at) VALUES (v_org, p_slug || '-' || substr(v_org::text,1,8), p_nome, now());
  INSERT INTO memberships (id, organization_id, user_id, estado, updated_at)
  VALUES (gen_random_uuid(), v_org, v_actor, 'ACTIVO', now()) RETURNING id INTO v_membership;
  INSERT INTO role_assignments (id, organization_id, membership_id, papel, updated_at)
  VALUES (gen_random_uuid(), v_org, v_membership, 'OWNER', now());
  INSERT INTO onboarding_progress (organization_id, passo, updated_at) VALUES (v_org, 1, now());
  RETURN QUERY SELECT v_org, true;
END; $$;
PY
PORTA_ABERTA=1
exigir_vermelho "caiu a asserção da repetição" \
  'a mesma chave duas vezes' /tmp/bossaos-onb-sem-chave.txt
if grep -qE '^ *ok .*chaves DIFERENTES' /tmp/bossaos-onb-sem-chave.txt; then
  verde "chaves diferentes continuaram a criar duas: caiu a idempotência, não a criação"
else
  vermelho "também caiu a criação — o vermelho não vem da idempotência"
fi
psql "$MIGRATION_DATABASE_URL" -q -f "$SQL_PORTA" >/dev/null 2>&1
PORTA_ABERTA=0

echo
echo "3. CONTROLO NEGATIVO — por configurar passa a ler-se como fechado"
# É o defeito exacto que o contrato proíbe, e o que qualquer pessoa escreveria
# sem pensar. Tem de fazer cair as asserções do desconhecido e SÓ essas.
semear
python3 - <<'PY'
import io
p = 'packages/domain/src/horarios.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    return { estado: 'desconhecido', motivo: 'por_configurar' };"
assert antigo in s, 'a resposta desconhecida não está onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    return { estado: 'fechado', motivo: 'dia_fechado' };"))
PY
exigir_vermelho "caiu a asserção do desconhecido" \
  'sem nada configurado' /tmp/bossaos-onb-sem-desconhecido.txt
if grep -qE '^ *ok .*com a sexta declarada fechada' /tmp/bossaos-onb-sem-desconhecido.txt; then
  verde "o lado do 'fechado' continuou verde: é o par que separa os dois"
else
  vermelho "caiu também o 'fechado' — a prova não distingue os dois estados"
fi
cp "$ORIG_MOTOR" "$MOTOR"

echo
echo "4. CONTROLO NEGATIVO — o dia anterior deixa de ser consultado"
semear
python3 - <<'PY'
import io
p = 'packages/domain/src/horarios.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (ontem.estado.tipo === 'aberto') {"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  if (false && ontem.estado.tipo === 'aberto') {"))
PY
exigir_vermelho "caiu a asserção da meia-noite" \
  '20:00-01:00 mantém o sábado' /tmp/bossaos-onb-sem-ontem.txt
cp "$ORIG_MOTOR" "$MOTOR"

echo
echo "5. CONTROLO NEGATIVO — a política de linha dos horários desligada"
semear
psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE schedule_days DISABLE ROW LEVEL SECURITY' >/dev/null 2>&1
RLS_DESLIGADO=1
exigir_vermelho "caiu a asserção do isolamento" \
  'as tabelas novas têm política de linha' /tmp/bossaos-onb-sem-rls.txt
psql "$MIGRATION_DATABASE_URL" -q -c 'ALTER TABLE schedule_days ENABLE ROW LEVEL SECURITY' >/dev/null 2>&1
RLS_DESLIGADO=0

echo
echo "6. Reposto — tem de voltar ao verde"
semear
if correr /tmp/bossaos-onb-reposto.txt; then
  read -r grupos assercoes <<<"$(analisar /tmp/bossaos-onb-reposto.txt)"
  verde "reposto: $grupos grupos, $assercoes asserções"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-onb-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit $(( falhas > 0 ? 1 : 0 ))

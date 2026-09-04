#!/usr/bin/env bash
#
# Correcção 5 do marco E11 — a tela de equipa, e o par que impede o conserto errado.
#
# A tela lia `users` pelo cliente do runtime e rebentava. O revisor escreveu a
# correcção com o par colado a ela:
#
#   > «A tela renderiza E o runtime continua sem conseguir ler `users`
#   >  directamente. Consertar dando permissão ao runtime seria trocar um ecrã
#   >  partido por um buraco de segurança.»
#
# Os controlos negativos deste script são os dois conserto-errados possíveis:
# alargar a política de `users`, e tirar a verificação de quem chama à porta nova.
# Se algum deles passar despercebido, o par não está a medir nada.
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

GRUPOS_ESPERADOS=4
CASOS_ESPERADOS=10
falhas=0

COPIAS=$(mktemp -d)
FUNCOES="$COPIAS/funcoes.sql"
# O retrato sai da BASE VIVA antes de se plantar seja o que for. É a lição que o
# `provar-publico.sh` custou: uma lista de migrações escrita à mão fica para trás,
# e a prova passa a repor a versão errada sem ninguém dar por isso.
psql "$MIGRATION_DATABASE_URL" -tAc "SELECT string_agg(pg_get_functiondef(p.oid), E';\n' ORDER BY p.oid) || ';'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind = 'f'" > "$FUNCOES"
if [[ ! -s "$FUNCOES" ]] || ! grep -q 'CREATE OR REPLACE FUNCTION' "$FUNCOES"; then
  echo "ERRO: não consegui retratar as funções da base." >&2; exit 2
fi
repor_funcoes() { psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$FUNCOES" >/dev/null; }

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

repor_politica() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'SQL'
DROP POLICY IF EXISTS identidade_propria ON users;
CREATE POLICY identidade_propria ON users USING (id = app_utilizador_actual());
SQL
}

restaurar() { repor_funcoes || true; repor_politica; rm -rf "$COPIAS"; }
trap restaurar EXIT INT TERM

correr() {
  node --test --test-timeout=180000 --test-reporter=tap \
    --experimental-strip-types provas/identidades.test.ts >"$1" 2>&1
}

analisar() {
  local f="$1" grupos casos
  grep -q '^TAP version' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  casos=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$casos" ]] || return 2
  echo "$grupos $casos"
}

exigir_vermelho() {
  local descricao="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "ficou VERDE com o defeito plantado — isto não mede o que diz medir"
    return
  fi
  if grep -qE "^ *not ok .*$marcador" "$ficheiro"; then
    verde "$descricao"
  else
    vermelho "ficou vermelho por outro motivo, não por: $descricao"
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
if correr /tmp/bossaos-id.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-id.txt)"
  if [[ "$grupos" == "$GRUPOS_ESPERADOS" && "$casos" == "$CASOS_ESPERADOS" ]]; then
    verde "$grupos grupos verdes, $casos casos"
  else
    vermelho "contagem inesperada: $grupos / $casos (esperava $GRUPOS_ESPERADOS / $CASOS_ESPERADOS)"
  fi
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok' /tmp/bossaos-id.txt | head -8
fi

echo
echo "2. CONSERTO ERRADO Nº1 — alargar a política de \`users\`"
# É a correcção que ocorre primeiro a quem vê a tela partida: deixar o runtime
# ler as identidades todas. A tela ficava de pé, e a separação do E04 caía.
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'SQL'
DROP POLICY IF EXISTS identidade_propria ON users;
CREATE POLICY identidade_propria ON users USING (true);
SQL
exigir_vermelho "caiu a asserção da leitura directa limitada à própria linha" \
  'devolve SÓ a própria linha' /tmp/bossaos-id-politica.txt
repor_politica

echo
echo "3. CONSERTO ERRADO Nº2 — a porta deixa de verificar QUEM CHAMA"
# A porta é `SECURITY DEFINER` e passa por cima do RLS. Sem a verificação, ela
# devolve nome e email de qualquer inquilino a qualquer rota do produto.
psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQL'
CREATE OR REPLACE FUNCTION identidades_da_organizacao(p_organization_id uuid)
RETURNS TABLE (id uuid, email text, nome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $f$
  SELECT u.id, u.email, u.nome FROM public.users u
   WHERE EXISTS (SELECT 1 FROM public.memberships m
                  WHERE m.user_id = u.id AND m.organization_id = p_organization_id)
$f$;
SQL
exigir_vermelho "caiu a asserção de não enumerar a equipa alheia" \
  'organização ALHEIA devolve zero' /tmp/bossaos-id-porta.txt
repor_funcoes

echo
echo "4. CONTROLO NEGATIVO — a porta devolve vazio"
# O oposto: uma porta que não devolve nada «isola» tudo e deixa a tela vazia.
# Sem este caso, o grupo 1 podia estar a medir uma tela que não mostra ninguém.
psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQL'
CREATE OR REPLACE FUNCTION identidades_da_organizacao(p_organization_id uuid)
RETURNS TABLE (id uuid, email text, nome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $f$
  SELECT u.id, u.email, u.nome FROM public.users u WHERE false
$f$;
SQL
exigir_vermelho "caiu a asserção de a tela trazer nome e email" \
  'nome E email' /tmp/bossaos-id-vazia.txt
repor_funcoes

echo
echo "5. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-id-reposto.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-id-reposto.txt)"
  verde "reposto: $grupos grupos, $casos casos"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-id-reposto.txt | head -6
fi

echo
echo "6. A base ficou como a encontrei?"
DEPOIS=$(mktemp)
psql "$MIGRATION_DATABASE_URL" -tAc "SELECT string_agg(pg_get_functiondef(p.oid), E';\n' ORDER BY p.oid) || ';'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind = 'f'" > "$DEPOIS"
POL=$(psql "$MIGRATION_DATABASE_URL" -tAc "SELECT pg_get_expr(polqual, polrelid) FROM pg_policy
  WHERE polrelid = 'users'::regclass AND polname = 'identidade_propria'")
if diff -q "$FUNCOES" "$DEPOIS" >/dev/null 2>&1 && [[ "$POL" == "(id = app_utilizador_actual())" ]]; then
  verde "as funções e a política de identidade estão como estavam"
else
  vermelho "a prova deixou a base diferente da que encontrou"
  [[ "$POL" == "(id = app_utilizador_actual())" ]] || echo "          política de users: $POL"
  diff "$FUNCOES" "$DEPOIS" | head -10
fi
rm -f "$DEPOIS"

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas falhas"; fi
exit $(( falhas > 0 ? 1 : 0 ))

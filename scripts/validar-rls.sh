#!/usr/bin/env bash
#
# TODA A TABELA COM `organization_id` TEM DE TER RLS LIGADO.
#
# O `provas/isolamento.test.ts` mede que o MECANISMO funciona — contexto,
# `WITH CHECK`, o contexto a morrer no commit, a ligação a não vazar o inquilino
# anterior. Vinte e oito asserções, e boas.
#
# O que ninguém media é se o mecanismo está LIGADO em todo o lado que precisa. E
# não é hipótese: a `custom_domain_owners` tem `organization_id` e não tem RLS.
# O teste do mecanismo nunca lhe tocaria, porque não é sobre tabelas — e foi por
# isso que ela passou meses sem ninguém reparar.
#
# Nasceu a 06/09 de uma pergunta do JR sobre `FORCE` contra `ENABLE`. A pergunta
# tinha resposta simples; o que estava por baixo dela é que não tinha.
set -uo pipefail
cd "$(dirname "$0")/.."

: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

falhas=0
erro() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas+1)); }
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }

# Excepções DECLARADAS, com motivo escrito. Uma tabela sai daqui quando alguém
# olhar para ela, não por um padrão largo que poupe o trabalho de olhar.
EXCEPCOES="
platform_staff:pessoal da plataforma, nao e dado de inquilino — o acesso e por papel
"

echo "1. Toda a tabela com organization_id tem RLS ligado"
SEM_RLS="$(psql "$MIGRATION_DATABASE_URL" -tAc "
  SELECT c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    AND EXISTS (SELECT 1 FROM information_schema.columns col
                WHERE col.table_schema='public' AND col.table_name=c.relname
                  AND col.column_name='organization_id')
  ORDER BY 1" 2>/dev/null || true)"

if [ -z "$SEM_RLS" ]; then
  ok "nenhuma tabela de inquilino sem RLS"
else
  while IFS= read -r t; do
    [ -n "$t" ] || continue
    motivo=$(printf '%s' "$EXCEPCOES" | grep "^${t}:" | cut -d: -f2-)
    if [ -n "$motivo" ]; then
      printf '  ── %s declarada fora: %s\n' "$t" "$motivo"
    else
      erro "$t tem organization_id e NAO tem RLS"
    fi
  done <<< "$SEM_RLS"
fi

# ── controlo negativo ────────────────────────────────────────────────────────
# A MESMA consulta sobre uma tabela de mentira com organization_id e sem RLS.
# Sem isto, um dia em que a consulta deixasse de devolver linhas — por um erro de
# SQL, por o schema mudar de nome — isto ficava verde sobre nada.
echo
echo "2. Controlo negativo"
psql "$MIGRATION_DATABASE_URL" -q -c "
  CREATE TABLE IF NOT EXISTS _sonda_rls (id int, organization_id uuid)" >/dev/null 2>&1
APANHA="$(psql "$MIGRATION_DATABASE_URL" -tAc "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity
    AND c.relname='_sonda_rls'" 2>/dev/null || echo 0)"
psql "$MIGRATION_DATABASE_URL" -q -c "DROP TABLE IF EXISTS _sonda_rls" >/dev/null 2>&1
if [ "$APANHA" = "1" ]; then
  ok "a mesma consulta apanha uma tabela de inquilino sem RLS"
else
  erro "CONTROLO NEGATIVO FALHOU: a sonda sem RLS nao foi apanhada"
fi

echo
[ "$falhas" -eq 0 ] && echo "  RLS ligado onde e preciso." || echo "  $falhas tabela(s) de inquilino sem RLS."
exit $([ "$falhas" -eq 0 ] && echo 0 || echo 1)

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
custom_domain_owners:tabela CROSS-INQUILINO por desenho, e protegida por GRANT em vez de RLS — ver a nota abaixo
"

# ── A nota da custom_domain_owners, escrita a 06/09 ────────────────────────
#
# Esta tabela foi-me apontada como orfa para APAGAR: zero linhas, zero
# chamadores, zero documentos. Fui verificar antes e a premissa nao se sustenta.
#
#   * A `vincular_dominio` (SECURITY DEFINER, linhas 463 e 478 da migracao do
#     E10) LE e ESCREVE nela. O chamador nao aparece num grep de TypeScript
#     porque vive dentro de uma funcao SQL.
#   * Zero linhas porque a `provas/sites.test.ts` limpa atras de si. Essa prova
#     passa hoje com 27 casos, e TRES deles medem exactamente esta tabela.
#   * E a coluna `dominio` e a chave primaria: e ela que implementa a regra 3 do
#     E10, «o nome nao volta ao mundo». Um dominio anda em cartoes, ementas e
#     anuncios pagos; se a linha de dono desaparecer, outra organizacao reclama
#     o nome e o trafego de quem o imprimiu passa a cair na casa errada.
#
# Porque e que nao tem RLS, e porque e que esta certo assim: ela e
# CROSS-INQUILINO de proposito. A pergunta que responde e «este nome ja e de
# alguem?», e essa pergunta so tem valor se a resposta atravessar inquilinos.
# A proteccao esta noutro sitio, e e mais apertada do que RLS: o `bossaos_app`
# tem SELECT e mais nada — sem INSERT, sem UPDATE, sem DELETE. Quem escreve e a
# funcao SECURITY DEFINER, e so ela. A `provas/sites.test.ts:398` mede isso:
# um DELETE pelo runtime da «permission denied».
#
# Ligar-lhe RLS por `organization_id` seria pior do que nao fazer nada: a
# leitura passava a ver so as linhas do proprio inquilino, e a pergunta «este
# nome ja e de alguem?» passava a responder «nao» a toda a gente.

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

echo
echo "1b. A excepcao que se justifica por GRANT tem de o PROVAR"
# ── Uma excepcao sem verificacao e uma porta ──────────────────────────────
#
# A `custom_domain_owners` sai da regra do RLS porque diz que esta protegida por
# GRANT: o runtime le e nao escreve. Se ficasse so escrito no comentario, bastava
# alguem correr um `GRANT INSERT` e a excepcao continuava verde a proteger nada.
#
# Isto mede a afirmacao. E a mesma exigencia que o projecto faz a si proprio em
# todo o lado: quem declara uma excepcao paga uma prova por ela.
PODE_ESCREVER="$(psql "$MIGRATION_DATABASE_URL" -tAc "
  SELECT privilege_type FROM information_schema.role_table_grants
   WHERE table_name = 'custom_domain_owners'
     AND grantee = 'bossaos_app'
     AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE')
   ORDER BY 1" 2>/dev/null || true)"
if [ -z "$PODE_ESCREVER" ]; then
  ok "custom_domain_owners: o runtime tem leitura e mais nada"
else
  erro "custom_domain_owners: o runtime GANHOU escrita ($(printf '%s' "$PODE_ESCREVER" | tr '\n' ' '))"
  echo "        A excepcao ao RLS assentava em ele nao poder escrever. Deixou de assentar."
fi

# E o outro lado: a leitura TEM de existir, senao a excepcao esta a proteger uma
# tabela que ninguem consegue consultar — e a regra 3 do E10 deixava de valer
# sem ninguem dar por isso.
PODE_LER="$(psql "$MIGRATION_DATABASE_URL" -tAc "
  SELECT 1 FROM information_schema.role_table_grants
   WHERE table_name = 'custom_domain_owners'
     AND grantee = 'bossaos_app' AND privilege_type = 'SELECT' LIMIT 1" 2>/dev/null || true)"
if [ -n "$PODE_LER" ]; then
  ok "e consegue ler — a pergunta «este nome ja e de alguem?» continua a ter resposta"
else
  erro "custom_domain_owners: o runtime perdeu a LEITURA — a regra 3 do E10 ficou muda"
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

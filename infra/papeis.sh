#!/usr/bin/env bash
# Os três papéis do E01, idempotentes. Corre NO SERVIDOR, a partir de /root/bossaos.
# Lê as senhas do .env.prod, que vive lá e nunca sobe de lado nenhum.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.prod; set +a
senha_de() { echo "$1" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|'; }
for i in $(seq 1 30); do
  docker exec bossaos-db pg_isready -U bossaos -d bossaos >/dev/null 2>&1 && break
  sleep 2
done
{
  echo "DO \$\$ BEGIN"
  for r in migrate app auth; do
    echo "  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='bossaos_$r') THEN CREATE ROLE bossaos_$r LOGIN; END IF;"
  done
  echo "END \$\$;"
  echo "ALTER ROLE bossaos_migrate WITH LOGIN CREATEDB PASSWORD '$(senha_de "$MIGRATION_DATABASE_URL")';"
  echo "ALTER ROLE bossaos_app     WITH LOGIN PASSWORD '$(senha_de "$DATABASE_URL")';"
  echo "ALTER ROLE bossaos_auth    WITH LOGIN PASSWORD '$(senha_de "$AUTH_DATABASE_URL")';"
} | docker exec -i bossaos-db psql -U bossaos -d bossaos -v ON_ERROR_STOP=1 -q
# ── As concessões, copiadas do dev-db.sh e não inventadas ───────────────────
# A migração falhou com "permission denied for schema public", e a causa estava
# escrita no dev-db.sh: lá a base é criada com `OWNER bossaos_migrate`. Aqui o
# contentor criou-a com dono `bossaos`, o superutilizador do POSTGRES_USER, e o
# migrate ficou com LOGIN e CREATEDB e sem direitos no esquema.
#
# Foi a separação de credenciais a funcionar — o E01 tirou ao runtime o poder de
# alterar o esquema, e eu tinha deixado o migrate sem o poder de o alterar
# TAMBÉM. O `provar-separacao-de-credenciais.sh` mede exactamente esta fronteira.
docker exec -i bossaos-db psql -U bossaos -d bossaos -v ON_ERROR_STOP=1 -q <<'SQL'
ALTER DATABASE bossaos OWNER TO bossaos_migrate;
ALTER SCHEMA public OWNER TO bossaos_migrate;
-- O runtime liga-se e usa, mas NÃO constrói.
GRANT CONNECT ON DATABASE bossaos TO bossaos_app;
GRANT USAGE ON SCHEMA public TO bossaos_app;
REVOKE CREATE ON SCHEMA public FROM bossaos_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
-- O de autenticação idem. Sem `GRANT ... ON ALL TABLES` de propósito: um
-- privilégio geral tornaria o próximo CREATE TABLE de inquilino legível pela
-- autenticação sem ninguém decidir isso.
GRANT CONNECT ON DATABASE bossaos TO bossaos_auth;
GRANT USAGE ON SCHEMA public TO bossaos_auth;
REVOKE CREATE ON SCHEMA public FROM bossaos_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bossaos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bossaos_app;
-- E sobre o que a migração criar a seguir, sem ser preciso voltar aqui.
ALTER DEFAULT PRIVILEGES FOR ROLE bossaos_migrate IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bossaos_app;
ALTER DEFAULT PRIVILEGES FOR ROLE bossaos_migrate IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bossaos_app;
SQL

# Não basta existirem: TÊM de entrar. "O papel existe" não é "o papel liga-se" —
# a primeira montagem criou um com uma senha nula e o psql disse `DO` na mesma.
for r in migrate app auth; do
  case $r in migrate) U=$MIGRATION_DATABASE_URL;; app) U=$DATABASE_URL;; auth) U=$AUTH_DATABASE_URL;; esac
  docker exec -e PGPASSWORD="$(senha_de "$U")" bossaos-db \
    psql -h 127.0.0.1 -U "bossaos_$r" -d bossaos -tAc "SELECT 1" >/dev/null \
    || { echo "ERRO: bossaos_$r não entra" >&2; exit 1; }
  echo "  ok    bossaos_$r entra"
done
# E a fronteira que isto tudo existe para manter, medida aqui e não assumida:
# o migrate CONSEGUE criar tabelas, e o app NÃO. Se um dia estas duas linhas
# deixarem de ser verdade, o produto perdeu a separação sem ninguém reparar.
M=$(senha_de "$MIGRATION_DATABASE_URL"); A=$(senha_de "$DATABASE_URL")
docker exec -e PGPASSWORD="$M" bossaos-db psql -h 127.0.0.1 -U bossaos_migrate -d bossaos -q \
  -c "CREATE TABLE _sonda_migrate(x int)" -c "DROP TABLE _sonda_migrate" >/dev/null 2>&1 \
  && echo "  ok    bossaos_migrate CRIA tabelas" \
  || { echo "ERRO: bossaos_migrate nao consegue criar tabelas" >&2; exit 1; }
if docker exec -e PGPASSWORD="$A" bossaos-db psql -h 127.0.0.1 -U bossaos_app -d bossaos -q \
     -c "CREATE TABLE _sonda_app(x int)" >/dev/null 2>&1; then
  docker exec bossaos-db psql -U bossaos -d bossaos -qc "DROP TABLE IF EXISTS _sonda_app" >/dev/null 2>&1
  echo "ERRO: bossaos_app CONSEGUIU criar uma tabela — a separacao do E01 nao existe" >&2; exit 1
fi
echo "  ok    bossaos_app NAO cria tabelas"

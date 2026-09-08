#!/usr/bin/env bash
# Base de desenvolvimento da BossaOS, com as DUAS credenciais separadas.
#
# PORQUE DUAS (E01, aceite 2 · CT-04). A credencial que corre a aplicação não
# pode alterar o schema. Se puder, uma injeção bem-sucedida deixa de ser leitura
# indevida e passa a ser `DROP TABLE`, e uma migração acidental em produção
# deixa de precisar de um erro humano — basta um bug.
#
#   bossaos_migrate  dono do schema, faz DDL. Só os comandos de migração a usam.
#   bossaos_app      liga-se e faz DML. NÃO pode criar, alterar nem apagar tabelas.
#   bossaos_auth     (E04) só identidade e sessão. NÃO vê dados de inquilino.
#
# O terceiro é o quarto acesso que o CT-04 manda separar — migração, runtime,
# autenticação global e leitura pública. A separação não é cerimónia: uma sessão
# é uma credencial viva, e o processo que serve o catálogo de um restaurante não
# precisa de conseguir ler a sessão de ninguém. E ao contrário: o processo que
# autentica não precisa de ver uma única linha de facturação.
#
# Corre contra o Postgres local (Homebrew). Não usa Docker de propósito: esta
# máquina tem 16 GB e um bug de rede do macOS que já causou kernel panics sob
# carga, e um Postgres nativo já a correr resolve o mesmo problema sem esse risco.
set -euo pipefail

DB_DEV="${DB_DEV:-bossaos_dev}"
DB_TEST="${DB_TEST:-bossaos_test}"
SENHA_MIG="${SENHA_MIG:-dev_migrate_local}"
SENHA_APP="${SENHA_APP:-dev_app_local}"
SENHA_AUTH="${SENHA_AUTH:-dev_auth_local}"
SUPER="${PGSUPERUSER:-$(whoami)}"

info() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }

command -v psql >/dev/null || { echo "psql não encontrado. brew install postgresql@16"; exit 1; }
pg_isready -q || { echo "PostgreSQL não responde. brew services start postgresql@16"; exit 1; }

info "Papéis"
psql -q -v ON_ERROR_STOP=1 -U "$SUPER" -d postgres <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='bossaos_migrate') THEN
    -- CREATEDB porque o \`prisma migrate dev\` cria uma base SOMBRA para
    -- comparar o schema declarado com o aplicado. E' privilegio da migracao,
    -- nunca do runtime: e' precisamente a fronteira que este script desenha.
    CREATE ROLE bossaos_migrate LOGIN CREATEDB PASSWORD '${SENHA_MIG}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='bossaos_app') THEN
    CREATE ROLE bossaos_app LOGIN PASSWORD '${SENHA_APP}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='bossaos_auth') THEN
    CREATE ROLE bossaos_auth LOGIN PASSWORD '${SENHA_AUTH}';
  END IF;
END \$\$;
-- Idempotente: se o papel ja existia sem CREATEDB, corrige.
ALTER ROLE bossaos_migrate CREATEDB;
ALTER ROLE bossaos_app NOCREATEDB NOCREATEROLE NOSUPERUSER;
ALTER ROLE bossaos_auth NOCREATEDB NOCREATEROLE NOSUPERUSER;
SQL

for DB in "$DB_DEV" "$DB_TEST"; do
  info "Base ${DB}"
  psql -q -v ON_ERROR_STOP=1 -U "$SUPER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB}'" | grep -q 1 \
    || psql -q -v ON_ERROR_STOP=1 -U "$SUPER" -d postgres -c "CREATE DATABASE ${DB} OWNER bossaos_migrate"

  psql -q -v ON_ERROR_STOP=1 -U "$SUPER" -d "$DB" <<SQL
  -- O runtime liga-se e usa, mas não constrói.
  GRANT CONNECT ON DATABASE ${DB} TO bossaos_app;
  GRANT USAGE ON SCHEMA public TO bossaos_app;
  REVOKE CREATE ON SCHEMA public FROM bossaos_app;
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;

  -- O de autenticação idem, e os privilégios POR TABELA são dados na migração
  -- do E04, tabela a tabela. Aqui não há «GRANT ... ON ALL TABLES» para ele de
  -- propósito: um privilégio geral tornaria o próximo «CREATE TABLE» de
  -- inquilino legível pela autenticação sem ninguém decidir isso.
  GRANT CONNECT ON DATABASE ${DB} TO bossaos_auth;
  GRANT USAGE ON SCHEMA public TO bossaos_auth;
  REVOKE CREATE ON SCHEMA public FROM bossaos_auth;

  -- Sobre o que já existe...
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bossaos_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bossaos_app;

  -- ...e sobre o que a migração criar a seguir, sem ser preciso voltar aqui.
  ALTER DEFAULT PRIVILEGES FOR ROLE bossaos_migrate IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bossaos_app;
  ALTER DEFAULT PRIVILEGES FOR ROLE bossaos_migrate IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO bossaos_app;
SQL
done

info "Pronto."
cat <<TXT

  Ponha isto no seu .env (os valores abaixo são LOCAIS e descartáveis):

    DATABASE_URL="postgresql://bossaos_app:${SENHA_APP}@127.0.0.1:5432/${DB_DEV}"
    MIGRATION_DATABASE_URL="postgresql://bossaos_migrate:${SENHA_MIG}@127.0.0.1:5432/${DB_DEV}"
    AUTH_DATABASE_URL="postgresql://bossaos_auth:${SENHA_AUTH}@127.0.0.1:5432/${DB_DEV}"

  E-mail de teste:  pnpm dev:mail   (interface em http://127.0.0.1:8025)
TXT

#!/usr/bin/env bash
#
# Prova o aceite 2 do E01: "runtime não tem privilégios de alterar o schema".
#
# Uma afirmação destas não vale por estar escrita no README. Este script põe a
# credencial do runtime a TENTAR alterar o schema e exige que o Postgres a
# recuse. E, porque uma recusa também aconteceria se a credencial estivesse
# simplesmente partida, começa por exigir que ela CONSIGA fazer o seu trabalho
# normal — o controlo negativo. Sem essa primeira metade, um DATABASE_URL com a
# senha errada dava "tudo verde".
#
# Uso: ./scripts/provar-separacao-de-credenciais.sh
set -uo pipefail

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

falhas=0
verde() { printf '  \033[32mok\033[0m   %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# Corre SQL com a credencial do runtime. Devolve 0 se o Postgres aceitou.
runtime() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "$1" >/dev/null 2>&1; }

echo "1. Controlo negativo — a credencial do runtime está viva e trabalha?"
if runtime "SELECT key FROM app_meta"; then
  verde "lê app_meta"
else
  vermelho "não lê app_meta — a credencial está partida, e então as recusas abaixo não provam nada"
  echo; echo "Interrompido: sem esta metade, o resto seria verde vazio."
  exit 1
fi
if runtime "INSERT INTO app_meta (key, value, updated_at) VALUES ('prova_runtime', 'ok', NOW())
            ON CONFLICT (key) DO UPDATE SET updated_at = NOW()"; then
  verde "escreve em app_meta"
else
  vermelho "não escreve em app_meta — o runtime não conseguiria funcionar"
fi

echo
echo "2. O que o runtime NÃO pode fazer (cada linha tem de ser recusada):"
for sql in \
  "CREATE TABLE prova_ddl (id int)" \
  "ALTER TABLE app_meta ADD COLUMN prova_ddl text" \
  "DROP TABLE app_meta" \
  "CREATE INDEX prova_ddl_idx ON app_meta (value)" \
  "TRUNCATE app_meta"
do
  if runtime "$sql"; then
    vermelho "PERMITIDO (devia ser recusado): $sql"
    # Desfaz o estrago que acabámos de provar ser possível.
    psql "$MIGRATION_DATABASE_URL" -q -c "DROP TABLE IF EXISTS prova_ddl" >/dev/null 2>&1
    psql "$MIGRATION_DATABASE_URL" -q -c "ALTER TABLE app_meta DROP COLUMN IF EXISTS prova_ddl" >/dev/null 2>&1
  else
    verde "recusado: $sql"
  fi
done

echo
echo "3. A credencial de migração consegue o que o runtime não consegue?"
if psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -q \
     -c "CREATE TABLE prova_migracao (id int)" -c "DROP TABLE prova_migracao" >/dev/null 2>&1; then
  verde "migração cria e larga tabelas"
else
  vermelho "migração não altera schema — as migrações não correriam"
fi

psql "$DATABASE_URL" -q -c "DELETE FROM app_meta WHERE key = 'prova_runtime'" >/dev/null 2>&1

echo
if (( falhas == 0 )); then
  echo "Separação de credenciais provada: $falhas falhas."
else
  echo "Separação de credenciais NÃO provada: $falhas falha(s)."
  exit 1
fi

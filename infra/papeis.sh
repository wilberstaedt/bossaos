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
# Não basta existirem: TÊM de entrar. "O papel existe" não é "o papel liga-se" —
# a primeira montagem criou um com uma senha nula e o psql disse `DO` na mesma.
for r in migrate app auth; do
  case $r in migrate) U=$MIGRATION_DATABASE_URL;; app) U=$DATABASE_URL;; auth) U=$AUTH_DATABASE_URL;; esac
  docker exec -e PGPASSWORD="$(senha_de "$U")" bossaos-db \
    psql -h 127.0.0.1 -U "bossaos_$r" -d bossaos -tAc "SELECT 1" >/dev/null \
    || { echo "ERRO: bossaos_$r não entra" >&2; exit 1; }
  echo "  ok    bossaos_$r entra"
done

#!/usr/bin/env bash
# Uma base de dados só para quem revê.
#
# PORQUE EXISTE. O revisor e o executor partilhavam uma única base, a
# `bossaos_dev`. Isso custou duas vezes num só dia: as minhas provas semeavam e
# truncavam por baixo do trabalho dele, e um script de prova morto a meio deixou
# uma função da base sem a lógica que a migração declarava - dois testes dele
# passaram a falhar por causa de uma coisa que eu parti a medir.
#
# O porto já tinha sido separado (PORTA_INSPECCAO). A base não. Este script
# fecha a outra metade.
#
# A `bossaos_test` NÃO serve para isto: tem um trabalho, que é estar vazia, e é
# o controlo negativo do `provar-prontidao.sh`. Enchê-la seria cegar essa prova.
#
# ── QUAL DAS BASES RESPONDE A QUÊ ──────────────────────────────────────────
#
# Não é «a de revisão é sempre melhor». As duas respondem a perguntas
# diferentes, e trocá-las é medir a coisa errada:
#
#   bossaos_revisao  PROVAS DE COMPORTAMENTO. Semear, inserir, truncar, atacar.
#                    Construída das migrações, portanto é o schema DECLARADO.
#
#   bossaos_dev      PROVAS DE DESVIO. «O que está vivo é o que está escrito?»
#                    O defeito da idempotência de 04/09 só era visível aqui: a
#                    migração tinha a lógica, a base viva não. Uma revisão que
#                    corresse só contra a base declarada NUNCA o teria visto.
#
# Quem revê usa as duas, e sabe qual está a usar.
set -euo pipefail

cd "$(dirname "$0")/.."
DB_REV="${DB_REV:-bossaos_revisao}"
SENHA_MIG="${SENHA_MIG:-dev_migrate_local}"
SENHA_APP="${SENHA_APP:-dev_app_local}"
SENHA_AUTH="${SENHA_AUTH:-dev_auth_local}"
HOSPEDE="127.0.0.1:5432"

# Trava. Se isto alguma vez apontar à base do JR, o script inteiro deixa de ter
# sentido - e a maneira de descobrir seria ele a perder trabalho.
case "$DB_REV" in
  bossaos_dev|bossaos_test)
    echo "RECUSO: '$DB_REV' e' a base de outra pessoa. O objectivo deste script e' nao lhe tocar." >&2
    exit 1 ;;
esac

url() { echo "postgresql://bossaos_$1:$2@${HOSPEDE}/${DB_REV}"; }
U_APP="$(url app "$SENHA_APP")"
U_MIG="$(url migrate "$SENHA_MIG")"
U_AUTH="$(url auth "$SENHA_AUTH")"

if [ "${1:-}" = "--exportar" ]; then
  # Para: eval "$(bash scripts/base-de-revisao.sh --exportar)"
  echo "export DATABASE_URL='$U_APP'"
  echo "export MIGRATION_DATABASE_URL='$U_MIG'"
  echo "export AUTH_DATABASE_URL='$U_AUTH'"
  exit 0
fi

echo "==> Base de revisao: $DB_REV"

# A receita das permissoes ja existe e esta certa. Chamo-a em vez de a copiar:
# uma copia diverge no dia em que alguem corrige so um dos lados.
DB_DEV="$DB_REV" DB_TEST="$DB_REV" bash scripts/dev-db.sh >/dev/null

echo "==> Migracoes"
DATABASE_URL="$U_APP" MIGRATION_DATABASE_URL="$U_MIG" AUTH_DATABASE_URL="$U_AUTH" \
  pnpm -s db:migrate:deploy 2>&1 | tail -3

aplicadas=$(psql "$U_MIG" -tAc \
  "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL" 2>/dev/null || echo 0)
declaradas=$(ls packages/db/prisma/migrations | grep -c '^[0-9]' || echo 0)
echo "==> $aplicadas de $declaradas migracoes aplicadas"
[ "$aplicadas" = "$declaradas" ] || { echo "FALHA: a base de revisao nao tem o schema todo." >&2; exit 1; }

cat <<TXT

  Pronto. Para correr uma prova contra ela, sem tocar na base do JR:

    eval "\$(bash scripts/base-de-revisao.sh --exportar)"
    bash scripts/provar-<o-que-for>.sh

  Lembre-se de qual pergunta esta a fazer: comportamento aqui, DESVIO na dev.
TXT

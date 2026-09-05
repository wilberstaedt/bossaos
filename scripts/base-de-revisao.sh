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
# Ligacao a base `postgres`, para poder APAGAR a de revisao (nao se apaga a
# base a que se esta ligado).
#
# A ORDEM: apagar ANTES do dev-db.sh. Ao contrario — que foi o que fiz a
# primeira vez — apaga-se a base que ele acabou de preparar, o Prisma recria-a
# NUA, e fica sem papeis, sem concessoes por omissao e sem `reservation_settings`
# acessivel. Deu 43 concessoes onde a dev tem 67, e as quatro provas morreram
# em `permission denied`.
U_MIG_POSTGRES="postgresql://bossaos_migrate:${SENHA_MIG}@${HOSPEDE}/postgres"

if [ "${1:-}" = "--exportar" ]; then
  # Para: eval "$(bash scripts/base-de-revisao.sh --exportar)"
  #
  # ── PORQUE E' QUE ISTO CARREGA O .env PRIMEIRO ──────────────────────────
  #
  # Ate 04/09 isto imprimia so as tres linhas de baixo. Quem fizesse apenas o
  # eval ficava com as bases certas e SEM o resto do ambiente - segredo de
  # autenticacao incluido. Apanhou-me duas vezes no mesmo dia: uma corrida
  # morreu nas fixtures por falta de variavel, e outra devolveu 500 no sign-up.
  # Da segunda escrevi numa revisao ASSINADA que a base de revisao estava
  # avariada. Nao estava; faltava-lhe o ambiente que este script nao dava.
  #
  # A ordem importa: carrega-se o .env e SO DEPOIS se sobrepoem as tres bases.
  # Ao contrario, o .env ganhava e as provas iam bater na base do JR - que e'
  # exactamente o que este ficheiro existe para impedir.
  if [ -f .env ]; then
    echo "set -a; . '$(pwd)/.env'; set +a"
  else
    echo "echo 'AVISO: nao ha .env; o ambiente pode estar incompleto' >&2"
  fi
  echo "export DATABASE_URL='$U_APP'"
  echo "export MIGRATION_DATABASE_URL='$U_MIG'"
  echo "export AUTH_DATABASE_URL='$U_AUTH'"
  exit 0
fi

echo "==> Base de revisao: $DB_REV"

# ── PORQUE E' QUE ESTA BASE TEM DE NASCER VAZIA ─────────────────────────────
#
# O dev-db.sh faz `GRANT ... DELETE ON ALL TABLES` e 23 revogacoes das
# migracoes tiram-no tabela a tabela por cima. Numa base VAZIA a ordem
# resolve-se sozinha. Numa base JA MIGRADA nao: o GRANT em massa volta a
# correr, os REVOKE nao (o Prisma nao reaplica migracoes ja aplicadas), e a
# base fica MAIS permissiva a cada reconstrucao.
#
# Medido a 05/09: 96 DELETE concedidos ao runtime aqui contra 67 na dev, e a
# provar-publico vermelha em "o runtime NAO pode apagar uma consulta". Quase
# reportei isso como buraco de seguranca do produto.
#
# Tentei reaplicar as revogacoes a partir das migracoes. NAO FUNCIONOU, duas
# vezes: a primeira colou `FROM bossaos_app` nas 8 que eram do `bossaos_auth`
# e deixou `allergens` sem SELECT; a segunda, ja com o papel certo, apanhou um
# `REVOKE ... ON language c` e a prova morreu em "permission denied for
# language c". Reaplicar por texto e' remendo, e cada remendo trouxe um
# defeito novo.
#
# A base nasce VAZIA. E' a unica forma em que a ordem esta certa por
# construcao, e a provar-migracoes-do-zero ja demonstra que as 39 migracoes
# aplicam limpas contra uma base vazia.
if [ "${RECRIAR:-1}" = "1" ]; then
  echo "==> A recriar $DB_REV do zero (RECRIAR=0 para reaproveitar)"
  psql "$U_MIG_POSTGRES" -q -c "DROP DATABASE IF EXISTS $DB_REV WITH (FORCE)" 2>/dev/null \
    || echo "   (nao consegui apagar; a base pode ficar mal-endurecida)" >&2
fi


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

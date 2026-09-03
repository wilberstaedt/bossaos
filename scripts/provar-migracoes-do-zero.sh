#!/usr/bin/env bash
# As migracoes tem de se aplicar NUMA BASE VAZIA, por ordem, sem falhar.
#
# Existe por causa de um erro meu, o senior, a 2026-09-03 as 19h35: validei o E06
# depois de correr nove provas, quatro guardas e o `pnpm verificar`, tudo verde -
# e a CI reprovou-o quatro minutos depois. A CI tinha razao.
#
# A migracao `...165614_e06_onboarding` USA `platform_staff` numa chave
# estrangeira, e a `...190000_e05_plataforma` e quem a CRIA. O Prisma aplica por
# CARIMBO e nao por etapa, portanto numa base do zero o e06 corre primeiro e
# rebenta com 42P01. Passou nas nossas maquinas porque as nossas bases foram
# migradas ao longo do dia, na ordem em que os ficheiros nasceram.
#
# Eu medi o ESTADO e nao o CAMINHO ate ele. Escrever "lembra-te de testar do zero"
# no protocolo nao me salvou; o que salvou foi a CI ter um PASSO. Isto e o mesmo
# passo, do lado de ca, para eu deixar de assinar o que a CI reprova.
set -uo pipefail
cd "$(dirname "$0")/.."

SUPER="${PGSUPERUSER:-$(whoami)}"
BASE="bossaos_zero_$$"
falhas=0
erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

limpar() { psql -q -U "$SUPER" -d postgres -c "DROP DATABASE IF EXISTS ${BASE}" >/dev/null 2>&1 || true; }
trap limpar EXIT INT TERM

echo "1. Base descartavel, mesmo vazia"
psql -q -U "$SUPER" -d postgres -c "CREATE DATABASE ${BASE} OWNER bossaos_migrate" >/dev/null 2>&1 \
  || { erro "nao consegui criar a base descartavel"; echo; echo "  $falhas FALHA(S)."; exit "$falhas"; }
n=$(psql -U "$SUPER" -d "$BASE" -X -A -t -c "SELECT count(*) FROM pg_tables WHERE schemaname='public'" 2>/dev/null | tr -d ' ')
if [ "${n:-1}" -ne 0 ]; then erro "a base nova ja tem $n tabelas - nao esta vazia"; else ok "vazia, 0 tabelas"; fi

echo
echo "2. Quantas migracoes ha para aplicar"
m=$(ls -d packages/db/prisma/migrations/*/ 2>/dev/null | wc -l | tr -d ' ')
# Controlo negativo do proprio leitor: sem migracoes, tudo "aplica" e o verde e vacuo.
if [ "${m:-0}" -lt 5 ]; then erro "so vi $m migracoes - o leitor esta cego"; else ok "$m migracoes na pasta"; fi

echo
echo "3. prisma migrate deploy contra a base vazia"
saida=$(cd packages/db && MIGRATION_DATABASE_URL="postgresql://bossaos_migrate:${SENHA_MIG:-dev_migrate_local}@127.0.0.1:5432/${BASE}" \
  npx prisma migrate deploy 2>&1)
if [ $? -eq 0 ]; then
  aplicadas=$(echo "$saida" | grep -c "^Applying migration" || true)
  if [ "${aplicadas:-0}" -lt "$m" ]; then
    erro "so aplicou ${aplicadas:-0} de $m migracoes"
  else
    ok "aplicou as $m, por ordem, sem falhar"
  fi
else
  erro "a cadeia de migracoes NAO se aplica do zero:"
  echo "$saida" | grep -E "Applying migration|Error|error:|Database error" | tail -6 | sed 's/^/          /'
fi

echo
[ "$falhas" -eq 0 ] && echo "  As migracoes aplicam-se do zero: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

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

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
SUPER="${PGSUPERUSER:-$(whoami)}"
PGHOST_="${PGHOST:-127.0.0.1}"
SENHA_MIG="${SENHA_MIG:-dev_migrate_local}"
MIGRACOES=packages/db/prisma/migrations
BASE="bossaos_zero_$$"
BASE_CTL="bossaos_zero_ctl_$$"
falhas=0
RENOMEADA=""

erro() { echo "  FALHA $1"; falhas=$((falhas+1)); }
ok()   { echo "  ok    $1"; }

limpar() {
  for d in "$BASE" "$BASE_CTL"; do
    psql -q -U "$SUPER" -h "$PGHOST_" -d postgres -c "DROP DATABASE IF EXISTS ${d}" >/dev/null 2>&1 || true
  done
  # Repor SEMPRE o carimbo que o controlo negativo desloca. Deixa-lo trocado
  # seria deixar no repositorio o defeito exacto que isto existe para apanhar.
  if [ -n "$RENOMEADA" ]; then
    mv "$MIGRACOES/$RENOMEADA" "$MIGRACOES/20260903152000_e05_plataforma" 2>/dev/null || true
    RENOMEADA=""
    echo "  (o carimbo da e05_plataforma foi reposto)"
  fi
}
trap limpar EXIT INT TERM

criar() { # $1 = nome
  psql -q -U "$SUPER" -h "$PGHOST_" -d postgres -c "CREATE DATABASE $1 OWNER bossaos_migrate" >/dev/null 2>&1
}

aplicar() { # $1 = base; imprime a saida, devolve o codigo do prisma
  MIGRATION_DATABASE_URL="postgresql://bossaos_migrate:${SENHA_MIG}@${PGHOST_}:5432/$1" \
    pnpm --filter @bossaos/db exec prisma migrate deploy 2>&1
}

echo "1. Base descartavel, mesmo vazia"
criar "$BASE" || { erro "nao consegui criar a base descartavel"; echo; echo "  $falhas FALHA(S)."; exit "$falhas"; }
n=$(psql -U "$SUPER" -h "$PGHOST_" -d "$BASE" -X -A -t -c "SELECT count(*) FROM pg_tables WHERE schemaname='public'" 2>/dev/null | tr -d ' ')
if [ "${n:-1}" -ne 0 ]; then erro "a base nova ja tem $n tabelas - nao esta vazia"; else ok "vazia, 0 tabelas"; fi

echo
echo "2. Quantas migracoes ha para aplicar"
m=$(find "$MIGRACOES" -name migration.sql | wc -l | tr -d ' ')
# Controlo negativo do proprio leitor: sem migracoes, tudo "aplica" e o verde e vacuo.
if [ "${m:-0}" -lt 5 ]; then erro "so vi $m migracoes - o leitor esta cego"; else ok "$m migracoes na pasta"; fi

echo
echo "3. prisma migrate deploy contra a base vazia"
saida=$(aplicar "$BASE"); codigo=$?
if [ "$codigo" -eq 0 ]; then
  # A contagem vem da BASE e nao do texto da saida. Contar linhas "Applying
  # migration" mede o que o Prisma imprimiu; contar `_prisma_migrations` mede o
  # que ele fez, e sao coisas diferentes no dia em que ele mudar o formato.
  aplicadas=$(psql -U "$SUPER" -h "$PGHOST_" -d "$BASE" -X -A -t \
    -c "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL" 2>/dev/null | tr -d " ")
  if [ "${aplicadas:-0}" -ne "$m" ]; then
    erro "aplicou ${aplicadas:-0} de $m migracoes"
  else
    ok "aplicou as $m, por ordem, sem falhar"
  fi

  # E o schema tem de estar mesmo la: uma cadeia de ficheiros vazios tambem sai
  # a zero e tambem conta $m aplicadas.
  t=$(psql -U "$SUPER" -h "$PGHOST_" -d "$BASE" -X -A -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" | tr -d " ")
  f=$(psql -U "$SUPER" -h "$PGHOST_" -d "$BASE" -X -A -t -c "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'" | tr -d " ")
  p=$(psql -U "$SUPER" -h "$PGHOST_" -d "$BASE" -X -A -t -c "SELECT count(*) FROM pg_policies" | tr -d " ")
  if [ "${t:-0}" -ge 25 ] && [ "${f:-0}" -ge 6 ] && [ "${p:-0}" -ge 15 ]; then
    ok "$t tabelas, $f funcoes, $p politicas de linha"
  else
    erro "schema incompleto: $t tabelas, $f funcoes, $p politicas"
  fi
else
  erro "a cadeia de migracoes NAO se aplica do zero:"
  echo "$saida" | grep -E "Applying migration|Error|error:|Database error" | tail -6 | sed "s/^/          /"
fi

echo
echo "4. CONTROLO NEGATIVO - o defeito de 19h35, plantado de volta"
# A regra que tu escreveste e que vale aqui: uma prova que nao consegue falhar
# nao prova nada. Devolve-se a `e05_plataforma` um carimbo POSTERIOR ao do `e06`
# que dela depende. Se isto continuar verde, o que se mede e que o Prisma corre.
mv "$MIGRACOES/20260903152000_e05_plataforma" "$MIGRACOES/20260903999999_e05_plataforma"
RENOMEADA="20260903999999_e05_plataforma"
criar "$BASE_CTL" || erro "nao consegui criar a base do controlo"
saida_ctl=$(aplicar "$BASE_CTL"); codigo_ctl=$?
if [ "$codigo_ctl" -eq 0 ]; then
  erro "aplicou-se com a ordem TROCADA - esta prova nao mede a ordem"
else
  ok "a cadeia partiu-se, como tem de partir"
  # O discriminador: tem de partir por FALTAR A TABELA, e nao por outra razao.
  # Uma base em baixo leria-se aqui exactamente igual.
  if echo "$saida_ctl" | grep -q "platform_staff"; then
    ok "partiu-se em platform_staff - e mesmo a dependencia que falta"
  else
    erro "partiu-se, mas nao por causa da dependencia"
    echo "$saida_ctl" | grep -E "Error|42P01" | head -3 | sed "s/^/          /"
  fi
fi
mv "$MIGRACOES/20260903999999_e05_plataforma" "$MIGRACOES/20260903152000_e05_plataforma"
RENOMEADA=""

echo
echo "5. Reposto - tem de voltar a aplicar-se do zero"
psql -q -U "$SUPER" -h "$PGHOST_" -d postgres -c "DROP DATABASE IF EXISTS ${BASE_CTL}" >/dev/null 2>&1
if criar "$BASE_CTL" && aplicar "$BASE_CTL" >/dev/null 2>&1; then
  ok "aplica-se outra vez"
else
  erro "nao voltou a aplicar-se depois de repor"
fi

echo
[ "$falhas" -eq 0 ] && echo "  As migracoes aplicam-se do zero: 0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

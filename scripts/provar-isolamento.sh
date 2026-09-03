#!/usr/bin/env bash
#
# A prova de isolamento do E03, com o controlo negativo obrigatório.
#
# O alvo está em `docs/architecture/prova-de-isolamento.md`, escrito no E00 antes
# de esta etapa começar. Este script não o reescreve: corre-o, e depois **desliga
# a política** para exigir que ele fique vermelho.
#
#   Se os casos 2 e 3 continuarem verdes com o RLS desligado, eles não estavam a
#   medir o RLS — estavam a medir outra coisa qualquer.
#
# A prova corre com o papel REAL de runtime (DATABASE_URL). Ligar e desligar
# políticas é DDL e exige a credencial de migração: são duas ligações
# diferentes de propósito, e é essa separação que dá sentido ao resto.
#
# Uso: ./scripts/provar-isolamento.sh
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

TABELAS=(organizations brands locations memberships role_assignments users)
falhas=0
DESLIGADO=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

politica() { # ENABLE | DISABLE
  local accao="$1"
  for t in "${TABELAS[@]}"; do
    psql "$MIGRATION_DATABASE_URL" -q -c "ALTER TABLE \"$t\" $accao ROW LEVEL SECURITY" >/dev/null 2>&1
  done
}

# Religar SEMPRE. Um script que morra a meio com as políticas desligadas deixa a
# base aberta — e é uma base de desenvolvimento hoje, mas o hábito é o que segue
# para o sítio onde há dados de clientes.
restaurar() {
  if [[ "$DESLIGADO" == "1" ]]; then
    politica ENABLE
    DESLIGADO=0
    printf '  (políticas religadas)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() { # devolve 0 se a prova passou; guarda a saída em $1
  node --test --experimental-strip-types provas/isolamento.test.ts >"$1" 2>&1
}

echo "0. Fixtures (dois inquilinos com nomes parecidos)"
if node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; then
  verde "semeados"
else
  vermelho "não foi possível semear"; exit 1
fi

echo
echo "1. Com as políticas LIGADAS — os quatro casos têm de passar"
if correr /tmp/bossaos-iso-ligado.txt; then
  verde "$(grep -c '^ok ' /tmp/bossaos-iso-ligado.txt) grupos verdes, $(grep -oE '^# pass [0-9]+' /tmp/bossaos-iso-ligado.txt | grep -oE '[0-9]+') asserções"
else
  vermelho "a prova falhou com as políticas ligadas"
  grep -E 'not ok|error:' /tmp/bossaos-iso-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — políticas DESLIGADAS, a prova tem de ficar vermelha"
politica DISABLE
DESLIGADO=1

if correr /tmp/bossaos-iso-desligado.txt; then
  vermelho "a prova passou com o RLS DESLIGADO — não está a medir a política"
else
  verde "a prova ficou vermelha, como tem de ficar"

  # E não basta ficar vermelha em qualquer sítio: têm de ser os casos que
  # dependem da política. Um erro de ligação também poria tudo vermelho.
  for caso in 'caso 2' 'caso 3'; do
    if grep -q "^not ok .*$caso" /tmp/bossaos-iso-desligado.txt; then
      verde "$caso ficou vermelho (é ele que mede o RLS)"
    else
      vermelho "$caso continuou verde sem política — não estava a medir o RLS"
    fi
  done

  # E é preciso provar que o que partiu foi a POLÍTICA e não a ligação. A
  # primeira versão deste script exigia que o caso 1 continuasse verde — errado:
  # sem política, A passa a ver as marcas de B e o caso 1, que espera UMA linha,
  # falha com razão.
  #
  # O discriminador certo é directo: o papel de runtime, SEM contexto nenhum,
  # conta as marcas. Com política = 0. Sem política = todas. É a mesma pergunta
  # do caso 3, feita sem passar por teste nenhum.
  sem_politica=$(psql "$DATABASE_URL" -tAc 'SELECT count(*) FROM brands' 2>/dev/null | tr -d ' ')
  if [[ "$sem_politica" -gt 0 ]]; then
    verde "sem política e sem contexto, o runtime vê $sem_politica marcas — a base está viva e cheia"
  else
    vermelho "sem política continua a ver 0: o vazio do caso 3 não vinha da política"
  fi
fi

politica ENABLE
DESLIGADO=0

# Limpeza depois do controlo negativo. Com a política desligada, uma escrita que
# escape à contenção fica gravada — e a corrida seguinte encontraria o mundo
# alterado e culparia a política. Semear é idempotente e repõe o dono.
psql "$MIGRATION_DATABASE_URL" -q \
  -c "DELETE FROM brands WHERE slug LIKE 'intrusa%' OR slug = 'sem-contexto'" \
  -c "DELETE FROM locations WHERE slug LIKE 'intrusa%'" >/dev/null 2>&1
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1

echo
echo "3. Religadas — tem de voltar ao verde"
if correr /tmp/bossaos-iso-religado.txt; then
  verde "de volta ao verde"
else
  vermelho "não voltou ao verde depois de religar"
  grep -E 'not ok|error:' /tmp/bossaos-iso-religado.txt | head -10
fi

echo
if (( falhas == 0 )); then
  echo "Isolamento provado: 0 falhas."
else
  echo "Isolamento NÃO provado: $falhas falha(s)."
  exit 1
fi

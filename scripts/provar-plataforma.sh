#!/usr/bin/env bash
#
# A superfície interna de plataforma: quem lê através de inquilinos, e quem não.
#
# Esta é a única leitura do produto que atravessa inquilinos de propósito — e é
# exactamente a pergunta que o E03 existe para recusar. A prova é o PAR: o staff
# vê as duas organizações, a dona de uma delas rebenta. Só o segundo caso
# passaria num sistema que recusasse a toda a gente.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

GRUPOS_ESPERADOS=3
ASSERCOES_ESPERADAS=10
falhas=0
SQL_PLATAFORMA=packages/db/prisma/migrations/20260903190000_e05_plataforma/migration.sql
PORTA_ABERTA=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# Repor SEMPRE. Um script morto a meio deixaria a função da base a responder a
# QUALQUER pessoa autenticada — uma superfície de plataforma aberta a viver no
# repositório, que é a mesma família da política a mais do `provar-acesso.sh`.
restaurar() {
  if [[ "$PORTA_ABERTA" == "1" ]]; then
    psql "$MIGRATION_DATABASE_URL" -q -f "$SQL_PLATAFORMA" >/dev/null 2>&1
    PORTA_ABERTA=0
    printf '  (a porta da plataforma foi reposta)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() { node --test --test-reporter=tap --experimental-strip-types provas/plataforma.test.ts >"$1" 2>&1; }

analisar() {
  local f="$1" grupos assercoes
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  assercoes=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$assercoes" ]] || return 2
  echo "$grupos $assercoes"
}

echo "0. Fixtures"
if node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; then
  verde "semeadas (inclui o utilizador de plataforma)"
else
  vermelho "não foi possível semear"; exit 1
fi

echo
echo "1. Com a porta fechada, como está"
if correr /tmp/bossaos-plataforma-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-plataforma-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos assercoes <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( assercoes != ASSERCOES_ESPERADAS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $assercoes asserções (esperadas $ASSERCOES_ESPERADAS)"
    exit 1
  fi
  verde "$grupos grupos verdes, $assercoes asserções"
else
  vermelho "a prova falhou com a porta fechada"
  grep -E '^ *not ok|error:' /tmp/bossaos-plataforma-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a porta sem a verificação de staff"
# A função passa a responder a qualquer pessoa autenticada. Se a prova continuar
# verde, o que ela media era que a função existe.
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
CREATE OR REPLACE FUNCTION plataforma_organizacoes()
RETURNS TABLE (id uuid, slug text, nome text, plano text, estado text, unidades bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  RETURN QUERY
    SELECT o.id, o.slug, o.nome, p.codigo, COALESCE(s.estado::text, 'SEM_PLANO'),
           (SELECT count(*) FROM locations l WHERE l.organization_id = o.id AND l.archived_at IS NULL)
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plan_definitions p ON p.id = s.plan_id
     WHERE o.archived_at IS NULL ORDER BY o.nome;
END; $$;
PY
PORTA_ABERTA=1
if correr /tmp/bossaos-plataforma-aberta.txt; then
  vermelho "a prova ficou VERDE com a porta aberta — não mede o acesso"
else
  verde "a prova ficou vermelha, como tem de ficar"
  # O discriminador: tem de cair o lado NEGATIVO do par — a cliente passou a ver.
  if grep -q 'uma cliente conseguiu listar todos os inquilinos\|sem identidade nenhuma' /tmp/bossaos-plataforma-aberta.txt; then
    verde "caiu o lado da recusa: era mesmo a verificação de staff que bloqueava"
  else
    vermelho "ficou vermelha, mas não foi a recusa que caiu"
    grep -E '^ *not ok' /tmp/bossaos-plataforma-aberta.txt | head -4
  fi
  # E o lado POSITIVO tem de continuar de pé. Se o staff também deixasse de ver,
  # o vermelho vinha de a função estar partida e não de a porta estar aberta.
  if grep -q 'ok 1 - o staff vê as organizações' /tmp/bossaos-plataforma-aberta.txt; then
    verde "o staff continuou a ver: caiu a porta, não a consulta"
  else
    vermelho "o staff também deixou de ver — o vermelho não vem da porta"
  fi
fi
psql "$MIGRATION_DATABASE_URL" -q -f "$SQL_PLATAFORMA" >/dev/null 2>&1
PORTA_ABERTA=0

echo
echo "3. Reposta — tem de voltar ao verde"
if correr /tmp/bossaos-plataforma-reposto.txt; then
  read -r grupos assercoes <<<"$(analisar /tmp/bossaos-plataforma-reposto.txt)"
  verde "reposto: $grupos grupos, $assercoes asserções"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-plataforma-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit $(( falhas > 0 ? 1 : 0 ))

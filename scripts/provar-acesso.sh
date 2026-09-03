#!/usr/bin/env bash
#
# A prova do E04: sessões, permissões, convites e revogação.
#
# O alvo está em `docs/architecture/autenticacao-e-convites.md`, escrito no E00
# antes desta etapa. Corre contra a aplicação CONSTRUÍDA, por HTTP, com sessões
# a sério.
#
# O controlo negativo faz **o par colapsar**: desliga-se a verificação de escopo
# e exige-se que o identificador de B passe a devolver 200 com sessão de A. Se a
# prova continuar verde com a verificação desligada, o que ela mede é que a rota
# existe.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"
: "${AUTH_DATABASE_URL:?AUTH_DATABASE_URL em falta}"

# A versão do Node, verificada à cabeça. A razão está escrita por extenso em
# `provar-isolamento.sh`: o formato do relatório muda com a versão, e uma
# contagem que não encontra o formato que espera conta zero — e zero, sem esta
# guarda, lê-se como "tudo bem".
NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  echo "Corra \`fnm use\` antes." >&2
  exit 2
fi

PORTA="${PORTA_PROVA:-3011}"
export BASE_URL="http://127.0.0.1:$PORTA"
export BETTER_AUTH_URL="$BASE_URL"
falhas=0
verificacoes=0
MINIMO_VERIFICACOES=7
PID=""
POLITICA_A_MAIS=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; verificacoes=$((verificacoes + 1)); }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); verificacoes=$((verificacoes + 1)); }

parar() {
  [[ -n "$PID" ]] && { kill "$PID" 2>/dev/null; wait "$PID" 2>/dev/null; }
  PID=""
  for _ in $(seq 1 20); do
    restantes=$(lsof -ti ":$PORTA" 2>/dev/null)
    [[ -z "$restantes" ]] && break
    echo "$restantes" | xargs kill 2>/dev/null
    sleep 0.25
  done
}

# Repor SEMPRE o ficheiro que o controlo negativo altera. Um script que morra a
# meio com a verificação de escopo desligada deixa o repositório com um defeito
# de segurança dentro — e é o tipo de coisa que sobrevive a um commit distraído.
# Uma política a mais deixada para trás é um furo de isolamento a viver no
# repositório. Cai-se sempre por aqui, mesmo com o script morto a meio.
restaurar() {
  parar
  if [[ "${POLITICA_A_MAIS:-0}" == "1" ]]; then
    psql "$MIGRATION_DATABASE_URL" -q \
      -c "DROP POLICY IF EXISTS sonda_de_mais ON organizations" \
      -c "DROP POLICY IF EXISTS sonda_de_mais ON brands" >/dev/null 2>&1
    POLITICA_A_MAIS=0
    printf '  (política a mais removida)\n'
  fi
  rm -rf apps/web/.next
}
trap restaurar EXIT INT TERM

construir_e_subir() {
  rm -rf apps/web/.next
  if ! pnpm build >/tmp/bossaos-acesso-build.log 2>&1; then
    vermelho "o build falhou — a prova não tem o que interrogar"
    tail -15 /tmp/bossaos-acesso-build.log
    return 1
  fi
  pnpm --filter @bossaos/web exec next start -p "$PORTA" >/tmp/bossaos-acesso-app.log 2>&1 &
  PID=$!
  for _ in $(seq 1 60); do
    curl -fsS "$BASE_URL/api/health" >/dev/null 2>&1 && return 0
    kill -0 "$PID" 2>/dev/null || return 1
    sleep 0.5
  done
  return 1
}

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/acesso.test.ts >"$1" 2>&1
}

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
  verde "semeadas"
else
  vermelho "não foi possível semear"; exit 1
fi

echo
echo "0b. O relógio da base e o do processo dizem o mesmo?"
# Antes de medir prazos, confirmar que se sabe que horas são. Um convite
# expirado era aceite porque o Prisma lia duas horas no futuro.
if node --test --test-reporter=tap --experimental-strip-types provas/fuso.test.ts >/tmp/bossaos-fuso.txt 2>&1; then
  verde "sem desvio ($(grep -m1 -oE '^# pass [0-9]+' /tmp/bossaos-fuso.txt | grep -oE '[0-9]+') asserções)"
else
  vermelho "há desvio de fuso — nenhum prazo desta prova é de confiança"
  grep -E 'not ok|horas de desvio' /tmp/bossaos-fuso.txt | head -5
  exit 1
fi

echo
echo "1. Com a verificação de escopo LIGADA"
if ! construir_e_subir; then vermelho "a aplicação não subiu"; exit 1; fi

if correr /tmp/bossaos-acesso-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-acesso-ligado.txt); then
    vermelho "a prova saiu a zero mas o relatório não é TAP legível — não se mediu nada"
    exit 1
  fi
  read -r grupos assercoes <<<"$leitura"
  if (( grupos == 0 )) || (( assercoes == 0 )); then
    vermelho "VERDE COM ZERO MEDIDO: $grupos grupos, $assercoes asserções."
    exit 1
  fi
  if (( grupos < 4 )) || (( assercoes < 24 )); then
    vermelho "medido a menos: $grupos grupos (esperados 4), $assercoes asserções (esperadas 24)"
    exit 1
  fi
  verde "$grupos grupos, $assercoes asserções"
else
  vermelho "a prova falhou com a verificação ligada"
  grep -E 'not ok|error:|AssertionError' /tmp/bossaos-acesso-ligado.txt | head -12
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o par tem de colapsar"
#
# A primeira versão deste controlo desligava a verificação de contexto em
# `tenant.ts`, fazendo a URL autenticar. **Não colapsou o par** — e isso não foi
# uma falha do controlo, foi informação: com a política de linha por baixo, partir
# só a resolução de contexto não vaza. A dona de A pedia a organização de B,
# ficava com o contexto de A, e o RLS devolvia vazio na mesma. As camadas fazem o
# que dizem.
#
# Para o par colapsar é preciso atacar a camada que produz a DIFERENÇA: a leitura
# com escopo. E há uma forma realista de o fazer, que é precisamente o risco que
# a revisão do E03 foi verificar — no PostgreSQL as políticas permissivas
# somam-se por **OR**, por isso uma política de leitura a mais alarga o acesso
# sem aparecer em teste nenhum.
#
# Acrescenta-se uma. É SQL, não precisa de rebuild, e é o defeito que alguém
# escreveria a sério a tentar resolver um "não vejo as minhas organizações".
psql "$MIGRATION_DATABASE_URL" -q \
  -c "CREATE POLICY sonda_de_mais ON organizations FOR SELECT USING (true)" \
  -c "CREATE POLICY sonda_de_mais ON brands FOR SELECT USING (true)" >/dev/null 2>&1
POLITICA_A_MAIS=1

if correr /tmp/bossaos-acesso-defeito.txt; then
  vermelho "a prova PASSOU com uma política de leitura a mais — não é o escopo que ela mede"
else
  if ! analisar /tmp/bossaos-acesso-defeito.txt >/dev/null; then
    vermelho "o relatório do controlo negativo não é TAP legível"
  else
    verde "a prova ficou vermelha, como tem de ficar"
    if grep -q '^not ok .*O PAR' /tmp/bossaos-acesso-defeito.txt; then
      verde "foi O PAR que caiu (é ele que mede o escopo)"
    else
      vermelho "o par continuou verde com o escopo alargado — não estava a medir"
    fi
  fi
fi

# E o discriminador directo, sem passar por teste nenhum: com a política a mais,
# a marca de B tem de ser visível a partir do contexto de A.
# `tail -1` apanhava a linha "COMMIT" e o `-ge` tentava avaliá-la como
# aritmética — com `set -u` isso mata o script e ele saía a zero na mesma. O
# número extrai-se pelo formato, não pela posição.
vista=$(psql "$DATABASE_URL" -tAc "
  BEGIN;
  SELECT set_config('app.organization_id','11111111-1111-4111-8111-111111111111',true);
  SELECT count(*) FROM brands;
  COMMIT;" 2>/dev/null | grep -E '^[0-9]+$' | tail -1)
if [[ "$vista" =~ ^[0-9]+$ ]] && (( vista >= 2 )); then
  verde "com a política a mais, o contexto de A vê $vista marcas (devia ver 1)"
else
  vermelho "a política a mais não alargou nada — o controlo não demonstrou o defeito"
fi

psql "$MIGRATION_DATABASE_URL" -q \
  -c "DROP POLICY IF EXISTS sonda_de_mais ON organizations" \
  -c "DROP POLICY IF EXISTS sonda_de_mais ON brands" >/dev/null 2>&1
POLITICA_A_MAIS=0

echo
echo "3. Reposta — tem de voltar ao verde"
if true; then
  if correr /tmp/bossaos-acesso-religado.txt; then
    verde "de volta ao verde"
  else
    vermelho "não voltou ao verde depois de repor"
    grep -E 'not ok|AssertionError' /tmp/bossaos-acesso-religado.txt | head -8
  fi
fi

echo
if (( verificacoes < MINIMO_VERIFICACOES )); then
  echo "VERDE COM ZERO MEDIDO: só $verificacoes verificações, esperadas $MINIMO_VERIFICACOES."
  exit 1
fi
if (( falhas == 0 )); then
  echo "Acesso provado: 0 falhas."
else
  echo "Acesso NÃO provado: $falhas falha(s)."
  exit 1
fi

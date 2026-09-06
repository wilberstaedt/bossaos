#!/usr/bin/env bash
#
# O aceite 3 do E04: recuperação e MFA FUNCIONAM no ambiente de teste, e a
# recuperação encerra as sessões conforme a política registada.
#
# Na primeira entrega isto ficou declarado como não demonstrado. Declarar em vez
# de afirmar é a resposta certa quando a coisa não está feita — mas não a faz.
#
# Corre contra a aplicação CONSTRUÍDA, por HTTP, e LÊ a caixa de correio do
# Mailpit. Não se verifica que o envio devolveu 200: abre-se a mensagem, tira-se
# a ligação de dentro e usa-se ela para repor a senha.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${AUTH_DATABASE_URL:?AUTH_DATABASE_URL em falta}"

# A versão do Node, verificada à cabeça. A razão está por extenso em
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

PORTA="${PORTA_PROVA:-3012}"
export BASE_URL="http://127.0.0.1:$PORTA"
export BETTER_AUTH_URL="$BASE_URL"
export MAILPIT_URL="${MAILPIT_URL:-http://127.0.0.1:8025}"
GRUPOS_ESPERADOS=2
ASSERCOES_ESPERADAS=13
falhas=0
PID=""
PID_MAILPIT=""
CONFIG=packages/auth/src/autenticacao.ts
ORIGINAL=$(mktemp)
cp "$CONFIG" "$ORIGINAL"

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── Um plante tem de VERIFICAR-SE ────────────────────────────────────────────
#
# Se a âncora já não existe, o `assert` do python dispara, o guião segue, e o
# `exigir_vermelho` corre contra um produto INTACTO: o produto passa, e o guião
# conclui que a asserção é vazia. É uma acusação falsa — e cinco das dez falhas
# do corredor de 06/09 eram exactamente isso.
#
# Aqui o código de saída do plante é lido. Se ele não pegou, a falha é do GUIÃO
# e diz-se assim, em vez de se atribuir ao produto.
plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

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

# Repor SEMPRE a configuração que o controlo negativo altera. Um script morto a
# meio deixaria a revogação de sessões no reset DESLIGADA dentro do repositório,
# e isso sobrevive a um commit distraído — é a lição do `provar-acesso.sh`.
restaurar() {
  parar
  cp "$ORIGINAL" "$CONFIG"; rm -f "$ORIGINAL"
  [[ -n "$PID_MAILPIT" ]] && kill "$PID_MAILPIT" 2>/dev/null
  rm -rf apps/web/.next
}
trap restaurar EXIT INT TERM

# ── Mailpit ────────────────────────────────────────────────────────────────
# Levantado por esta prova se não estiver de pé. Se não houver binário, isto
# FALHA — não salta. Uma prova que se salta a si própria quando falta a
# infraestrutura fica verde exactamente no dia em que ela não está lá.
if ! curl -fsS "$MAILPIT_URL/api/v1/info" >/dev/null 2>&1; then
  if ! command -v mailpit >/dev/null 2>&1; then
    echo "ERRO: Mailpit não está a correr nem instalado. Esta prova LÊ a caixa." >&2
    exit 2
  fi
  mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025 >/tmp/bossaos-mailpit.log 2>&1 &
  PID_MAILPIT=$!
  for _ in $(seq 1 40); do
    curl -fsS "$MAILPIT_URL/api/v1/info" >/dev/null 2>&1 && break
    sleep 0.25
  done
fi
curl -fsS "$MAILPIT_URL/api/v1/info" >/dev/null 2>&1 || { echo "ERRO: Mailpit não respondeu." >&2; exit 2; }

construir_e_subir() {
  rm -rf apps/web/.next
  if ! pnpm build >/tmp/bossaos-mfa-build.log 2>&1; then
    vermelho "o build falhou — a prova não tem o que interrogar"
    tail -15 /tmp/bossaos-mfa-build.log
    return 1
  fi
  pnpm --filter @bossaos/web exec next start -p "$PORTA" >/tmp/bossaos-mfa-app.log 2>&1 &
  PID=$!
  for _ in $(seq 1 60); do
    curl -fsS "$BASE_URL/api/health" >/dev/null 2>&1 && return 0
    kill -0 "$PID" 2>/dev/null || return 1
    sleep 0.5
  done
  return 1
}

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/recuperacao-e-mfa.test.ts >"$1" 2>&1
}

# O formato é exigido, não adivinhado. Um relatório que não é TAP conta zero
# grupos e zero asserções, e zero lê-se como "correu tudo bem".
analisar() {
  local f="$1" grupos assercoes
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  assercoes=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$assercoes" ]] || return 2
  echo "$grupos $assercoes"
}

echo "1. Com a política REGISTADA em vigor"
if ! construir_e_subir; then vermelho "a aplicação não subiu"; exit 1; fi

if correr /tmp/bossaos-mfa-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-mfa-ligado.txt); then
    vermelho "a prova saiu a zero mas o relatório não é TAP legível — não se mediu nada"
    exit 1
  fi
  read -r grupos assercoes <<<"$leitura"
  if (( grupos == 0 )) || (( assercoes == 0 )); then
    vermelho "VERDE COM ZERO MEDIDO: $grupos grupos, $assercoes asserções."
    exit 1
  fi
  if (( grupos != GRUPOS_ESPERADOS )) || (( assercoes != ASSERCOES_ESPERADAS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $assercoes asserções (esperadas $ASSERCOES_ESPERADAS)"
    exit 1
  fi
  verde "$grupos grupos verdes, $assercoes asserções"
else
  vermelho "a prova falhou com a política em vigor"
  grep -E 'not ok|Error|AssertionError|em baixo' /tmp/bossaos-mfa-ligado.txt | head -20
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a revogação de sessões no reset DESLIGADA"
# Se a prova continuar verde com isto desligado, o que ela mede é que o pedido
# de recuperação devolve 200 — e não que recuperar o acesso expulsa quem já lá
# estava, que é o que o aceite 3 exige.
parar
plantar <<'PY' || true
import io
p = 'packages/auth/src/autenticacao.ts'
s = io.open(p, encoding='utf-8').read()
assert 'revokeSessionsOnPasswordReset: true,' in s
io.open(p, 'w', encoding='utf-8').write(s.replace('revokeSessionsOnPasswordReset: true,', ''))
PY
if ! construir_e_subir; then vermelho "a aplicação não subiu no controlo negativo"; exit 1; fi

if correr /tmp/bossaos-mfa-desligado.txt; then
  vermelho "a prova ficou VERDE com a revogação desligada — não mede a política"
  falhas=$((falhas + 1))
else
  verde "a prova ficou vermelha, como tem de ficar"
  # O discriminador: tem de cair a asserção CERTA. Vermelho por outro motivo
  # (build partido, servidor em baixo) leria-se aqui exactamente igual.
  if grep -q 'sessão anterior à recuperação continua viva' /tmp/bossaos-mfa-desligado.txt; then
    verde "caiu a asserção das sessões antigas — é ela que mede a política"
  else
    vermelho "ficou vermelha, mas não foi a asserção das sessões antigas que caiu"
    grep -E 'not ok' /tmp/bossaos-mfa-desligado.txt | head -5
  fi
  # E o resto tem de continuar de pé: o MFA não depende desta opção. Se caísse
  # tudo, o vermelho vinha de a aplicação ter partido e não da política.
  if grep -q '^# pass' /tmp/bossaos-mfa-desligado.txt && \
     (( $(grep -m1 -oE '^# pass [0-9]+' /tmp/bossaos-mfa-desligado.txt | grep -oE '[0-9]+') >= 10 )); then
    verde "o segundo factor continuou verde — caiu a política, não a aplicação"
  else
    vermelho "caiu demasiada coisa: o vermelho não vem da política"
  fi
fi

echo
echo "3. CONTROLO NEGATIVO — a caixa de correio fora de alcance"
# Prova que a LEITURA da caixa é carregada. Se a prova passasse com o Mailpit
# inalcançável, o que ela media era o 200 do pedido — e o 200 do pedido é
# exactamente o que o E04 entregou da primeira vez.
parar
cp "$ORIGINAL" "$CONFIG"
if ! construir_e_subir; then vermelho "a aplicação não subiu no terceiro controlo"; exit 1; fi
if MAILPIT_URL="http://127.0.0.1:59999" correr /tmp/bossaos-mfa-sem-caixa.txt; then
  vermelho "a prova ficou VERDE sem caixa de correio — não a está a ler"
  falhas=$((falhas + 1))
elif grep -q 'Mailpit em baixo' /tmp/bossaos-mfa-sem-caixa.txt; then
  verde "falhou alto por falta de caixa, em vez de saltar"
else
  vermelho "falhou sem dizer que a caixa não estava lá"
  grep -E 'not ok' /tmp/bossaos-mfa-sem-caixa.txt | head -5
fi

echo
echo "4. Reposta — tem de voltar ao verde"
parar
cp "$ORIGINAL" "$CONFIG"
if ! construir_e_subir; then vermelho "a aplicação não subiu depois de repor"; exit 1; fi
if correr /tmp/bossaos-mfa-reposto.txt; then
  read -r grupos assercoes <<<"$(analisar /tmp/bossaos-mfa-reposto.txt)"
  verde "reposto: $grupos grupos, $assercoes asserções"
else
  vermelho "não voltou ao verde depois de repor a configuração"
  grep -E 'not ok' /tmp/bossaos-mfa-reposto.txt | head -10
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit $(( falhas > 0 ? 1 : 0 ))

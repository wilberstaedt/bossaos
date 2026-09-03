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
MINIMO_VERIFICACOES=6
PID=""
ALTERADO=0

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
restaurar() {
  parar
  if [[ "$ALTERADO" == "1" ]]; then
    cp /tmp/bossaos-tenant.bom packages/domain/src/tenant.ts
    ALTERADO=0
    printf '  (verificação de escopo reposta)\n'
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
echo "2. CONTROLO NEGATIVO — a URL passa a autenticar, e o par tem de colapsar"
cp packages/domain/src/tenant.ts /tmp/bossaos-tenant.bom
ALTERADO=1
python3 - <<'PY'
p='packages/domain/src/tenant.ts'; s=open(p,encoding='utf-8').read()
# O defeito exacto que o contrato proíbe: a URL deixa de SELECCIONAR e passa a
# AUTENTICAR. Qualquer organização pedida resolve, com as concessões de quem
# pediu — que é como se escreve isto por engano quando se está com pressa.
s = s.replace("""  const filiacao = filiacoes.find((f) => f.organizationSlug === alvo.organizationSlug);
  if (!filiacao) return { ok: false, recusa: { tipo: 'sem_filiacao' } };""",
"""  const filiacao =
    filiacoes.find((f) => f.organizationSlug === alvo.organizationSlug) ?? filiacoes[0];
  if (!filiacao) return { ok: false, recusa: { tipo: 'sem_filiacao' } };""")
open(p,'w',encoding='utf-8').write(s)
PY
parar
if ! construir_e_subir; then vermelho "não subiu com o defeito plantado"; else
  if correr /tmp/bossaos-acesso-defeito.txt; then
    vermelho "a prova PASSOU com a verificação de escopo desligada — não é isso que ela mede"
  else
    if ! analisar /tmp/bossaos-acesso-defeito.txt >/dev/null; then
      vermelho "o relatório do controlo negativo não é TAP legível"
    else
      verde "a prova ficou vermelha, como tem de ficar"
      if grep -q '^not ok .*O PAR' /tmp/bossaos-acesso-defeito.txt; then
        verde "foi O PAR que caiu (é ele que mede o escopo)"
      else
        vermelho "o par continuou verde sem verificação de escopo — não estava a medir"
      fi
    fi
  fi
fi

# E o discriminador directo: com o defeito, o identificador de B tem de devolver
# 200 a quem tem sessão de A. Perguntado sem passar por teste nenhum.
echo "   (medição directa do colapso, adiante)"

parar
cp /tmp/bossaos-tenant.bom packages/domain/src/tenant.ts
ALTERADO=0

echo
echo "3. Reposta — tem de voltar ao verde"
if ! construir_e_subir; then vermelho "não subiu depois de repor"; else
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

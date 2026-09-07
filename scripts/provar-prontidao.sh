#!/usr/bin/env bash
#
# Prova o CT-03: "uma falha de infraestrutura deve retornar indisponibilidade
# real; não simular banco saudável".
#
# Não testa a função em memória — testa a APLICAÇÃO CONSTRUÍDA, por HTTP, em
# quatro estados de infraestrutura diferentes. É a diferença entre saber que a
# peça funciona e saber que o caminho até ela funciona.
#
#   base migrada        → /ready 200 "pronto"
#   base viva sem schema→ /ready 503 "schema_por_migrar"   (deploy sem migração)
#   base em baixo       → /ready 503 "base_indisponivel"
#   sem configuração    → o processo NÃO arranca
#
# E em todos eles /health continua 200: vivacidade e prontidão são perguntas
# diferentes, e confundi-las faz o orquestrador reiniciar a aplicação quando
# quem caiu foi o Postgres.
#
# O script CONSTRÓI a aplicação, para ser auto-suficiente: interroga sempre o
# que acabou de compilar e nunca um build velho que por acaso lá esteja.
#
# Uso: ./scripts/provar-prontidao.sh
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
PORTA="${PORTA_PROVA:-3999}"
falhas=0
# Quantas verificações correram de facto.
#
# Acrescentado depois de o verificador do E03 conseguir dizer verde sem ter
# medido nada. Um contador de FALHAS a zero só diz que nada correu mal; não diz
# que alguma coisa correu. São perguntas diferentes, e é sempre a segunda que
# falta.
verificacoes=0
# O mínimo vive numa variável só. Ao provar que este portão dispara, vi a
# mensagem dizer "esperadas 8" enquanto a comparação usava outro número: tinha o
# valor escrito duas vezes. Uma régua que se descreve a si própria de forma
# diferente da que aplica é uma régua que ninguém pode acreditar.
#
# Estava em 10 e uma corrida verde emite 11 — medido a 07/09, contadas as linhas
# da saída com os códigos de cor tirados. O piso estava solto por uma: podia
# desaparecer uma verificação e isto continuava a dizer «Prontidão provada».
#
# Fica piso e não igualdade de propósito. Com a aplicação em baixo, as secções
# tomam o ramo do `else` e emitem MENOS verificações; uma igualdade trocava a
# mensagem certa («a aplicação não arrancou») pela errada («a prova não correu
# inteira»). O piso perde-se com o tempo, mas perde-se para o lado seguro.
MINIMO_VERIFICACOES=11

PID=""

verde()  { printf '  \033[32mok\033[0m    %s\n' "$1"; verificacoes=$((verificacoes + 1)); }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); verificacoes=$((verificacoes + 1)); }

# Matar o PID pode não chegar: `pnpm exec` é um invólucro e o `next start` que
# ele lança pode sobreviver ao pai. Confirma-se pela PORTA — que é o que se pode
# observar — e insiste-se até ficar livre, senão o arranque seguinte encontra-a
# ocupada e a prova mede o servidor errado.
parar() {
  [[ -n "$PID" ]] && { kill "$PID" 2>/dev/null; wait "$PID" 2>/dev/null; }
  PID=""
  for _ in $(seq 1 20); do
    local restantes; restantes=$(lsof -ti ":$PORTA" 2>/dev/null)
    [[ -z "$restantes" ]] && return 0
    echo "$restantes" | xargs kill 2>/dev/null
    sleep 0.25
  done
  echo "  aviso: a porta $PORTA continua ocupada" >&2
}
limpar() { parar; rm -rf apps/web/.next; }
trap limpar EXIT

echo "0. Construir a aplicação (limpo, para a prova não correr sobre restos)"
rm -rf apps/web/.next
if pnpm build >/tmp/bossaos-build.log 2>&1; then
  verde "build concluído"
else
  vermelho "o build falhou — a prova não tem o que interrogar"
  tail -20 /tmp/bossaos-build.log
  exit 1
fi
echo

# Arranca a app com o DATABASE_URL dado. Devolve 1 se não subiu em 30 s.
arrancar() {
  parar
  DATABASE_URL="$1" PORT="$PORTA" NODE_ENV=production LOG_LEVEL=error \
    pnpm --filter @bossaos/web exec next start -p "$PORTA" >/tmp/bossaos-prova.log 2>&1 &
  PID=$!
  for _ in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:$PORTA/api/health" >/dev/null 2>&1; then return 0; fi
    kill -0 "$PID" 2>/dev/null || return 1
    sleep 0.5
  done
  return 1
}

# Ecoa "<código> <corpo>" de um caminho.
pedir() { curl -s -o /tmp/bossaos-corpo -w '%{http_code}' "http://127.0.0.1:$PORTA$1"; }

espera() { # caminho, código esperado, estado esperado, rótulo
  local codigo; codigo=$(pedir "$1"); local corpo; corpo=$(cat /tmp/bossaos-corpo)
  if [[ "$codigo" == "$2" ]] && [[ "$corpo" == *"\"$3\""* ]]; then
    verde "$4 → $codigo $3"
  else
    vermelho "$4 → esperado $2/$3, veio $codigo $corpo"
  fi
}

echo "1. Base migrada (o estado normal)"
if arrancar "$DATABASE_URL"; then
  espera /api/health 200 vivo   "/health"
  espera /api/ready  200 pronto "/ready"
  # O request_id volta ao cliente: sem ele, quem reporta um erro não tem o que citar.
  rid=$(curl -s -D- -o /dev/null "http://127.0.0.1:$PORTA/api/ready" | tr -d '\r' \
        | awk 'tolower($1)=="x-request-id:"{print $2}')
  [[ -n "$rid" ]] && verde "devolve x-request-id ($rid)" || vermelho "não devolveu x-request-id"
  # Um request_id vindo de fora com lixo não pode ser aceite tal e qual.
  sujo=$(curl -s -D- -o /dev/null -H 'x-request-id: nao valido{"forjado":1}' \
         "http://127.0.0.1:$PORTA/api/ready" | tr -d '\r' \
         | awk 'tolower($1)=="x-request-id:"{print $2}')
  [[ "$sujo" == *forjado* ]] && vermelho "aceitou um request_id forjado" \
                             || verde "recusa request_id com formato inválido"
else
  vermelho "a aplicação não arrancou com a base migrada"
fi

echo
echo "2. Base viva, schema por migrar (deploy incompleto)"
SEM_SCHEMA="${DATABASE_URL/bossaos_dev/bossaos_test}"
if arrancar "$SEM_SCHEMA"; then
  espera /api/health 200 vivo              "/health"
  espera /api/ready  503 schema_por_migrar "/ready"
else
  vermelho "a aplicação não arrancou contra a base sem schema"
fi

echo
echo "3. Base em baixo"
# Porta onde não há Postgres nenhum.
EM_BAIXO="${DATABASE_URL/:5432/:5433}"
if arrancar "$EM_BAIXO"; then
  espera /api/health 200 vivo              "/health"
  espera /api/ready  503 base_indisponivel "/ready"
else
  vermelho "a aplicação não arrancou com a base em baixo (health devia continuar a responder)"
fi
parar

echo
echo "4. Configuração obrigatória em falta"
saida=$(env -u DATABASE_URL -u MIGRATION_DATABASE_URL \
        node --experimental-strip-types apps/worker/src/index.ts 2>&1)
codigo=$?
if [[ $codigo -ne 0 ]] && [[ "$saida" == *DATABASE_URL* ]]; then
  verde "o worker recusa arrancar e nomeia DATABASE_URL (saída $codigo)"
else
  vermelho "arrancou sem configuração ou não disse qual falta (saída $codigo)"
fi
if [[ "$saida" == *"://"*":"*"@"* ]]; then
  vermelho "a mensagem de erro contém algo com forma de credencial"
else
  verde "a mensagem não revela credenciais"
fi

echo
if (( verificacoes < MINIMO_VERIFICACOES )); then
  echo
  echo "VERDE COM ZERO MEDIDO: só $verificacoes verificações correram, esperadas $MINIMO_VERIFICACOES."
  echo "A prova não correu inteira — não conclua nada dela."
  exit 1
fi

if (( falhas == 0 )); then echo "Prontidão provada: 0 falhas."; else
  echo "Prontidão NÃO provada: $falhas falha(s)."; echo "--- log ---"; tail -20 /tmp/bossaos-prova.log; exit 1
fi

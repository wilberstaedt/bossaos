#!/usr/bin/env bash
# ── O registo por email está fechado, e mede-se na RESPOSTA ────────────────
#
# `emailAndPassword: { enabled: true }` sem `disableSignUp` faz o `better-auth`
# 1.7.2 registar `POST /api/auth/sign-up/email` **exista ou não uma página**. Foi
# assim que o produto esteve com registo aberto num domínio público sem ninguém
# o ter querido: a interface não tinha porta, a API tinha.
#
# ── Porque é que isto NÃO lê a configuração ───────────────────────────────
#
# Ler `disableSignUp: true` no ficheiro não prova que a rota morreu. Foi
# exactamente ler a interface — «não há página de registo» — que produziu a
# afirmação errada de que o registo não existia. **Aqui pergunta-se ao
# servidor.**
#
# ── O sinal NÃO é um 404, e isso foi medido ──────────────────────────────
#
# A régua deste trabalho previa que a rota passasse a **404**. Não passa: o
# `disableSignUp` **não desregista a rota**, recusa a operação. Medido com a cura
# ligada e corpo válido:
#
#   {"message":"Email and password sign up is not enabled",
#    "code":"EMAIL_PASSWORD_SIGN_UP_DISABLED"}   [400]
#
# Exigir 404 teria feito esta guarda ficar vermelha para sempre sobre uma cura
# que funciona — e a saída fácil seria alguém concluir que a cura não pegou e ir
# procurar outra. O que interessa não é a rota desaparecer: é **não se poder
# criar conta**. É isso que se mede.
#
# Na MESMA corrida:
#
#   rota inventada     404                              o controlo: 404 = não registada
#   sign-in/email      400 VALIDATION_ERROR             uma rota viva responde validação
#   sign-up/email      400 EMAIL_PASSWORD_SIGN_UP_DISABLED   a operação recusada
#
# Se algum controlo não bater, o veredicto é NÃO MEDI: sem uma rota viva ao lado,
# a recusa do registo podia ser de qualquer outra coisa.
#
# ── E a sonda nunca cria conta ────────────────────────────────────────────
#
# O corpo leva uma senha de UM carácter. Medido: com a cura ligada o
# `disableSignUp` responde ANTES da política de senha, e com ela desligada é a
# política que recusa — nos dois casos **nada é criado**. Uma prova de segurança
# que precisasse de criar a conta para saber se podia criá-la seria o próprio
# defeito a correr.
#
# O `GET` não serve para perguntar isto: o `better-auth` responde 404 a método
# errado, e o `sign-in/email` também dá 404 em `GET`. O primeiro instrumento foi
# descartado por um controlo, não por intuição.
#
# Três respostas:
#   OK (0)        o registo está fechado e o resto do produto responde
#   FALHOU (1)    o `sign-up` aceita pedidos
#   NÃO MEDI (2)  o servidor não subiu, ou os controlos não se comportaram
set -uo pipefail
cd "$(dirname "$0")/.."

OK=0; FALHOU=1; NAO_MEDI=2
verde()    { echo "  ok       $1"; }
vermelho() { echo "  FALHOU   $1"; }
naomedi()  { echo "  NÃO MEDI $1"; }

echo "O registo por email está fechado?"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

PORTA="${PORTA_REGISTO:-3031}"
if lsof -nP -iTCP:"$PORTA" -sTCP:LISTEN >/dev/null 2>&1; then
  naomedi "a porta $PORTA já está ocupada — outra corrida a decorrer?"
  exit "$NAO_MEDI"
fi

# O build é o de PRODUÇÃO, que é onde a rota existe ou não. Reconstrói-se sempre
# pela mesma razão do `provar-demonstracao.sh`: medir um build velho é medir
# outro produto.
. "$(dirname "$0")/next-env-intacto.sh"
guardar_next_env
pnpm build >/tmp/registo-build.log 2>&1 || { repor_next_env; naomedi "o build falhou; ver /tmp/registo-build.log"; exit "$NAO_MEDI"; }

BETTER_AUTH_URL="http://127.0.0.1:$PORTA" \
  pnpm --filter @bossaos/web exec next start -p "$PORTA" >/tmp/registo-servidor.log 2>&1 &
SERVIDOR=$!
trap 'kill "$SERVIDOR" 2>/dev/null; repor_next_env' EXIT INT TERM

pronto=0
for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$PORTA/api/health" >/dev/null 2>&1 && { pronto=1; break; }
  sleep 2
done
[ "$pronto" -eq 1 ] || { naomedi "o servidor não subiu na porta $PORTA"; exit "$NAO_MEDI"; }

codigo() {
  curl -s -o /dev/null -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' -d "${2:-{\}}" \
    "http://127.0.0.1:$PORTA$1"
}

corpo() {
  curl -s -X POST -H 'Content-Type: application/json' -d "$2" "http://127.0.0.1:$PORTA$1"
}

INVENTADA=$(codigo /api/auth/rota-inventada-xyz)
ENTRADA=$(codigo /api/auth/sign-in/email '{}')
# Senha de um carácter: nunca cria conta, com ou sem a cura.
SONDA='{"email":"registo-fechado@bossaos.invalid","password":"x","name":"x"}'
REGISTO=$(codigo /api/auth/sign-up/email "$SONDA")
REGISTO_CORPO=$(corpo /api/auth/sign-up/email "$SONDA")
# O convite não pode partir: é por lá que entra toda a gente. Um token inventado
# deve dar 404 do RECURSO — o que importa é a rota responder, não ter sumido.
CONVITE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORTA/api/convites/token-que-nao-existe")
ACEITAR=$(codigo /api/convites/aceitar '{"token":"x"}')

echo "  medido:  inventada=$INVENTADA  sign-in=$ENTRADA  sign-up=$REGISTO  convite=$CONVITE  aceitar=$ACEITAR"
echo "           sign-up diz: $(printf '%s' "$REGISTO_CORPO" | head -c 120)"

ambito() {
  echo "  âmbito:  três pedidos na mesma corrida contra o build de PRODUÇÃO."
  echo "           Mede a RESPOSTA do servidor e nunca a configuração — ler o"
  echo "           ficheiro foi o que fez alguém afirmar que a rota não existia."
  echo "           FORA, e declarado: isto não mede o que uma conta criada assim"
  echo "           alcançaria. A exposição prova-se; a consequência não se mediu,"
  echo "           e medi-la exigia criar contas."
}

# ── Os controlos primeiro: sem eles o 404 do registo não vale nada ────────
if [ "$INVENTADA" != "404" ]; then
  naomedi "o controlo falhou: uma rota inventada devolveu $INVENTADA e não 404."
  ambito; exit "$NAO_MEDI"
fi
if [ "$ENTRADA" != "400" ]; then
  naomedi "o controlo falhou: o \`sign-in/email\` devolveu $ENTRADA e não 400."
  echo "           Sem uma rota viva a responder validação, um 404 no registo"
  echo "           pode ser de um 404 global — e isso não é cura."
  ambito; exit "$NAO_MEDI"
fi
verde "os controlos batem: inventada 404, sign-in 400"

if [ "$CONVITE" = "000" ] || [ "$ACEITAR" = "000" ]; then
  naomedi "as rotas do convite não responderam — não se mede a cura sem elas."
  ambito; exit "$NAO_MEDI"
fi
verde "o convite continua vivo: /api/convites/[token] $CONVITE · /aceitar $ACEITAR"

case "$REGISTO_CORPO" in
  *EMAIL_PASSWORD_SIGN_UP_DISABLED*) ;;
  *)
    vermelho "o \`sign-up/email\` não recusou o registo (respondeu $REGISTO):"
    echo "           $(printf '%s' "$REGISTO_CORPO" | head -c 160)"
    echo "           Num domínio público isto é registo aberto: qualquer pessoa"
    echo "           cria conta sem convite. A cura é \`disableSignUp: true\`."
    ambito; exit "$FALHOU" ;;
esac

verde "o \`sign-up/email\` recusa: EMAIL_PASSWORD_SIGN_UP_DISABLED"
echo
ambito
exit "$OK"

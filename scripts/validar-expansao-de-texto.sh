#!/usr/bin/env bash
#
# O TEXTO CRESCE QUANDO SE TRADUZ, E O ECRÃ NÃO CRESCE COM ELE.
#
# ── O caso está medido, não suposto ────────────────────────────────────────
#
# Contra o inglês, o `es-ES` cresce em média **1,09×** sobre as 1322 cadeias de
# 12 ou mais caracteres, e **189 (14%) crescem 30% ou mais**. O `es-ES` é a
# língua do PILOTO — La Societat, Castellón —, por isso não é uma língua entre
# outras: é aquela em que o produto vai ser usado primeiro.
#
# O pico é o `integracoesE32.reprocessar` («Retry safely» → «Reintenta de forma
# segura», 2,08×) e logo a seguir o `kdsE16.estacao` — e o KDS é a superfície
# com MENOS folga, porque corre a 18 px por ser lido ao longe.
#
# ── E não existia guarda nenhuma para isto ─────────────────────────────────
#
# As duas que uma busca por «expansão» devolve são substring: uma casa em
# «expansão da combinação», a outra num comentário com «30%».
#
# ── TRÊS respostas, e o NÃO MEDI sai a 2 ───────────────────────────────────
#
# OK, FALHOU e NÃO MEDI. O 2 é o que distingue «o texto cabe» de «não consegui
# ver se cabe» — e tem de sobreviver à camada de relatório: quem chamar isto NÃO
# pode canalizar para `tail`, porque o `tail` come o código de saída.
set -uo pipefail
cd "$(dirname "$0")/.."

# O ambiente da base, como os outros guiões que tocam no arnês. Sem isto o
# `arnes-pronto.sh` recusa — e recusa bem: preparar um arnês contra a base
# errada é medir outra coisa com ar de medição.
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi

OK=0; FALHOU=1; NAO_MEDI=2

verde()    { printf '  \033[32mok\033[0m       %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHOU\033[0m   %s\n' "$1"; }
naomedi()  { printf '  \033[33mNÃO MEDI\033[0m %s\n' "$1"; }

echo "O texto traduzido cabe onde o inglês cabia?"

# ── 1. A POPULAÇÃO, antes de qualquer coisa ────────────────────────────────
#
# Zero candidatas não é «não há risco»: é o leitor cego. Se as três línguas
# tiverem o mesmo tamanho, ou se os ficheiros não se lerem, esta guarda não mede
# nada — e o que ela responde nesse caso é NÃO MEDI, nunca verde.
CANDIDATAS=$(python3 - <<'PY' 2>/dev/null
import json, io
def folhas(o, p=''):
    for k, v in o.items():
        n = f'{p}.{k}' if p else k
        if isinstance(v, dict): yield from folhas(v, n)
        else: yield n, str(v)
try:
    L = {n: dict(folhas(json.load(io.open(f'packages/i18n/src/mensagens/{n}.json', encoding='utf-8'))))
         for n in ('en', 'es-ES', 'pt-BR')}
except Exception:
    print(-1); raise SystemExit(0)
base = {k: v for k, v in L['en'].items() if len(v) >= 12}
n = sum(1 for lang in ('es-ES', 'pt-BR') for k, v in base.items()
        if k in L[lang] and len(L[lang][k]) / len(v) >= 1.30)
print(n if base else -1)
PY
)
if [ -z "${CANDIDATAS:-}" ] || [ "$CANDIDATAS" -lt 0 ]; then
  naomedi "não consegui ler os três ficheiros de mensagens — sem população não há medição."
  exit "$NAO_MEDI"
fi
if [ "$CANDIDATAS" -eq 0 ]; then
  naomedi "nenhuma cadeia cresce 30% — ou as línguas são iguais, ou o leitor está cego."
  echo "           Zero aqui não é «não há risco»: é não ter medido."
  exit "$NAO_MEDI"
fi
verde "$CANDIDATAS cadeias crescem 30% ou mais — há o que medir"

# ── 2. O ARNÊS. Sem ele, o transbordo mede a página de «não encontrado» ────
if ! bash scripts/arnes-pronto.sh >/tmp/bossaos-expansao-arnes.txt 2>&1; then
  naomedi "não consegui preparar o arnês — vê /tmp/bossaos-expansao-arnes.txt"
  exit "$NAO_MEDI"
fi
verde "arnês pronto"

PORTA_DA_PROVA="${PORTA_INSPECCAO:-3018}"
if lsof -nP -iTCP:"$PORTA_DA_PROVA" -sTCP:LISTEN >/dev/null 2>&1; then
  naomedi "a porta $PORTA_DA_PROVA está ocupada — outra corrida, ou um servidor órfão."
  exit "$NAO_MEDI"
fi

# ── 3. E os ficheiros de i18n TÊM de ficar byte a byte ────────────────────
#
# Outro agente está a editá-los enquanto isto corre. Esta guarda não lhes toca —
# a sonda injecta no DOM e não no ficheiro —, e o md5 antes e depois prova-o em
# vez de o prometer.
ANTES=$(md5 -q packages/i18n/src/mensagens/en.json packages/i18n/src/mensagens/es-ES.json \
                packages/i18n/src/mensagens/pt-BR.json 2>/dev/null | tr '\n' ' ')

# ── 3.1 A SONDA PRIMEIRO, e pelo CÓDIGO DE SAÍDA ──────────────────────────
#
# A primeira versão disto perguntava ao relatório se via um «✘» na linha da
# sonda. O `--reporter=line` não escreve esse glifo: era um detector que nunca
# podia disparar, e uma sonda falhada teria sido contada como «o texto não
# cabe» — o diagnóstico errado, que é pior do que nenhum. Agora a sonda corre
# na sua própria invocação e o veredicto é o código de saída do Playwright, que
# não depende de como o relatório está escrito.
correr() {
  PORTA_INSPECCAO="$PORTA_DA_PROVA" BETTER_AUTH_URL="http://127.0.0.1:$PORTA_DA_PROVA" \
    pnpm exec playwright test --project=preparar --project=painel expansao.spec.ts \
    --reporter=line "$@" 2>&1
}

# ── Um vermelho de ARRANQUE não é uma medição ─────────────────────────────
#
# A `provar-staff-no-navegador.sh` já tinha aprendido isto a 04/09 e eu não o
# tinha nesta guarda: quando o servidor da inspecção não arranca, o Playwright
# sai com código 1 e TODA a suite fica vermelha sem ter corrido um caso. Aqui
# apanhou-me ao vivo — o `.next` estava a ser reconstruído por outro processo
# (`pnpm build && next start -p 3013`) e a minha guarda disse «a sonda não
# acendeu», que é falso e acusa o instrumento errado.
#
# O `.next` é recurso partilhado como a árvore, a base e a porta.
arranque_falhou() { # $1 = ficheiro de saída
  grep -qE 'config.webServer was not able to start|Could not find a production build' "$1"
}

SAIDA_SONDA=/tmp/bossaos-expansao-sonda.txt
correr -g 'SONDA' >"$SAIDA_SONDA"
ESTADO_SONDA=$?
if arranque_falhou "$SAIDA_SONDA"; then
  naomedi "o servidor da inspecção não arrancou — o \`.next\` está em reconstrução noutro processo?"
  grep -oE 'Could not find a production build[^"]*|Exit code: [0-9]*' "$SAIDA_SONDA" | head -2 | sed 's/^/           /'
  exit "$NAO_MEDI"
fi
if [ "$ESTADO_SONDA" -ne 0 ]; then
  naomedi "a sonda não acendeu: o detector não fica VERMELHO nem com uma cadeia longa injectada."
  sed 's/^/           /' "$SAIDA_SONDA" | tail -8
  exit "$NAO_MEDI"
fi
verde "a sonda acendeu com uma cadeia longa injectada — o detector sabe ficar VERMELHO"

# ── 3.2 E só agora a medição a sério ──────────────────────────────────────
SAIDA=/tmp/bossaos-expansao.txt
correr --grep-invert 'SONDA' >"$SAIDA"
ESTADO=$?

# «Nenhum teste encontrado» é o leitor cego outra vez, não um verde e não uma
# falha de texto: o Playwright também sai com código 1 nesse caso.
if arranque_falhou "$SAIDA"; then
  naomedi "o servidor da inspecção caiu a meio — nada foi medido."
  exit "$NAO_MEDI"
fi

if grep -q 'No tests found' "$SAIDA"; then
  naomedi "o Playwright não encontrou o caso principal — nada foi medido."
  exit "$NAO_MEDI"
fi

DEPOIS=$(md5 -q packages/i18n/src/mensagens/en.json packages/i18n/src/mensagens/es-ES.json \
                 packages/i18n/src/mensagens/pt-BR.json 2>/dev/null | tr '\n' ' ')
if [ "$ANTES" != "$DEPOIS" ]; then
  vermelho "os ficheiros de mensagens MUDARAM durante a corrida — esta guarda não lhes pode tocar."
  echo "           antes:  $ANTES"
  echo "           depois: $DEPOIS"
  exit "$FALHOU"
fi
verde "os três ficheiros de mensagens ficaram byte a byte"

# ── O ÂMBITO, lido da prova e repetido em TODAS as saídas ─────────────────
#
# Um verde chamado `validar-expansao-de-texto` lê-se como «a expansão está
# tratada». Significa outra coisa: que nos ecrãs MEDIDOS o texto cabe. Numa
# varredura de 36 guardas o nome e o código de saída atravessam, o qualificador
# não — e um verde sem denominador engana quem o lê para decidir. Por isso o
# número sai da prova em linha própria e é repetido aqui, nas três saídas.
AMBITO=$(grep -o 'AMBITO .*' "$SAIDA" | tail -1)
ambito() {
  if [ -z "$AMBITO" ]; then
    echo "  âmbito:  desconhecido — a prova não declarou quantos ecrãs mediu"
    return
  fi
  local med cand sem porres div ch
  med=$(sed -n 's/.*medidos=\([0-9]*\).*/\1/p' <<<"$AMBITO")
  cand=$(sed -n 's/.*candidatos=\([0-9]*\).*/\1/p' <<<"$AMBITO")
  sem=$(sed -n 's/.*semEndereco=\([0-9]*\).*/\1/p' <<<"$AMBITO")
  porres=$(sed -n 's/.*porResolver=\([0-9]*\).*/\1/p' <<<"$AMBITO")
  div=$(sed -n 's/.*divida=\([0-9]*\).*/\1/p' <<<"$AMBITO")
  ch=$(sed -n 's/.*chaves=\([0-9]*\).*/\1/p' <<<"$AMBITO")
  echo "  âmbito:  $med ecrãs medidos de $cand candidatos, derivados de $ch cadeias que crescem"
  echo "           fora da medição: $porres com parâmetro por resolver, $sem sem endereço, $div namespaces em dívida"
}

# População vazia sai por aqui, e não pelo vermelho: um ecrã que não abre não é
# um defeito de tradução, e chamar-lhe isso era acusar o inocente.
if grep -q 'POPULACAO-ZERO' "$SAIDA"; then
  naomedi "um dos ecrãs não deu texto para medir — sem população, não há verde nem vermelho."
  grep -o 'POPULACAO-ZERO:[^"]*' "$SAIDA" | head -3 | sed 's/^/           /'
  ambito
  exit "$NAO_MEDI"
fi

if [ "$ESTADO" -ne 0 ]; then
  vermelho "há texto traduzido que não cabe onde o inglês cabia:"
  grep -E '·.*px·|· \+[0-9]+px|KDS-|INT-' "$SAIDA" | head -12 | sed 's/^/           /'
  ambito
  exit "$FALHOU"
fi

verde "o que cabe em inglês cabe também em es-ES e pt-BR, nos ecrãs medidos"
echo
ambito
echo
echo "  O texto cabe nos ecrãs medidos: 0 falhas."
exit "$OK"

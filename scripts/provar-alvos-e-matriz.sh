#!/usr/bin/env bash
#
# Duas guardas que ficaram vermelhas no `pnpm inspeccionar` do E20, e nenhuma
# delas era do E20 — o que é pior, não melhor.
#
# ── 1. O alvo do pedido era uma lotaria ───────────────────────────────────
#
# `numero LIKE 'insp-%' LIMIT 1`, sem ordem, com NOVE pedidos a casar. Só o
# `insp-A001` tem a linha aceite e a rejeitada lado a lado. Passava por sorte da
# ordem física das linhas; as três linhas do E20 mudaram o baralho.
#
# O controlo aponta o alvo a um pedido REAL mas errado — um do KDS, que não tem
# nem a linha aceite nem a rejeitada. Reproduz a falha exacta que o `LIMIT 1`
# causou. (O `insp-C001` não servia: tem Arroz e não tem Pulpo, e fazia cair a
# OUTRA asserção — vermelho certo pela razão errada.)
#
# ── 2. A guarda da matriz media o NOME do estado ──────────────────────────
#
# Exigia `implementado aguardando validação`. O sénior assinou o E19 e pôs as 28
# a `validado`: a guarda acendeu por a etapa ter AVANÇADO. Agora aceita as duas
# palavras — e o controlo põe uma tela em `planejado` para mostrar que continua
# a ter dentes.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"

ALVOS=inspeccao/alvos.ts
MATRIZ=docs/progress/coverage.csv
ORIG_ALVOS=$(mktemp); ORIG_MATRIZ=$(mktemp)
cp "$ALVOS" "$ORIG_ALVOS"; cp "$MATRIZ" "$ORIG_MATRIZ"

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }
restaurar() {
  cp "$ORIG_ALVOS" "$ALVOS"; cp "$ORIG_MATRIZ" "$MATRIZ"
  rm -f "$ORIG_ALVOS" "$ORIG_MATRIZ"
}
trap restaurar EXIT INT TERM

correr() {  # $1 ficheiro de saída, $2... argumentos do playwright
  local saida="$1"; shift
  pnpm exec playwright test --project=preparar --project=painel "$@" \
    --workers=1 --reporter=list >"$saida" 2>&1
}

# ── O texto do erro NÃO vive na linha do ✘ ────────────────────────────────
#
# O Playwright põe o nome do teste na linha do ✘ e a mensagem da asserção na
# linha seguinte. Um `grep "✘.*$erro"` nunca casa: acusa «não foi a asserção
# esperada» mesmo quando foi exactamente essa. Por isso são duas perguntas — que
# teste caiu, e com que mensagem — e não uma expressão só.
exigir_vermelho() {
  local nome="$1" teste="$2" erro="$3" ficheiro="$4"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  if grep -q 'config.webServer was not able to start' <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — a suite nem chegou a correr"
    grep -E 'error TS|Failed to type check' <<<"$limpo" | head -3; return
  fi
  if ! grep -qE "✘.*$teste" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o teste esperado ($teste)"
    grep -E '✘' <<<"$limpo" | head -4; return
  fi
  if ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o teste certo caiu pela mensagem errada"
    grep -E '^ +Error:' <<<"$limpo" | head -4; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado — as duas guardas têm de estar verdes"
if correr /tmp/bossaos-alvos-ligado.txt pedidos.spec.ts mensagens.spec.ts; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-alvos-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "as guardas não estão verdes com tudo ligado"
  grep -E '✘' /tmp/bossaos-alvos-ligado.txt | head -6; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o alvo aponta a um pedido REAL mas ERRADO"
python3 - <<'PYALVO'
import io
p = 'inspeccao/alvos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "SELECT id FROM orders WHERE numero = '${PREFIXO}A001'"
assert antigo in s, 'o alvo do pedido nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "SELECT id FROM orders WHERE numero = '${PREFIXO}K000'", 1))
PYALVO
correr /tmp/bossaos-alvos-errado.txt pedidos.spec.ts
exigir_vermelho "caiu o alvo: a prova mediu outro pedido e não deu por isso" \
  'a ficha do pedido mostra a rejeitada' 'a linha aceite desapareceu' \
  /tmp/bossaos-alvos-errado.txt
cp "$ORIG_ALVOS" "$ALVOS"

echo
echo "3. CONTROLO NEGATIVO — uma tela do E19 volta a PLANEJADO"
python3 - <<'PYMATRIZ'
import io
p = 'docs/progress/coverage.csv'
s = io.open(p, encoding='utf-8', newline='').read()
alvo = 'INT-004,'
i = s.index(alvo)
fim = s.index('\n', i)
linha = s[i:fim]
assert ',validado,' in linha, 'a INT-004 nao esta validada — o controlo mediria outra coisa'
io.open(p, 'w', encoding='utf-8', newline='').write(
    s[:i] + linha.replace(',validado,', ',planejado,', 1) + s[fim:])
PYMATRIZ
correr /tmp/bossaos-alvos-planejado.txt mensagens.spec.ts
exigir_vermelho "caiu a matriz: uma tela por construir passou por declarada" \
  'estão todas na matriz como feitas' 'nem todas as 28 estão declaradas' \
  /tmp/bossaos-alvos-planejado.txt
cp "$ORIG_MATRIZ" "$MATRIZ"

echo
echo "4. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-alvos-reposto.txt pedidos.spec.ts mensagens.spec.ts; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-alvos-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '✘' /tmp/bossaos-alvos-reposto.txt | head -6
fi

echo
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

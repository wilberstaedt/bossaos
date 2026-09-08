#!/usr/bin/env bash
#
# CORREDOR do `provas/criar-utilizador.test.ts`.
#
# A prova prende a única função que toca em API privada do `better-auth`. Sem
# corredor ela não dá verde nem vermelho: **desaparece** — foi o que a
# `validar-suites-com-guiao.sh` acusou no primeiro commit desta cura, e tinha
# razão.
#
# ── O plante, e porque é ESTE ─────────────────────────────────────────────
#
# Trocar o `issuer` pelo `@default` da coluna é o defeito REAL que já aconteceu:
# a conta nasce, as linhas existem, e o `sign-in` recusa. Um teste que só
# contasse linhas ficava verde com ele. O plante exige que a asserção da ENTRADA
# seja a que cai.
#
# ── E o `mtime`, que não é detalhe ────────────────────────────────────────
#
# O plante escreve num `.ts` debaixo de `packages/`, e a frescura das capturas
# compara `mtime` de captura contra a fonte `.ts`/`.tsx`/`.css` mais recente de
# `apps/` e `packages/`. Restaurar o CONTEÚDO e deixar o `mtime` novo envelhecia
# as 25 telas-mestre e as 24 de marketing **sem ninguém lhes tocar** — a guarda
# passaria a acusar um produto que não mudou. Por isso o restauro repõe também a
# data, com `touch -r`.
set -uo pipefail
cd "$(dirname "$0")/.."

verde()    { echo "  ok    $1"; }
vermelho() { echo "  FALHA $1"; FALHAS=$((FALHAS + 1)); }
FALHAS=0

ALVO=packages/auth/src/criar-utilizador.ts
[ -f "$ALVO" ] || { echo "  NAO MEDI  $ALVO nao existe"; exit 2; }

# `-p` e a diferenca entre restaurar e restaurar BEM: sem ele a copia nasce
# com a hora de agora, e o `touch -r` la em baixo repoe essa em vez da
# original. O controlo 3 deste ficheiro apanhou-me nisto.
ORIG=$(mktemp); cp -p "$ALVO" "$ORIG"
restaurar() {
  cp "$ORIG" "$ALVO"
  # A data ANTES da data: sem isto, provar envelhece a prova alheia.
  touch -r "$ORIG" "$ALVO"
  rm -f "$ORIG"
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types \
    provas/criar-utilizador.test.ts >"$1" 2>&1
}

echo "A funcao que cria contas sem a rota de registo"

# ── 1 · Verde no produto intacto ──────────────────────────────────────────
SAIDA=/tmp/bossaos-criar-utilizador.txt
if correr "$SAIDA"; then
  PASSOU=$(grep -oE '^# pass [0-9]+' "$SAIDA" | grep -oE '[0-9]+' || echo 0)
  if [ "${PASSOU:-0}" -lt 2 ]; then
    vermelho "so ${PASSOU:-0} teste(s) passaram — a prova tem de fixar as tres coisas e o controlo"
  else
    verde "$PASSOU testes verdes com o produto intacto"
  fi
else
  if grep -qE 'ECONNREFUSED|MIGRATION_DATABASE_URL|Connection terminated' "$SAIDA"; then
    echo "  NAO MEDI  a base nao respondeu — sem ela isto nao mede nada."
    exit 2
  fi
  vermelho "a prova reprovou com o produto intacto:"
  grep -E '^not ok|Error' "$SAIDA" | head -3 | sed 's/^/          /'
fi

# ── 2 · O PLANTE: o issuer volta ao `@default` da coluna ──────────────────
if ! python3 - <<'PY'; then
import io
p = 'packages/auth/src/criar-utilizador.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "export const ISSUER_DE_CREDENCIAL = 'local:credential';"
assert antigo in s, 'a ancora do issuer mudou — o plante nao mede nada'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo,
    "export const ISSUER_DE_CREDENCIAL = 'credential';", 1))
PY
  vermelho "o plante NAO APLICOU — a ancora mudou; isto nao mediu nada"
else
  PLANTE=/tmp/bossaos-criar-utilizador-plante.txt
  if correr "$PLANTE"; then
    vermelho "ficou VERDE com o issuer errado — a prova nao mede a ENTRADA, so as linhas"
  elif grep -q 'criou o utilizador e ele não entra' "$PLANTE" \
    || grep -q 'existe e não entra' "$PLANTE"; then
    verde "com o issuer no \`@default\` a prova acusa a ENTRADA, que e' a asseracao certa"
  else
    vermelho "ficou vermelha, mas nao foi a asseracao esperada:"
    grep -E '^not ok|Error' "$PLANTE" | head -3 | sed 's/^/          /'
  fi
fi
restaurar; trap - EXIT INT TERM

# ── 3 · O restauro repos a data? ──────────────────────────────────────────
#
# Um controlo do proprio corredor: se isto falhar, provar esta funcao passa a
# envelhecer 49 capturas de cada vez, e ninguem daria por isso.
AGORA=$(date +%s)
MT=$(stat -f '%m' "$ALVO" 2>/dev/null || echo "$AGORA")
if [ "$((AGORA - MT))" -lt 60 ]; then
  vermelho "o restauro deixou o \`mtime\` novo — isto envelhece as capturas sem o produto mudar"
else
  verde "o restauro repos a data do ficheiro (nao envelheceu prova alheia)"
fi

echo
[ "$FALHAS" -eq 0 ] && { echo "  A porta esta presa: 0 falhas."; exit 0; }
echo "  $FALHAS FALHA(S)."; exit 1

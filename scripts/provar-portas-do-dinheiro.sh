#!/usr/bin/env bash
#
# As portas do dinheiro — e o controlo negativo apaga a CHAMADA, não o comportamento.
#
# ── Porque é que esta prova existe ────────────────────────────────────────
#
# O E23 foi assinado com o `receberWebhook` sem chamador nenhum, e a
# `provar-adquirente` jurava que o reenvio deduplicava — numa porta que não
# existia. Uma suite verde nunca responde à pergunta «o produto chega aqui».
#
# Se a asserção ficar verde depois de eu apagar a linha que chama, ela não mede o
# produto: mede a existência da função, que já está medida noutro sítio.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi

WEBHOOK='apps/web/app/api/webhooks/pagamentos/[provedor]/route.ts'
TPV='apps/web/app/api/org/[orgSlug]/tpv/route.ts'
CONTA='apps/web/app/[idioma]/pos/[locationId]/conta/[billId]/page.tsx'
PROVA=provas/portas-do-dinheiro.test.ts
FICHEIROS=("$WEBHOOK" "$TPV" "$CONTA")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }
repor() {
  local i=0
  for f in "${FICHEIROS[@]}"; do
    [[ "$f" == "$1" ]] && { cp "${COPIAS[$i]}" "$f"; return; }
    i=$((i + 1))
  done
}
restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { node --test --test-reporter=tap --experimental-strip-types "$PROVA" >"$1" 2>&1; }

plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

exigir_vermelho() {
  local nome="$1" caso="$2" erro="$3" ficheiro="$4"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  if ! grep -qE '^# fail [1-9]' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com a chamada apagada"; return
  fi
  if ! grep -qE "not ok [0-9]+ - .*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E "^ +not ok [0-9]+ - " <<<"$limpo" | head -4; return
  fi
  if [[ -n "$erro" ]] && ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E "error: '" <<<"$limpo" | head -3; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-pdin-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pdin-ligado.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "as portas não estão verdes com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pdin-ligado.txt \
    | grep -E "^ +not ok|error: '" | head -6; exit 1
fi

# ── Apagar a CHAMADA, um por um ───────────────────────────────────────────
apagar_chamada() {
  local nome="$1" ficheiro="$2" agulha="$3" caso="$4" erro="$5" saida="$6"
  echo
  echo "CONTROLO NEGATIVO — ${nome}"
  AGULHA="$agulha" FICHEIRO="$ficheiro" plantar <<'PYAP' || return
import io, os, re
p = os.environ['FICHEIRO']
agulha = os.environ['AGULHA']
s = io.open(p, encoding='utf-8').read()
assert agulha in s, 'a chamada a %s nao esta onde se esperava' % agulha
# Basta desfigurar o NOME da chamada: o ficheiro deixa de a conter, e é isso
# que a prova de alcance procura. Não é preciso partir a sintaxe.
io.open(p, 'w', encoding='utf-8').write(s.replace(agulha, agulha.replace('(', 'X('), 1))
PYAP
  correr "$saida"
  exigir_vermelho "$nome" "$caso" "$erro" "$saida"
  repor "$ficheiro"
}

apagar_chamada "o webhook deixa de chamar a porta da assinatura" \
  "$WEBHOOK" 'receberWebhook(' 'a rota, e ela CHAMA o receberWebhook' \
  'não chama a porta que confere a assinatura' /tmp/bossaos-pdin-wh.txt

apagar_chamada "o webhook grava e não reconcilia" \
  "$WEBHOOK" 'reconciliarComProvedor(' 'chama a reconciliação' \
  'grava o acontecimento e não reconcilia' /tmp/bossaos-pdin-rec.txt

apagar_chamada "nada no produto pode PEDIR um documento fiscal" \
  "$TPV" 'pedirDocumento(' 'pedirDocumento é chamado em produto' \
  'nada no produto pode PEDIR' /tmp/bossaos-pdin-ped.txt

apagar_chamada "nada no produto pode ENVIAR um documento fiscal" \
  "$TPV" 'enviarDocumento(' 'enviarDocumento é chamado em produto' \
  'nada no produto pode ENVIAR' /tmp/bossaos-pdin-env.txt

apagar_chamada "nada no produto pode registar a RESPOSTA do fornecedor" \
  "$TPV" 'responderDocumento(' 'responderDocumento é chamado em produto' \
  'registar a RESPOSTA' /tmp/bossaos-pdin-resp.txt

apagar_chamada "nada no produto pode CORRIGIR um documento fiscal" \
  "$TPV" 'corrigirDocumento(' 'corrigirDocumento é chamado em produto' \
  'nada no produto pode CORRIGIR' /tmp/bossaos-pdin-corr.txt

apagar_chamada "quem reconcilia deixa de ver o que o banco disse" \
  "$CONTA" 'acontecimentosDaConta(' 'trilho do adquirente é LIDO' \
  'não vê o que o banco disse' /tmp/bossaos-pdin-tri.txt

echo
echo "CONTROLO NEGATIVO — o corpo do webhook passa a ser lido como JSON"
plantar <<'PYJSON' || true
import io
p = 'apps/web/app/api/webhooks/pagamentos/[provedor]/route.ts'
s = io.open(p, encoding='utf-8').read()
antigo = 'const corpoCru = await pedido.text();'
assert antigo in s, 'a leitura do corpo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, 'const corpoCru = JSON.stringify(await pedido.json());', 1))
PYJSON
correr /tmp/bossaos-pdin-json.txt
exigir_vermelho "caiu o corpo cru: a assinatura deixaria de bater" \
  'corpo vai CRU' 'lê o corpo como JSON' /tmp/bossaos-pdin-json.txt
repor "$WEBHOOK"

echo
echo "Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-pdin-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-pdin-reposto.txt \
    | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

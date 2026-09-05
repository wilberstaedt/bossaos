#!/usr/bin/env bash
#
# E22 fatia 3 — as 19 telas do TPV, das contas e da caixa, no navegador.
#
# ── O que a régua reprova à cabeça ────────────────────────────────────────
#
# Verde sobre conta vazia e caixa por abrir. Quase todas estas telas têm um
# estado vazio legítimo que cabe em qualquer largura, não tem contraste para
# medir e não tem alvos de toque — é o ecrã FÁCIL. Por isso o controlo 2 esvazia
# a semeadura e a guarda de população tem de acender.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

CONTA='apps/web/app/[idioma]/pos/[locationId]/conta/[billId]/page.tsx'
DIVIDIR='apps/web/app/[idioma]/pos/[locationId]/conta/[billId]/dividir/page.tsx'
DINHEIRO='apps/web/app/[idioma]/pos/[locationId]/conta/[billId]/dinheiro/page.tsx'
MOVIMENTO='apps/web/app/[idioma]/pos/[locationId]/caixa/[registerId]/movimento/page.tsx'
CONTAGEM='apps/web/app/[idioma]/pos/[locationId]/caixa/[registerId]/contagem/page.tsx'
TPVHOME='apps/web/app/[idioma]/pos/[locationId]/page.tsx'
SPEC=inspeccao/tpv.spec.ts
SEMENTE=packages/db/prisma/semente-inspeccao.ts

# ── Sem `declare -A`: o bash do macOS é o 3.2 e não tem tabelas ───────────
#
# A primeira versão usava uma tabela associativa, morria aqui na linha 32 e o
# guião saía com código **0** — um guião que morre no arranque e reporta sucesso
# é pior do que um que falha. Ver a guarda `CHEGOU_AO_FIM` no fim do ficheiro.
FICHEIROS=("$CONTA" "$DIVIDIR" "$DINHEIRO" "$MOVIMENTO" "$CONTAGEM" "$TPVHOME" "$SPEC" "$SEMENTE")
COPIAS=()
for f in "${FICHEIROS[@]}"; do
  c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c")
done

# Devolve a cópia original de um ficheiro, pela posição.
copia_de() {
  local i=0
  for f in "${FICHEIROS[@]}"; do
    [[ "$f" == "$1" ]] && { echo "${COPIAS[$i]}"; return; }
    i=$((i + 1))
  done
  echo "ERRO: $1 não está na lista de cópias" >&2; return 1
}

CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }
repor()    { cp "$(copia_de "$1")" "$1"; }
restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do
    cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i + 1))
  done
  # ── Morrer a meio NÃO é passar ─────────────────────────────────────────
  #
  # Sem isto, um erro de arranque — como o `declare -A` que o bash 3.2 recusa —
  # matava o guião antes do primeiro teste e a saída era 0. Verde sobre nada.
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel tpv.spec.ts \
    --workers=1 --reporter=list >"$1" 2>&1
}

# ── Um plante que NÃO APLICA não é um controlo ────────────────────────────
#
# Os plantes são heredocs de Python com um `assert` na âncora. Sem `set -e`, um
# assert falhado escrevia para o stderr e o guião SEGUIA — a suite corria com o
# artefacto intacto, ficava verde, e o relatório dizia «caiu no caso errado».
#
# Aconteceu a 05/09 no controlo 5: a âncora era um `<input>` que eu tinha
# entretanto convertido em `<Campo>`. Agora o plante que não pega pára tudo.
plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

# Duas perguntas e não uma: o nome do caso vem numa linha e a mensagem noutra.
exigir_vermelho() {
  local nome="$1" caso="$2" erro="$3" ficheiro="$4"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  # ── Ficar VERDE é o pior resultado, e tem de se dizer assim ────────────
  #
  # A primeira versão só perguntava «caiu o caso certo?». Com o defeito plantado
  # e a suite verde, respondia «caiu no caso errado» — que manda procurar no
  # sítio errado. Se ficou verde, o defeito não foi medido: ponto.
  if ! grep -qE '[0-9]+ failed' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    grep -E '[0-9]+ passed' <<<"$limpo" | head -1; return
  fi
  if grep -q 'config.webServer was not able to start' <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — é um ficheiro partido, não um defeito"
    grep -E 'error TS|Failed to type check' <<<"$limpo" | head -3; return
  fi
  if ! grep -qE "✘.*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E '✘' <<<"$limpo" | head -4; return
  fi
  if ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E 'Error:' <<<"$limpo" | head -4; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-tpv-ligado.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-tpv-ligado.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "${passou:-0} casos verdes"
else
  vermelho "a prova de navegador falhou com tudo ligado"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-tpv-ligado.txt | grep -E '✘' | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a conta da prova fica SEM ajuste"
# O ajuste é o que faz «o que se tirou vê-se» medir alguma coisa. Sem ele, a
# tela mostrava um total e a prova passava sobre um ecrã onde nada foi tirado.
# Pôr o ajuste a ZERO viola o `CHECK ajuste_positivo` e mata a semeadura: o
# vermelho vinha de uma semente partida, não da guarda de população. Apaga-se a
# linha inteira, que é o defeito que se quer medir.
plantar <<'PYAJUSTE' || true
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
i = s.index('    await prisma.billAdjustment.create({')
j = s.index('    });', i) + len('    });\n')
assert 'cliente habitual' in s[i:j], 'o ajuste da semeadura nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s[:i] + s[j:])
PYAJUSTE
correr /tmp/bossaos-tpv-ajuste.txt
exigir_vermelho "caiu a população: a conta deixou de ter o que foi tirado" \
  'declara quantos havia' 'não havia ajuste' /tmp/bossaos-tpv-ajuste.txt
repor "$SEMENTE"

echo
echo "3. CONTROLO NEGATIVO — a divisão deixa de mostrar a SOMA das partes"
plantar <<'PYSOMA' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/conta/[billId]/dividir/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="soma-das-partes">'
assert antigo in s, 'a soma das partes nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '      <p data-teste="soma-escondida">', 1))
PYSOMA
correr /tmp/bossaos-tpv-soma.txt
exigir_vermelho "caiu a soma: o ecrã divide e não mostra que as partes fecham" \
  'a divisão mostra as partes E a soma' 'toBeVisible' /tmp/bossaos-tpv-soma.txt
repor "$DIVIDIR"

echo
echo "4. CONTROLO NEGATIVO — a gaveta passa a oferecer CARTÃO"
plantar <<'PYCARTAO' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/caixa/[registerId]/movimento/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '          <option value="SAIDA">{t.saida}</option>'
assert antigo in s, 'as opcoes do movimento nao estao onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(
    antigo, antigo + '\n          <option value="CARTAO">Tarjeta</option>', 1))
PYCARTAO
correr /tmp/bossaos-tpv-cartao.txt
exigir_vermelho "caiu a separação: o ecrã ofereceu cartão na gaveta de notas" \
  'a caixa diz que só entra dinheiro' 'o ecrã oferece cartão na gaveta' \
  /tmp/bossaos-tpv-cartao.txt
repor "$MOVIMENTO"

echo
echo "5. CONTROLO NEGATIVO — a contagem ganha um campo de DIFERENÇA"
plantar <<'PYDIF' || true
import io, re
p = 'apps/web/app/[idioma]/pos/[locationId]/caixa/[registerId]/contagem/page.tsx'
s = io.open(p, encoding='utf-8').read()
m = re.search(r'<Campo rotulo=\{t\.contado\}[^/]*/>', s)
assert m, 'o campo do contado nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s[:m.end()] + '\n        <Campo rotulo={t.diferenca} name="diferenca" type="text" />'
    + s[m.end():])
PYDIF
correr /tmp/bossaos-tpv-dif.txt
exigir_vermelho "caiu a derivação: a diferença passou a poder escrever-se a zero" \
  'NÃO tem campo de diferença' 'alguém pode escrevê-la a zero' /tmp/bossaos-tpv-dif.txt
repor "$CONTAGEM"

echo
echo "6. CONTROLO NEGATIVO — o troco deixa de dizer que não é receita"
plantar <<'PYTROCO' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/conta/[billId]/dinheiro/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<p data-teste="troco-ajuda">{t.trocoAjuda}</p>'
assert antigo in s, 'a frase do troco nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '<p data-teste="troco-ajuda">{t.troco}</p>', 1))
PYTROCO
correr /tmp/bossaos-tpv-troco.txt
exigir_vermelho "caiu a frase: o troco virou um número sem explicação" \
  'o troco diz que NÃO é receita' 'não diz que o troco não é receita' \
  /tmp/bossaos-tpv-troco.txt
repor "$DINHEIRO"

echo
echo "7. CONTROLO NEGATIVO — o TPV deixa de declarar que não há gateway"
plantar <<'PYPROV' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '      <p data-teste="sem-provedor">{t.semProvedor}</p>'
assert antigo in s, 'a declaracao do provedor nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYPROV
correr /tmp/bossaos-tpv-prov.txt
exigir_vermelho "caiu a declaração: o TPV deixou de dizer o que NÃO faz" \
  'não há gateway ligado' 'toBeGreaterThan' /tmp/bossaos-tpv-prov.txt
repor "$TPVHOME"

echo
echo "8. CONTROLO NEGATIVO — o ajuste passa a aparecer SEM o motivo"
plantar <<'PYMOTIVO' || true
import io
p = 'apps/web/app/[idioma]/pos/[locationId]/conta/[billId]/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<span data-teste="ajuste-motivo">{a.motivo}</span>'
assert antigo in s, 'o motivo do ajuste nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, '<span data-teste="ajuste-motivo">{\'\'}</span>', 1))
PYMOTIVO
correr /tmp/bossaos-tpv-motivo.txt
exigir_vermelho "caiu o motivo: o desconto aparece sem dizer porquê" \
  'mostra o ajuste COM o motivo' 'aparece sem dizer porquê' /tmp/bossaos-tpv-motivo.txt
repor "$CONTA"

echo
echo "9. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
plantar <<'PYPOP' || true
import io
p = 'inspeccao/tpv.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    { id: 'POS-011', caminho: `${CONTA}/cortesia` },\n"
assert antigo in s, 'a lista de telas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYPOP
correr /tmp/bossaos-tpv-pop.txt
exigir_vermelho "caiu a população: 18 telas deixaram de ser 19" \
  'a população é 19 telas' 'toBe' /tmp/bossaos-tpv-pop.txt
repor "$SPEC"

echo
echo "10. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-tpv-reposto.txt; then
  passou=$(sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-tpv-reposto.txt \
    | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  sed -e 's/\x1b\[[0-9;]*m//g' /tmp/bossaos-tpv-reposto.txt | grep -E '✘' | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

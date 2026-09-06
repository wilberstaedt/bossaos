#!/usr/bin/env bash
#
# E32 no navegador — e por HTTP, que é o que esta etapa tem de diferente.
#
# O controlo 3 é o que a régua nomeia: **tira a verificação de UMA rota**, e não
# do encaminhador. Se o plante desligasse um portão central, mediria outra
# coisa — e o defeito real desta fronteira é a rota nova que ninguém reviu.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

ROTA_PEDIDOS="apps/web/app/api/v1/pedidos/route.ts"
ROTA_WEBHOOK="apps/web/app/api/webhooks/saas/[provedor]/route.ts"
CHAVES="apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/integrations/chaves/page.tsx"
CATALOGO="apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/integrations/catalogo/page.tsx"
ASSINATURAS="apps/web/app/[idioma]/platform/assinaturas/page.tsx"
FICHEIROS=("$ROTA_PEDIDOS" "$ROTA_WEBHOOK" "$CHAVES" "$CATALOGO" "$ASSINATURAS")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    printf 'Ficheiros repostos.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { npx playwright test inspeccao/integracoes.spec.ts --reporter=line >"$1" 2>&1; }

plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

exigir_vermelho() {
  local nome="$1" caso="$2" ficheiro="$3"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  # Um plante que não compila NÃO é um controlo verde — a lição do E31.
  if grep -qE 'SyntaxError|Cannot find|Type error|Failed to compile|webServer was not able to start' <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA ou não arrancou — é o guião, não o produto"
    grep -E 'SyntaxError|Cannot find|Type error|webServer' <<<"$limpo" | head -2; return
  fi
  if ! grep -qE '[0-9]+ failed' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qF "$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E '›.*›' <<<"$limpo" | tail -4; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-intweb-ligado.txt; then
  verde "$(grep -oE '[0-9]+ passed' /tmp/bossaos-intweb-ligado.txt | head -1)"
else
  vermelho "o navegador não está verde com tudo ligado"
  grep -E '›|Error' /tmp/bossaos-intweb-ligado.txt | tail -8; exit 1
fi

echo
echo "2. CONTROLO — a lista passa a mostrar a chave INTEIRA"
# «Um ecrã que consegue mostrar outra vez uma chave antiga prova que ela está
# guardada em claro.» Aqui mostra-se o `resumo`, que é o que mais se parece com
# a chave e que o produto tem à mão — e a prova tem de o apanhar pelo tamanho.
plantar <<'PY' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/integrations/chaves/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "                  {s.prefixo} {c.prefixo}…"
assert antigo in s, 'a linha do prefixo nao esta onde se esperava'
novo = "                  {s.prefixo} {c.prefixo}{c.prefixo}{c.prefixo}{c.prefixo}…"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-intweb-c2.txt || true
exigir_vermelho "caiu o prefixo: o ecrã mostra mais do que devia" \
  "PREFIXO e nunca a chave" /tmp/bossaos-intweb-c2.txt
cp "${COPIAS[2]}" "$CHAVES"

echo
echo "3. CONTROLO — UMA rota deixa de pedir o âmbito dela"
# ── O que a régua manda medir, e o que ela proíbe medir ──────────────────
#
# Tira-se a verificação de UMA rota: a dos pedidos passa a aceitar o âmbito do
# catálogo. O encaminhador não se toca — se o plante o desligasse, mediria a
# existência do portão e não a declaração por operação.
plantar <<'PY' || true
import io
p = 'apps/web/app/api/v1/pedidos/route.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "await comChave(pedido, 'PEDIDOS_LER')"
assert antigo in s, 'a declaracao do ambito nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "await comChave(pedido, 'CATALOGO_LER')", 1))
PY
correr /tmp/bossaos-intweb-c3.txt || true
exigir_vermelho "caiu o âmbito de UMA rota: a chave do catálogo lê os pedidos" \
  "O PAR QUE DECIDE" /tmp/bossaos-intweb-c3.txt
cp "${COPIAS[0]}" "$ROTA_PEDIDOS"

echo
echo "4. CONTROLO — o webhook diz 401 em vez de 404"
# Dizer «existe mas não estás autorizado» conta a quem sonda que este provedor
# está ligado aqui. A diferença entre os dois códigos é um oráculo.
plantar <<'PY' || true
import io
p = 'apps/web/app/api/webhooks/saas/[provedor]/route.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });"
assert antigo in s, 'a resposta do provedor desconhecido nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 });", 1))
PY
correr /tmp/bossaos-intweb-c4.txt || true
exigir_vermelho "caiu a ausência: o webhook conta que o provedor existe" \
  "404 — e não 401" /tmp/bossaos-intweb-c4.txt
cp "${COPIAS[1]}" "$ROTA_WEBHOOK"

echo
echo "5. CONTROLO — a PLAT-005 deixa de contar os eventos sem vínculo"
# A lista das vezes em que o sistema RECUSOU mudar alguma coisa é precisamente
# o que se quer poder ver. Um contador que não conta esconde as tentativas.
plantar <<'PY' || true
import io
p = 'apps/web/app/[idioma]/platform/assinaturas/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = """  const semVinculo = eventos.filter(
    (e: { estado: string }) => e.estado === 'SEM_VINCULO');"""
assert antigo in s, 'a contagem dos sem-vinculo nao esta onde se esperava'
novo = """  const semVinculo: unknown[] = [];"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-intweb-c5.txt || true
exigir_vermelho "caiu a contagem: as tentativas recusadas deixam de aparecer" \
  "mostra o evento que alegou" /tmp/bossaos-intweb-c5.txt
cp "${COPIAS[4]}" "$ASSINATURAS"

echo
echo "6. CONTROLO — a INT-001 deixa de dizer o que falta"
# «Não conectada» sem requisitos é um beco: quem lê não sabe o que fazer a
# seguir, e volta cá amanhã.
plantar <<'PY' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/integrations/catalogo/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '''                <p className="bo-campo__ajuda" data-teste="requisitos">
                  {s.requisitos}: {i.requisitos}
                </p>'''
assert antigo in s, 'os requisitos nao estao onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '                <p />', 1))
PY
correr /tmp/bossaos-intweb-c6.txt || true
exigir_vermelho "caiu o requisito: «não conectada» passa a ser um beco" \
  "requisitos de cada integração" /tmp/bossaos-intweb-c6.txt
cp "${COPIAS[3]}" "$CATALOGO"

echo
echo "7. Reposto"
i=0; for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; i=$((i+1)); done
if correr /tmp/bossaos-intweb-reposto.txt; then
  verde "reposto: $(grep -oE '[0-9]+ passed' /tmp/bossaos-intweb-reposto.txt | head -1)"
else
  vermelho "não voltou ao verde depois dos plantes"
  grep -E '›' /tmp/bossaos-intweb-reposto.txt | tail -5
fi

# ── E a base ficou limpa? ─────────────────────────────────────────────────
#
# Nenhum plante deste guião mexe na base, mas a prova de navegador CRIA chaves.
# Um controlo do E32 já deixou dezassete chaves com o valor em claro no nome, e
# a tela mostrou-as. Isto verifica que não voltou a acontecer.
echo
echo "8. Nenhuma chave ficou com o valor em claro"
n=$(psql "$MIGRATION_DATABASE_URL" -t -c \
  "select count(*) from api_keys where nome like 'bk\_%';" | tr -d ' ')
if [[ "$n" == "0" ]]; then
  verde "nenhuma chave com o valor no nome"
else
  vermelho "$n chave(s) com o valor em claro no nome — um controlo sujou a base"
fi

CHEGOU_AO_FIM=1
echo
[[ "$falhas" -eq 0 ]] && echo "  0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

#!/usr/bin/env bash
#
# E31 no navegador — e o controlo que mais interessa é o 2.
#
# «O teste passa e não sai papel» é a frase da régua desta etapa, e o defeito
# que ela descreve não se vê no motor: a prova de base pode estar verde com o
# ecrã a mentir. Foi exactamente o que aconteceu na primeira corrida real — a
# porta do kiosk devolvia o slug INTERNO em vez do público, a carta vinha vazia
# em silêncio, e os 21 casos e 8 controlos do motor não passavam por lá.
#
# Por isso o controlo 6 replanta esse defeito: é o único destes que já foi um
# defeito a sério, e é o que prova que esta prova o teria apanhado.
set -uo pipefail
cd "$(dirname "$0")/.."

# O arnês antes de tudo. Salta sozinho em zero segundos se já estiver pronto;
# numa base fresca faz os três passos pela ordem certa — fixtures, o utilizador
# do `preparar`, e só depois a semente, que o `preparar` limparia.
#
# Sem isto, uma base sem o utilizador do arnês faz o `alvos.ts` rebentar na
# RECOLHA e o Playwright diz «No tests found» — que não aponta para nada, e me
# custou seis hipóteses a 06/09.
bash "$(dirname "$0")/arnes-pronto.sh" >/dev/null || {
  echo "ERRO: não consegui preparar o arnês — vê scripts/arnes-pronto.sh" >&2
  exit 1
}

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

DIAGNOSTICO="apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/devices/impressoras/[printerId]/page.tsx"
IMPRESSORAS="apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/devices/impressoras/page.tsx"
PAUSADO="apps/web/app/[idioma]/kiosk/[deviceId]/pausado/page.tsx"
FALLBACK="apps/web/app/[idioma]/kds/[locationId]/[stationId]/impressao/page.tsx"
PURO="packages/domain/src/impressao.ts"
MOTOR="packages/db/src/kiosk.ts"
FICHEIROS=("$DIAGNOSTICO" "$IMPRESSORAS" "$PAUSADO" "$FALLBACK" "$PURO" "$MOTOR")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# A porta do kiosk é objecto de BASE, e um plante nela não se repõe do git.
repor_porta() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'SQL' || true
CREATE OR REPLACE FUNCTION kiosk_do_aparelho(p_device UUID)
RETURNS TABLE (
  organization_id UUID, organization_slug TEXT, location_id UUID,
  location_slug TEXT, location_nome TEXT, fuso TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.slug, l.id, l.public_slug, l.nome, l.fuso
    FROM devices d
    JOIN locations l     ON l.id = d.location_id
    JOIN organizations o ON o.id = d.organization_id
   WHERE d.id = p_device AND d.estado = 'ACTIVO';
$$;
SQL
}

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  repor_porta
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    printf 'Ficheiros e porta repostos.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() {
  npx playwright test inspeccao/kiosk.spec.ts --reporter=line >"$1" 2>&1
}

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
  # ── Um plante que não compila NÃO é um controlo verde ──────────────────
  #
  # A 06/09 o plante do controlo 4 quebrou o typecheck, o servidor não subiu, e
  # a saída não trazia a palavra «failed» — esta função leu isso como «ficou
  # VERDE com o defeito plantado» e acusou o produto por um erro do guião.
  #
  # É a forma mais cara de verde vazio invertida: um vermelho vazio, que manda
  # procurar um defeito que não existe. A falha do servidor entra aqui.
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
if correr /tmp/bossaos-kioskweb-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-kioskweb-ligado.txt | head -1)
  verde "${passou:-0 passed}"
else
  vermelho "o navegador não está verde com tudo ligado"
  grep -E '›|Error' /tmp/bossaos-kioskweb-ligado.txt | tail -8; exit 1
fi

echo
echo "2. CONTROLO — o «não sei» colapsa em «impresso» NO ECRÃ"
# O que a régua põe em primeiro lugar. As duas decisões erradas custam coisas
# diferentes, e é por isso que o produto não pode escolher nenhuma.
plantar <<'PY' || true
import io
p = 'packages/domain/src/impressao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (decorridos > segundosAteNaoSaber) {\n    return { sabe: false, desde };\n  }"
assert antigo in s, 'a derivacao do nao-sei nao esta onde se esperava'
novo = "  if (decorridos > segundosAteNaoSaber) {\n    return { sabe: true, estado: 'impresso' };\n  }"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-kioskweb-c2.txt || true
exigir_vermelho "caiu a derivação: o ecrã diz impresso a papel que ninguém viu sair" \
  "diz NÃO SEI" /tmp/bossaos-kioskweb-c2.txt
cp "${COPIAS[4]}" "$PURO"

echo
echo "3. CONTROLO — a linha por testar deixa de se explicar"
# «Uma linha vazia lê-se como uma linha aprovada, e as duas custam a mesma tinta.»
plantar <<'PY' || true
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/devices/impressoras/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '''                <p className="bo-campo__ajuda" data-teste="por-testar-ajuda">
                  {s.porTestarAjuda}
                </p>'''
assert antigo in s, 'a explicacao do por-testar nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '                <p />', 1))
PY
correr /tmp/bossaos-kioskweb-c3.txt || true
exigir_vermelho "caiu a explicação: «por testar» passa a ler-se como aprovado" \
  "POR TESTAR, e explica-o" /tmp/bossaos-kioskweb-c3.txt
cp "${COPIAS[1]}" "$IMPRESSORAS"

echo
echo "4. CONTROLO — o terminal pausado deixa de dizer que está pausado"
# O cruzamento das duas coisas mais perigosas do produto.
# ── O plante vai ao MOTOR, e o controlo mede o ecrã ─────────────────────
#
# As duas tentativas anteriores plantaram na TELA e nenhuma compilava: trocar a
# razão por `null` ou por outro valor do enum faz o TypeScript recusar o ramo
# seguinte, o servidor não sobe, e o guião mede a sua própria avaria.
#
# Plantar no motor é melhor por outra razão, e não só por compilar: prova que
# esta prova cobre o caminho MOTOR→ECRÃ. Um defeito na contagem das cobranças
# indeterminadas chega ao corredor, e é isso que se quer ver acender.
plantar <<'PY' || true
import io
p = 'packages/db/src/kiosk.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    if (porResolver > 0) {"
assert antigo in s, 'a contagem das cobrancas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    if (porResolver > 99) {", 1))
PY
correr /tmp/bossaos-kioskweb-c4.txt || true
exigir_vermelho "caiu a contagem no motor: o kiosk com cobrança por resolver parece disponível" \
  "está PAUSADO" /tmp/bossaos-kioskweb-c4.txt
cp "${COPIAS[5]}" "$MOTOR"

echo
echo "5. CONTROLO — o KDS deixa de mostrar o talão"
# Sem esta tela, a alternativa a papel é uma pessoa a gritar do balcão.
plantar <<'PY' || true
import io
p = 'apps/web/app/[idioma]/kds/[locationId]/[stationId]/impressao/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = '<pre className="bo-talao" data-teste="talao">{j.conteudo}</pre>'
assert antigo in s, 'o talao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '<pre className="bo-talao" />', 1))
PY
correr /tmp/bossaos-kioskweb-c5.txt || true
exigir_vermelho "caiu o talão: a cozinha fica sem saber o que fazer" \
  "traz a marca, e o KDS lê-a" /tmp/bossaos-kioskweb-c5.txt
cp "${COPIAS[3]}" "$FALLBACK"

echo
echo "6. CONTROLO — a porta volta a devolver o slug INTERNO"
# ── Este já foi um defeito a sério, e é o que justifica esta prova ────────
#
# A 06/09 a `kiosk_do_aparelho` devolvia `locations.slug` em vez de
# `public_slug`. A carta do kiosk vinha VAZIA, em silêncio, e o motor estava
# verde: 21 casos e 8 controlos, nenhum a abrir uma carta. Quem o viu foi esta
# prova, à primeira corrida.
psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQL' || vermelho "o plante de BASE não aplicou"
CREATE OR REPLACE FUNCTION kiosk_do_aparelho(p_device UUID)
RETURNS TABLE (
  organization_id UUID, organization_slug TEXT, location_id UUID,
  location_slug TEXT, location_nome TEXT, fuso TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.slug, l.id, l.slug, l.nome, l.fuso
    FROM devices d
    JOIN locations l     ON l.id = d.location_id
    JOIN organizations o ON o.id = d.organization_id
   WHERE d.id = p_device AND d.estado = 'ACTIVO';
$$;
SQL
correr /tmp/bossaos-kioskweb-c6.txt || true
exigir_vermelho "caiu o slug: a carta do kiosk vem vazia em silêncio" \
  "11 telas" /tmp/bossaos-kioskweb-c6.txt
repor_porta

echo
echo "7. Reposto"
i=0; for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; i=$((i+1)); done
repor_porta
if correr /tmp/bossaos-kioskweb-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-kioskweb-reposto.txt | head -1)
  verde "reposto: ${passou:-0 passed}"
else
  vermelho "não voltou ao verde depois dos plantes"
  grep -E '›' /tmp/bossaos-kioskweb-reposto.txt | tail -5
fi

# A porta está mesmo reposta? «Reposto e verde» não chega: a prova podia não
# passar por ela.
echo
echo "8. A porta devolve o slug PÚBLICO"
# Lê a DEFINIÇÃO da função, e não uma consulta com dados.
#
# A primeira versão perguntava à porta pelo aparelho semeado — e a limpeza do
# arnês corre no fim de cada passagem, portanto o aparelho já não existe e a
# resposta vinha VAZIA. Um vazio que se lia como «a porta está errada»: o
# instrumento a medir a limpeza em vez de medir a porta.
definicao=$(psql "$MIGRATION_DATABASE_URL" -t -c \
  "SELECT pg_get_functiondef('kiosk_do_aparelho(uuid)'::regprocedure);")
if grep -q 'l.public_slug' <<<"$definicao"; then
  verde "a porta devolve o endereço público (l.public_slug na definição)"
else
  vermelho "a porta ficou a devolver o slug interno — o plante do controlo 6 não foi reposto"
fi

CHEGOU_AO_FIM=1
echo
[[ "$falhas" -eq 0 ]] && echo "  0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

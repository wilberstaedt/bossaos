#!/usr/bin/env bash
#
# E20 — as 7 telas do takeaway e da entrega, no navegador.
#
# ── O que a régua reprova à cabeça ────────────────────────────────────────
#
# «**Verde sobre fila de retirada vazia.** Declara quantos pedidos havia.» É o
# controlo 2, e não é um defeito de produto: é a semeadura a deixar de pôr os
# pedidos, e a guarda a ter de acender.
#
# E o par que só um modelo unificado passa — «o filtro esconde da sala sem tirar
# da cozinha» — é o controlo 3.
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
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

PORTA_DA_PROVA="${PORTA_INSPECCAO:-3010}"
if lsof -ti:"$PORTA_DA_PROVA" >/dev/null 2>&1; then
  echo "ERRO: a porta $PORTA_DA_PROVA já está ocupada." >&2; exit 2
fi

CASOS_MINIMOS=24
falhas=0

FILA='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/takeaway/page.tsx'
DEL='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/delivery/page.tsx'
FILADEL='apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/delivery/fila/page.tsx'
STAFF='apps/web/app/[idioma]/staff/[locationId]/levar/page.tsx'
TARDE=packages/db/src/mais-tarde.ts
SPEC=inspeccao/levar.spec.ts
SEMENTE=packages/db/prisma/semente-inspeccao.ts
ORIG_FILA=$(mktemp); ORIG_DEL=$(mktemp); ORIG_FILADEL=$(mktemp); ORIG_STAFF=$(mktemp)
ORIG_TARDE=$(mktemp); ORIG_SPEC=$(mktemp); ORIG_SEMENTE=$(mktemp)
cp "$FILA" "$ORIG_FILA"; cp "$DEL" "$ORIG_DEL"; cp "$FILADEL" "$ORIG_FILADEL"
cp "$STAFF" "$ORIG_STAFF"; cp "$TARDE" "$ORIG_TARDE"; cp "$SPEC" "$ORIG_SPEC"
cp "$SEMENTE" "$ORIG_SEMENTE"

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

restaurar() {
  cp "$ORIG_FILA" "$FILA"; cp "$ORIG_DEL" "$DEL"; cp "$ORIG_FILADEL" "$FILADEL"
  cp "$ORIG_STAFF" "$STAFF"; cp "$ORIG_TARDE" "$TARDE"; cp "$ORIG_SPEC" "$SPEC"
  cp "$ORIG_SEMENTE" "$SEMENTE"
  rm -f "$ORIG_FILA" "$ORIG_DEL" "$ORIG_FILADEL" "$ORIG_STAFF" "$ORIG_TARDE" \
        "$ORIG_SPEC" "$ORIG_SEMENTE"
}
trap restaurar EXIT INT TERM

correr() {
  pnpm exec playwright test --project=preparar --project=painel levar.spec.ts \
    --workers=1 --reporter=list >"$1" 2>&1
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3" nao_esperado="${4:-}"
  if correr "$ficheiro"; then vermelho "$nome: ficou VERDE com o defeito plantado"; return; fi
  if grep -q 'config.webServer was not able to start' "$ficheiro"; then
    vermelho "$nome: o defeito plantado NÃO COMPILA — a suite nem chegou a correr"
    grep -E 'error TS|Failed to type check' "$ficheiro" | head -3; return
  fi
  if ! grep -qE "✘.*$marcador" "$ficheiro"; then
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '✘' "$ficheiro" | head -4; return
  fi
  if [[ -n "$nao_esperado" ]] && grep -qE "✘.*$nao_esperado" "$ficheiro"; then
    vermelho "$nome: derrubou também o que NÃO devia cair ($nao_esperado)"; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-levar-nav-ligado.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-levar-nav-ligado.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then
    vermelho "VERDE COM POUCO MEDIDO: só $passou casos (mínimo $CASOS_MINIMOS)"; exit 1
  fi
  verde "$passou casos verdes (7 telas × 5 larguras + toque, contraste, 3 idiomas, o par do canal)"
else
  vermelho "a prova de navegador falhou com tudo ligado"
  grep -E '✘' /tmp/bossaos-levar-nav-ligado.txt | head -10; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — as filas ficam VAZIAS"
# O falso verde que a régua reprova à cabeça. Sem pedidos, as sete telas
# respondem 200, cabem em todas as larguras e passam o contraste — sobre o ecrã
# de «não há pedidos».
python3 - <<'PYVAZIO'
import io
p = 'packages/db/prisma/semente-inspeccao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    for (const [i, minutos] of [-30, 180].entries()) {"
assert antigo in s, 'a semeadura dos pedidos do E20 nao esta onde se esperava'
# ── So a ENTREGA sai ────────────────────────────────────────────────────
#
# Apagar os dois matava o arnes antes de medir: `resolverAlvos` exige o pedido de
# takeaway e recusa continuar sem ele — uma guarda a serio, mas a do arnes, e o
# vermelho vinha pelo sitio errado.
#
# Sem a entrega, a fila de entrega fica a zero e e' a guarda de populacao que
# acende, que e' o que este controlo mede.
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "    for (const [i, minutos] of [-30].entries()) {", 1))
PYVAZIO
exigir_vermelho "caiu a população: a fila vazia deixou de passar por medição" \
  'declara quantos havia' /tmp/bossaos-levar-nav-vazio.txt \
  'população é 7 telas'
cp "$ORIG_SEMENTE" "$SEMENTE"

echo
echo "3. CONTROLO NEGATIVO — o filtro por canal desaparece"
# ── O par que só um modelo unificado passa ───────────────────────────────
#
# Sem o filtro, a tela do takeaway mostra as entregas. É o que aconteceria com
# duas tabelas mal ligadas — ou com uma consulta que se esquece do canal.
python3 - <<'PYCANAL'
import io
p = 'packages/db/src/mais-tarde.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    where: { locationId, canal, estado: { in: ['ACEITE', 'EM_PREPARO', 'PRONTO'] } },"
assert antigo in s, 'o filtro por canal nao esta onde se esperava'
# ── O plante mexe SO dentro da filaDoCanal ──────────────────────────────
#
# `SELECT now() AS agora` aparece tres vezes no ficheiro. Ancorar nessa linha
# punha o `void canal` na PRIMEIRA, que e' outra funcao onde `canal` nem existe:
# o ficheiro deixava de compilar e o vermelho vinha de um ficheiro partido, nao
# de um defeito. Recorto a funcao pelo nome e planto so la dentro.
#
# O `void canal` mantem o parametro usado. Sem ele o TypeScript recusa o
# ficheiro, e um defeito que nao compila nao e' um defeito plantado.
i = s.index('export async function filaDoCanal(')
j = s.index('export async function marcarSaida(', i)
corpo = s[i:j]
assert antigo in corpo, 'o filtro por canal nao esta dentro da filaDoCanal'
picado = (corpo
    .replace(antigo,
             "    where: { locationId, estado: { in: ['ACEITE', 'EM_PREPARO', 'PRONTO'] } },", 1)
    .replace("  const [agora] =", "  void canal;\n  const [agora] =", 1))
io.open(p, 'w', encoding='utf-8').write(s[:i] + picado + s[j:])
PYCANAL
exigir_vermelho "caiu o filtro: a tela do takeaway passou a mostrar entregas" \
  'mostra APENAS o takeaway' /tmp/bossaos-levar-nav-canal.txt \
  'KDS continua a ver as tarefas'
cp "$ORIG_TARDE" "$TARDE"

echo
echo "4. CONTROLO NEGATIVO — a fila deixa de separar o que ainda não entrou"
# «Um pedido que ainda não entrou não é um pedido atrasado.» Misturados, quem
# está ao balcão lê os dois como a mesma coisa.
python3 - <<'PYSEPARA'
import io
p = 'packages/db/src/mais-tarde.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    naCozinha: l.producaoEm === null || l.producaoEm <= agora!.agora,"
assert antigo in s, 'a marca de ja estar na cozinha nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "    naCozinha: true,", 1)
     .replace("  const linhas = await db.order.findMany({\n    where: { locationId, canal,",
              "  void agora;\n  const linhas = await db.order.findMany({\n    where: { locationId, canal,", 1))
PYSEPARA
exigir_vermelho "caiu a separação: o que ainda vem apareceu como se estivesse a fazer-se" \
  'separa o que está na cozinha' /tmp/bossaos-levar-nav-separa.txt
cp "$ORIG_TARDE" "$TARDE"

echo
echo "5. CONTROLO NEGATIVO — a tela deixa de dizer que os pedidos entram sozinhos"
python3 - <<'PYFRASE'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/takeaway/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = 'data-teste="por-entrar-ajuda">{t.porEntrarAjuda}</p>'
assert antigo in s, 'a frase do por entrar nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, 'data-teste="por-entrar-ajuda">{t.porEntrar}</p>', 1))
PYFRASE
exigir_vermelho "caiu a frase: o balcão deixou de saber que não tem de fazer nada" \
  'ninguém tem de fazer nada' /tmp/bossaos-levar-nav-frase.txt
cp "$ORIG_FILA" "$FILA"

echo
echo "6. CONTROLO NEGATIVO — o conector desligado deixa de dizer a CONSEQUÊNCIA"
python3 - <<'PYCONECTOR'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/delivery/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = 'data-teste="conector-ajuda">{t.conectorAjuda}</p>'
assert antigo in s, 'a consequencia do conector nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, 'data-teste="conector-ajuda">{t.conector}</p>', 1))
PYCONECTOR
exigir_vermelho "caiu a consequência: «desligado» virou um pormenor de configuração" \
  'não aceita pedidos externos' /tmp/bossaos-levar-nav-conector.txt
cp "$ORIG_DEL" "$DEL"

echo
echo "7. CONTROLO NEGATIVO — a fila de entrega passa a mostrar a MORADA"
# «Não exponha endereços ou telefones nas telas públicas de fila.»
python3 - <<'PYMORADA'
import io
p = 'apps/web/app/[idioma]/app/[orgSlug]/[locationSlug]/delivery/fila/page.tsx'
s = io.open(p, encoding='utf-8').read()
antigo = "  const fila = await comEscopoDoPedido(sessao, (db) => filaDoCanal(db, unidade.id, 'DELIVERY'));"
assert antigo in s, 'a leitura da fila de entrega nao esta onde se esperava'
novo = """  const fila = await comEscopoDoPedido(sessao, (db) => filaDoCanal(db, unidade.id, 'DELIVERY'));
  // O defeito: alguem acrescenta a morada «porque da jeito ao estafeta».
  const moradaDeExemplo = 'Paseo del Puerto 14';"""
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, novo, 1)
     .replace("      <p data-teste=\"quantos\">{fila.length} {t.quantos}</p>",
              "      <p data-teste=\"quantos\">{fila.length} {t.quantos} · {moradaDeExemplo}</p>", 1))
PYMORADA
exigir_vermelho "caiu a redacção: a fila passou a expor moradas" \
  'não mostra morada nenhuma' /tmp/bossaos-levar-nav-morada.txt
cp "$ORIG_FILADEL" "$FILADEL"

echo
echo "8. CONTROLO NEGATIVO — uma tela DESAPARECE da lista medida"
python3 - <<'PYPOP'
import io
p = 'inspeccao/levar.spec.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    { id: 'DEL-002', caminho: `${PAINEL}/delivery/mapeamento` },\n"
assert antigo in s, 'a lista de telas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYPOP
exigir_vermelho "caiu a população: 6 telas deixaram de ser 7" \
  'população é 7 telas' /tmp/bossaos-levar-nav-pop.txt
cp "$ORIG_SPEC" "$SPEC"

echo
echo "9. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-levar-nav-reposto.txt; then
  passou=$(grep -oE '[0-9]+ passed' /tmp/bossaos-levar-nav-reposto.txt | grep -oE '[0-9]+' || echo 0)
  if (( passou < CASOS_MINIMOS )); then vermelho "reposto mas com pouco medido: $passou casos"
  else verde "reposto: $passou casos verdes"; fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '✘' /tmp/bossaos-levar-nav-reposto.txt | head -10
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))

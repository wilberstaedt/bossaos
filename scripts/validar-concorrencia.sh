#!/usr/bin/env bash
#
# Concorrência provada em SEQUÊNCIA não prova nada.
#
# O aceite 1 do E13 diz «duas aberturas CONCORRENTES da mesma mesa produzem uma
# única sessão activa». Um teste que abre, **espera pela resposta**, e abre outra
# vez testa que o segundo pedido viu o primeiro já gravado — isso é sequência, e
# passa mesmo numa implementação que só faz `SELECT` antes do `INSERT`.
#
# E essa implementação é pior do que nenhuma: é uma corrida com a janela mais
# estreita, portanto passa a maior parte das vezes. Um defeito que falha em 1 de
# 50 arranques é mais caro do que um que falha sempre.
#
# Escrita a 04/09 com o E13 a arrancar e antes de existir a prova. O endereço
# público do E09 já tinha acertado nisto: *«não se consulta antes; duas pessoas a
# escolher no mesmo segundo leem ambas que está livre»*.
set -uo pipefail
cd "$(dirname "$0")/.."

falhas=0
pendentes=0
erro() { echo "  FALHA    $1"; falhas=$((falhas + 1)); }
ok()   { echo "  ok       $1"; }
pend() { echo "  PENDENTE $1"; pendentes=$((pendentes + 1)); }

# Vários nomes, porque adivinhar UM e falhar em silêncio quando chegar com outro
# e a familia de defeito que este projecto passou o dia a corrigir.
# A busca exige a palavra E o assunto. A primeira versao procurava so
# "concorrente" e apanhou tres ficheiros que a MENCIONAM de passagem - o teste do
# ambiente, o do catalogo e o do tema -, e acusou-os de nao provarem concorrencia
# que nunca prometeram. Uma guarda que acusa quem passa ao lado gasta o credito
# que precisa de ter quando acusar a serio.
# ── O detector estava CEGO, e a cegueira dele saia a verde ───────────────
#
# `grep -E 'concorrent|simultân'` falhava por duas razoes ao mesmo tempo, e as
# duas em texto que qualquer pessoa escreveria:
#
#   1. e sensivel a maiusculas. "duas aberturas CONCORRENTES" nao casa.
#   2. "concorrencia" NAO contem "concorrent" - e c-o-n-c-o-r-r-e-n-c-i-a. A
#      palavra mais provavel de aparecer no cabecalho de uma prova de
#      concorrencia era exactamente a que o padrao nao apanhava.
#
# Resultado medido a 04/09: com `provas/sala.test.ts` no repositorio - 22 casos,
# um deles com duas transaccoes demonstravelmente abertas ao mesmo tempo - esta
# guarda dizia "ainda nao ha prova de concorrencia" e saia a ZERO. Um detector
# que nao ve o que existe passa a mesma coisa que um que ve: nada.
BUSCA_ASSUNTO='concorrent|concorr[eê]nc|simultan|simult[âa]n|paralel'
FICHEIROS=$(git ls-files 'provas/*.ts' 'packages/*/src/*.test.ts' 2>/dev/null \
  | xargs grep -liE "$BUSCA_ASSUNTO" 2>/dev/null \
  | xargs grep -liE 'mesa|sess[aã]o|floor|table' 2>/dev/null || true)

# ── E o detector prova-se a si proprio, antes de julgar seja o que for ────
#
# Duas sondas, em ficheiros SEPARADOS: a 04/09 duas sondas no mesmo ficheiro
# fizeram a primeira mascarar a segunda noutra guarda desta casa.
SONDA=$(mktemp -d)
trap 'rm -rf "$SONDA"' EXIT
printf 'it("duas aberturas CONCORRENTES da mesma mesa", async () => {});\n' > "$SONDA/casa.ts"
printf 'it("o preco arredonda para cima", async () => {});\n' > "$SONDA/nao-casa.ts"
autoteste=0
grep -liE "$BUSCA_ASSUNTO" "$SONDA/casa.ts" >/dev/null 2>&1 || autoteste=1
grep -liE "$BUSCA_ASSUNTO" "$SONDA/nao-casa.ts" >/dev/null 2>&1 && autoteste=1
if [ "$autoteste" -ne 0 ]; then
  erro "o proprio detector esta cego: nao ve 'CONCORRENTES' ou acusa quem passa ao lado"
else
  ok "o detector ve o assunto em maiusculas e nao acusa quem passa ao lado"
fi

echo "1. Existe prova de concorrência?"
if [ -z "$FICHEIROS" ]; then
  # ── Ausencia e PENDENCIA antes do E13, e FALHA a partir dele ───────────
  #
  # Antes do E13 nao ha nada que precise de concorrencia, e uma guarda que
  # falhasse ali era ruido. A partir do E13 a ausencia deixa de ser inocente:
  # e a guarda a sair a zero sobre uma etapa que a exige, que e o "verde sobre
  # populacao zero" com outro nome. A etapa vem do medidor, nao de uma constante
  # escrita aqui a mao - uma constante envelhece e volta a deixar passar.
  atual=$(bash scripts/estado.sh 2>/dev/null | tr ' ' '\n' | grep '^ATUAL=' | cut -d= -f2 | tr -d 'E')
  if [ -n "$atual" ] && [ "$((10#$atual))" -ge 13 ]; then
    erro "a etapa autorizada e a E$atual e NAO ha prova de concorrencia nenhuma"
    echo "           A E13 e a primeira em que duas pessoas mexem na mesma coisa ao"
    echo "           mesmo tempo. Sem prova, nao ha o que declarar."
    echo
    echo "  $falhas FALHA(S)."
    exit "$falhas"
  fi
  pend "ainda não há prova de concorrência — o E13 é a primeira etapa que precisa dela"
  echo
  echo "  Nada medido: 0 falhas, 1 pendência declarada."
  exit 0
fi
ok "encontrada: $(echo "$FICHEIROS" | tr '\n' ' ')"

echo
echo "2. As duas chamadas partem juntas, ou uma espera pela outra?"
# `Promise.all`, `Promise.allSettled` ou dois `const p1 = f()` sem await sao
# despacho paralelo. Um `await` seguido de outro `await` no mesmo par nao e.
sem_paralelo=""
for f in $FICHEIROS; do
  if ! grep -qE 'Promise\.(all|allSettled)|\.map\([^)]*=>[^)]*\(\)\)' "$f"; then
    sem_paralelo="$sem_paralelo $f"
  fi
done
if [ -n "$sem_paralelo" ]; then
  erro "prova(s) de concorrência sem despacho paralelo:$sem_paralelo"
  echo '           Duas chamadas com await entre elas medem SEQUENCIA. Dispara as'
  echo '           duas sem esperar pela primeira - Promise.all ou equivalente.'
else
  ok "as provas de concorrência disparam em paralelo"
fi

echo
echo "3. A unicidade vem da BASE, e não de uma consulta prévia?"
# ── Esta verificacao NUNCA mediu nada, e foi apanhada a 04/09 ─────────────
#
# O padrao era `CREATE UNIQUE INDEX.*(sess|mesa|floor|table)` sobre TODAS as
# migracoes. Casava com `sessions_token_key` do E04 - um indice da tabela de
# sessoes de autenticacao, que nao tem nada a ver com mesas - e por isso saia a
# verde desde antes de o E13 existir. Degradei o indice a serio para indice
# normal e a guarda continuou a dizer "ha indice unico": um detector que qualquer
# vizinho satisfaz.
#
# Agora exige as duas coisas que fazem o aceite 1 ser verdade ao mesmo tempo:
#   - UNIQUE, na tabela das SESSOES DE MESA (`table_sessions`), e
#   - PARCIAL (`WHERE`), porque um indice unico sobre (mesa) sem condicao de
#     estado passa o aceite 1 e deixa a mesa inutilizavel depois do primeiro
#     servico. A condicao e o par, e sem ela isto certificava metade da regra.
indice_parcial() {
  python3 - "$@" <<'PYIDX'
import re, sys
padrao = re.compile(
    r'CREATE\s+UNIQUE\s+INDEX[^;]*?\bON\s+"?table_sessions"?[^;]*?\bWHERE\b[^;]*;',
    re.IGNORECASE | re.DOTALL)
for caminho in sys.argv[1:]:
    try:
        texto = open(caminho, encoding='utf-8').read()
    except OSError:
        continue
    if padrao.search(texto):
        print(caminho)
        raise SystemExit(0)
raise SystemExit(1)
PYIDX
}

# ── O autoteste do detector, em ficheiros separados ──────────────────────
SONDA_SQL=$(mktemp -d)
cat > "$SONDA_SQL/bom.sql" <<'PSQLBOM'
CREATE UNIQUE INDEX "uma_sessao_activa_por_mesa"
  ON "table_sessions" ("table_id")
  WHERE estado <> 'FECHADA';
PSQLBOM
cat > "$SONDA_SQL/mau.sql" <<'PSQLMAU'
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE UNIQUE INDEX "service_tables_location_id_codigo_key" ON "service_tables"("location_id", "codigo");
CREATE UNIQUE INDEX "sem_condicao" ON "table_sessions" ("table_id");
PSQLMAU
auto3=0
indice_parcial "$SONDA_SQL/bom.sql" >/dev/null 2>&1 || auto3=1
indice_parcial "$SONDA_SQL/mau.sql" >/dev/null 2>&1 && auto3=1
rm -rf "$SONDA_SQL"
if [ "$auto3" -ne 0 ]; then
  erro "o detector do indice esta cego: nao ve o parcial, ou aceita um vizinho qualquer"
else
  ok "o detector distingue o índice PARCIAL da sessão de um índice qualquer"
fi

# shellcheck disable=SC2046
if achado=$(indice_parcial $(git ls-files 'packages/db/prisma/migrations/*/migration.sql' 2>/dev/null) 2>/dev/null); then
  ok "índice único PARCIAL da sessão de mesa em $(basename "$(dirname "$achado")")"
else
  erro "não achei um índice único PARCIAL sobre table_sessions nas migrações"
  echo "           Sem ele, a unicidade vem de um SELECT antes do INSERT — uma corrida"
  echo "           com janela mais estreita, que passa a maior parte das vezes."
  echo "           E sem a condição de estado (WHERE), a mesa nunca mais volta a abrir."
fi

echo
[ "$falhas" -eq 0 ] && [ "$pendentes" -eq 0 ] && echo "  A concorrência prova-se a sério: 0 falhas."
[ "$falhas" -gt 0 ] && echo "  $falhas FALHA(S)."
exit "$falhas"

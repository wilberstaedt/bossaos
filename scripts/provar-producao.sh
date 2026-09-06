#!/usr/bin/env bash
#
# E16 — produção, estações e KDS.
#
# ── O que este script tem de provar, e porquê ─────────────────────────────
#
# O contrato `tarefas-de-producao-e-estacoes.md` é explícito sobre o que NÃO
# chega: *«uma prova em que todas as linhas têm exactamente uma tarefa não
# distingue este modelo do ingénuo.»*
#
# O modelo ingénuo — uma linha pertence a uma estação — é a primeira coisa que
# se escreve e passa em quase todos os testes, porque quase todos os pratos são
# de uma estação só. Por isso o **primeiro** controlo aqui é esse: reduzir o
# roteamento a uma estação por linha e ver a fritadeira deixar de ver a batata.
#
# E o modo de falha desta área NÃO DÁ ERRO. Nenhum destes defeitos produz uma
# mensagem vermelha em produção: produzem um prato que nunca é feito. É por isso
# que têm de produzir vermelho aqui.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

GRUPOS_ESPERADOS=8
CASOS_ESPERADOS=17
GRUPOS_KDS=6
CASOS_KDS=14
falhas=0

# ── O alvo MUDOU DE FICHEIRO no E17, e o script apanhou-o ─────────────────
#
# `estadoDerivado` e `totalDoPedido` são funções puras e mudaram-se para
# `@bossaos/domain` — a guarda `rotas-com-porta.test.ts` mostrou porquê: uma tela
# pública que só queria somar um total tinha de importar o pacote da base.
#
# O plante deixou de encontrar o alvo, o `assert` do Python rebentou, o ficheiro
# ficou intacto e o controlo ficou VERDE. Foi o próprio ajudante que o disse —
# «ficou VERDE com o defeito plantado» — e é exactamente para isto que ele
# verifica as duas coisas em vez de uma.
PRODUCAO=packages/db/src/producao.ts
PURO=packages/domain/src/pedido-puro.ts
KDS=packages/domain/src/kds.ts
ORIG_PRODUCAO=$(mktemp); ORIG_KDS=$(mktemp); ORIG_PURO=$(mktemp)
cp "$PRODUCAO" "$ORIG_PRODUCAO"; cp "$KDS" "$ORIG_KDS"; cp "$PURO" "$ORIG_PURO"
BASE_MEXIDA=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── Um plante tem de VERIFICAR-SE ────────────────────────────────────────────
#
# Se a âncora já não existe, o `assert` do python dispara, o guião segue, e o
# `exigir_vermelho` corre contra um produto INTACTO: o produto passa, e o guião
# conclui que a asserção é vazia. É uma acusação falsa — e cinco das dez falhas
# do corredor de 06/09 eram exactamente isso.
#
# Aqui o código de saída do plante é lido. Se ele não pegou, a falha é do GUIÃO
# e diz-se assim, em vez de se atribuir ao produto.
plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

# ── Repor SEMPRE ──────────────────────────────────────────────────────────
#
# Um script morto a meio deixaria a base sem o gatilho que impede o estado de
# produção de ser escrito no pedido — e a segunda verdade que o contrato proíbe
# passava a ser possível, em silêncio, até alguém reparar. Foi assim que uma
# corrida morta do E13 deixou uma função da base com defeito plantado e mandou
# duas provas para o sítio errado.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
DROP TRIGGER IF EXISTS pedido_estado_de_producao_deriva ON "orders";
CREATE TRIGGER pedido_estado_de_producao_deriva
  BEFORE INSERT OR UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION pedido_nao_escreve_estado_de_producao();
DROP TRIGGER IF EXISTS tarefa_versao_monotona ON "production_tasks";
CREATE TRIGGER tarefa_versao_monotona
  BEFORE UPDATE ON "production_tasks"
  FOR EACH ROW EXECUTE FUNCTION tarefa_versao_so_sobe();
PSQL
}

restaurar() {
  cp "$ORIG_PRODUCAO" "$PRODUCAO"; cp "$ORIG_KDS" "$KDS"; cp "$ORIG_PURO" "$PURO"
  rm -f "$ORIG_PRODUCAO" "$ORIG_KDS" "$ORIG_PURO"
  if [[ "$BASE_MEXIDA" == "1" ]]; then
    repor_base; BASE_MEXIDA=0
    printf '  (os gatilhos da base foram repostos)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/producao.test.ts >"$1" 2>&1
}
correr_kds() {
  node --test --test-reporter=tap --experimental-strip-types packages/domain/src/kds.test.ts >"$1" 2>&1
}

analisar() {
  local f="$1" grupos casos
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  casos=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$casos" ]] || return 2
  echo "$grupos $casos"
}

exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3" comando="${4:-correr}"
  if "$comando" "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    return
  fi
  if grep -qE "^ *not ok .*$marcador" "$ficheiro"; then
    verde "$nome"
  else
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '^ *not ok' "$ficheiro" | head -4
  fi
}

echo "0. Fixtures"
if node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; then
  verde "semeadas"
else
  vermelho "não foi possível semear"; exit 1
fi

echo
echo "1. Com tudo ligado"
if correr /tmp/bossaos-producao-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-producao-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $casos casos (esperados $CASOS_ESPERADOS)"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos (base)"
else
  vermelho "a prova de base falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-producao-ligado.txt | head -10
  exit 1
fi

if correr_kds /tmp/bossaos-kds-ligado.txt; then
  read -r gk ck <<<"$(analisar /tmp/bossaos-kds-ligado.txt)"
  if (( gk != GRUPOS_KDS )) || (( ck != CASOS_KDS )); then
    vermelho "a projecção mediu $gk grupos e $ck casos (esperados $GRUPOS_KDS e $CASOS_KDS)"; exit 1
  fi
  verde "$gk grupos verdes, $ck casos (projecção do KDS)"
else
  vermelho "a projecção do KDS falhou com tudo ligado"; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO OBRIGATÓRIO — o modelo INGÉNUO: uma linha, uma estação"
# É o que o contrato exige pelo nome. Com uma estação por linha, a fritadeira
# nunca vê a batata — e o defeito não dá erro: dá comida em falta, descoberta
# pelo cliente.
plantar <<'PYINGENUO' || true
import io
p = 'packages/db/src/producao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return [...new Set(regras.map((r: { stationId: string }) => r.stationId))];"
assert antigo in s, 'a resolucao de estacoes nao esta onde se esperava'
# O modelo ingénuo: a PRIMEIRA estação que casar, e mais nenhuma.
novo = "  return [...new Set(regras.map((r: { stationId: string }) => r.stationId))].slice(0, 1);"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYINGENUO
exigir_vermelho "caiu o caso 1: a segunda estação deixou de ver a linha" \
  'as duas estações vêem' /tmp/bossaos-producao-ingenuo.txt
cp "$ORIG_PRODUCAO" "$PRODUCAO"

echo
echo "3. CONTROLO NEGATIVO — ausência de regra passa a ser «cozinha por omissão»"
# «Ausência de regra não é cozinha por omissão.» Este defeito manda o item sem
# roteamento para a primeira estação que houver — em silêncio, que é o que o
# torna perigoso: alguém decidiu, e essa pessoa não foi o dono.
plantar <<'PYOMISSAO' || true
import io
p = 'packages/db/src/producao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    const alvos: (string | null)[] = estacoes.length > 0 ? estacoes : [null];"
assert antigo in s, 'a decisao do nao encaminhado nao esta onde se esperava'
novo = """    const porOmissao = await db.productionStation.findFirst({
      where: { locationId: dados.locationId, archivedAt: null }, select: { id: true },
    });
    const alvos: (string | null)[] = estacoes.length > 0
      ? estacoes : [porOmissao?.id ?? null];"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYOMISSAO
# O marcador casa o NOME do teste, e não a mensagem da asserção: o TAP escreve
# nomes nas linhas `not ok`, e a primeira versão deste controlo procurava a
# frase que está dentro do `assert`. Ficou vermelho pelo motivo certo e o
# ajudante disse que não — que é o comportamento correcto dele, e o erro era meu.
exigir_vermelho "caiu o caso 4: o item sem regra foi para uma estação qualquer" \
  'gera uma tarefa SEM estação' /tmp/bossaos-producao-omissao.txt
cp "$ORIG_PRODUCAO" "$PRODUCAO"

echo
echo "4. CONTROLO NEGATIVO — «pronto parcial» passa a ser pronto"
# «Uma mesa com três pratos em que dois estão prontos é uma mesa que ainda não
# sai — e mostrar pronto ali faz sair comida fria.» O defeito é trocar o TODAS
# por um ALGUMA, que é a versão que sai de graça de quem escreve depressa.
plantar <<'PYPARCIAL' || true
import io
p = 'packages/domain/src/pedido-puro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (prontas === vivas.length) return { estado: 'PRONTO', prontas, total: vivas.length };"
assert antigo in s, 'a regra do pronto nao esta onde se esperava'
novo = "  if (prontas > 0) return { estado: 'PRONTO', prontas, total: vivas.length };"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYPARCIAL
exigir_vermelho "caiu o caso 3: o pedido ficou pronto com metade por fazer" \
  'PRONTO só quando a última estação acaba' /tmp/bossaos-producao-parcial.txt
cp "$ORIG_PURO" "$PURO"

echo
echo "5. CONTROLO NEGATIVO — cancelar a linha deixa tarefas ÓRFÃS nas estações"
# «Uma tarefa órfã numa estação é comida a ser feita para um pedido que já não
# existe» — e a cozinha não tem como saber, porque do lado dela nada mudou.
plantar <<'PYORFA' || true
import io
p = 'packages/db/src/producao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    where: { lineId: dados.lineId, estado: { notIn: ['CANCELADA'] as EstadoDaProducao[] } },"
assert antigo in s, 'a seleccao das tarefas a cancelar nao esta onde se esperava'
# Cancela só a primeira: nas outras estações o trabalho continua.
novo = "    where: { lineId: dados.lineId, estado: { notIn: ['CANCELADA'] as EstadoDaProducao[] } },\n    take: 1,"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYORFA
exigir_vermelho "caiu o cancelamento: ficou trabalho vivo numa estação" \
  'em TODAS as estações' /tmp/bossaos-producao-orfa.txt
cp "$ORIG_PRODUCAO" "$PRODUCAO"

echo
echo "6. CONTROLO NEGATIVO — o limite VISÍVEL entra na fila"
# O erro concreto do `kds-e-tempo-real.md`: o KDS mostra doze, chegam vinte, e os
# oito de baixo desaparecem em vez de ficarem alcançáveis. Parece limpo, e é
# comida que nunca é feita.
plantar <<'PYLIMITE' || true
import io
p = 'packages/db/src/producao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    // Prioridade primeiro, e depois a ordem de chegada. Nunca o contrário: um
    // bilhete priorizado no fim da lista é uma prioridade que não serve de nada.
    orderBy: [{ prioridade: 'desc' }, { criadaEm: 'asc' }],"""
assert antigo in s, 'a ordenacao das tarefas nao esta onde se esperava'
novo = """    orderBy: [{ prioridade: 'desc' }, { criadaEm: 'asc' }],
    take: 3,"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYLIMITE
exigir_vermelho "caiu o backlog: a consulta passou a esconder bilhetes" \
  'não perde nada por falta de espaço' /tmp/bossaos-producao-limite.txt
cp "$ORIG_PRODUCAO" "$PRODUCAO"

echo
echo "7. CONTROLO NEGATIVO — o gatilho que impede a SEGUNDA VERDADE é desligado"
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
DROP TRIGGER IF EXISTS pedido_estado_de_producao_deriva ON "orders";
PSQL
exigir_vermelho "caiu a garantia: o estado de produção voltou a poder ser escrito à mão" \
  'NÃO se escreve no pedido' /tmp/bossaos-producao-gatilho.txt
repor_base; BASE_MEXIDA=0

echo
echo "8. CONTROLO NEGATIVO — a versão da tarefa volta a poder RETROCEDER"
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
DROP TRIGGER IF EXISTS tarefa_versao_monotona ON "production_tasks";
PSQL
exigir_vermelho "caiu a monotonia: a base deixou a versão andar para trás" \
  'recusa uma versão que RETROCEDA' /tmp/bossaos-producao-versao.txt
repor_base; BASE_MEXIDA=0

echo
echo "9. CONTROLO NEGATIVO — o ecrã volta a poder REGREDIR"
# É o que torna esta etapa perigosa: «um ecrã que volta atrás mostra ao
# cozinheiro um estado que já não é verdade, e ele age sobre ele. Ninguém vai
# procurar o erro — a comida sai errada e alguém culpa a pessoa.»
#
# O defeito é «aplicar o último que chega», que sai de graça de qualquer
# implementação que não pense em ordem.
plantar <<'PYREGRIDE' || true
import io
p = 'packages/domain/src/kds.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (actual && evento.versao <= actual.versao) {"
assert antigo in s, 'a regra da versao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  if (false) {"))
PYREGRIDE
exigir_vermelho "caiu a ordem: um evento atrasado reabriu um bilhete que já saiu" \
  'não reabre um bilhete que já saiu' /tmp/bossaos-kds-regride.txt correr_kds
cp "$ORIG_KDS" "$KDS"

echo
echo "10. CONTROLO NEGATIVO — o buraco no cursor é ignorado"
# «Ao detectar um intervalo desconhecido, vai ao estado autoritativo em vez de
# adivinhar.» Aplicar por cima do buraco é a definição de adivinhar.
plantar <<'PYBURACO' || true
import io
p = 'packages/domain/src/kds.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (evento.cursor !== esperado) {"
assert antigo in s, 'a deteccao do intervalo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  if (false) {"))
PYBURACO
exigir_vermelho "caiu o intervalo: aplicou por cima de um buraco" \
  'INTERVALO desconhecido' /tmp/bossaos-kds-buraco.txt correr_kds
cp "$ORIG_KDS" "$KDS"

echo
echo "11. CONTROLO NEGATIVO — o temporizador volta a ler o relógio do TABLET"
# «Os temporizadores contam a partir do carimbo do servidor, nunca do relógio do
# tablet.» Um `Date.now()` escondido aqui passava despercebido para sempre, e o
# sintoma aparecia num restaurante e não numa prova.
plantar <<'PYRELOGIO' || true
import io
p = 'packages/domain/src/kds.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const ms = agoraNoServidorMs - criadaEmMs;"
assert antigo in s, 'a conta do tempo nao esta onde se esperava'
novo = "  const ms = Date.now() - criadaEmMs;"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYRELOGIO
exigir_vermelho "caiu o relógio: o tempo passou a depender do aparelho" \
  'relógio é do SERVIDOR' /tmp/bossaos-kds-relogio.txt correr_kds
cp "$ORIG_KDS" "$KDS"

echo
echo "12. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-producao-reposto.txt && correr_kds /tmp/bossaos-kds-reposto.txt; then
  read -r g c <<<"$(analisar /tmp/bossaos-producao-reposto.txt)"
  read -r gk ck <<<"$(analisar /tmp/bossaos-kds-reposto.txt)"
  verde "reposto: $g grupos e $c casos (base), $gk grupos e $ck casos (projecção)"
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '^ *not ok' /tmp/bossaos-producao-reposto.txt /tmp/bossaos-kds-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "Produção provada: 0 falhas."
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))

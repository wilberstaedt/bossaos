#!/usr/bin/env bash
#
# E19 — a lista de espera.
#
# ── O controlo obrigatório está escrito no contrato ───────────────────────
#
# *«Fazer a derivação ignorar o tamanho do grupo. Se a prova continuar verde, ela
# está a medir uma fila, não uma lista de espera.»*
#
# É o controlo que decide a etapa, e o que ele planta é a versão ingénua — a que
# qualquer pessoa escreve primeiro, e que passa em quase todos os testes porque
# quase todos os cenários têm grupos do mesmo tamanho.
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

GRUPOS_ESPERADOS=6
CASOS_ESPERADOS=18
falhas=0

PURO=packages/domain/src/espera.ts
ESPERA=packages/db/src/espera.ts
ORIG_PURO=$(mktemp); ORIG_ESPERA=$(mktemp)
cp "$PURO" "$ORIG_PURO"; cp "$ESPERA" "$ORIG_ESPERA"
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

# ── Repor SEMPRE o CHECK dos carimbos ─────────────────────────────────────
#
# Um script morto a meio deixaria a base a aceitar um `SENTADO` sem hora — e o
# relatório de tempos de espera passava a nascer errado, em silêncio, até alguém
# reparar. É a garantia que este script tira de propósito.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "espera_carimbo_bate_com_estado";
ALTER TABLE "waitlist_entries"
  ADD CONSTRAINT "espera_carimbo_bate_com_estado" CHECK (
    ("estado" <> 'SENTADO'  OR "sentado_em"  IS NOT NULL) AND
    ("estado" <> 'DESISTIU' OR "desistiu_em" IS NOT NULL) AND
    ("estado" <> 'COM_OFERTA' OR ("chamado_em" IS NOT NULL AND "oferta_expira_em" IS NOT NULL))
  );
PSQL
}

restaurar() {
  cp "$ORIG_PURO" "$PURO"; cp "$ORIG_ESPERA" "$ESPERA"
  rm -f "$ORIG_PURO" "$ORIG_ESPERA"
  if [[ "$BASE_MEXIDA" == "1" ]]; then
    repor_base; BASE_MEXIDA=0
    printf '  (o CHECK dos carimbos foi reposto)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/espera.test.ts >"$1" 2>&1
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
  local nome="$1" marcador="$2" ficheiro="$3" nao_esperado="${4:-}"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    return
  fi
  if ! grep -qE "^ *not ok .*$marcador" "$ficheiro"; then
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '^ *not ok' "$ficheiro" | head -4
    return
  fi
  if [[ -n "$nao_esperado" ]] && grep -qE "^ *not ok .*$nao_esperado" "$ficheiro"; then
    vermelho "$nome: derrubou também o que NÃO devia cair ($nao_esperado)"
    return
  fi
  verde "$nome"
}

echo "0. Fixtures"
if node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; then
  verde "semeadas"
else
  vermelho "não foi possível semear"; exit 1
fi

echo
echo "1. Com tudo ligado"
if correr /tmp/bossaos-espera-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-espera-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $casos casos (esperados $CASOS_ESPERADOS)"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-espera-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO OBRIGATÓRIO — a derivação IGNORA o tamanho do grupo"
# O que o contrato manda plantar, e é a versão ingénua: toda a gente na mesma
# lista, posição por ordem de chegada. É a fila.
#
# O que TEM de cair é o par — o grupo de 6 a mudar de posição quando um de 2 se
# senta. O caso do de 2 a mudar **não** pode cair: numa fila ele também muda, e
# se caísse este controlo estaria a medir «alguma coisa parou» em vez da
# diferença entre uma fila e uma lista de espera.
plantar <<'PYFILA' || true
import io
p = 'packages/domain/src/espera.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return mesas\n    .filter((m) => m.capacidade >= quem.pessoas)"
assert antigo in s, 'o filtro por capacidade nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  return mesas\n    .filter(() => true)", 1))
PYFILA
# ── E o que NÃO pode cair ─────────────────────────────────────────────────
#
# Este plante derruba quase todo o grupo 2, e isso por si só não prova nada: o
# E17 ensinou-me que um defeito que derruba tudo prova que alguma coisa parou,
# não que a asserção certa funciona.
#
# O que o confina é a sugestão ao host, que vive noutra função e tem de ficar
# VERDE. Se cair, o plante escorregou para fora da derivação e este controlo
# deixou de ser sobre a diferença entre uma fila e uma lista de espera.
exigir_vermelho "caiu a fila: o grupo grande passou a subir quando o pequeno senta" \
  'NÃO muda com isso' /tmp/bossaos-espera-fila.txt \
  'a sugestão para a mesa de 2'
cp "$ORIG_PURO" "$PURO"

echo
echo "3. CONTROLO NEGATIVO — a posição volta a ser um contador de chegada"
# A outra forma da mesma fila: agrupar toda a gente numa lista só, mantendo o
# filtro. É o que sai de escrever «ordena por chegada e conta».
plantar <<'PYCONTADOR' || true
import io
p = 'packages/domain/src/espera.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    .filter((outro) => mesasQueServem(outro, mesas).join(',') === chave)"
assert antigo in s, 'o agrupamento por mesas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    .filter(() => true)", 1))
PYCONTADOR
exigir_vermelho "caiu o agrupamento: a posição passou a contar toda a gente" \
  'DOS GRUPOS DE 5 OU 6|dos de 2' /tmp/bossaos-espera-contador.txt \
  'a sugestão para a mesa de 2'
cp "$ORIG_PURO" "$PURO"

echo
echo "4. CONTROLO NEGATIVO — a preferência de ZONA deixa de contar"
# Quem só aceita o terraço passa a ser sugerido para a sala. Nada dá erro: o host
# chama a pessoa, ela recusa, e a mesa fica vazia mais dez minutos.
plantar <<'PYZONA' || true
import io
p = 'packages/domain/src/espera.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    .filter((quem) => quem.zonas.length === 0 || quem.zonas.includes(mesa.areaId))"
assert antigo in s, 'o filtro de zona da sugestao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    .filter(() => true)", 1))
PYZONA
exigir_vermelho "caiu a zona: quem espera pelo terraço foi chamado para a sala" \
  'não é sugerido para uma mesa da sala' /tmp/bossaos-espera-zona.txt
cp "$ORIG_PURO" "$PURO"

echo
echo "5. CONTROLO NEGATIVO — a estimativa perde a marca de estimativa"
# «Uma estimativa apresentada como promessa é um defeito.» Aqui o número passa a
# viajar sozinho, e nenhum ecrã consegue saber o que ele é.
plantar <<'PYESTIMATIVA' || true
import io
p = 'packages/domain/src/espera.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return { minutos: posicao.posicao * duracaoMediaMin, estimativa: true };"
assert antigo in s, 'a marca da estimativa nao esta onde se esperava'
novo = "  return { minutos: posicao.posicao * duracaoMediaMin, estimativa: false as unknown as true };"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYESTIMATIVA
exigir_vermelho "caiu a marca: o número passou a viajar sem dizer o que é" \
  'sai sempre com a marca' /tmp/bossaos-espera-marca.txt
cp "$ORIG_PURO" "$PURO"

echo
echo "6. CONTROLO NEGATIVO — quem não cabe passa a ser o ÚLTIMO"
# A tentação óbvia: em vez de `null`, dar-lhe o fim da lista. É a promessa mais
# falsa de todas — um grupo de 20 numa sala cuja maior mesa tem 6 nunca vai ser
# sentado, e «é o 7.º» diz-lhe que vai.
plantar <<'PYSEMMESA' || true
import io
p = 'packages/domain/src/espera.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (minhas.length === 0) return null;"
assert antigo in s, 'a resposta de quem nao cabe nao esta onde se esperava'
novo = "  if (minhas.length === 0) return { posicao: todos.length, de: todos.length };"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYSEMMESA
exigir_vermelho "caiu a honestidade: quem nunca vai caber recebeu um lugar na fila" \
  'NÃO tem posição' /tmp/bossaos-espera-semmesa.txt
cp "$ORIG_PURO" "$PURO"

echo
echo "7. CONTROLO NEGATIVO — desistir deixa a vaga pendurada"
# A mesa fica presa a quem foi embora, até a retenção expirar. Ninguém vê erro
# nenhum: vê-se uma mesa vazia que o sistema diz estar ocupada.
plantar <<'PYDESISTE' || true
import io
p = 'packages/db/src/espera.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      ofertaTableId: null, ofertaInicio: null, ofertaFim: null, ofertaExpiraEm: null,"
assert antigo in s, 'a largada da vaga nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYDESISTE
exigir_vermelho "caiu a largada: a vaga ficou presa a uma espera morta" \
  'larga a vaga' /tmp/bossaos-espera-desiste.txt
cp "$ORIG_ESPERA" "$ESPERA"

echo
echo "8. CONTROLO NEGATIVO — a base aceita um SENTADO sem carimbo"
# O `CHECK` é o que impede o relatório de tempos de espera de nascer errado.
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "espera_carimbo_bate_com_estado";
PSQL
exigir_vermelho "caiu o carimbo: a base deixou passar um SENTADO sem hora" \
  'RECUSA um SENTADO sem carimbo' /tmp/bossaos-espera-carimbo.txt
repor_base; BASE_MEXIDA=0

echo
echo "9. CONTROLO NEGATIVO — a coluna PROIBIDA volta à tabela"
# A garantia desta etapa é uma ausência, e uma ausência só está guardada se
# alguém acender quando ela deixar de existir.
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "posicao" INTEGER;
PSQL
exigir_vermelho "caiu a ausência: a tabela ganhou onde guardar um número errado" \
  'não existe coluna posicao' /tmp/bossaos-espera-coluna.txt
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "posicao";
PSQL
BASE_MEXIDA=0

echo
echo "10. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-espera-reposto.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-espera-reposto.txt)"
  if (( casos != CASOS_ESPERADOS )); then
    vermelho "reposto mas com $casos casos (esperados $CASOS_ESPERADOS)"
  else
    verde "reposto: $grupos grupos, $casos casos"
  fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '^ *not ok' /tmp/bossaos-espera-reposto.txt | head -5
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))

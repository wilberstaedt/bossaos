#!/usr/bin/env bash
#
# E20 — um pedido para as 20h não é trabalho para agora.
#
# ── O que o contrato numera, e onde está aqui ─────────────────────────────
#
#   1. um pedido para daqui a três horas não aparece na fila agora  → controlo 2
#   2. o PAR: o mesmo pedido aparece quando o momento chega         → controlo 3
#   3. atravessar o momento duas vezes não cria duas entradas       → controlo 4
#   4. um item esgotado antes da hora marca o pedido antes          → controlo 8
#
# E o que a régua reprova à cabeça: **a prova do momento medida só em minutos
# relativos**. Por isso o controlo 5 troca o fuso pela hora de parede, e o que
# tem de cair é a asserção da hora ABSOLUTA — a que compara com o relógio da base.
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

GRUPOS_ESPERADOS=5
CASOS_ESPERADOS=26
falhas=0

TARDE=packages/db/src/mais-tarde.ts
PRODUCAO=packages/db/src/producao.ts
ORIG_TARDE=$(mktemp); ORIG_PRODUCAO=$(mktemp)
cp "$TARDE" "$ORIG_TARDE"; cp "$PRODUCAO" "$ORIG_PRODUCAO"
BASE_MEXIDA=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── Repor SEMPRE o gatilho que deriva o momento ───────────────────────────
#
# Um guião morto a meio deixaria `producao_em` como mais uma coluna que alguém
# pode escrever — e a primeira vez que a escrevesse errada, a comida saía à hora
# errada sem nada dar erro.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
CREATE OR REPLACE FUNCTION pedido_deriva_momento_de_producao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entregar_as IS NULL THEN
    NEW.producao_em := NULL;
  ELSE
    NEW.producao_em := NEW.entregar_as - make_interval(mins => COALESCE(NEW.preparo_min, 0));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS pedido_momento_de_producao_deriva ON "orders";
CREATE TRIGGER pedido_momento_de_producao_deriva
  BEFORE INSERT OR UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION pedido_deriva_momento_de_producao();
PSQL
}

restaurar() {
  cp "$ORIG_TARDE" "$TARDE"; cp "$ORIG_PRODUCAO" "$PRODUCAO"
  rm -f "$ORIG_TARDE" "$ORIG_PRODUCAO"
  if [[ "$BASE_MEXIDA" == "1" ]]; then
    repor_base; BASE_MEXIDA=0
    printf '  (o gatilho do momento de produção foi reposto)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/mais-tarde.test.ts >"$1" 2>&1
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
  if correr "$ficheiro"; then vermelho "$nome: ficou VERDE com o defeito plantado"; return; fi
  if ! grep -qE "^ *not ok .*$marcador" "$ficheiro"; then
    vermelho "$nome: ficou vermelha, mas não foi a asserção esperada"
    grep -E '^ *not ok' "$ficheiro" | head -4; return
  fi
  if [[ -n "$nao_esperado" ]] && grep -qE "^ *not ok .*$nao_esperado" "$ficheiro"; then
    vermelho "$nome: derrubou também o que NÃO devia cair ($nao_esperado)"; return
  fi
  verde "$nome"
}

echo "0. Fixtures"
if node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1; then
  verde "semeadas"
else vermelho "não foi possível semear"; exit 1; fi

echo
echo "1. Com tudo ligado"
if correr /tmp/bossaos-tarde-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-tarde-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos, $casos casos"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-tarde-ligado.txt | head -10; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a cozinha volta a ver TUDO (o modelo ingénuo)"
# «Um pedido é um pedido, entra na fila quando chega.» Enche o ecrã da cozinha ao
# almoço com trabalho para o jantar — e ensina a cozinha a ignorar o ecrã.
python3 - <<'PYINGENUO'
import io
p = 'packages/db/src/producao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """      ...(filtro.incluirFuturas ? {} : {
        pedido: { OR: [{ producaoEm: null }, { producaoEm: { lte: agora } }] },
      }),"""
assert antigo in s, 'o filtro do relogio nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYINGENUO
exigir_vermelho "caiu a fila: trabalho para o jantar apareceu ao almoço" \
  'daqui a três horas NÃO aparece' /tmp/bossaos-tarde-ingenuo.txt \
  'SEM hora é para agora'
cp "$ORIG_PRODUCAO" "$PRODUCAO"

echo
echo "3. CONTROLO NEGATIVO — a cozinha ESCONDE tudo o que tem hora"
# ── O defeito simétrico, e o par que o contrato exige ────────────────────
#
# «Só aparece quando for a hora» escrito como «nunca aparece»: um pedido que
# nunca entra é comida que nunca se faz. Sem este par, o controlo 2 passa com
# «esconde tudo» lá dentro.
python3 - <<'PYESCONDE'
import io
p = 'packages/db/src/producao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "        pedido: { OR: [{ producaoEm: null }, { producaoEm: { lte: agora } }] },"
assert antigo in s, 'o filtro do relogio nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "        pedido: { producaoEm: null },", 1))
PYESCONDE
exigir_vermelho "caiu a passagem: chegou a hora e o pedido não entrou" \
  'aparece quando o momento chega' /tmp/bossaos-tarde-esconde.txt \
  'daqui a três horas NÃO aparece'
cp "$ORIG_PRODUCAO" "$PRODUCAO"

echo
echo "4. CONTROLO NEGATIVO — o relógio deixa de ser o da BASE"
# ── E a razão não é o fuso, que foi o que eu escrevi errado ──────────────
#
# `Date.now()` é UTC absoluto: o fuso do processo não lhe toca. O que o relógio
# da base guarda é a DERIVA entre a máquina que pergunta e a que guarda os
# carimbos — e um servidor mal acertado transforma segundos em minutos.
#
# O plante põe quatro horas de deriva, acima da margem do cenário, porque é isso
# que faz a diferença ser observável. Uma deriva pequena existe e é invisível —
# e é precisamente por ser invisível que se pergunta à base em vez de adivinhar.
python3 - <<'PYRELOGIO'
import io
p = 'packages/db/src/producao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const [linha] = await db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`;
  const agora = linha!.agora;"""
assert antigo in s, 'a leitura do relogio da base nao esta onde se esperava'
novo = "  const agora = new Date(Date.now() + 4 * 3600_000);"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYRELOGIO
exigir_vermelho "caiu o relógio: a fila passou a depender do relógio de quem pergunta" \
  'daqui a três horas NÃO aparece' /tmp/bossaos-tarde-relogio.txt
cp "$ORIG_PRODUCAO" "$PRODUCAO"

echo
echo "5. CONTROLO NEGATIVO OBRIGATÓRIO — a hora de entrega volta a ser hora de parede"
# ── O defeito do E19, aqui no fogão ──────────────────────────────────────
#
# «Um pedido para as 20:30 com 25 minutos de preparo entraria em produção às
# 22:05 locais — comida feita duas horas depois de a pessoa a vir buscar.»
#
# O que TEM de cair é a asserção da hora ABSOLUTA. Se caísse só uma medida em
# minutos relativos, o controlo não provava nada: 25 minutos antes é verdade em
# qualquer fuso.
python3 - <<'PYPAREDE'
import io
p = 'packages/db/src/mais-tarde.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const r = await resolverHoraLocal(db, unidade.fuso, `${dia} ${hora}:00`);"
assert antigo in s, 'a resolucao do fuso nao esta onde se esperava'
novo = "  const r = { instante: new Date(`${dia}T${hora}:00Z`), estado: 'NORMAL' as const };"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYPAREDE
exigir_vermelho "caiu o fuso: o momento de produção nasceu duas horas errado" \
  'produzem-se às 20:05 de Madrid' /tmp/bossaos-tarde-parede.txt
cp "$ORIG_TARDE" "$TARDE"

echo
echo "6. CONTROLO NEGATIVO — a base deixa de DERIVAR o momento"
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
DROP TRIGGER IF EXISTS pedido_momento_de_producao_deriva ON "orders";
PSQL
exigir_vermelho "caiu a derivação: o momento pôde ser escrito de fora" \
  'DERIVA o momento' /tmp/bossaos-tarde-gatilho.txt
repor_base; BASE_MEXIDA=0

echo
echo "7. CONTROLO NEGATIVO — a taxa passa a ter um valor por OMISSÃO"
# «Ausência não é política, e um valor por omissão que ninguém decidiu é uma
# decisão do dono tomada por nós.» É o ramo que qualquer pessoa escreve primeiro.
python3 - <<'PYTAXA'
import io
p = 'packages/db/src/mais-tarde.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (!area) return { ok: false, motivo: 'FORA_DA_AREA' };"
assert antigo in s, 'a recusa da area nao esta onde se esperava'
novo = "  if (!area) return { ok: true, areaId: '', taxaMenor: 0, moeda: 'EUR' };"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYTAXA
exigir_vermelho "caiu a área: um código postal sem área ganhou taxa zero" \
  'FORA DA ÁREA|NÃO é inventada' /tmp/bossaos-tarde-taxa.txt \
  'DENTRO da área é aceite'
cp "$ORIG_TARDE" "$TARDE"

echo
echo "8. CONTROLO NEGATIVO — o esgotado só se descobre à HORA"
# «O defeito é descobri-lo às 19h58, e o defeito pior é descobri-lo às 18h e não
# dizer nada.» Aqui a lista só olha para o que já entrou em produção.
python3 - <<'PYESGOTADO'
import io
p = 'packages/db/src/mais-tarde.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """      locationId, estado: { not: 'CANCELADO' },
      producaoEm: { gt: agora!.agora },
    },
    include: {
      linhas: { select: { nome: true, productId: true } },
    },"""
assert antigo in s, 'a leitura dos agendados em risco nao esta onde se esperava'
novo = """      locationId, estado: { not: 'CANCELADO' },
      producaoEm: { lte: agora!.agora },
    },
    include: {
      linhas: { select: { nome: true, productId: true } },
    },"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYESGOTADO
exigir_vermelho "caiu o aviso: o esgotado só apareceu quando já era tarde" \
  'fica marcado às 18h' /tmp/bossaos-tarde-esgotado.txt
cp "$ORIG_TARDE" "$TARDE"

echo
echo "9. CONTROLO NEGATIVO — o conector externo aceita com o provedor desligado"
python3 - <<'PYCONECTOR'
import io
p = 'packages/db/src/mais-tarde.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (!conector.activo || !conector.provedor) return { ok: false, motivo: 'DESLIGADO' };"
assert antigo in s, 'a verificacao do conector nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYCONECTOR
exigir_vermelho "caiu o conector: aceitou pedidos que ninguém vai buscar" \
  'conector desligado é RECUSADO' /tmp/bossaos-tarde-conector.txt \
  'com provedor e mapa, o pedido externo ENTRA'
cp "$ORIG_TARDE" "$TARDE"

echo
echo "10. CONTROLO NEGATIVO — o mesmo evento externo cria DOIS pedidos"
python3 - <<'PYIDEMP'
import io
p = 'packages/db/src/mais-tarde.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (jaExiste) return { ok: true, orderId: jaExiste.id, repetido: true };"
assert antigo in s, 'a idempotencia do pedido externo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PYIDEMP
exigir_vermelho "caiu a idempotência: o reenvio do parceiro fez a cozinha duas vezes" \
  'duas vezes preserva UM pedido' /tmp/bossaos-tarde-idemp.txt \
  'id externo DIFERENTE é um pedido novo'
cp "$ORIG_TARDE" "$TARDE"

echo
echo "11. CONTROLO NEGATIVO — o preparo passa a ser a SOMA das linhas"
# As estações trabalham em paralelo: a batata e o bife saem juntos. Somar dá um
# momento de produção cedo demais, e trabalho que espera no passe.
python3 - <<'PYSOMA'
import io
p = 'packages/db/src/mais-tarde.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return produtos.reduce((maior, p) => Math.max(maior, p.preparoMin), 0);"
assert antigo in s, 'a conta do preparo nao esta onde se esperava'
# A soma pura, sem truques: com 25 e 5, dá 30 onde o maximo e' 25.
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "  return produtos.reduce((total, p) => total + p.preparoMin, 0);", 1))
PYSOMA
exigir_vermelho "caiu o preparo: a soma pôs a cozinha a começar cedo demais" \
  'MAIOR das linhas' /tmp/bossaos-tarde-preparo.txt
cp "$ORIG_TARDE" "$TARDE"

echo
echo "12. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-tarde-reposto.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-tarde-reposto.txt)"
  if (( casos != CASOS_ESPERADOS )); then
    vermelho "reposto mas com $casos casos (esperados $CASOS_ESPERADOS)"
  else verde "reposto: $grupos grupos, $casos casos"; fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '^ *not ok' /tmp/bossaos-tarde-reposto.txt | head -5
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))

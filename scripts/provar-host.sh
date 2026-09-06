#!/usr/bin/env bash
#
# E19 — o que o host vê, e o que o host faz.
#
# ── O par que decide esta fatia ───────────────────────────────────────────
#
# «Chegar não é estar sentado.» O controlo 2 colapsa os dois actos — o check-in
# passa a sentar — e o que TEM de cair é o par: a chegada deixa de não abrir
# sessão. O caso de sentar **não** pode cair: se caísse, o controlo estaria a
# medir «alguma coisa parou» em vez da distinção entre os dois actos.
#
# É a mesma forma do controlo obrigatório do E17, e está aqui pela mesma razão.
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
CASOS_ESPERADOS=17
falhas=0

HOST=packages/db/src/host.ts
ORIG_HOST=$(mktemp)
cp "$HOST" "$ORIG_HOST"
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
# Um script morto a meio deixaria a base a aceitar uma reserva SENTADA sem hora
# de chegada — e a tolerância de atraso passava a contar contra quem já lá está.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reserva_carimbo_bate_com_estado";
ALTER TABLE "reservations"
  ADD CONSTRAINT "reserva_carimbo_bate_com_estado" CHECK (
    ("estado" <> 'CHEGOU'         OR "chegou_em"   IS NOT NULL) AND
    ("estado" <> 'SENTADA'        OR ("sentada_em" IS NOT NULL AND "chegou_em" IS NOT NULL)) AND
    ("estado" <> 'CANCELADA'      OR "cancelada_em" IS NOT NULL) AND
    ("estado" <> 'NAO_COMPARECEU' OR "no_show_em"   IS NOT NULL)
  );
PSQL
}

restaurar() {
  cp "$ORIG_HOST" "$HOST"; rm -f "$ORIG_HOST"
  if [[ "$BASE_MEXIDA" == "1" ]]; then
    repor_base; BASE_MEXIDA=0
    printf '  (o CHECK dos carimbos foi reposto)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/host.test.ts >"$1" 2>&1
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
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
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
if correr /tmp/bossaos-host-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-host-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos, $casos casos"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-host-ligado.txt | head -10; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO OBRIGATÓRIO — o check-in passa a SENTAR"
# Os dois actos colapsam num só. É o que qualquer pessoa escreve primeiro, e é o
# que faz o mapa da sala mentir a quem serve.
plantar <<'PYCOLAPSO' || true
import io
p = 'packages/db/src/host.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    data: { estado: 'CHEGOU', chegouEm: new Date() },"
assert antigo in s, 'a marcacao de chegada nao esta onde se esperava'
novo = """    data: { estado: 'SENTADA', chegouEm: new Date(), sentadaEm: new Date() },"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYCOLAPSO
# ── O discriminador é o ESTADO, e não o par ──────────────────────────────
#
# Apontei isto primeiro ao par — «a chegada não abre sessão» — e ficou vermelho
# pela asserção errada. O plante muda o estado e não abre sessão nenhuma, por isso
# o par continuava verde, com razão.
#
# Quem distingue os dois actos aqui é o estado que a chegada escreve. O par fica
# como `nao_esperado` invertido: o caso de SENTAR tem de continuar verde, senão
# isto mede «alguma coisa parou».
exigir_vermelho "caiu a distinção: o check-in passou a sentar o grupo" \
  'a chegada carimba e muda o estado' /tmp/bossaos-host-colapso.txt \
  'sentar abre a sessão'
cp "$ORIG_HOST" "$HOST"

echo
echo "3. CONTROLO NEGATIVO — sentar deixa de exigir a chegada"
# O check-in fica a existir e deixa de servir para nada: senta-se quem nunca
# apareceu, e o carimbo da chegada some.
plantar <<'PYSEMCHEGADA' || true
import io
p = 'packages/db/src/host.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (!reserva || !reserva.chegouEm) return { ok: false, motivo: 'NAO_CHEGOU' };"
assert antigo in s, 'a exigencia da chegada nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "  if (!reserva) return { ok: false, motivo: 'NAO_CHEGOU' };", 1))
PYSEMCHEGADA
exigir_vermelho "caiu a exigência: sentou-se quem nunca chegou" \
  'sentar quem NÃO chegou' /tmp/bossaos-host-semchegada.txt
cp "$ORIG_HOST" "$HOST"

echo
echo "4. CONTROLO NEGATIVO — a base aceita uma SENTADA sem chegada"
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reserva_carimbo_bate_com_estado";
PSQL
exigir_vermelho "caiu o carimbo: a base deixou passar uma SENTADA sem chegada" \
  'RECUSA uma SENTADA sem o carimbo' /tmp/bossaos-host-carimbo.txt
repor_base; BASE_MEXIDA=0

echo
echo "5. CONTROLO NEGATIVO — a sala anuncia reservas de QUALQUER hora"
# «A reserva de amanhã aparece na sala de hoje.» O mapa enche-se de avisos que
# não são deste turno, e quem serve deixa de os ler.
plantar <<'PYJANELA' || true
import io
p = 'packages/db/src/host.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      reserva: { estado: { in: ['CONFIRMADA', 'CHEGOU'] }, inicio: { gte: agora, lt: ate } },"
assert antigo in s, 'a janela das reservas a chegar nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "      reserva: { estado: { in: ['CONFIRMADA', 'CHEGOU'] } },", 1))
PYJANELA
exigir_vermelho "caiu a janela: a sala passou a anunciar reservas de amanhã" \
  'reserva de amanhã NÃO aparece' /tmp/bossaos-host-janela.txt
cp "$ORIG_HOST" "$HOST"

echo
echo "6. CONTROLO NEGATIVO — as atrasadas passam a ser LIBERTADAS"
# «Libertar uma reserva atrasada é política e acção do host, nunca uma limpeza
# automática silenciosa.» Um varredor dá a mesa de quem está a estacionar o carro
# a outra pessoa, sem ninguém decidir nada.
plantar <<'PYVARREDOR' || true
import io
p = 'packages/db/src/host.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return hoje.filter((r) => r.estado === 'CONFIRMADA' && r.inicio < limite);"
assert antigo in s, 'a leitura das atrasadas nao esta onde se esperava'
novo = """  const lista = hoje.filter((r) => r.estado === 'CONFIRMADA' && r.inicio < limite);
  for (const r of lista) {
    await db.reservationAllocation.deleteMany({ where: { reservationId: r.id } });
  }
  return lista;"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYVARREDOR
exigir_vermelho "caiu a política: a leitura passou a libertar a mesa sozinha" \
  'NADA foi libertado' /tmp/bossaos-host-varredor.txt
cp "$ORIG_HOST" "$HOST"

echo
echo "7. CONTROLO NEGATIVO — as chegadas por hora contam as HORAS TODAS"
# Uma reserva das 20h que dura 90 minutos passa a contar nas 20h e nas 21h, e a
# ocupação soma mais gente do que existe na sala.
plantar <<'PYHORAS' || true
import io
p = 'packages/db/src/host.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    const h = r.inicio.getUTCHours();"
assert antigo in s, 'a hora contada nao esta onde se esperava'
novo = """    for (let extra = r.inicio.getUTCHours(); extra <= r.fim.getUTCHours(); extra += 1) {
      const anterior = porHora.get(extra) ?? { pessoas: 0, reservas: 0 };
      porHora.set(extra, { pessoas: anterior.pessoas + r.pessoas, reservas: anterior.reservas + 1 });
    }
    const h = r.inicio.getUTCHours();"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYHORAS
exigir_vermelho "caiu a definição: a ocupação passou a somar mais gente do que existe" \
  'hora de INÍCIO' /tmp/bossaos-host-horas.txt
cp "$ORIG_HOST" "$HOST"

echo
echo "8. CONTROLO NEGATIVO — o walk-in senta-se numa mesa ocupada"
plantar <<'PYWALKIN' || true
import io
p = 'packages/db/src/host.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const ocupada = await db.tableSession.findFirst({
    where: { tableId, estado: { not: 'FECHADA' } }, select: { id: true },
  });
  if (ocupada) return { ok: false, motivo: 'MESA_OCUPADA' };
  const sessao = await db.tableSession.create({"""
assert antigo in s, 'a verificacao do walk-in nao esta onde se esperava'
novo = """  const sessao = await db.tableSession.create({"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYWALKIN
exigir_vermelho "caiu a verificação: dois grupos na mesma mesa" \
  'walk-in numa mesa ocupada' /tmp/bossaos-host-walkin.txt
cp "$ORIG_HOST" "$HOST"

echo
echo "9. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-host-reposto.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-host-reposto.txt)"
  if (( casos != CASOS_ESPERADOS )); then
    vermelho "reposto mas com $casos casos (esperados $CASOS_ESPERADOS)"
  else verde "reposto: $grupos grupos, $casos casos"; fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '^ *not ok' /tmp/bossaos-host-reposto.txt | head -5
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))

#!/usr/bin/env bash
#
# E13 — sala, sessões, dispositivos e PIN.
#
# A régua (`docs/reviews/ALVO-E13.md`) nomeia o defeito mais provável desta etapa
# antes de ele existir: **concorrência provada em sequência**. E nomeia a segunda
# forma do mesmo erro: unicidade garantida por consulta prévia em vez de restrição
# na base — *«uma corrida com janela mais estreita, que passa a maior parte das
# vezes, e isso é pior do que falhar sempre»*.
#
# Sete defeitos plantados, um de cada vez, e cada um tem de derrubar a asserção
# QUE MEDE ESSA COISA. O primeiro é o que interessa: sem o índice, as duas
# aberturas concorrentes passam as duas.
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

GRUPOS_ESPERADOS=3
CASOS_ESPERADOS=24
falhas=0

SALA=packages/db/src/sala.ts
DISP=packages/db/src/dispositivos.ts
ORIG_SALA=$(mktemp); ORIG_DISP=$(mktemp)
cp "$SALA" "$ORIG_SALA"; cp "$DISP" "$ORIG_DISP"
INDICE_MEXIDO=0

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

# O índice é a garantia inteira do aceite 1. Um script morto a meio que o deixasse
# de fora abria a porta a duas sessões na mesma mesa, em silêncio.
repor_indice() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
DROP INDEX IF EXISTS "uma_sessao_activa_por_mesa";
CREATE UNIQUE INDEX "uma_sessao_activa_por_mesa"
  ON "table_sessions" ("table_id") WHERE estado <> 'FECHADA';
PSQL
}

restaurar() {
  cp "$ORIG_SALA" "$SALA"; cp "$ORIG_DISP" "$DISP"
  rm -f "$ORIG_SALA" "$ORIG_DISP"
  if [[ "$INDICE_MEXIDO" == "1" ]]; then
    repor_indice
    INDICE_MEXIDO=0
    printf '  (o índice único da sessão foi reposto)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/sala.test.ts >"$1" 2>&1
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
  local nome="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
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
if correr /tmp/bossaos-sala-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-sala-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos == 0 )) || (( casos == 0 )); then
    vermelho "VERDE COM ZERO MEDIDO: $grupos grupos, $casos casos."; exit 1
  fi
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $casos casos (esperados $CASOS_ESPERADOS)"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-sala-ligado.txt | head -12
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o índice único desaparece"
# É O controlo desta etapa. Sem o índice, as duas aberturas concorrentes passam
# as duas — e é isso que mostra que quem garante a unicidade é a BASE e não uma
# consulta prévia que o código nem sequer faz.
psql "$MIGRATION_DATABASE_URL" -q -c 'DROP INDEX IF EXISTS "uma_sessao_activa_por_mesa";' >/dev/null 2>&1
INDICE_MEXIDO=1
exigir_vermelho "caiu a asserção das duas aberturas concorrentes" \
  'as duas disparadas SEM esperar' /tmp/bossaos-sala-sem-indice.txt
if grep -q 'not ok.*duas transacções abertas AO MESMO TEMPO' /tmp/bossaos-sala-sem-indice.txt; then
  verde "e a prova das duas transacções simultâneas também caiu — é o mesmo índice"
else
  vermelho "a prova das transacções simultâneas ficou verde sem índice: não mede o que diz"
fi
repor_indice; INDICE_MEXIDO=0

echo
echo "3. CONTROLO NEGATIVO — o índice deixa de ter a condição de estado"
# A régua: «um índice único sobre (mesa) sem estado passa o aceite e deixa a mesa
# inutilizável para sempre». Aqui o aceite 1 continua verde e é o PAR que cai —
# que é exactamente a diferença que este controlo existe para mostrar.
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
DROP INDEX IF EXISTS "uma_sessao_activa_por_mesa";
CREATE UNIQUE INDEX "uma_sessao_activa_por_mesa" ON "table_sessions" ("table_id");
PSQL
INDICE_MEXIDO=1
exigir_vermelho "caiu o PAR: a mesa deixou de voltar a abrir" \
  'a mesa VOLTA a abrir' /tmp/bossaos-sala-indice-sem-estado.txt
if grep -q 'not ok.*as duas disparadas SEM esperar' /tmp/bossaos-sala-indice-sem-estado.txt; then
  vermelho "o aceite 1 também caiu — o controlo não distingue as duas coisas"
else
  verde "e o aceite 1 aguentou: as duas regras são distintas"
fi
repor_indice; INDICE_MEXIDO=0

echo
echo "4. CONTROLO NEGATIVO — a transferência escreve o histórico fora da transacção"
# «A transferência é uma transacção ou não é nada.» Com o evento escrito à parte,
# uma transferência recusada deixa rasto de ter acontecido.
# O defeito é «registar primeiro, e fora da transacção» — a forma real deste erro,
# porque quem escreve um diário quer registá-lo ANTES de a acção poder falhar.
# Com ele, uma transferência RECUSADA deixa no histórico que aconteceu.
#
# A primeira versão deste controlo pôs o registo depois do `update`, e ficou
# verde: nesse sítio ele nunca chega a correr quando o destino está ocupado,
# porque o `update` falha antes. O controlo estava a plantar um defeito que o
# caminho medido não atravessa — e isso lê-se como código correcto.
plantar <<'PYTRANS' || true
import io
p = 'packages/db/src/sala.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """      await db.tableSession.update({
        where: { id: sessaoId },
        data: { tableId: destino.id, locationId: destino.locationId },
      });
      await registarEvento(db, organizationId, sessaoId, 'sessao.transferida', actor.email, {
        de: sessao.tableId, para: destino.id,
      });"""
assert antigo in s, 'a transferência não está onde se esperava'
novo = """      await comEscopo(prisma, { organizationId }, (outro) =>
        registarEvento(outro, organizationId, sessaoId, 'sessao.transferida', actor.email, {
          de: sessao.tableId, para: destino.id,
        }));
      await db.tableSession.update({
        where: { id: sessaoId },
        data: { tableId: destino.id, locationId: destino.locationId },
      });"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYTRANS
exigir_vermelho "caiu a asserção do histórico que não devia existir" \
  'a origem fica como estava' /tmp/bossaos-sala-transaccao.txt
cp "$ORIG_SALA" "$SALA"

echo
echo "5. CONTROLO NEGATIVO — arquivar fecha a sessão em vez de recusar"
# «Arquivamento respeita sessões abertas.» Fechar por quem está à mesa decide a
# conta de alguém a meio do jantar.
plantar <<'PY' || true
import io
p = 'packages/db/src/sala.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (aberta) return { ok: false, motivo: 'sessao_aberta', sessaoId: aberta.id };"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  void aberta;"))
PY
exigir_vermelho "caiu a recusa de arquivar com sessão aberta" \
  'arquivar uma mesa com sessão aberta é RECUSADO' /tmp/bossaos-sala-arquivo.txt
cp "$ORIG_SALA" "$SALA"

echo
echo "6. CONTROLO NEGATIVO — o PIN é verificado e o DISPOSITIVO não"
# É o defeito que o «inclusive» do aceite 2 nomeia. O ataque 1 e o 3 caem; o
# ataque 2 aguenta, porque mede outra defesa — e é essa distinção que faz destes
# controlos dois e não um.
plantar <<'PY' || true
import io
p = 'packages/db/src/dispositivos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    const porta = await dispositivoPodeComandar(db, dados.deviceId);
    if (!porta.pode) return { ok: false as const, motivo: porta.motivo };"""
assert antigo in s
novo = """    const porta = await dispositivoPodeComandar(db, dados.deviceId);
    if (!porta.pode) {
      const d = await db.device.findFirst({ where: { id: dados.deviceId }, select: { locationId: true } });
      if (!d) return { ok: false as const, motivo: porta.motivo };
      Object.assign(porta, { pode: true, estacao: 'SALA', locationId: d.locationId });
    }"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PY
exigir_vermelho "caiu o ataque 1: PIN correcto num aparelho revogado" \
  'revogado, com o PIN CORRECTO' /tmp/bossaos-sala-pin.txt
if grep -q 'not ok.*revogar DURANTE o turno' /tmp/bossaos-sala-pin.txt; then
  vermelho "o ataque 2 também caiu — o controlo não distingue as duas defesas"
else
  verde "e o ataque 2 aguentou: a porta dos comandos é outra defesa"
fi
cp "$ORIG_DISP" "$DISP"

echo
echo "7. CONTROLO NEGATIVO — a porta dos comandos deixa de ver a revogação"
plantar <<'PY' || true
import io
p = 'packages/db/src/dispositivos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (d.estado === 'REVOGADO') return { pode: false, motivo: 'dispositivo_revogado' };"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  // plantado"))
PY
exigir_vermelho "caiu o ataque 2: revogar a meio do turno" \
  'revogar DURANTE o turno' /tmp/bossaos-sala-comandos.txt
cp "$ORIG_DISP" "$DISP"

echo
echo "8. CONTROLO NEGATIVO — o PIN passa a ser guardado em claro"
plantar <<'PY' || true
import io
p = 'packages/db/src/dispositivos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const resumo = resumirPin(dados.pin, sal).toString('hex');"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  const resumo = dados.pin;"))
PY
exigir_vermelho "caiu a asserção do PIN em claro" \
  'o PIN não fica em claro na base' /tmp/bossaos-sala-claro.txt
cp "$ORIG_DISP" "$DISP"

echo
echo "9. CONTROLO NEGATIVO — a limpeza passa a libertar a mesa"
# Uma mesa vazia por limpar NAO e uma mesa livre. Se `EM_LIMPEZA` sair do indice
# — ou se o fecho acontecer sem passar por ela — outra pessoa senta-se numa mesa
# por limpar, e o ecra da sala diz que estava tudo bem.
plantar <<'PYLIMP' || true
import io
p = 'packages/db/src/sala.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  await db.tableSession.update({ where: { id: sessaoId }, data: { estado: 'EM_LIMPEZA' } });"
assert antigo in s, 'a limpeza nao esta onde se esperava'
novo = ("  await db.tableSession.update({ where: { id: sessaoId },\n"
        "    data: { estado: 'FECHADA', fechadaEm: new Date(), fechadaPor: actor.email } });")
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYLIMP
exigir_vermelho "caiu a asserção da mesa ocupada durante a limpeza" \
  'a LIMPEZA não liberta a mesa' /tmp/bossaos-sala-limpeza.txt
cp "$ORIG_SALA" "$SALA"

echo
echo "10. CONTROLO NEGATIVO — o responsável deixa de ser verificado"
# A pertenca de outro inquilino nao aparece dentro do escopo; sem a verificacao,
# o `update` aceitaria um identificador vindo do formulario e a mesa passava a
# responder a alguem que nao e da casa.
plantar <<'PYRESP' || true
import io
p = 'packages/db/src/sala.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (!pertenca) return { ok: false, motivo: 'pessoa_desconhecida' };"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  void pertenca;"))
PYRESP
exigir_vermelho "caiu a asserção da pertença alheia" \
  'uma pessoa que não é da casa não entra' /tmp/bossaos-sala-responsavel.txt
cp "$ORIG_SALA" "$SALA"

echo
echo "11. Reposto — tem de voltar ao verde"
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1
if correr /tmp/bossaos-sala-reposto.txt; then
  if ! leitura=$(analisar /tmp/bossaos-sala-reposto.txt); then
    vermelho "reposto mas o relatório não é legível"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "reposto com contagem diferente: $grupos grupos, $casos casos"
  else
    verde "reposto: $grupos grupos, $casos casos"
  fi
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-sala-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit "$falhas"

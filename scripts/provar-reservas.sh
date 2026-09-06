#!/usr/bin/env bash
#
# E18 — reservas e capacidade concorrente.
#
# ── O que este script tem de provar ────────────────────────────────────────
#
# O contrato manda um controlo negativo com todas as letras: *«desligar o lock e
# ver o teste de concorrência ficar vermelho. Um teste que passa com e sem o lock
# está a testar que a base de dados responde.»*
#
# Medi, e a resposta é mais interessante do que a instrução. Com o lock desligado
# e o isolamento em `serializable`, o teste continua VERDE — e com razão: o SSI
# apanha o mesmo desvio de escrita e o retry transforma o aborto numa resposta de
# negócio. São DUAS propriedades colapsadas numa, e o controlo escrito à letra
# não distinguia qual estava a segurar.
#
#   | 8 corridas, 2 hosts   | com lock | sem lock |
#   | serializable          | 1 aceite | 1 aceite |
#   | read committed        | 1 aceite | 2 ACEITES |
#
# Por isso o controlo aqui desliga a SERIALIZAÇÃO INTEIRA — lock e isolamento —
# e é isso que fica vermelho. E o mesmo cenário tem de forçar mesas DIFERENTES:
# a primeira versão que escrevi punha as duas transacções a escolher a mesma
# mesa, e quem as separava era a exclusão da base, não a contagem. Não havia
# desvio de escrita nenhum para medir.
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

GRUPOS_ESPERADOS=12
CASOS_ESPERADOS=37
falhas=0

RESERVAS=packages/db/src/reservas.ts
PURO=packages/domain/src/reservas.ts
ESCOPO=packages/db/src/escopo.ts
ORIG_RESERVAS=$(mktemp); ORIG_PURO=$(mktemp); ORIG_ESCOPO=$(mktemp)
cp "$RESERVAS" "$ORIG_RESERVAS"; cp "$PURO" "$ORIG_PURO"; cp "$ESCOPO" "$ORIG_ESCOPO"
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

# ── Repor a exclusão SEMPRE ───────────────────────────────────────────────
#
# Um script morto a meio deixaria a base sem `uma_mesa_um_intervalo` — e a mesma
# mesa passava a poder ser vendida duas vezes, em silêncio, até alguém reparar.
# É a garantia mais forte desta etapa e é a que este script tira de propósito.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "reservation_allocations" DROP CONSTRAINT IF EXISTS "uma_mesa_um_intervalo";
ALTER TABLE "reservation_allocations"
  ADD CONSTRAINT "uma_mesa_um_intervalo"
  EXCLUDE USING gist ("table_id" WITH =, tstzrange("inicio", "fim", '[)') WITH &&);
PSQL
}

restaurar() {
  cp "$ORIG_RESERVAS" "$RESERVAS"; cp "$ORIG_PURO" "$PURO"; cp "$ORIG_ESCOPO" "$ESCOPO"
  rm -f "$ORIG_RESERVAS" "$ORIG_PURO" "$ORIG_ESCOPO"
  if [[ "$BASE_MEXIDA" == "1" ]]; then
    repor_base; BASE_MEXIDA=0
    printf '  (a exclusão da base foi reposta)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/reservas.test.ts >"$1" 2>&1
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
if correr /tmp/bossaos-reservas-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-reservas-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $casos casos (esperados $CASOS_ESPERADOS)"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos"
else
  vermelho "a prova de base falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-reservas-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO OBRIGATÓRIO — a SERIALIZAÇÃO desaparece"
# ── O do contrato, na forma que a medição mostrou ser a certa ─────────────
#
# O lock E o isolamento, os dois. Com só o lock desligado o teste fica verde
# porque o `serializable` apanha o mesmo desvio — e o controlo estaria a
# confirmar que a base responde, que é precisamente o que o contrato proíbe.
#
# O que TEM de cair é a contagem da zona. O caso da mesma mesa **não** pode cair:
# quem o segura é a exclusão, e se caísse este controlo estaria a medir «alguma
# coisa parou» em vez do desvio de escrita.
plantar <<'PYSERIAL' || true
import io
p = 'packages/db/src/escopo.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    if (comLock) {\n      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${chaveDeSerializacao}))`;\n    }"
assert antigo in s, 'o lock nao esta onde se esperava'
s = s.replace(antigo, "    // sem lock")
antigo2 = "  }, { isolationLevel: 'Serializable' });"
assert antigo2 in s, 'o isolamento nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo2, "  });"))
PYSERIAL
exigir_vermelho "caiu a contagem: sem serialização, a zona vendeu-se duas vezes" \
  'a última capacidade da ZONA' /tmp/bossaos-reservas-serial.txt \
  'a MESMA mesa: uma aceite'
cp "$ORIG_ESCOPO" "$ESCOPO"

echo
echo "3. CONTROLO NEGATIVO — a EXCLUSÃO da base desaparece"
# A outra metade do par. A exclusão é o que impede a mesma mesa duas vezes, e
# nenhuma quantidade de lock a substitui: duas transacções que escolhem a mesma
# mesa e correm em série continuam a poder escrevê-la, se a base deixar.
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
ALTER TABLE "reservation_allocations" DROP CONSTRAINT IF EXISTS "uma_mesa_um_intervalo";
PSQL
exigir_vermelho "caiu a mesa: sem a exclusão, a mesma mesa aceitou duas reservas" \
  'a BASE recusa duas alocações sobrepostas' /tmp/bossaos-reservas-exclusao.txt \
  'a BASE aceita duas alocações que ENCOSTAM'
repor_base; BASE_MEXIDA=0

echo
echo "4. CONTROLO NEGATIVO — o limite semiaberto passa a FECHADO"
# `<` para `<=`: um caractere. É a origem clássica da mesa vendida duas vezes na
# direcção contrária — o turno das 21h recusado a noite inteira.
plantar <<'PYLIMITE' || true
import io
p = 'packages/domain/src/reservas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return a.inicio.getTime() < b.fim.getTime() && b.inicio.getTime() < a.fim.getTime();"
assert antigo in s, 'a conta do limite nao esta onde se esperava'
novo = "  return a.inicio.getTime() <= b.fim.getTime() && b.inicio.getTime() <= a.fim.getTime();"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYLIMITE
exigir_vermelho "caiu o limite: encostar passou a ser sobrepor" \
  'não se sobrepõem' /tmp/bossaos-reservas-limite.txt
cp "$ORIG_PURO" "$PURO"

echo
echo "5. CONTROLO NEGATIVO — o buffer é aplicado DEPOIS da conta"
# «Aplicá-lo depois da verificação é o mesmo que não o ter.» Aqui deixa de entrar
# no intervalo efectivo — e o intervalo guardado na alocação fica sem ele.
plantar <<'PYBUFFER' || true
import io
p = 'packages/domain/src/reservas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    fim: new Date(inicio.getTime() + (duracaoMin + bufferMin) * 60_000),"
assert antigo in s, 'o intervalo efectivo nao esta onde se esperava'
novo = "    fim: new Date(inicio.getTime() + duracaoMin * 60_000),"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYBUFFER
exigir_vermelho "caiu o buffer: a mesa aceitou quem encosta dentro dele" \
  'buffer' /tmp/bossaos-reservas-buffer.txt
cp "$ORIG_PURO" "$PURO"

echo
echo "6. CONTROLO NEGATIVO — a combinação passa a ter recurso PRÓPRIO"
# O erro cuja soma bate certo: a combinação 3+4 deixa de ocupar as componentes e
# passa a ser um recurso à parte. Nada dá erro, o relatório fecha, e às 21h estão
# duas famílias à porta.
plantar <<'PYCOMBI' || true
import io
p = 'packages/domain/src/reservas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    .map((c) => [...c.membros]);"
assert antigo in s, 'a expansao da combinacao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    .map((c) => [c.id]);"))
PYCOMBI
exigir_vermelho "caiu a combinação: a mesma capacidade foi vendida duas vezes" \
  'componentes|3\+4' /tmp/bossaos-reservas-combi.txt
cp "$ORIG_PURO" "$PURO"

echo
echo "7. CONTROLO NEGATIVO — a retenção passa a expirar por EVENTO"
# «Se a capacidade só é libertada quando alguém abre o ecrã, uma retenção
# esquecida bloqueia uma mesa a noite inteira.» A ocupação deixa de olhar para o
# relógio e passa a acreditar no estado — que é exactamente o desenho proibido.
plantar <<'PYRETENCAO' || true
import io
p = 'packages/db/src/reservas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "       AND w.oferta_expira_em > now()\n"
assert antigo in s, 'a comparacao com o relogio nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, ""))
PYRETENCAO
exigir_vermelho "caiu o relógio: a retenção expirada continuou a prender a mesa" \
  'SEM ninguém abrir ecrã' /tmp/bossaos-reservas-retencao.txt
cp "$ORIG_RESERVAS" "$RESERVAS"

echo
echo "8. CONTROLO NEGATIVO — reagendar LARGA primeiro e tenta depois"
# «Não se larga a antiga antes de a nova estar garantida.» Aqui, quando não há
# capacidade, a função devolve em vez de rebentar — e o COMMIT leva o
# `deleteMany` consigo. A reserva sobrevive sem mesa nenhuma, que é a versão
# silenciosa do defeito.
plantar <<'PYREAGENDA' || true
import io
p = 'packages/db/src/reservas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "            throw new SemCapacidadeParaReagendar();"
assert antigo in s, 'o rebentar de proposito nao esta onde se esperava'
novo = "            return { ok: false, motivo: 'SEM_MESA' as const, alternativas: [], anteriorIntacta: true };"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYREAGENDA
exigir_vermelho "caiu o reagendamento: a reserva anterior ficou sem mesa" \
  'anterior sobrevive|intacta|sem mesa' /tmp/bossaos-reservas-reagenda.txt
cp "$ORIG_RESERVAS" "$RESERVAS"

echo
echo "9. CONTROLO NEGATIVO — a chave idempotente deixa de ser lida"
# «Sem chave, o retry é a segunda reserva.» O cliente fica com duas mesas.
plantar <<'PYCHAVE' || true
import io
p = 'packages/db/src/reservas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (jaFeita) {"
assert antigo in s, 'a leitura da chave nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  if (false && jaFeita) {", 1))
PYCHAVE
exigir_vermelho "caiu a idempotência: a repetição criou uma reserva nova" \
  'mesma chave duas vezes' /tmp/bossaos-reservas-chave.txt
cp "$ORIG_RESERVAS" "$RESERVAS"

echo
echo "10. CONTROLO NEGATIVO — o walk-in deixa de ocupar a mesa"
# «Walk-ins usam as mesmas alocações.» Sem esta fonte, a sala cheia aparece vazia
# a quem atende o telefone — e a mesa é prometida a alguém que já lá tem gente.
plantar <<'PYSALA' || true
import io
p = 'packages/db/src/reservas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "       AND s.estado = 'ABERTA'\n"
assert antigo in s, 'a leitura das sessoes de sala nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "       AND s.estado = 'FECHADA'\n"))
PYSALA
exigir_vermelho "caiu a sala: a mesa ocupada apareceu livre" \
  'walk-in|sessão de mesa ABERTA' /tmp/bossaos-reservas-sala.txt
cp "$ORIG_RESERVAS" "$RESERVAS"

echo
echo "11. CONTROLO NEGATIVO — a soma da zona conta por ALOCAÇÃO"
# O grupo de oito numa combinação passa a contar dezasseis, e a zona parece cheia
# com metade da gente. O erro que fecha as reservas de uma noite inteira sem
# nunca dar erro.
plantar <<'PYSOMA' || true
import io
p = 'packages/db/src/reservas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      SELECT DISTINCT r.id, r.pessoas"
assert antigo in s, 'a soma por reserva distinta nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "      SELECT r.id, r.pessoas"))
PYSOMA
exigir_vermelho "caiu a soma: a combinação passou a contar o grupo duas vezes" \
  'conta uma vez, não uma por mesa' /tmp/bossaos-reservas-soma.txt
cp "$ORIG_RESERVAS" "$RESERVAS"

echo
echo "12. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-reservas-reposto.txt; then
  read -r grupos casos <<<"$(analisar /tmp/bossaos-reservas-reposto.txt)"
  if (( casos != CASOS_ESPERADOS )); then
    vermelho "reposto mas com $casos casos (esperados $CASOS_ESPERADOS)"
  else
    verde "reposto: $grupos grupos, $casos casos"
  fi
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '^ *not ok' /tmp/bossaos-reservas-reposto.txt | head -5
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "0 falhas"
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))

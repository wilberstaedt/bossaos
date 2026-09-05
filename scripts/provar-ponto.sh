#!/usr/bin/env bash
#
# E28 fatia 1 — equipa, escalas e ponto.
#
# O controlo que a régua pede por nome é o 2: tirar a imutabilidade e ver se a
# prova acende. Se um encarregado puder reescrever a hora de entrada de alguém
# sem deixar marca, o registo não vale nada — nem para a casa, nem em tribunal.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

PONTO=packages/db/src/ponto.ts
PROVA=provas/ponto.test.ts
MIGRACAO=packages/db/prisma/migrations/20260913900000_e28_equipa_e_ponto/migration.sql
FICHEIROS=("$PONTO" "$PROVA")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# Repor os gatilhos da migração, e falhar ALTO se não repuser. O `2>/dev/null`
# que engoliu o erro do extractor no E26 custou uma base sem gatilho.
repor_sql() {
  local sql
  sql=$(python3 scripts/extrair-sql.py "$MIGRACAO" 'CREATE OR REPLACE FUNCTION|CREATE TRIGGER') || {
    vermelho "não consegui extrair os gatilhos da migração"; return 1; }
  if [[ -z "$sql" ]]; then vermelho "o extractor devolveu VAZIO — nada foi reposto"; return 1; fi
  psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 <<<"
    DROP TRIGGER IF EXISTS \"marcacoes_sao_imutaveis\" ON \"time_entries\";
    DROP TRIGGER IF EXISTS \"correccao_mantem_o_sentido\" ON \"time_entries\";
    $sql" >/dev/null
}

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  repor_sql
  repor_check
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

# ── Repor a restrição: por FICHEIRO, e a limpar o que o controlo deixou ────
#
# Duas coisas correram mal aqui, e as duas em silêncio.
#
# A primeira: pus a restrição num `psql -c` com quatro níveis de aspas para
# chegar ao `''` do SQL. Saiu malformada, não voltou, e o guião seguiu a medir
# uma base sem ela — três controlos vermelhos pela mesma razão invisível.
#
# A segunda: com a restrição desligada, o caso que a testa consegue inserir a
# linha que ela existe para recusar. Repor sem limpar falha com «is violated by
# some row».
repor_check() {
  psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 <<'FIMSQL' || {
ALTER TABLE "time_entries" DROP CONSTRAINT IF EXISTS "correccao_exige_motivo";
ALTER TABLE "time_entries" DISABLE TRIGGER USER;
DELETE FROM "time_entries"
 WHERE "corrige_id" IS NOT NULL AND length(btrim(COALESCE("motivo", ''))) = 0;
ALTER TABLE "time_entries" ENABLE TRIGGER USER;
ALTER TABLE "time_entries" ADD CONSTRAINT "correccao_exige_motivo" CHECK
  ("corrige_id" IS NULL OR length(btrim(COALESCE("motivo", ''))) > 0);
FIMSQL
    vermelho "a restrição não voltou — o resto da corrida mede uma base sem ela"
    return 1
  }
}

correr() { node --experimental-strip-types --test provas/ponto.test.ts >"$1" 2>&1; }

plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

exigir_vermelho() {
  local nome="$1" caso="$2" erro="$3" ficheiro="$4"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  if grep -qE 'SyntaxError|Cannot find|ERR_MODULE' <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO CARREGA — é um ficheiro partido"
    grep -E 'SyntaxError|Cannot find' <<<"$limpo" | head -2; return
  fi
  if ! grep -qE '^# fail [1-9]' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qE "not ok .*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E '^ +not ok' <<<"$limpo" | head -4; return
  fi
  if [[ -n "$erro" ]] && ! grep -qF "$erro" <<<"$limpo"; then
    vermelho "$nome: o caso certo caiu pela mensagem errada"
    grep -E "error: " <<<"$limpo" | head -3; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-ponto-ligado.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-ponto-ligado.txt | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "o motor não está verde com tudo ligado"
  grep -E "^ +not ok|error: " /tmp/bossaos-ponto-ligado.txt | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a marcação deixa de ser IMUTÁVEL"
# ── O que a régua pede por nome ───────────────────────────────────────────
#
# Sem este gatilho, um encarregado reescreve a hora de entrada de alguém e não
# fica marca nenhuma. O registo deixa de valer — nem para a casa, nem em
# tribunal — e quem perde é quem tem menos poder para o contestar.
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP TRIGGER IF EXISTS "marcacoes_sao_imutaveis" ON "time_entries";' >/dev/null 2>&1
correr /tmp/bossaos-ponto-imutavel.txt
exigir_vermelho "caiu a imutabilidade: a hora de entrada passou a reescrever-se sem marca" \
  'apagar uma marcação FALHA na base' '' /tmp/bossaos-ponto-imutavel.txt
repor_sql

echo
echo "3. CONTROLO NEGATIVO — cai o CHECK que exige motivo na correcção"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'ALTER TABLE "time_entries" DROP CONSTRAINT "correccao_exige_motivo";' >/dev/null 2>&1
correr /tmp/bossaos-ponto-motivo.txt
exigir_vermelho "caiu o motivo: corrige-se o salário de alguém sem dizer porquê" \
  'SEM motivo é recusada' '' /tmp/bossaos-ponto-motivo.txt
repor_check

echo
echo "4. CONTROLO NEGATIVO — cai o gatilho que impede a correcção de trocar a pessoa"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP TRIGGER IF EXISTS "correccao_mantem_o_sentido" ON "time_entries";' >/dev/null 2>&1
correr /tmp/bossaos-ponto-sentido.txt
exigir_vermelho "caiu o sentido: o rasto passou a documentar o que nunca aconteceu" \
  'troca a pessoa é recusada pela base' '' /tmp/bossaos-ponto-sentido.txt
repor_sql

echo
echo "5. CONTROLO NEGATIVO — o dia de serviço passa a ser o dia CIVIL"
plantar <<'PYDIA' || true
import io
p = 'packages/db/src/ponto.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const recuado = new Date(momento.getTime() - corteMinutos * 60_000);"
assert antigo in s, 'o recuo do corte nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "  const recuado = new Date(momento.getTime());", 1))
PYDIA
correr /tmp/bossaos-ponto-dia.txt
exigir_vermelho "caiu a fronteira: o turno da sexta foi cortado ao meio pela meia-noite" \
  'trabalhou na SEXTA' 'cortado ao meio pela data civil' /tmp/bossaos-ponto-dia.txt
cp "${COPIAS[0]}" "$PONTO"

echo
echo "6. CONTROLO NEGATIVO — o fuso passa a ser um deslocamento FIXO"
plantar <<'PYFUSO' || true
import io
p = 'packages/db/src/ponto.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(recuado);"""
assert antigo in s, 'a conversao do dia nao esta onde se esperava'
# Um deslocamento fixo de +2h: certo no Verao, errado no Inverno. E' o defeito
# que so' aparece em metade do ano.
novo = """  const fixo = new Date(recuado.getTime() + 2 * 60 * 60 * 1000);
  void fuso;
  return fixo.toISOString().slice(0, 10);"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYFUSO
correr /tmp/bossaos-ponto-fuso.txt
exigir_vermelho "caiu o fuso: um deslocamento fixo dá o dia errado em metade do ano" \
  'hora de VERÃO muda o dia de serviço' '' /tmp/bossaos-ponto-fuso.txt
cp "${COPIAS[0]}" "$PONTO"

echo
echo "7. CONTROLO NEGATIVO — a autocorrecção deixa de se distinguir"
plantar <<'PYAUTO' || true
import io
p = 'packages/db/src/ponto.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    autocorreccao: l.corrigeId !== null && l.autorMembershipId === l.membershipId,"
assert antigo in s, 'a distincao da autocorreccao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    autocorreccao: false,", 1))
PYAUTO
correr /tmp/bossaos-ponto-auto.txt
exigir_vermelho "caiu a distinção: quem se corrige a si mesmo passou por corrigido por terceiro" \
  'corrigida pela própria pessoa, É autocorrecção' \
  'passou por correcção de terceiro' /tmp/bossaos-ponto-auto.txt
cp "${COPIAS[0]}" "$PONTO"

echo
echo "8. CONTROLO NEGATIVO — a marcação corrigida VOLTA a contar"
plantar <<'PYCONTA' || true
import io
p = 'packages/db/src/ponto.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const valem = todas.filter((m) => !m.corrigida);"
assert antigo in s, 'o filtro das marcacoes que valem nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  const valem = todas;", 1))
PYCONTA
correr /tmp/bossaos-ponto-conta.txt
exigir_vermelho "caiu a conta: a hora errada e a corrigida passaram a contar as duas" \
  'CORRIGIDA não conta' 'continuou a contar' /tmp/bossaos-ponto-conta.txt
cp "${COPIAS[0]}" "$PONTO"

echo
echo "9. CONTROLO NEGATIVO — a jornada aberta passa por jornada fechada"
plantar <<'PYABERTA' || true
import io
p = 'packages/db/src/ponto.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    aberta: entradas.length > saidas.length,"
assert antigo in s, 'a marca da jornada aberta nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    aberta: false,", 1))
PYABERTA
correr /tmp/bossaos-ponto-aberta.txt
exigir_vermelho "caiu o esquecimento: quem não picou a saída ficou com jornada de zero" \
  'jornada ABERTA, e não de zero' \
  'passou por jornada fechada' /tmp/bossaos-ponto-aberta.txt
cp "${COPIAS[0]}" "$PONTO"

echo
echo "10. CONTROLO NEGATIVO — sem escala, o produto INVENTA uma diferença"
plantar <<'PYSEMESCALA' || true
import io
p = 'packages/db/src/ponto.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    diferencaMinutos: previsto === null ? null : real - previsto,"
assert antigo in s, 'a diferenca nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "    diferencaMinutos: real - (previsto ?? 0),", 1))
PYSEMESCALA
correr /tmp/bossaos-ponto-inventa.txt
exigir_vermelho "caiu a ausência: sem turno previsto nasceu uma diferença contra o trabalhador" \
  'não há diferença NENHUMA' 'inventou uma diferença' /tmp/bossaos-ponto-inventa.txt
cp "${COPIAS[0]}" "$PONTO"

echo
echo "11. CONTROLO NEGATIVO — o PAR de quem picou no previsto sai da prova"
plantar <<'PYPAR' || true
import io
p = 'provas/ponto.test.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    assert.equal(j.diferencaMinutos, 0);
  });"""
assert antigo in s, 'o par do previsto nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, """    assert.equal(j.diferencaMinutos, 1, 'PLANTE');
  });""", 1))
PYPAR
correr /tmp/bossaos-ponto-par.txt
# Sem este par, «marca sempre divergencia» passava o caso dos dois numeros — e
# quem picou exactamente no previsto aparecia a dever tempo a' casa.
exigir_vermelho "caiu o par: «diverge sempre» passava o caso dos dois números" \
  'picou no previsto não gera divergência' 'PLANTE' /tmp/bossaos-ponto-par.txt
cp "${COPIAS[1]}" "$PROVA"

echo
echo "12. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-ponto-reposto.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-ponto-reposto.txt | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E "^ +not ok|error: " /tmp/bossaos-ponto-reposto.txt | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

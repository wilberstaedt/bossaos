#!/usr/bin/env bash
#
# E12 — cores públicas e mudanças de plano.
#
# A régua está em `docs/reviews/ALVO-E12.md`. Esta prova mede as três coisas que
# o E12 tem de mostrar AO MESMO TEMPO — o Restaurant/Pro muda a cor, o Starter
# não consegue e é o SERVIDOR a recusar, e o que não é personalizável continua a
# não ser — mais as três promessas da descida, que falham por caminhos
# diferentes.
#
# Seis defeitos plantados, um de cada vez. Cada um tem de fazer cair a asserção
# QUE MEDE ESSA COISA e não outra: um controlo que faz cair tudo não distingue
# nada, e um que faz cair a asserção errada mede outra coisa qualquer.
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

GRUPOS_ESPERADOS=7
CASOS_ESPERADOS=29
falhas=0

TEMA_DB=packages/db/src/tema.ts
TEMA_UI=packages/ui/src/tema.ts
SQL_AGENDAR=packages/db/prisma/migrations/20260904200000_e12_agendar_descida_no_fuso/migration.sql
ORIG_DB=$(mktemp); ORIG_UI=$(mktemp)
cp "$TEMA_DB" "$ORIG_DB"; cp "$TEMA_UI" "$ORIG_UI"
FUNCAO_ABERTA=0
PRIVILEGIO_ABERTO=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# Repor SEMPRE. Um script morto a meio deixaria o runtime com privilégio de
# APAGAR revisões de tema — e isso sobrevive a um commit distraído.
restaurar() {
  cp "$ORIG_DB" "$TEMA_DB"; cp "$ORIG_UI" "$TEMA_UI"
  rm -f "$ORIG_DB" "$ORIG_UI"
  if [[ "$FUNCAO_ABERTA" == "1" ]]; then
    psql "$MIGRATION_DATABASE_URL" -q -f "$SQL_AGENDAR" >/dev/null 2>&1
    FUNCAO_ABERTA=0
    printf '  (a função de agendamento foi reposta)\n'
  fi
  if [[ "$PRIVILEGIO_ABERTO" == "1" ]]; then
    psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
REVOKE UPDATE, DELETE ON "theme_revisions" FROM bossaos_app;
GRANT  UPDATE ("activa") ON "theme_revisions" TO bossaos_app;
PSQL
    PRIVILEGIO_ABERTO=0
    printf '  (o privilégio de APAGAR revisões foi retirado outra vez)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/tema.test.ts >"$1" 2>&1
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
if correr /tmp/bossaos-tema-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-tema-ligado.txt); then
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
  grep -E '^ *not ok|error:' /tmp/bossaos-tema-ligado.txt | head -12
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o portão do plano desaparece do rascunho"
# É o defeito que a régua manda provar: «o Starter não consegue, e não é um ecrã
# escondido, é o servidor a recusar». Sem o portão, o Starter passa a gravar — e
# se as recusas NÃO ficarem verdes com ele desligado, o que estava a bloquear era
# outra coisa e o teste do plano nunca existiu.
python3 - <<'PY'
import io
p = 'packages/db/src/tema.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const capacidade = podeCapacidade(estado, { capacidade: CAPACIDADE_DO_TEMA, intencao: 'usar' });
  if (!capacidade.permitido) return { ok: false, motivo: 'plano', capacidade };

  // Chaves que não são temáveis saem antes de tudo."""
assert antigo in s, 'o portão do plano do rascunho não está onde se esperava'
s = s.replace(antigo, """  const capacidade = podeCapacidade(estado, { capacidade: CAPACIDADE_DO_TEMA, intencao: 'usar' });
  void capacidade;

  // Chaves que não são temáveis saem antes de tudo.""")
io.open(p, 'w', encoding='utf-8').write(s)
PY
exigir_vermelho "caiu a recusa por plano ao guardar" \
  'guardar o rascunho é recusado por PLANO' /tmp/bossaos-tema-sem-plano.txt
cp "$ORIG_DB" "$TEMA_DB"

echo
echo "3. CONTROLO NEGATIVO — o contraste deixa de bloquear"
# «Publicar cor ilegível falha NO SERVIDOR. No cliente é conveniência; no
# servidor é a regra.» Com a validação desligada, o par ilegível tem de passar —
# e a asserção que cai tem de ser a do contraste, não a do plano.
python3 - <<'PY'
import io
p = 'packages/db/src/tema.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const validacao = validarTema(entrada as Partial<TemaPublico>);
  if (!validacao.aprovado) return { ok: false, motivo: 'contraste', validacao };"""
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, """  const validacao = validarTema(entrada as Partial<TemaPublico>);
  void validacao;"""))
PY
exigir_vermelho "caiu a recusa por contraste" \
  'o Pro é recusado por contraste' /tmp/bossaos-tema-sem-contraste.txt
cp "$ORIG_DB" "$TEMA_DB"

echo
echo "4. CONTROLO NEGATIVO — os tokens não temáveis passam a ser aceites"
# «O que NÃO é personalizável continua a não ser, mesmo no plano de cima.» Um
# cliente que repinte um estado de erro quebra a leitura de um ecrã de operação.
python3 - <<'PY'
import io
p = 'packages/db/src/tema.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const intrusos = tokensNaoPermitidos(entrada);
  if (intrusos.length > 0) return { ok: false, motivo: 'token', tokens: intrusos };"""
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, """  const intrusos = tokensNaoPermitidos(entrada);
  void intrusos;"""))
PY
exigir_vermelho "caiu a recusa dos tokens não temáveis" \
  'tipografia, componentes e cores de estado são recusados' /tmp/bossaos-tema-tokens.txt
cp "$ORIG_DB" "$TEMA_DB"

echo
echo "5. CONTROLO NEGATIVO — a cor volta a ser escrita tal e qual no CSS"
# `red;--bo-foco:transparent` desligava o anel de foco do site inteiro sem
# ninguém escrever uma linha de CSS. É a regra «não injecte CSS recebido do
# cliente», e a última porta é `variaveisDoTema`.
python3 - <<'PY'
import io
p = 'packages/ui/src/tema.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const seguro = (valor: string, alternativa: string) => normalizarCor(valor) ?? alternativa;"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo,
  "  const seguro = (valor: string, alternativa: string) => { void alternativa; return valor; };"))
PY
exigir_vermelho "caiu a asserção do CSS injectado" \
  'CSS injectado numa cor não passa' /tmp/bossaos-tema-css.txt
cp "$ORIG_UI" "$TEMA_UI"

echo
echo "6. CONTROLO NEGATIVO — a descida volta a agendar à meia-noite UTC"
# Era o que o `plataforma.mjs` fazia. A oeste de Greenwich a data escrita cai no
# DIA ANTERIOR, e o restaurante perde as cores um dia antes do que lhe foi dito.
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
CREATE OR REPLACE FUNCTION agendar_descida(
  p_organization_id uuid, p_codigo text, p_data date, p_location_id uuid
) RETURNS text LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v_plano uuid; v_linhas integer;
BEGIN
  SELECT id INTO v_plano FROM public.plan_definitions WHERE codigo = p_codigo;
  IF NOT FOUND THEN RETURN 'plano_desconhecido'; END IF;
  UPDATE public.subscriptions
     SET descer_para_plano_id = v_plano, descer_em = p_data::timestamptz, updated_at = now()
   WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_linhas = ROW_COUNT;
  IF v_linhas = 0 THEN RETURN 'sem_subscricao'; END IF;
  RETURN 'agendada';
END; $$;
PSQL
FUNCAO_ABERTA=1
exigir_vermelho "caiu a asserção do fuso da unidade" \
  'a mesma data escrita dá instantes DIFERENTES' /tmp/bossaos-tema-fuso.txt
psql "$MIGRATION_DATABASE_URL" -q -f "$SQL_AGENDAR" >/dev/null 2>&1
FUNCAO_ABERTA=0

echo
echo "7. CONTROLO NEGATIVO — o runtime volta a poder APAGAR revisões"
# É o par que separa REVERTER de APAGAR. A régua: «uma implementação que
# APAGASSE o tema no downgrade passaria as duas primeiras promessas e falharia a
# terceira». Com o privilégio de volta, a promessa deixa de ser estrutural.
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
GRANT UPDATE, DELETE ON "theme_revisions" TO bossaos_app;
PSQL
PRIVILEGIO_ABERTO=1
exigir_vermelho "caiu a asserção da imutabilidade das revisões" \
  'A BASE recusa apagar uma revisão publicada' /tmp/bossaos-tema-apagar.txt
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
REVOKE UPDATE, DELETE ON "theme_revisions" FROM bossaos_app;
GRANT  UPDATE ("activa") ON "theme_revisions" TO bossaos_app;
PSQL
PRIVILEGIO_ABERTO=0

echo
echo "8. Reposto — tem de voltar ao verde"
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1
if correr /tmp/bossaos-tema-reposto.txt; then
  if ! leitura=$(analisar /tmp/bossaos-tema-reposto.txt); then
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
  grep -E '^ *not ok' /tmp/bossaos-tema-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit "$falhas"

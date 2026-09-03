#!/usr/bin/env bash
#
# Descer de plano: o trabalho de fundo do E05.
#
# O alvo está em `docs/architecture/planos-e-limites.md`, escrito no E00. Corre
# com o papel REAL de runtime, contra a base, e mede quatro coisas que só se
# distinguem umas das outras se cada uma tiver o seu controlo negativo:
#
#   1. o par entre superfícies — o que a rota recusa, o job recusa;
#   2. a descida agendada, com o tema revertido e o anterior preservado;
#   3. não efectivar por cima de operações abertas;
#   4. as duas portas `SECURITY DEFINER`, e os limites delas.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

# A versão do Node, verificada à cabeça. A razão está por extenso em
# `provar-isolamento.sh`: o formato do relatório muda com a versão, e uma
# contagem que não encontra o formato que espera conta zero.
NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
NODE_ACTUAL="$(node --version)"
if [[ "$NODE_ACTUAL" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO); em uso $NODE_ACTUAL." >&2
  exit 2
fi

GRUPOS_ESPERADOS=4
ASSERCOES_ESPERADAS=14
falhas=0
PLANOS=packages/db/src/planos.ts
DESCIDAS=packages/db/src/descidas.ts
SQL_APLICAR=packages/db/prisma/migrations/20260903180000_e05_descida_agendada/migration.sql
ORIG_PLANOS=$(mktemp); ORIG_DESCIDAS=$(mktemp)
cp "$PLANOS" "$ORIG_PLANOS"; cp "$DESCIDAS" "$ORIG_DESCIDAS"
FUNCAO_ABERTA=0

verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# Repor SEMPRE. Um script morto a meio deixaria a verificação de inquilino
# DESLIGADA dentro da função da base — e isso sobrevive a um commit distraído.
restaurar() {
  cp "$ORIG_PLANOS" "$PLANOS"; cp "$ORIG_DESCIDAS" "$DESCIDAS"
  rm -f "$ORIG_PLANOS" "$ORIG_DESCIDAS"
  if [[ "$FUNCAO_ABERTA" == "1" ]]; then
    psql "$MIGRATION_DATABASE_URL" -q -f "$SQL_APLICAR" >/dev/null 2>&1
    FUNCAO_ABERTA=0
    printf '  (a função da base foi reposta)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/descidas.test.ts >"$1" 2>&1
}

analisar() {
  local f="$1" grupos assercoes
  grep -q '^TAP version' "$f" || return 2
  grep -qE '^# (pass|fail) [0-9]+' "$f" || return 2
  grupos=$(grep -c '^ok ' "$f" || true)
  assercoes=$(grep -m1 -oE '^# pass [0-9]+' "$f" | grep -oE '[0-9]+' || true)
  [[ -n "$assercoes" ]] || return 2
  echo "$grupos $assercoes"
}

# Exige vermelho, E que caia a asserção certa. Vermelho por outro motivo — um
# erro de sintaxe no que se acabou de plantar — lê-se aqui exactamente igual.
exigir_vermelho() {
  local nome="$1" marcador="$2" ficheiro="$3"
  if correr "$ficheiro"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"
    return
  fi
  if grep -q "$marcador" "$ficheiro"; then
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
if correr /tmp/bossaos-descidas-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-descidas-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos assercoes <<<"$leitura"
  if (( grupos == 0 )) || (( assercoes == 0 )); then
    vermelho "VERDE COM ZERO MEDIDO: $grupos grupos, $assercoes asserções."; exit 1
  fi
  if (( grupos != GRUPOS_ESPERADOS )) || (( assercoes != ASSERCOES_ESPERADAS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $assercoes asserções (esperadas $ASSERCOES_ESPERADAS)"; exit 1
  fi
  verde "$grupos grupos verdes, $assercoes asserções"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-descidas-ligado.txt | head -12
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — a flag volta a ser opcional"
# Este é o defeito REAL que esta prova apanhou ao ser escrita: a flag só era
# consultada se quem chamasse se lembrasse de a passar, e nenhum sítio se
# lembrava. Plantá-lo de volta tem de fazer cair a asserção da flag, e SÓ ela —
# se caísse o par da quota também, o que se estava a medir era o plano.
python3 - <<'PY'
import io
p = 'packages/db/src/planos.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const nomeDaFlag = pedido.flag ?? pedido.capacidade;"""
assert antigo in s, 'a convenção de nome da flag não está onde se esperava'
s = s.replace(antigo, """  const nomeDaFlag = pedido.flag ?? '\\u0000nunca-casa';""")
io.open(p, 'w', encoding='utf-8').write(s)
PY
exigir_vermelho "caiu a asserção da flag, e é ela que mede o lançamento" \
  'flag DESLIGADA' /tmp/bossaos-descidas-sem-flag.txt
if grep -q 'not ok.*par da quota\|not ok.*quota' /tmp/bossaos-descidas-sem-flag.txt; then
  vermelho "caiu também a quota — o vermelho não vem da flag"
else
  verde "o resto continuou verde: caiu a camada da flag, não o plano"
fi
cp "$ORIG_PLANOS" "$PLANOS"

echo
echo "3. CONTROLO NEGATIVO — a descida deixa de consultar pendências"
# Sem isto, "adia por causa da caixa aberta" e "efectiva porque não há nada
# aberto" leem-se iguais: as duas acabariam a efectivar.
python3 - <<'PY'
import io
p = 'packages/db/src/descidas.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (pendencias.length > 0) return { aplicada: false, motivo: 'pendencias', pendencias };"
assert antigo in s
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  void pendencias;"))
PY
exigir_vermelho "caiu a asserção das pendências" \
  'com uma pendência registada' /tmp/bossaos-descidas-sem-pendencias.txt
cp "$ORIG_DESCIDAS" "$DESCIDAS"

echo
echo "4. CONTROLO NEGATIVO — a função da base sem a verificação de inquilino"
# `SECURITY DEFINER` corre como o dono das tabelas, para quem a política de
# linha do E03 não se aplica. É a verificação dentro da função que impede A de
# efectivar a descida de B — e uma função assim sem essa linha lê-se, de fora,
# exactamente como uma com ela.
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PY'
CREATE OR REPLACE FUNCTION aplicar_descida_agendada(p_org uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_destino uuid; v_quando timestamptz;
BEGIN
  SELECT descer_para_plano_id, descer_em INTO v_destino, v_quando
    FROM subscriptions WHERE organization_id = p_org;
  IF NOT FOUND THEN RETURN 'sem_subscricao'; END IF;
  IF v_destino IS NULL OR v_quando IS NULL THEN RETURN 'nada_agendado'; END IF;
  IF v_quando > now() THEN RETURN 'ainda_nao'; END IF;
  UPDATE subscriptions SET plan_id = v_destino, descer_para_plano_id = NULL,
         descer_em = NULL, updated_at = now() WHERE organization_id = p_org;
  RETURN 'aplicada';
END; $$;
PY
FUNCAO_ABERTA=1
exigir_vermelho "caiu a asserção do inquilino alheio" \
  'aplicar a descida de OUTRO inquilino' /tmp/bossaos-descidas-sem-inquilino.txt
psql "$MIGRATION_DATABASE_URL" -q -f "$SQL_APLICAR" >/dev/null 2>&1
FUNCAO_ABERTA=0

echo
echo "5. Reposto — tem de voltar ao verde"
node --experimental-strip-types packages/db/prisma/fixtures.ts >/dev/null 2>&1
if correr /tmp/bossaos-descidas-reposto.txt; then
  read -r grupos assercoes <<<"$(analisar /tmp/bossaos-descidas-reposto.txt)"
  verde "reposto: $grupos grupos, $assercoes asserções"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E '^ *not ok' /tmp/bossaos-descidas-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then
  printf '\033[32m%s\033[0m\n' "0 falhas"
else
  printf '\033[31m%s\033[0m\n' "$falhas falhas"
fi
exit $(( falhas > 0 ? 1 : 0 ))

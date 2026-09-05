#!/usr/bin/env bash
#
# E29 fatia 1 — financeiro e conciliação.
#
# O controlo que o contrato põe em primeiro lugar é o 6: colapsar as três datas
# e ver os dois relatórios passarem a CONCORDAR. É o único controlo desta etapa
# cujo sinal de avaria é dois números baterem certo — e é por isso que um
# sistema financeiro errado é tão difícil de ver: ele não parte, soma bem uma
# realidade que não existe.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

FIN=packages/db/src/financeiro.ts
PROVA=provas/financeiro.test.ts
MIGRACAO=packages/db/prisma/migrations/20260914900000_e29_financeiro_e_conciliacao/migration.sql
FICHEIROS=("$FIN" "$PROVA")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

repor_sql() {
  local sql
  sql=$(python3 scripts/extrair-sql.py "$MIGRACAO" 'CREATE OR REPLACE FUNCTION|CREATE TRIGGER') || {
    vermelho "não consegui extrair os gatilhos da migração"; return 1; }
  if [[ -z "$sql" ]]; then vermelho "o extractor devolveu VAZIO — nada foi reposto"; return 1; fi
  psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 <<FIMSQL >/dev/null
DROP TRIGGER IF EXISTS "periodo_fechado_nao_recebe" ON "financial_movements";
$sql
FIMSQL
}

repor_indice() {
  psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 >/dev/null <<'FIMSQL'
DELETE FROM bank_lines a USING bank_lines b
 WHERE a.ctid > b.ctid AND a.account_id = b.account_id AND a.data_valor = b.data_valor
   AND a.montante_menor = b.montante_menor AND a.ordem_no_dia = b.ordem_no_dia
   AND COALESCE(a.referencia,'') = COALESCE(b.referencia,'');
CREATE UNIQUE INDEX IF NOT EXISTS "uma_linha_por_impressao_digital" ON "bank_lines"
  ("account_id", "data_valor", "montante_menor", COALESCE("referencia", ''), "ordem_no_dia");
FIMSQL
}

repor_check() {
  psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 >/dev/null <<'FIMSQL'
ALTER TABLE "reconciliations" DROP CONSTRAINT IF EXISTS "confirmada_tem_autor_e_momento";
UPDATE "reconciliations" SET "estado" = 'SUGERIDA'
 WHERE "estado" = 'CONFIRMADA'
   AND (COALESCE("confirmada_por", '') = '' OR "confirmada_em" IS NULL);
ALTER TABLE "reconciliations" ADD CONSTRAINT "confirmada_tem_autor_e_momento" CHECK
  ("estado" <> 'CONFIRMADA'
   OR (length(btrim(COALESCE("confirmada_por", ''))) > 0 AND "confirmada_em" IS NOT NULL));
FIMSQL
}

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  repor_sql; repor_indice; repor_check
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { node --experimental-strip-types --test provas/financeiro.test.ts >"$1" 2>&1; }

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
if correr /tmp/bossaos-fin-ligado.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-fin-ligado.txt | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "o motor não está verde com tudo ligado"
  grep -E "^ +not ok|error: " /tmp/bossaos-fin-ligado.txt | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — cai o índice único da impressão digital"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP INDEX IF EXISTS "uma_linha_por_impressao_digital";' >/dev/null 2>&1
correr /tmp/bossaos-fin-indice.txt
exigir_vermelho "caiu a identidade: reimportar o extracto duplicou o dinheiro" \
  'a BASE recusa a impressão digital repetida' '' /tmp/bossaos-fin-indice.txt
repor_indice

echo
echo "3. CONTROLO NEGATIVO — a ordem no dia desaparece da identidade"
# ── É o par, e é o que separa uma defesa de um estrago ────────────────────
#
# Sem a ordem, as duas linhas legítimas iguais no mesmo dia passam a ser uma só:
# o detector de duplicados apaga um facto verdadeiro. E uma prova que só
# reimporta o ficheiro nunca descobre isto.
plantar <<'PYORDEM' || true
import io
p = 'packages/db/src/financeiro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    const ordem = (contador.get(chave) ?? 0) + 1;"
assert antigo in s, 'a ordem no dia nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "    const ordem = 1;", 1))
PYORDEM
correr /tmp/bossaos-fin-ordem.txt
exigir_vermelho "caiu o par: o detector de duplicados passou a apagar factos reais" \
  'iguais no mesmo dia ENTRAM as duas' \
  'foi apagada como duplicado' /tmp/bossaos-fin-ordem.txt
cp "${COPIAS[0]}" "$FIN"

echo
echo "4. CONTROLO NEGATIVO — a importação ignora em SILÊNCIO"
plantar <<'PYSILENCIO' || true
import io
p = 'packages/db/src/financeiro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """      jaVistas += 1;"""
assert antigo in s, 'a contagem das ja vistas nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "      jaVistas += 0;", 1))
PYSILENCIO
correr /tmp/bossaos-fin-silencio.txt
exigir_vermelho "caiu a contagem: ignorar 200 linhas ficou igual a não ler o ficheiro" \
  'diz quantas ignorou' 'não disse quantas' /tmp/bossaos-fin-silencio.txt
cp "${COPIAS[0]}" "$FIN"

echo
echo "5. CONTROLO NEGATIVO — a correspondência a 100 AUTO-CONFIRMA-SE"
plantar <<'PYAUTO' || true
import io
p = 'packages/db/src/financeiro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """      semelhanca: Math.max(0, Math.min(100, Math.round(dados.semelhanca))),
    },
  });"""
assert antigo in s, 'a sugestao nao esta onde se esperava'
novo = """      semelhanca: Math.max(0, Math.min(100, Math.round(dados.semelhanca))),
      ...(dados.semelhanca >= 100
        ? { estado: 'CONFIRMADA' as const, confirmadaPor: 'automatico',
            confirmadaEm: new Date() }
        : {}),
    },
  });"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYAUTO
correr /tmp/bossaos-fin-auto.txt
exigir_vermelho "caiu a confirmação: a semelhança perfeita passou a conciliar sozinha" \
  'a 100 continua SUGESTÃO' 'auto-confirmou' /tmp/bossaos-fin-auto.txt
cp "${COPIAS[0]}" "$FIN"

echo
echo "6. CONTROLO NEGATIVO — cai o CHECK que exige autor na confirmação"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'ALTER TABLE "reconciliations" DROP CONSTRAINT "confirmada_tem_autor_e_momento";' \
  >/dev/null 2>&1
correr /tmp/bossaos-fin-autor.txt
exigir_vermelho "caiu o autor: alguém conciliou e daqui a um ano ninguém sabe quem" \
  'sem autor é recusado' '' /tmp/bossaos-fin-autor.txt
repor_check

echo
echo "7. CONTROLO NEGATIVO — as TRÊS DATAS colapsam numa só"
# ── O controlo que o contrato põe em primeiro lugar ───────────────────────
#
# Quando os dois relatórios concordam, está errado. É o único sinal de avaria
# desta etapa que se parece com um sinal de saúde.
plantar <<'PYDATAS' || true
import io
p = 'packages/db/src/financeiro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """      valorEm: {
        gte: new Date(`${dados.de}T00:00:00Z`), lte: new Date(`${dados.ate}T00:00:00Z`),
      },"""
assert antigo in s, 'o filtro do caixa nao esta onde se esperava'
novo = """      ocorrenciaEm: {
        gte: new Date(`${dados.de}T00:00:00Z`), lte: new Date(`${dados.ate}T00:00:00Z`),
      },"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYDATAS
correr /tmp/bossaos-fin-datas.txt
exigir_vermelho "caíram as três datas: os dois relatórios passaram a CONCORDAR" \
  'DISCORDAM — e é isso que está certo' \
  'as três datas foram colapsadas' /tmp/bossaos-fin-datas.txt
cp "${COPIAS[0]}" "$FIN"

echo
echo "8. CONTROLO NEGATIVO — o total deixa de descer à transacção"
plantar <<'PYORIGEM' || true
import io
p = 'packages/db/src/financeiro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    origemTipo: l.origemTipo, origemId: l.origemId,
  }));
}

/** RESULTADO — pela ocorrência."""
assert antigo in s, 'a origem do caixa nao esta onde se esperava'
novo = """    origemTipo: null, origemId: null,
  }));
}

/** RESULTADO — pela ocorrência."""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYORIGEM
correr /tmp/bossaos-fin-origem.txt
exigir_vermelho "caiu a descida: o total virou uma opinião sem origem" \
  'chega-se à TRANSACÇÃO de origem' 'não diz de onde veio' /tmp/bossaos-fin-origem.txt
cp "${COPIAS[0]}" "$FIN"

echo
echo "9. CONTROLO NEGATIVO — cai o gatilho do período fechado"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP TRIGGER IF EXISTS "periodo_fechado_nao_recebe" ON "financial_movements";' >/dev/null 2>&1
correr /tmp/bossaos-fin-fecho.txt
exigir_vermelho "caiu o fecho: lançou-se dentro de um mês já fechado e assinado" \
  'recusado NA BASE' '' /tmp/bossaos-fin-fecho.txt
repor_sql

echo
echo "10. CONTROLO NEGATIVO — as moedas passam a SOMAR-SE"
plantar <<'PYMOEDAS' || true
import io
p = 'packages/db/src/financeiro.ts'
s = io.open(p, encoding='utf-8').read()
# O plante tem de trocar a LEITURA e a ESCRITA do mapa. A primeira versao so'
# trocou a leitura, os dois grupos continuaram a existir, e o controlo caiu
# noutro caso — um plante pela metade e' um plante que nao planta o defeito.
antigo = "    const actual = por.get(l.moeda) ?? { total: 0n, linhas: 0 };"
assert antigo in s, 'o agrupamento por moeda nao esta onde se esperava'
s = s.replace(antigo, "    const actual = por.get('EUR') ?? { total: 0n, linhas: 0 };", 1)
antigo2 = "    por.set(l.moeda, { total: actual.total + sinal * l.montanteMenor, linhas: actual.linhas + 1 });"
assert antigo2 in s, 'a escrita do mapa nao esta onde se esperava'
s = s.replace(antigo2, "    por.set('EUR', { total: actual.total + sinal * l.montanteMenor, linhas: actual.linhas + 1 });", 1)
io.open(p, 'w', encoding='utf-8').write(s)
PYMOEDAS
correr /tmp/bossaos-fin-moedas.txt
exigir_vermelho "caiu o agrupamento: euros e dólares somados num total só" \
  'AGRUPADO por moeda' 'somou moedas diferentes' /tmp/bossaos-fin-moedas.txt
cp "${COPIAS[0]}" "$FIN"

echo
echo "11. CONTROLO NEGATIVO — converte SEM taxa, adivinhando o câmbio"
plantar <<'PYTAXA' || true
import io
p = 'packages/db/src/financeiro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  if (!taxa) {
    throw new RecusaDoFinanceiro('SEM_TAXA',"""
assert antigo in s, 'a recusa sem taxa nao esta onde se esperava'
novo = """  if (!taxa) {
    return {
      totalMenor: dados.total.totalMenor, moeda: dados.para,
      fonte: 'estimado', emVigorDe: new Date(),
    };
  }
  if (false) {
    throw new RecusaDoFinanceiro('SEM_TAXA',"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYTAXA
correr /tmp/bossaos-fin-taxa.txt
exigir_vermelho "caiu a recusa: converteu a olho e devolveu uma opinião com ar de facto" \
  'SEM taxa é recusado' '' /tmp/bossaos-fin-taxa.txt
cp "${COPIAS[0]}" "$FIN"

echo
echo "12. CONTROLO NEGATIVO — o PAR do período aberto sai da prova"
plantar <<'PYPAR' || true
import io
p = 'provas/financeiro.test.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    assert.ok(m.id);
  });"""
assert antigo in s, 'o par do periodo aberto nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, """    assert.equal(m.id, 'PLANTE');
  });""", 1))
PYPAR
plantar <<'PYSEMPRE' || true
import io
p = 'packages/db/prisma/migrations/20260914900000_e29_financeiro_e_conciliacao/migration.sql'
s = io.open(p, encoding='utf-8').read()
antigo = """     AND p."estado" = 'FECHADO'"""
assert antigo in s, 'a condicao do fechado nao esta onde se esperava'
bloco = s[s.index('CREATE OR REPLACE FUNCTION periodo_fechado_recusa_movimento'):]
bloco = bloco.split('$$ LANGUAGE plpgsql;')[0].replace(antigo, "     AND p.\"estado\" IN ('FECHADO', 'ABERTO')", 1)
io.open('/tmp/plante-fin.sql', 'w', encoding='utf-8').write(bloco + '$$ LANGUAGE plpgsql;')
PYSEMPRE
psql "$MIGRATION_DATABASE_URL" -q -f /tmp/plante-fin.sql >/dev/null 2>&1
correr /tmp/bossaos-fin-par.txt
# Sem o par, «recusa sempre» passava o caso do periodo fechado — e a casa ficava
# sem conseguir lancar nada, com a prova toda verde.
exigir_vermelho "caiu o par: «recusa sempre» passava o caso do período fechado" \
  'com o período ABERTO, lançar dentro funciona' '' /tmp/bossaos-fin-par.txt
cp "${COPIAS[1]}" "$PROVA"
repor_sql

echo
echo "13. CONTROLO NEGATIVO — a fronteira volta a converter com Number"
# ── O defeito que reteve o E29 ────────────────────────────────────────────
#
# A importação é a única porta por onde entra dado externo, e a validação aceita
# trinta dígitos. Um `Number` no caminho perde dígitos EM SILÊNCIO: a linha do
# banco entra errada e todos os totais continuam a bater certo entre si.
plantar <<'PYPRECISAO' || true
import io
p = 'packages/db/src/financeiro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    const montante = BigInt(l.montanteMenor);"
assert antigo in s, 'a leitura do montante nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "    const montante = BigInt(Number(l.montanteMenor));", 1))
PYPRECISAO
correr /tmp/bossaos-fin-precisao.txt
exigir_vermelho "caiu a precisão: a linha do banco entrou errada, e em silêncio" \
  'vinte e cinco dígitos entra EXACTO' \
  'a precisão perdeu-se na fronteira' /tmp/bossaos-fin-precisao.txt
cp "${COPIAS[0]}" "$FIN"

echo
echo "14. CONTROLO NEGATIVO — a SEGUNDA porta volta a converter"
plantar <<'PYSEGUNDA' || true
import io
p = 'packages/db/src/financeiro.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      montanteMenor: BigInt(dados.montanteMenor),"
assert antigo in s, 'a leitura do movimento nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(
    s.replace(antigo, "      montanteMenor: BigInt(Number(dados.montanteMenor)),", 1))
PYSEGUNDA
correr /tmp/bossaos-fin-segunda.txt
exigir_vermelho "caiu a segunda porta: o movimento à mão perdeu dígitos" \
  'SEGUNDA porta' 'o defeito estava nos dois sítios' /tmp/bossaos-fin-segunda.txt
cp "${COPIAS[0]}" "$FIN"

echo
echo "15. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-fin-reposto.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-fin-reposto.txt | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E "^ +not ok|error: " /tmp/bossaos-fin-reposto.txt | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

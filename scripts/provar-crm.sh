#!/usr/bin/env bash
#
# E27 fatia 1 — CRM, consentimento, fidelidade e campanhas.
#
# O controlo que mais vale é o 2: fazer o consentimento de SERVIÇO valer para
# CAMPANHA. Nada estoira, nada dá erro, e o telefone que alguém deixou para ser
# avisado de que a mesa está pronta passa a ser uma lista de marketing. É o
# defeito mais comum de todos os produtos de restauração, e em Espanha tem coima.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

CRM=packages/db/src/crm.ts
PROVA=provas/crm.test.ts
MIGRACAO=packages/db/prisma/migrations/20260912900000_e27_crm_e_campanhas/migration.sql
FICHEIROS=("$CRM" "$PROVA")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# Repor o SQL da migração, e falhar ALTO se não repuser. O `2>/dev/null` que
# engoliu o erro do extractor no E26 custou uma base sem gatilho.
repor_sql() {
  local sql
  sql=$(python3 scripts/extrair-sql.py "$MIGRACAO" 'CREATE OR REPLACE FUNCTION|CREATE TRIGGER') || {
    vermelho "não consegui extrair os gatilhos da migração"; return 1; }
  if [[ -z "$sql" ]]; then vermelho "o extractor devolveu VAZIO — nada foi reposto"; return 1; fi
  psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 <<<"
    DROP TRIGGER IF EXISTS \"envio_exige_consentimento_vivo\" ON \"campaign_deliveries\";
    DROP TRIGGER IF EXISTS \"saldo_de_pontos_nao_se_escreve\" ON \"customers\";
    DROP TRIGGER IF EXISTS \"movimentos_derivam_pontos\" ON \"loyalty_movements\";
    $sql" >/dev/null
}

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  repor_sql
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { node --experimental-strip-types --test provas/crm.test.ts >"$1" 2>&1; }

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
if correr /tmp/bossaos-crm-ligado.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-crm-ligado.txt | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "o motor não está verde com tudo ligado"
  grep -E "^ +not ok|error: " /tmp/bossaos-crm-ligado.txt | head -8; exit 1
fi

echo
echo "2. CONTROLO NEGATIVO — o consentimento de SERVIÇO passa a valer para CAMPANHA"
# ── O defeito mais comum de todos os produtos de restauração ──────────────
#
# Repare-se que nada estoira: a campanha envia, os números batem, e o ecrã fica
# verde. O que muda é que uma pessoa recebe publicidade porque deixou o telefone
# para ser avisada de que a mesa estava pronta.
plantar <<'PYFIN' || true
import io
p = 'packages/db/prisma/migrations/20260912900000_e27_crm_e_campanhas/migration.sql'
s = io.open(p, encoding='utf-8').read()
antigo = """   WHERE c."customer_id" = p_customer
     AND c."finalidade"  = p_finalidade
     AND c."canal"       = p_canal"""
assert antigo in s, 'a consulta do consentimento nao esta onde se esperava'
novo = """   WHERE c."customer_id" = p_customer
     AND c."canal"       = p_canal"""
io.open('/tmp/plante-crm.sql', 'w', encoding='utf-8').write(
    s[s.index('CREATE OR REPLACE FUNCTION tem_consentimento'):]
     .split('$$ LANGUAGE plpgsql;')[0].replace(antigo, novo, 1) + '$$ LANGUAGE plpgsql;')
PYFIN
psql "$MIGRATION_DATABASE_URL" -q -f /tmp/plante-crm.sql >/dev/null 2>&1
correr /tmp/bossaos-crm-finalidade.txt
exigir_vermelho "caiu a finalidade: o aviso da mesa virou lista de marketing" \
  'serviço por SMS não dá campanha por SMS' \
  'virou permissão de marketing' /tmp/bossaos-crm-finalidade.txt
repor_sql

echo
echo "3. CONTROLO NEGATIVO — o canal deixa de contar"
plantar <<'PYCANAL' || true
import io
p = 'packages/db/prisma/migrations/20260912900000_e27_crm_e_campanhas/migration.sql'
s = io.open(p, encoding='utf-8').read()
antigo = """     AND c."finalidade"  = p_finalidade
     AND c."canal"       = p_canal"""
assert antigo in s, 'a consulta do canal nao esta onde se esperava'
io.open('/tmp/plante-crm.sql', 'w', encoding='utf-8').write(
    s[s.index('CREATE OR REPLACE FUNCTION tem_consentimento'):]
     .split('$$ LANGUAGE plpgsql;')[0]
     .replace(antigo, '     AND c."finalidade"  = p_finalidade', 1) + '$$ LANGUAGE plpgsql;')
PYCANAL
psql "$MIGRATION_DATABASE_URL" -q -f /tmp/plante-crm.sql >/dev/null 2>&1
correr /tmp/bossaos-crm-canal.txt
exigir_vermelho "caiu o canal: aceitar email passou a aceitar SMS" \
  'campanha por EMAIL não dá campanha por SMS' \
  'aceitar email passou a aceitar SMS' /tmp/bossaos-crm-canal.txt
repor_sql

echo
echo "4. CONTROLO NEGATIVO — a retirada deixa de mandar"
plantar <<'PYRET' || true
import io
p = 'packages/db/prisma/migrations/20260912900000_e27_crm_e_campanhas/migration.sql'
s = io.open(p, encoding='utf-8').read()
antigo = "  IF ultimo.\"accao\" = 'RETIRADO' THEN RETURN FALSE; END IF;"
assert antigo in s, 'a regra da retirada nao esta onde se esperava'
io.open('/tmp/plante-crm.sql', 'w', encoding='utf-8').write(
    s[s.index('CREATE OR REPLACE FUNCTION tem_consentimento'):]
     .split('$$ LANGUAGE plpgsql;')[0].replace(antigo, '', 1) + '$$ LANGUAGE plpgsql;')
PYRET
psql "$MIGRATION_DATABASE_URL" -q -f /tmp/plante-crm.sql >/dev/null 2>&1
correr /tmp/bossaos-crm-retirada.txt
exigir_vermelho "caiu a retirada: quem disse que não continuou a receber" \
  'a retirada manda sobre o consentimento anterior' '' /tmp/bossaos-crm-retirada.txt
repor_sql

echo
echo "5. CONTROLO NEGATIVO — a finalidade de serviço deixa de EXPIRAR"
plantar <<'PYEXP' || true
import io
p = 'packages/db/prisma/migrations/20260912900000_e27_crm_e_campanhas/migration.sql'
s = io.open(p, encoding='utf-8').read()
antigo = '  IF ultimo."expira_em" IS NOT NULL AND ultimo."expira_em" <= now() THEN RETURN FALSE; END IF;'
assert antigo in s, 'a regra da expiracao nao esta onde se esperava'
io.open('/tmp/plante-crm.sql', 'w', encoding='utf-8').write(
    s[s.index('CREATE OR REPLACE FUNCTION tem_consentimento'):]
     .split('$$ LANGUAGE plpgsql;')[0].replace(antigo, '', 1) + '$$ LANGUAGE plpgsql;')
PYEXP
psql "$MIGRATION_DATABASE_URL" -q -f /tmp/plante-crm.sql >/dev/null 2>&1
correr /tmp/bossaos-crm-expira.txt
exigir_vermelho "caiu a caducidade: o número da porta ficou lá para sempre" \
  'EXPIRADO não autoriza nada' \
  'depois de a finalidade acabar' /tmp/bossaos-crm-expira.txt
repor_sql

echo
echo "6. CONTROLO NEGATIVO — cai o GATILHO que recusa o envio sem consentimento"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP TRIGGER IF EXISTS "envio_exige_consentimento_vivo" ON "campaign_deliveries";' >/dev/null 2>&1
correr /tmp/bossaos-crm-gatilho.txt
exigir_vermelho "caiu a última defesa: a base deixou gravar um envio sem permissão" \
  'a BASE recusa o envio, mesmo que o código tente à força' '' /tmp/bossaos-crm-gatilho.txt
repor_sql

echo
echo "7. CONTROLO NEGATIVO — a audiência deixa de perguntar pelo consentimento"
plantar <<'PYAUD' || true
import io
p = 'packages/db/src/crm.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (!regra.exigeConsentimento) return candidatos;"
assert antigo in s, 'o filtro da audiencia nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "  return candidatos;\n" + antigo, 1))
PYAUD
correr /tmp/bossaos-crm-audiencia.txt
exigir_vermelho "caiu a audiência: a regra deixou de ser uma consulta sobre quem consentiu" \
  'a mesma regra dá gente diferente quando o consentimento muda' \
  'devolveu gente que não consentiu' /tmp/bossaos-crm-audiencia.txt
cp "${COPIAS[0]}" "$CRM"

echo
echo "8. CONTROLO NEGATIVO — o envio pergunta UMA vez e grava tudo a seguir"
plantar <<'PYUMAVEZ' || true
import io
p = 'packages/db/src/crm.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    if (!(await temConsentimento(db, p.id, 'CAMPANHA', campanha.canal))) {
      recusados.push({ customerId: p.id, nome: p.nome });
      continue;
    }"""
assert antigo in s, 'a pergunta por pessoa nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, '', 1))
PYUMAVEZ
correr /tmp/bossaos-crm-umavez.txt
# Sem a pergunta por pessoa, quem nunca consentiu chega ao gatilho, a transaccao
# aborta com 25P02 e a campanha inteira morre — que e' o lado seguro de falhar,
# mas nao e' o comportamento que a prova descreve.
exigir_vermelho "caiu a pergunta por pessoa: a recusa deixou de ser dita a quem envia" \
  'a lista de recusados enche-se' '' /tmp/bossaos-crm-umavez.txt
cp "${COPIAS[0]}" "$CRM"

echo
echo "9. CONTROLO NEGATIVO — o saldo de pontos passa a escrever-se à mão"
psql "$MIGRATION_DATABASE_URL" -q -c \
  'DROP TRIGGER IF EXISTS "saldo_de_pontos_nao_se_escreve" ON "customers";' >/dev/null 2>&1
correr /tmp/bossaos-crm-saldo.txt
exigir_vermelho "caiu a derivação: o saldo de pontos virou coluna que se escreve" \
  'escrever o saldo de fora é SUBSTITUÍDO pela base' \
  'o saldo escrito à mão FICOU' /tmp/bossaos-crm-saldo.txt
repor_sql

echo
echo "10. CONTROLO NEGATIVO — o PAR de quem volta a consentir sai da prova"
plantar <<'PYPAR' || true
import io
p = 'provas/crm.test.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """    await consentir(p.id, 'CAMPANHA', 'EMAIL');
    assert.equal(await comA((db) => temConsentimento(db, p.id, 'CAMPANHA', 'EMAIL')), true);
  });"""
assert antigo in s, 'o par de quem volta a consentir nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, """    await consentir(p.id, 'CAMPANHA', 'EMAIL');
    assert.equal(await comA((db) => temConsentimento(db, p.id, 'CAMPANHA', 'EMAIL')), false, 'PLANTE');
  });""", 1))
PYPAR
plantar <<'PYSEMPRE' || true
import io
p = 'packages/db/prisma/migrations/20260912900000_e27_crm_e_campanhas/migration.sql'
s = io.open(p, encoding='utf-8').read()
antigo = "   ORDER BY c.\"momento\" DESC, c.\"id\" DESC"
assert antigo in s, 'a ordem do ultimo acontecimento nao esta onde se esperava'
io.open('/tmp/plante-crm.sql', 'w', encoding='utf-8').write(
    s[s.index('CREATE OR REPLACE FUNCTION tem_consentimento'):]
     .split('$$ LANGUAGE plpgsql;')[0]
     .replace(antigo, '   ORDER BY c."momento" ASC, c."id" ASC', 1) + '$$ LANGUAGE plpgsql;')
PYSEMPRE
psql "$MIGRATION_DATABASE_URL" -q -f /tmp/plante-crm.sql >/dev/null 2>&1
correr /tmp/bossaos-crm-par.txt
# Sem o par, «o primeiro acontecimento manda» passava o caso da retirada: quem
# deu e retirou continuava a dar FALSE por outra razao, e ninguem notava que uma
# pessoa que mudou de ideias ficava calada para sempre.
exigir_vermelho "caiu o par: «o primeiro manda» passava o caso da retirada" \
  'quem volta a consentir depois de retirar, vale' '' /tmp/bossaos-crm-par.txt
cp "${COPIAS[1]}" "$PROVA"
repor_sql

echo
echo "11. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-crm-reposto.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-crm-reposto.txt | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois de repor"
  grep -E "^ +not ok|error: " /tmp/bossaos-crm-reposto.txt | head -6
fi

echo
CHEGOU_AO_FIM=1
if [[ $falhas -eq 0 ]]; then printf '\033[32m0 falhas\033[0m\n'; exit 0; fi
printf '\033[31m%d FALHA(S).\033[0m\n' "$falhas"; exit 1

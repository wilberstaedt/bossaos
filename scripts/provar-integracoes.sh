#!/usr/bin/env bash
#
# E32 — integrações, API e cobrança do SaaS.
#
# O controlo que decide a etapa é o 7, e é diferente de todos os outros deste
# projecto: os outros plantam um defeito que PREJUDICA alguém. Este planta uma
# porta que RENDE DINHEIRO a quem a encontrar — um webhook que aceita o
# `organization_id` do corpo é qualquer pessoa a dar-se a si própria o plano que
# quiser, com o sistema a registar tudo como legítimo, porque foi.
#
# Se ele não acender, não há etapa.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

MOTOR=packages/db/src/integracoes.ts
PURO=packages/domain/src/integracoes.ts
PROVA=provas/integracoes.test.ts
FICHEIROS=("$MOTOR" "$PURO" "$PROVA")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── A reposição da BASE é a parte cara, e o E31 ensinou porquê ─────────────
#
# Um ficheiro repõe-se do git; uma restrição não. E aqui há mais do que
# restrições: há uma PERMISSÃO. Um controlo que conceda escrita ao runtime em
# `entitlement_grants` e não a retire deixa a fronteira do E05 aberta — e ela
# tem 27 etapas de idade.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'SQL' || true
-- A fronteira do E05, primeiro. É a que não pode ficar aberta.
REVOKE INSERT, UPDATE, DELETE ON "entitlement_grants" FROM bossaos_app;
REVOKE INSERT, UPDATE, DELETE ON "subscriptions"      FROM bossaos_app;

DROP TRIGGER IF EXISTS "resolucao_so_pela_ligacao" ON "saas_billing_events";
CREATE TRIGGER "resolucao_so_pela_ligacao"
  BEFORE INSERT OR UPDATE ON "saas_billing_events"
  FOR EACH ROW EXECUTE FUNCTION resolucao_vem_da_ligacao_verificada();

ALTER TABLE "webhook_endpoints" DROP CONSTRAINT IF EXISTS "destino_e_https";
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "destino_e_https"
  CHECK ("url" LIKE 'https://%');

ALTER TABLE "api_keys" DROP CONSTRAINT IF EXISTS "chave_tem_ambito";
ALTER TABLE "api_keys" ADD CONSTRAINT "chave_tem_ambito"
  CHECK (coalesce(array_length("escopos", 1), 0) >= 1);
SQL
}

# A função privilegiada, na forma correcta. Um dos plantes reescreve-a.
repor_funcao() {
  psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 >/dev/null 2>&1 \
    -f packages/db/prisma/migrations/20260916900000_e32_integracoes_api_e_cobranca/funcao-aplicar.sql \
    || true
}

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  repor_base
  repor_funcao
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    printf 'Ficheiros, base e função repostos.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { node --experimental-strip-types --test provas/integracoes.test.ts >"$1" 2>&1; }

plantar() {
  if ! python3 -; then
    vermelho "o plante NÃO APLICOU — a âncora mudou; isto não mediu nada"
    return 1
  fi
}

plantar_sql() {
  if ! psql "$MIGRATION_DATABASE_URL" -q -v ON_ERROR_STOP=1 >/dev/null 2>&1; then
    vermelho "o plante de BASE não aplicou — isto não mediu nada"
    return 1
  fi
}

exigir_vermelho() {
  local nome="$1" caso="$2" ficheiro="$3"
  if [[ ! -s "$ficheiro" ]]; then vermelho "$nome: não correu"; return; fi
  local limpo; limpo=$(sed -e 's/\x1b\[[0-9;]*m//g' "$ficheiro")
  if grep -qE 'SyntaxError|Cannot find|ERR_MODULE' <<<"$limpo"; then
    vermelho "$nome: o defeito plantado NÃO CARREGA — é o guião, não o produto"
    grep -E 'SyntaxError|Cannot find' <<<"$limpo" | head -2; return
  fi
  if ! grep -qE '^# fail [1-9]' <<<"$limpo"; then
    vermelho "$nome: ficou VERDE com o defeito plantado"; return
  fi
  if ! grep -qE "not ok .*$caso" <<<"$limpo"; then
    vermelho "$nome: caiu, mas não foi o caso esperado ($caso)"
    grep -E '^ +not ok' <<<"$limpo" | head -4; return
  fi
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-int-ligado.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-int-ligado.txt | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "o motor não está verde com tudo ligado"
  grep -E "^ +not ok|error: " /tmp/bossaos-int-ligado.txt | head -8; exit 1
fi

echo
echo "2. CONTROLO — a chave passa a ser guardada em claro"
plantar <<'PY' || true
import io
p = 'packages/db/src/integracoes.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "      resumo: resumirChave(valor),"
assert antigo in s, 'a gravacao do resumo nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "      resumo: valor,", 1))
PY
correr /tmp/bossaos-int-c2.txt || true
exigir_vermelho "caiu o resumo: a chave fica na base em claro" \
  "não está em lado nenhum da base" /tmp/bossaos-int-c2.txt
cp "${COPIAS[0]}" "$MOTOR"

echo
echo "3. CONTROLO — o âmbito deixa de ser verificado"
# A régua manda tirar a verificação de UMA operação, não do portão central. Aqui
# a operação e o portão são a mesma função, e por isso o plante vai à decisão —
# não ao caminho que chama por ela.
plantar <<'PY' || true
import io
p = 'packages/domain/src/integracoes.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  return escopos.includes(preciso);"
assert antigo in s, 'a decisao do ambito nao esta onde se esperava'
novo = "  void preciso;\n  return escopos.length > 0;"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-int-c3.txt || true
exigir_vermelho "caiu o âmbito: qualquer chave serve para qualquer operação" \
  "de âmbito errado" /tmp/bossaos-int-c3.txt
cp "${COPIAS[1]}" "$PURO"

echo
echo "4. CONTROLO — revogar deixa de cortar já"
plantar <<'PY' || true
import io
p = 'packages/domain/src/integracoes.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (chave.revogadaEm !== null && chave.revogadaEm <= agora) return 'revogada';"
assert antigo in s, 'a leitura da revogacao nao esta onde se esperava'
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, "", 1))
PY
correr /tmp/bossaos-int-c4.txt || true
exigir_vermelho "caiu a revogação: a chave levada continua a servir" \
  "no mesmo segundo" /tmp/bossaos-int-c4.txt
cp "${COPIAS[1]}" "$PURO"

echo
echo "5. CONTROLO — a assinatura passa a ser sobre a NOSSA reconstrução"
# «A excepção não dispensa a exigência, TROCA-A.» Verificar sobre a nossa
# reconstrução do JSON não verifica nada.
plantar <<'PY' || true
import io
p = 'packages/db/src/integracoes.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const confere = assinaturaConfere(dados.corpoCru, dados.assinatura, dados.segredo);"
assert antigo in s, 'a verificacao da assinatura nao esta onde se esperava'
novo = ("  const confere = assinaturaConfere(\n"
        "    JSON.stringify(JSON.parse(dados.corpoCru)), dados.assinatura, dados.segredo);")
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-int-c5.txt || true
exigir_vermelho "caiu o corpo cru: a assinatura passa a ser sobre outra coisa" \
  "assinada sobre o corpo como chegou" /tmp/bossaos-int-c5.txt
cp "${COPIAS[0]}" "$MOTOR"

echo
echo "6. CONTROLO — o destino interno passa a ser aceite"
plantar <<'PY' || true
import io
p = 'packages/domain/src/integracoes.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (alvo.protocol !== 'https:') return { ok: false, razao: 'so_https' };"
assert antigo in s, 'a verificacao do destino nao esta onde se esperava'
novo = antigo + "\n  return { ok: true };"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-int-c6.txt || true
exigir_vermelho "caiu o destino: o nosso servidor vai ler o que só ele vê" \
  "recusa antes de guardar" /tmp/bossaos-int-c6.txt
cp "${COPIAS[1]}" "$PURO"

echo
echo "7. CONTROLO QUE DECIDE A ETAPA — a resolução passa a vir do CORPO"
# ── O defeito que rende dinheiro ─────────────────────────────────────────
#
# Substitui-se a função privilegiada por uma que resolve a organização a partir
# do `organization_id_alegado` — que é exactamente o que uma implementação
# apressada faz, e o que parece razoável a quem lê o corpo assinado e conclui
# «isto veio do provedor, portanto é de confiança».
#
# O gatilho cai junto, senão ele impedia a escrita e o controlo mediria o
# gatilho em vez de medir o caminho. É a regra do plante inteiro: desligar as
# DUAS metades do mesmo defeito.
plantar_sql <<'SQL' || true
DROP TRIGGER "resolucao_so_pela_ligacao" ON "saas_billing_events";

CREATE OR REPLACE FUNCTION aplicar_evento_de_cobranca(p_evento UUID)
RETURNS "EstadoDoEventoDeCobranca"
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_evento "saas_billing_events"%ROWTYPE;
  v_plano  UUID;
BEGIN
  SELECT * INTO v_evento FROM "saas_billing_events" WHERE "id" = p_evento;
  IF v_evento."estado" <> 'RECEBIDO' THEN RETURN v_evento."estado"; END IF;

  SELECT "id" INTO v_plano FROM "plan_definitions" WHERE "codigo" = v_evento."plano_codigo";

  -- O DEFEITO: acredita no corpo.
  UPDATE "subscriptions" SET "plan_id" = v_plano, "updated_at" = now()
   WHERE "organization_id" = v_evento."organization_id_alegado";

  UPDATE "saas_billing_events"
     SET "estado" = 'APLICADO', "resolvido_em" = now(),
         "organization_id_resolvido" = v_evento."organization_id_alegado"
   WHERE "id" = p_evento;
  RETURN 'APLICADO';
END;
$$;
SQL
correr /tmp/bossaos-int-c7.txt || true
exigir_vermelho "caiu a ligação verificada: quem descobrir o endereço dá-se o plano que quiser" \
  "não muda nada nela" /tmp/bossaos-int-c7.txt
repor_base
repor_funcao

echo
echo "8. CONTROLO — o runtime ganha escrita em entitlement_grants"
# A fronteira do E05, com 27 etapas de idade. Um webhook que escrevesse lá
# contornava-a por fora, e seria o mesmo defeito com carimbo de integração.
plantar_sql <<'SQL' || true
GRANT INSERT, UPDATE ON "entitlement_grants" TO bossaos_app;
SQL
correr /tmp/bossaos-int-c8.txt || true
exigir_vermelho "caiu a fronteira do E05: o runtime concede capacidades a si próprio" \
  "SOBREVIVE" /tmp/bossaos-int-c8.txt
repor_base

echo
echo "9. Reposto"
i=0; for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; i=$((i+1)); done
repor_base
repor_funcao
if correr /tmp/bossaos-int-reposto.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-int-reposto.txt | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois dos plantes"
  grep -E "^ +not ok" /tmp/bossaos-int-reposto.txt | head -5
fi

# ── E a FRONTEIRA está mesmo fechada? ─────────────────────────────────────
#
# «Reposto e verde» não chega quando um dos plantes mexeu numa PERMISSÃO. Isto
# conta-a, e conta também o gatilho e as restrições.
echo
echo "10. Os objectos e a permissão que os plantes desligaram"
em_falta=0
verificar() {
  local n; n=$(psql "$MIGRATION_DATABASE_URL" -t -c "$2" | tr -d ' ')
  if [[ "$n" != "$3" ]]; then printf '    errado: %s (esperava %s, veio %s)\n' "$1" "$3" "$n"; em_falta=$((em_falta+1)); fi
}
verificar "gatilho resolucao_so_pela_ligacao" \
  "select count(*) from pg_trigger where tgname='resolucao_so_pela_ligacao';" 1
verificar "CHECK destino_e_https" \
  "select count(*) from pg_constraint where conname='destino_e_https';" 1
verificar "CHECK chave_tem_ambito" \
  "select count(*) from pg_constraint where conname='chave_tem_ambito';" 1
verificar "a função resolve pela ligacao (saas_customers na definicao)" \
  "select count(*) from pg_proc p where p.proname='aplicar_evento_de_cobranca' and pg_get_functiondef(p.oid) like '%saas_customers%';" 1
verificar "o runtime NAO escreve em entitlement_grants" \
  "select count(*) from information_schema.role_table_grants where table_name='entitlement_grants' and grantee='bossaos_app' and privilege_type in ('INSERT','UPDATE','DELETE');" 0
verificar "o runtime NAO escreve em subscriptions" \
  "select count(*) from information_schema.role_table_grants where table_name='subscriptions' and grantee='bossaos_app' and privilege_type in ('INSERT','UPDATE','DELETE');" 0
if [[ "$em_falta" -eq 0 ]]; then
  verde "6 verificações: gatilho, dois CHECKs, a função, e as duas permissões do E05"
else
  vermelho "$em_falta objecto(s) ou permissão(ões) por repor — a base está pior do que antes desta prova"
fi

CHEGOU_AO_FIM=1
echo
[[ "$falhas" -eq 0 ]] && echo "  0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

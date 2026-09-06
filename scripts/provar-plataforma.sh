#!/usr/bin/env bash
#
# E33 — plataforma, suporte e governança.
#
# ── Esta é a etapa em que o atacante somos NÓS ────────────────────────────
#
# Todos os outros guiões deste projecto plantam um defeito que prejudica quem
# usa o produto. Este planta defeitos que nos dão poder a nós — e é por isso que
# os controlos 2 e 5 são os que decidem:
#
#   2. o suporte vira dono, porque a sessão deixa de expirar sozinha;
#   5. a fronteira do E05 abre-se pelo lado de dentro, na etapa que traz a
#      interface de escrita das concessões e teria mais tentação de a abrir.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

PURO=packages/domain/src/plataforma.ts
MOTOR=packages/db/src/plataforma-suporte.ts
FICHEIROS=("$PURO" "$MOTOR")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── A reposição da BASE é a parte cara, e aqui é a mais cara de todas ─────
#
# Um dos plantes concede escrita ao runtime em `entitlement_grants`. Se ficasse
# por repor, a fronteira que tem vinte e oito etapas ficava aberta — e ninguém
# daria por isso até alguém a usar. É o mesmo cuidado do E32, com mais peso.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'SQL' || true
REVOKE INSERT, UPDATE, DELETE ON "entitlement_grants" FROM bossaos_app;
REVOKE INSERT, UPDATE, DELETE ON "subscriptions"      FROM bossaos_app;
REVOKE INSERT, UPDATE, DELETE ON "support_sessions"   FROM bossaos_app;
GRANT  SELECT                  ON "support_sessions"  TO   bossaos_app;

DROP TRIGGER IF EXISTS "capacidade_protegida_nao_entra_no_plano" ON "plan_capabilities";
CREATE TRIGGER "capacidade_protegida_nao_entra_no_plano"
  BEFORE INSERT OR UPDATE ON "plan_capabilities"
  FOR EACH ROW EXECUTE FUNCTION capacidade_nao_pode_ficar_atras_do_plano();

DROP TRIGGER IF EXISTS "accao_da_plataforma_diz_quem_a_fez" ON "audit_events";
CREATE TRIGGER "accao_da_plataforma_diz_quem_a_fez"
  BEFORE INSERT ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION rasto_guarda_a_pessoa();

DROP TRIGGER IF EXISTS "sessao_de_suporte_respeita_a_casa" ON "support_sessions";
CREATE TRIGGER "sessao_de_suporte_respeita_a_casa"
  BEFORE INSERT OR UPDATE ON "support_sessions"
  FOR EACH ROW EXECUTE FUNCTION sessao_respeita_a_politica_da_casa();
SQL
}

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  repor_base
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    printf 'Ficheiros e base repostos, INCLUINDO a fronteira do E05.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { node --experimental-strip-types --test provas/plataforma.test.ts >"$1" 2>&1; }

# ── E há um controlo que tem de correr OUTRA prova ────────────────────────
#
# O plante do segredo é numa função PURA, e o caso que o mede vive no
# `packages/domain/src/plataforma.test.ts`. Corri-o contra a prova de base à
# primeira e ele ficou VERDE — não porque o produto resistisse, mas porque o
# caso não estava naquele ficheiro.
#
# É o mesmo erro de alcance que este projecto persegue, virado para o guião:
# **plantar num sítio e medir noutro**. Fica com corredor próprio.
correr_puro() {
  node --experimental-strip-types --test packages/domain/src/plataforma.test.ts >"$1" 2>&1
}

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
if correr /tmp/bossaos-plat-ligado.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-plat-ligado.txt | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "o motor não está verde com tudo ligado"
  grep -E "^ +not ok|error: " /tmp/bossaos-plat-ligado.txt | head -8; exit 1
fi

echo
echo "2. CONTROLO — a sessão passa a depender de alguém a fechar"
# ── O que a régua manda plantar, com as palavras dela ────────────────────
#
# «Uma sessão que só termina quando alguém se lembra é permanente na prática.
# Exijo que expire sozinha, e o controlo faz depender de alguém fechar.»
#
# O plante é a versão que quase toda a gente escreve à primeira: olhar só para
# o fim. É a diferença entre uma sessão de suporte e uma chave de casa que ficou
# com o canalizador.
plantar <<'PY' || true
import io
p = 'packages/domain/src/plataforma.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (sessao.terminadaEm !== null) return false;\n  return sessao.expiraEm > agora;"
assert antigo in s, 'a derivacao da sessao viva nao esta onde se esperava'
novo = "  return sessao.terminadaEm === null;"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-plat-c2.txt || true
exigir_vermelho "caiu a expiração: a sessão esquecida continua a autorizar, e o suporte vira dono" \
  "O CASO QUE DECIDE" /tmp/bossaos-plat-c2.txt
cp "${COPIAS[0]}" "$PURO"

echo
echo "3. CONTROLO — a entrada esconde-se do lado do inquilino"
# «Um acesso que só aparece do nosso lado é um acesso que o cliente não pode
# contestar.» Esconde-se, e a prova tem de acender.
plantar <<'PY' || true
import io
p = 'packages/db/src/plataforma-suporte.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "export function sessoesDaCasa(db: ClienteComEscopo, organizationId: string) {\n  return db.supportSession.findMany({\n    where: { organizationId },"
assert antigo in s, 'a leitura das sessoes da casa nao esta onde se esperava'
novo = ("export function sessoesDaCasa(db: ClienteComEscopo, organizationId: string) {\n"
        "  return db.supportSession.findMany({\n"
        "    where: { organizationId, id: '00000000-0000-4000-8000-000000000000' },")
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-plat-c3.txt || true
exigir_vermelho "caiu a visibilidade: a casa deixa de ver quem entrou" \
  "a casa lê as sessões de suporte dela" /tmp/bossaos-plat-c3.txt
cp "${COPIAS[1]}" "$MOTOR"

echo
echo "4. CONTROLO — o rasto passa a aceitar «suporte» como resposta"
# «Suporte» não responde à pergunta *quem fez isto*.
plantar_sql <<'SQL' || true
DROP TRIGGER "accao_da_plataforma_diz_quem_a_fez" ON "audit_events";
SQL
correr /tmp/bossaos-plat-c4.txt || true
exigir_vermelho "caiu o gatilho do rasto: um papel passa a assinar as acções da plataforma" \
  "assinada por «suporte»" /tmp/bossaos-plat-c4.txt
repor_base

echo
echo "5. CONTROLO QUE DECIDE — o runtime ganha escrita em entitlement_grants"
# ── A fronteira que tem vinte e oito etapas ──────────────────────────────
#
# «Se para a tela funcionar o runtime ganhar INSERT, a resposta é NÃO — muda-se
# o caminho, não a permissão.»
#
# Este é o plante que alguém faria de boa fé, com pressa, para a tela nova
# funcionar. Tem de acender.
plantar_sql <<'SQL' || true
GRANT INSERT, UPDATE ON "entitlement_grants" TO bossaos_app;
SQL
correr /tmp/bossaos-plat-c5.txt || true
exigir_vermelho "caiu a fronteira do E05: o runtime concede capacidades por fora do caminho" \
  "NÃO escreve em entitlement_grants" /tmp/bossaos-plat-c5.txt
repor_base

echo
echo "6. CONTROLO — a exportação fica atrás do plano"
# ── A única exigência da régua que não é técnica ─────────────────────────
#
# «Começa por "a exportação em massa é uma funcionalidade Pro" e acaba com um
# cliente sem forma de sair.» O plante é o gatilho desligado — que é o que
# acontece quando alguém acha que a regra é uma opinião.
plantar_sql <<'SQL' || true
DROP TRIGGER "capacidade_protegida_nao_entra_no_plano" ON "plan_capabilities";
SQL
correr /tmp/bossaos-plat-c6.txt || true
exigir_vermelho "caiu a protecção: a exportação passa a poder ficar atrás do plano" \
  "RECUSA pôr a exportação atrás" /tmp/bossaos-plat-c6.txt
repor_base

echo
echo "7. CONTROLO — a política da casa deixa de valer"
# O tecto e o consentimento são DA CASA. Sem o gatilho, o suporte pede o que
# quiser e entra onde quiser.
plantar_sql <<'SQL' || true
DROP TRIGGER "sessao_de_suporte_respeita_a_casa" ON "support_sessions";
SQL
correr /tmp/bossaos-plat-c7.txt || true
exigir_vermelho "caiu a política: a casa deixa de poder apertar o tecto" \
  "a casa aperta o tecto" /tmp/bossaos-plat-c7.txt
repor_base

echo
echo "8. CONTROLO — o segredo passa a sair na projecção"
plantar <<'PY' || true
import io
p = 'packages/domain/src/plataforma.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  return {
    nome: s.nome, configurado: s.configurado,
    rodadoEm: s.rodadoEm, rodadoPor: s.rodadoPor,
  };"""
assert antigo in s, 'a projeccao do segredo nao esta onde se esperava'
novo = "  return { ...s } as SegredoVisivel;"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr_puro /tmp/bossaos-plat-c8.txt || true
exigir_vermelho "caiu a lista de permissão: o que vem a mais atravessa" \
  "NÃO sobrevive à travessia" /tmp/bossaos-plat-c8.txt
cp "${COPIAS[0]}" "$PURO"

echo
echo "9. Reposto"
i=0; for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; i=$((i+1)); done
repor_base
if correr /tmp/bossaos-plat-reposto.txt && correr_puro /tmp/bossaos-plat-reposto-puro.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-plat-reposto.txt | grep -oE '[0-9]+')
  puros=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-plat-reposto-puro.txt | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos de base e ${puros:-0} puros"
else
  vermelho "não voltou ao verde depois dos plantes"
  grep -E "^ +not ok" /tmp/bossaos-plat-reposto.txt | head -5
fi

# ── E a FRONTEIRA está mesmo fechada? ─────────────────────────────────────
#
# «Reposto e verde» não chega quando um dos plantes mexeu na permissão que tem
# vinte e oito etapas. Isto conta-a, e conta os três gatilhos.
echo
echo "10. A fronteira do E05 e os gatilhos, um a um"
em_falta=0
verificar() {
  local n; n=$(psql "$MIGRATION_DATABASE_URL" -t -c "$2" | tr -d ' ')
  if [[ "$n" != "$3" ]]; then printf '    errado: %s (esperava %s, veio %s)\n' "$1" "$3" "$n"; em_falta=$((em_falta+1)); fi
}
verificar "o runtime NAO escreve em entitlement_grants" \
  "select count(*) from information_schema.role_table_grants where table_name='entitlement_grants' and grantee='bossaos_app' and privilege_type in ('INSERT','UPDATE','DELETE');" 0
verificar "o runtime NAO escreve em subscriptions" \
  "select count(*) from information_schema.role_table_grants where table_name='subscriptions' and grantee='bossaos_app' and privilege_type in ('INSERT','UPDATE','DELETE');" 0
verificar "o runtime NAO escreve em support_sessions" \
  "select count(*) from information_schema.role_table_grants where table_name='support_sessions' and grantee='bossaos_app' and privilege_type in ('INSERT','UPDATE','DELETE');" 0
verificar "o runtime LE support_sessions" \
  "select count(*) from information_schema.role_table_grants where table_name='support_sessions' and grantee='bossaos_app' and privilege_type='SELECT';" 1
verificar "gatilho accao_da_plataforma_diz_quem_a_fez" \
  "select count(*) from pg_trigger where tgname='accao_da_plataforma_diz_quem_a_fez';" 1
verificar "gatilho capacidade_protegida_nao_entra_no_plano" \
  "select count(*) from pg_trigger where tgname='capacidade_protegida_nao_entra_no_plano';" 1
verificar "gatilho sessao_de_suporte_respeita_a_casa" \
  "select count(*) from pg_trigger where tgname='sessao_de_suporte_respeita_a_casa';" 1
if [[ "$em_falta" -eq 0 ]]; then
  verde "7 verificações: as quatro permissões e os três gatilhos"
else
  vermelho "$em_falta por repor — a base está pior do que antes desta prova"
fi

CHEGOU_AO_FIM=1
echo
[[ "$falhas" -eq 0 ]] && echo "  0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

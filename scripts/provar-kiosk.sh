#!/usr/bin/env bash
#
# E31 — kiosk, terminais e impressão.
#
# O controlo que a régua põe em primeiro lugar é o 5: fazer o «não sei»
# colapsar em «impresso». Nada estoira, o ecrã fica bonito, e o cliente espera
# por comida que ninguém está a fazer — ou a cozinha faz o prato duas vezes.
#
# E há um com critério invulgar, o 2: NÃO basta o caminho concluído passar. Os
# TRÊS caminhos de saída têm de limpar o mesmo, e o plante desliga UM deles —
# porque um caminho que limpa menos é indistinguível dos outros até ao dia em
# que não é.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL em falta}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL em falta}"

NODE_ESPERADO="v$(tr -d ' \n' < .nvmrc)"
if [[ "$(node --version)" != "$NODE_ESPERADO" ]]; then
  echo "ERRO: esta prova exige o Node do .nvmrc ($NODE_ESPERADO)." >&2; exit 2
fi

MOTOR_KIOSK=packages/db/src/kiosk.ts
MOTOR_IMPR=packages/db/src/impressao.ts
PURO=packages/domain/src/impressao.ts
PROVA=provas/kiosk.test.ts
FICHEIROS=("$MOTOR_KIOSK" "$MOTOR_IMPR" "$PURO" "$PROVA")
COPIAS=()
for f in "${FICHEIROS[@]}"; do c=$(mktemp); cp "$f" "$c"; COPIAS+=("$c"); done
CHEGOU_AO_FIM=0

falhas=0
verde()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
vermelho() { printf '  \033[31mFALHA\033[0m %s\n' "$1"; falhas=$((falhas + 1)); }

# ── A RESTAURAÇÃO DA BASE É A PARTE CARA DESTE GUIÃO ───────────────────────
#
# Um plante em ficheiro repõe-se do git. Um plante na BASE — um índice apagado,
# um gatilho removido — não. E a corrida anterior desta prova morreu a meio e
# deixou a `print_jobs` sem a restrição única: a prova seguinte falhou por o
# produto ter perdido a garantia, não por defeito nenhum.
#
# Por isso cada plante de base tem aqui a sua reposição, e o guião VERIFICA no
# fim que os objectos estão todos de volta. Um guião que planta na base sem
# provar que repôs é um guião que estraga o produto para medir o produto.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'SQL' || true
CREATE UNIQUE INDEX IF NOT EXISTS "uma_sessao_aberta_por_kiosk"
  ON "kiosk_sessions" ("device_id") WHERE "estado" = 'ABERTA';
CREATE UNIQUE INDEX IF NOT EXISTS "um_envio_por_identidade"
  ON "print_jobs" ("organization_id", "identidade");

DROP TRIGGER IF EXISTS "fechar_sessao_nao_apaga_cobranca_por_resolver" ON "kiosk_sessions";
CREATE TRIGGER "fechar_sessao_nao_apaga_cobranca_por_resolver"
  BEFORE UPDATE ON "kiosk_sessions"
  FOR EACH ROW EXECUTE FUNCTION reiniciar_nao_abandona_cobranca();

DROP TRIGGER IF EXISTS "reimpressao_diz_no_papel_que_e_segunda_via" ON "print_jobs";
CREATE TRIGGER "reimpressao_diz_no_papel_que_e_segunda_via"
  BEFORE INSERT OR UPDATE ON "print_jobs"
  FOR EACH ROW EXECUTE FUNCTION segunda_via_marcada_no_papel();

ALTER TABLE "print_jobs" DROP CONSTRAINT IF EXISTS "resposta_do_aparelho_ou_nada";
ALTER TABLE "print_jobs" ADD CONSTRAINT "resposta_do_aparelho_ou_nada" CHECK (
  ("estado" IN ('CONFIRMADO_PELO_APARELHO', 'RECUSADO_PELO_APARELHO'))
    = ("respondido_em" IS NOT NULL AND "resposta" IS NOT NULL));

ALTER TABLE "printers" DROP CONSTRAINT IF EXISTS "homologacao_tem_assinatura";
ALTER TABLE "printers" ADD CONSTRAINT "homologacao_tem_assinatura"
  CHECK (("homologada_em" IS NULL) = ("homologada_por" IS NULL));

ALTER TABLE "order_contacts" DROP CONSTRAINT IF EXISTS "order_contacts_customer_id_fkey";
ALTER TABLE "order_contacts" ADD CONSTRAINT "order_contacts_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
SQL
}

restaurar() {
  local estado=$?
  local i=0
  for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; rm -f "${COPIAS[$i]}"; i=$((i+1)); done
  repor_base
  if [[ "$CHEGOU_AO_FIM" -eq 0 ]]; then
    printf '\033[31mO GUIÃO NÃO CHEGOU AO FIM\033[0m — nenhum controlo foi medido.\n' >&2
    printf 'Ficheiros e base repostos.\n' >&2
    exit 1
  fi
  exit "$estado"
}
trap restaurar EXIT INT TERM

correr() { node --experimental-strip-types --test provas/kiosk.test.ts >"$1" 2>&1; }

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
  verde "$nome"
}

echo "1. Com tudo ligado"
if correr /tmp/bossaos-kiosk-ligado.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-kiosk-ligado.txt | grep -oE '[0-9]+')
  verde "${passou:-0} casos verdes"
else
  vermelho "o motor não está verde com tudo ligado"
  grep -E "^ +not ok|error: " /tmp/bossaos-kiosk-ligado.txt | head -8; exit 1
fi

echo
echo "2. CONTROLO — UM dos três caminhos de saída limpa menos"
# Este é o do critério invulgar. Não basta o caminho concluído passar: o caso
# real é a pessoa que se farta e vai embora a meio.
plantar <<'PY' || true
import io
p = 'packages/db/src/kiosk.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const anterior = await sessaoViva(db, deviceId);\n  if (anterior) {"
assert antigo in s, 'o fecho da sessao anterior nao esta onde se esperava'
novo = "  const anterior = await sessaoViva(db, deviceId);\n  if (anterior && anterior.estado !== 'ABERTA') {"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-kiosk-c2.txt || true
exigir_vermelho "caiu o fecho da sessão anterior: o segundo cliente vê o ecrã do primeiro" \
  "Dois clientes seguidos" /tmp/bossaos-kiosk-c2.txt
cp "${COPIAS[0]}" "$MOTOR_KIOSK"

echo
echo "3. CONTROLO — o «não sei» colapsa em «impresso»"
# O que a régua põe em primeiro lugar. As duas decisões erradas custam coisas
# diferentes, e é por isso que o produto não pode escolher nenhuma.
plantar <<'PY' || true
import io
p = 'packages/domain/src/impressao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (decorridos > segundosAteNaoSaber) {\n    return { sabe: false, desde };\n  }"
assert antigo in s, 'a derivacao do nao-sei nao esta onde se esperava'
novo = "  if (decorridos > segundosAteNaoSaber) {\n    return { sabe: true, estado: 'impresso' };\n  }"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-kiosk-c3.txt || true
exigir_vermelho "caiu a derivação: o que saiu passou a contar como impresso" \
  "Entregue à ponte" /tmp/bossaos-kiosk-c3.txt
cp "${COPIAS[2]}" "$PURO"

echo
echo "4. CONTROLO — a segunda via deixa de se marcar no papel"
plantar <<'PY' || true
import io
p = 'packages/domain/src/impressao.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  if (via <= 1) return corpo.join('\\n');"
assert antigo in s, 'o ramo da primeira via nao esta onde se esperava'
novo = "  if (via >= 1) return corpo.join('\\n');"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PY
correr /tmp/bossaos-kiosk-c4.txt || true
exigir_vermelho "caiu a marca: a cozinha não distingue a segunda via de um pedido novo" \
  "reimpressão distingue-se" /tmp/bossaos-kiosk-c4.txt
cp "${COPIAS[2]}" "$PURO"

echo
echo "5. CONTROLO — a base deixa de recusar duas sessões abertas"
plantar_sql <<'SQL' || true
DROP INDEX "uma_sessao_aberta_por_kiosk";
SQL
correr /tmp/bossaos-kiosk-c5.txt || true
exigir_vermelho "caiu o índice: dois clientes podem estar vivos no mesmo aparelho" \
  "Dois clientes seguidos" /tmp/bossaos-kiosk-c5.txt
repor_base

echo
echo "6. CONTROLO — o reiniciar volta a poder abandonar a cobrança"
# O cruzamento das duas coisas mais perigosas do produto: o estado indeterminado
# e o botão que limpa tudo.
plantar_sql <<'SQL' || true
DROP TRIGGER "fechar_sessao_nao_apaga_cobranca_por_resolver" ON "kiosk_sessions";
SQL
correr /tmp/bossaos-kiosk-c6.txt || true
exigir_vermelho "caiu o gatilho: o reset faz a cobrança indeterminada desaparecer" \
  "Offline não promete" /tmp/bossaos-kiosk-c6.txt
repor_base

echo
echo "7. CONTROLO — a base deixa de exigir a resposta do aparelho"
plantar_sql <<'SQL' || true
ALTER TABLE "print_jobs" DROP CONSTRAINT "resposta_do_aparelho_ou_nada";
SQL
correr /tmp/bossaos-kiosk-c7.txt || true
exigir_vermelho "caiu o CHECK: dá para chamar impresso ao que ninguém confirmou" \
  "Entregue à ponte" /tmp/bossaos-kiosk-c7.txt
repor_base

echo
echo "8. CONTROLO — a pessoa e o pedido voltam a estar presos"
# O controlo que a régua nomeia: juntar os dois e ver a prova acender. Aqui a
# junção faz-se pela ponta que a estrutura protege — a ligação deixa de cair
# com a pessoa e passa a IMPEDIR que ela seja apagada.
plantar_sql <<'SQL' || true
ALTER TABLE "order_contacts" DROP CONSTRAINT "order_contacts_customer_id_fkey";
ALTER TABLE "order_contacts" ADD CONSTRAINT "order_contacts_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT;
SQL
correr /tmp/bossaos-kiosk-c8.txt || true
exigir_vermelho "caiu a separação: apagar a pessoa deixou de ser possível" \
  "Apagar a pessoa" /tmp/bossaos-kiosk-c8.txt
repor_base

echo
echo "9. CONTROLO — a homologação volta a poder ser anónima"
plantar_sql <<'SQL' || true
ALTER TABLE "printers" DROP CONSTRAINT "homologacao_tem_assinatura";
SQL
correr /tmp/bossaos-kiosk-c9.txt || true
exigir_vermelho "caiu o CHECK: uma impressora fica homologada sem ninguém assinar" \
  "Homologação" /tmp/bossaos-kiosk-c9.txt
repor_base

echo
echo "10. Reposto"
for f in "${FICHEIROS[@]}"; do :; done
i=0; for f in "${FICHEIROS[@]}"; do cp "${COPIAS[$i]}" "$f"; i=$((i+1)); done
repor_base
if correr /tmp/bossaos-kiosk-reposto.txt; then
  passou=$(grep -oE '^# pass [0-9]+' /tmp/bossaos-kiosk-reposto.txt | grep -oE '[0-9]+')
  verde "reposto: ${passou:-0} casos verdes"
else
  vermelho "não voltou ao verde depois dos plantes — a base ou os ficheiros ficaram sujos"
  grep -E "^ +not ok" /tmp/bossaos-kiosk-reposto.txt | head -5
fi

# ── E os objectos da base estão TODOS de volta? ────────────────────────────
#
# «Reposto e verde» não chega: um objecto podia ter ficado de fora e a prova
# não o exercitar. Isto conta-os um a um.
echo
echo "11. Os objectos que os plantes desligaram estão de volta"
em_falta=0
verificar() {
  local n; n=$(psql "$MIGRATION_DATABASE_URL" -t -c "$2" | tr -d ' ')
  if [[ "$n" != "1" ]]; then printf '    em falta: %s\n' "$1"; em_falta=$((em_falta+1)); fi
}
verificar "índice uma_sessao_aberta_por_kiosk" \
  "select count(*) from pg_indexes where indexname='uma_sessao_aberta_por_kiosk';"
verificar "índice um_envio_por_identidade" \
  "select count(*) from pg_indexes where indexname='um_envio_por_identidade';"
verificar "gatilho fechar_sessao_nao_apaga_cobranca_por_resolver" \
  "select count(*) from pg_trigger where tgname='fechar_sessao_nao_apaga_cobranca_por_resolver';"
verificar "gatilho reimpressao_diz_no_papel_que_e_segunda_via" \
  "select count(*) from pg_trigger where tgname='reimpressao_diz_no_papel_que_e_segunda_via';"
verificar "CHECK resposta_do_aparelho_ou_nada" \
  "select count(*) from pg_constraint where conname='resposta_do_aparelho_ou_nada';"
verificar "CHECK homologacao_tem_assinatura" \
  "select count(*) from pg_constraint where conname='homologacao_tem_assinatura';"
verificar "FK order_contacts em CASCADE" \
  "select count(*) from pg_constraint where conname='order_contacts_customer_id_fkey' and confdeltype='c';"
if [[ "$em_falta" -eq 0 ]]; then
  verde "7 objectos de volta, incluindo a direcção do CASCADE"
else
  vermelho "$em_falta objecto(s) ficaram por repor — a base está pior do que antes desta prova"
fi

CHEGOU_AO_FIM=1
echo
[[ "$falhas" -eq 0 ]] && echo "  0 falhas." || echo "  $falhas FALHA(S)."
exit "$falhas"

#!/usr/bin/env bash
#
# E17 — o QR da mesa e o visitante.
#
# ── O controlo que decide a etapa ──────────────────────────────────────────
#
# O contrato é explícito sobre o que se pode perder aqui: *«colapsar as duas num
# "invalidar" dá um sistema que ou nunca roda, ou expulsa gente da mesa a meio do
# prato.»*
#
# Por isso o controlo 2 planta **exactamente esse colapso** — a rotação a fechar
# as sessões vivas — e o que tem de acender é o caso 1. Se acender o caso 2 em
# vez do 1, o detector está a medir a revogação e não a distinção.
#
# E o controlo 4 é o que o contrato chama pelo nome: uma prova que só testa com a
# mesa aberta não mede a fotografia do QR. Planta-se a cegueira e exige-se que o
# caso 3 caia.
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

GRUPOS_ESPERADOS=5
CASOS_ESPERADOS=21
falhas=0

VISITANTE=packages/db/src/visitante.ts
ORIG_VISITANTE=$(mktemp)
cp "$VISITANTE" "$ORIG_VISITANTE"
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

# ── Repor SEMPRE ──────────────────────────────────────────────────────────
#
# Um script morto a meio deixaria a base com a porta do visitante alargada — e um
# QR fotografado passava a abrir sessões numa mesa fechada, em silêncio, até
# alguém reparar. Foi assim que uma corrida morta do E13 deixou uma função da
# base com defeito plantado e mandou duas provas para o sítio errado.
repor_base() {
  psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
CREATE OR REPLACE FUNCTION visitante_activo(p_token_hash text)
RETURNS TABLE (
  guest_id uuid, organization_id uuid, location_id uuid,
  table_id uuid, table_session_id uuid, mesa_codigo text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT g.id, g.organization_id, g.location_id, g.table_id, g.table_session_id, t.codigo
  FROM guest_sessions g
  JOIN table_sessions ts ON ts.organization_id = g.organization_id AND ts.id = g.table_session_id
  JOIN service_tables t  ON t.organization_id  = g.organization_id AND t.id = g.table_id
  WHERE g.token_hash = p_token_hash
    AND g.estado = 'ACTIVA'
    AND ts.estado <> 'FECHADA'
$$;
CREATE OR REPLACE FUNCTION mesa_do_qr(p_slug text, p_segredo_hash text)
RETURNS TABLE (
  organization_id uuid, location_id uuid, table_id uuid,
  table_session_id uuid, mesa_codigo text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT l.organization_id, l.id, t.id, ts.id, t.codigo
  FROM locations l
  JOIN service_tables t ON t.organization_id = l.organization_id
                       AND t.location_id = l.id
                       AND t.archived_at IS NULL
  JOIN table_sessions ts ON ts.organization_id = t.organization_id
                        AND ts.table_id = t.id
                        AND ts.estado <> 'FECHADA'
  WHERE l.public_slug = p_slug
    AND l.archived_at IS NULL
    AND t.qr_segredo_hash IS NOT NULL
    AND t.qr_segredo_hash = p_segredo_hash
$$;
-- ── E a porta das CHAMADAS ────────────────────────────────────────────────
--
-- Sem esta reposição, um script morto a meio deixava a deduplicação desligada —
-- em silêncio, e cada toque no botão passava a ser um aviso à sala. É o mesmo
-- risco que o índice único do E14 correu, e a mesma resposta.
CREATE OR REPLACE FUNCTION chamar_a_sala(
  p_token_hash text, p_tipo "TipoDeChamada", p_janela_segundos integer
)
RETURNS TABLE (call_id uuid, pedida_em timestamptz, atendida_em timestamptz, deduplicada boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_guest uuid; v_org uuid; v_loc uuid; v_mesa uuid; v_sessao uuid;
  v_id uuid; v_pedida timestamptz; v_atendida timestamptz;
BEGIN
  SELECT a.guest_id, a.organization_id, a.location_id, a.table_id, a.table_session_id
    INTO v_guest, v_org, v_loc, v_mesa, v_sessao
  FROM visitante_activo(p_token_hash) a;
  IF v_guest IS NULL THEN RETURN; END IF;
  SELECT c.id, c.pedida_em, c.atendida_em INTO v_id, v_pedida, v_atendida
  FROM guest_calls c
  WHERE c.table_session_id = v_sessao
    AND c.tipo = p_tipo
    AND c.pedida_em > now() - make_interval(secs => p_janela_segundos)
  ORDER BY c.pedida_em DESC
  LIMIT 1
  FOR UPDATE;
  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, v_pedida, v_atendida, true;
    RETURN;
  END IF;
  INSERT INTO guest_calls (
    id, organization_id, location_id, table_id, table_session_id,
    guest_session_id, tipo, updated_at
  ) VALUES (
    gen_random_uuid(), v_org, v_loc, v_mesa, v_sessao, v_guest, p_tipo, now()
  ) RETURNING id, guest_calls.pedida_em INTO v_id, v_pedida;
  RETURN QUERY SELECT v_id, v_pedida, NULL::timestamptz, false;
END;
$$;
PSQL
}

restaurar() {
  cp "$ORIG_VISITANTE" "$VISITANTE"; rm -f "$ORIG_VISITANTE"
  if [[ "$BASE_MEXIDA" == "1" ]]; then
    repor_base; BASE_MEXIDA=0
    printf '  (as portas da base foram repostas)\n'
  fi
}
trap restaurar EXIT INT TERM

correr() {
  node --test --test-reporter=tap --experimental-strip-types provas/visitante.test.ts >"$1" 2>&1
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
  # ── E o que NÃO devia cair, não caiu ────────────────────────────────────
  #
  # Um defeito no colapso faz cair o caso 1. Se fizesse cair o caso 2 também, o
  # detector estaria a medir «alguma coisa parou de funcionar» em vez de medir a
  # distinção entre os dois actos — que é a única coisa que interessa aqui.
  if [[ -n "$nao_esperado" ]] && grep -qE "^ *not ok .*$nao_esperado" "$ficheiro"; then
    vermelho "$nome: caiu TAMBÉM o que não devia cair ($nao_esperado) — o detector não distingue"
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
if correr /tmp/bossaos-visitante-ligado.txt; then
  if ! leitura=$(analisar /tmp/bossaos-visitante-ligado.txt); then
    vermelho "saiu a zero mas o relatório não é TAP legível — não se mediu nada"; exit 1
  fi
  read -r grupos casos <<<"$leitura"
  if (( grupos != GRUPOS_ESPERADOS )) || (( casos != CASOS_ESPERADOS )); then
    vermelho "medido diferente do esperado: $grupos grupos (esperados $GRUPOS_ESPERADOS), $casos casos (esperados $CASOS_ESPERADOS)"; exit 1
  fi
  verde "$grupos grupos verdes, $casos casos"
else
  vermelho "a prova falhou com tudo ligado"
  grep -E '^ *not ok|error:' /tmp/bossaos-visitante-ligado.txt | head -10
  exit 1
fi

echo
echo "2. CONTROLO NEGATIVO OBRIGATÓRIO — RODAR passa a REVOGAR (o colapso)"
# O defeito que o contrato existe para impedir, plantado. A rotação passa a
# fechar as sessões vivas — e é a versão que sai de graça de quem escreve
# «invalidar o QR» sem pensar em quem está a comer.
plantar <<'PYCOLAPSO' || true
import io
p = 'packages/db/src/visitante.ts'
s = io.open(p, encoding='utf-8').read()
antigo = """  const sessoesQueContinuam = await db.guestSession.count({"""
assert antigo in s, 'a contagem da rotacao nao esta onde se esperava'
novo = """  await db.guestSession.updateMany({
    where: { tableId: mesa.id, estado: 'ACTIVA' },
    data: { estado: 'REVOGADA', revogadaEm: new Date(), revogadaPor: dados.actor.email },
  });
  const sessoesQueContinuam = await db.guestSession.count({"""
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYCOLAPSO
exigir_vermelho "caiu o caso 1: rodar expulsou alguém da mesa a meio do prato" \
  'CONTINUA activa' /tmp/bossaos-visitante-colapso.txt 'deixa de pedir'
cp "$ORIG_VISITANTE" "$VISITANTE"

echo
echo "3. CONTROLO NEGATIVO — REVOGAR passa a não fechar nada (o colapso ao contrário)"
# O outro lado: um sistema onde revogar não revoga. Passa o caso 1 com folga, e
# deixa quem se queixou de pedidos que não fez a continuar a recebê-los.
plantar <<'PYREVOGA' || true
import io
p = 'packages/db/src/visitante.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "        estado: 'REVOGADA', revogadaEm: new Date(),"
assert antigo in s, 'a escrita da revogacao nao esta onde se esperava'
# Escreve o motivo e o carimbo, e NÃO muda o estado: a linha parece tratada.
novo = "        revogadaEm: new Date(),"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo, 1))
PYREVOGA
exigir_vermelho "caiu o caso 2: a sessão revogada continuou a poder pedir" \
  'deixa de pedir' /tmp/bossaos-visitante-revoga.txt 'CONTINUA activa'
cp "$ORIG_VISITANTE" "$VISITANTE"

echo
echo "4. CONTROLO NEGATIVO — a porta deixa de olhar à MESA (a fotografia do QR)"
# «Uma prova que só teste com a mesa aberta não o mede», e a porta é onde a regra
# vive. Sem o `ts.estado <> 'FECHADA'`, um autocolante fotografado abre sessão num
# restaurante fechado — e a credencial de quem já lá esteve sobrevive à conta.
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
CREATE OR REPLACE FUNCTION mesa_do_qr(p_slug text, p_segredo_hash text)
RETURNS TABLE (
  organization_id uuid, location_id uuid, table_id uuid,
  table_session_id uuid, mesa_codigo text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT l.organization_id, l.id, t.id, ts.id, t.codigo
  FROM locations l
  JOIN service_tables t ON t.organization_id = l.organization_id
                       AND t.location_id = l.id
                       AND t.archived_at IS NULL
  JOIN table_sessions ts ON ts.organization_id = t.organization_id
                        AND ts.table_id = t.id
  WHERE l.public_slug = p_slug
    AND l.archived_at IS NULL
    AND t.qr_segredo_hash IS NOT NULL
    AND t.qr_segredo_hash = p_segredo_hash
$$;
PSQL
exigir_vermelho "caiu o caso 3: a fotografia do QR abriu sessão com a mesa fechada" \
  'tira valor à fotografia' /tmp/bossaos-visitante-mesa.txt
repor_base; BASE_MEXIDA=0

echo
echo "5. CONTROLO NEGATIVO — a credencial sobrevive ao fecho da conta"
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
CREATE OR REPLACE FUNCTION visitante_activo(p_token_hash text)
RETURNS TABLE (
  guest_id uuid, organization_id uuid, location_id uuid,
  table_id uuid, table_session_id uuid, mesa_codigo text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT g.id, g.organization_id, g.location_id, g.table_id, g.table_session_id, t.codigo
  FROM guest_sessions g
  JOIN table_sessions ts ON ts.organization_id = g.organization_id AND ts.id = g.table_session_id
  JOIN service_tables t  ON t.organization_id  = g.organization_id AND t.id = g.table_id
  WHERE g.token_hash = p_token_hash
    AND g.estado = 'ACTIVA'
$$;
PSQL
exigir_vermelho "caiu o caso 3b: a credencial sobreviveu ao fecho da conta" \
  'morre COM a mesa' /tmp/bossaos-visitante-fecho.txt
repor_base; BASE_MEXIDA=0

echo
echo "6. CONTROLO NEGATIVO — o segredo deixa de ser trocado ao rodar"
# «Rodar não fecha nada» seria satisfeito por uma rotação que não roda nada. É
# este controlo que impede a interpretação preguiçosa do controlo 2.
#
# ── O defeito tem de ISOLAR a propriedade ─────────────────────────────────
#
# A primeira versão deste controlo tirava a escrita do `qrSegredoHash`. Caiu o
# grupo inteiro — e com razão: a PRIMEIRA rotação é o que dá segredo à mesa, que
# nasce sem nenhum. Sem escrita, ninguém entra, e o detector deixou de distinguir
# «rodou mal» de «não há QR».
#
# Um defeito que derruba tudo não prova que a asserção certa funciona; prova que
# alguma coisa parou. Agora a rotação escreve sempre — mas escreve **o mesmo
# segredo**, e é isso que uma rotação que não roda realmente é.
plantar <<'PYNAORODA' || true
import io
p = 'packages/db/src/visitante.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "  const segredo = segredoNovo();"
assert antigo in s, 'a geracao do segredo nao esta onde se esperava'
# Determinístico a partir da mesa: a primeira rotação dá segredo (e a entrada
# funciona), e todas as seguintes dão o MESMO — o QR antigo continua a abrir.
novo = "  const segredo = `nao-roda-${mesa.id}`;"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYNAORODA
exigir_vermelho "caiu o QR antigo: continuou a abrir sessões depois de rodar" \
  'QR ANTIGO já não abre' /tmp/bossaos-visitante-naoroda.txt
cp "$ORIG_VISITANTE" "$VISITANTE"

echo
echo "8. CONTROLO NEGATIVO — a deduplicacao desaparece: cada toque e uma chamada"
# O defeito que o ponto 4 existe para impedir. Quem tem o QR — e basta uma
# fotografia — carrega sem parar, e quem serve recebe avisos que nao distingue de
# chamadas reais numa sala cheia.
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
CREATE OR REPLACE FUNCTION chamar_a_sala(
  p_token_hash text, p_tipo "TipoDeChamada", p_janela_segundos integer
)
RETURNS TABLE (call_id uuid, pedida_em timestamptz, atendida_em timestamptz, deduplicada boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_guest uuid; v_org uuid; v_loc uuid; v_mesa uuid; v_sessao uuid;
  v_id uuid; v_pedida timestamptz;
BEGIN
  SELECT a.guest_id, a.organization_id, a.location_id, a.table_id, a.table_session_id
    INTO v_guest, v_org, v_loc, v_mesa, v_sessao
  FROM visitante_activo(p_token_hash) a;
  IF v_guest IS NULL THEN RETURN; END IF;
  INSERT INTO guest_calls (
    id, organization_id, location_id, table_id, table_session_id,
    guest_session_id, tipo, updated_at
  ) VALUES (
    gen_random_uuid(), v_org, v_loc, v_mesa, v_sessao, v_guest, p_tipo, now()
  ) RETURNING id, guest_calls.pedida_em INTO v_id, v_pedida;
  RETURN QUERY SELECT v_id, v_pedida, NULL::timestamptz, false;
END;
$$;
PSQL
exigir_vermelho "caiu a deduplicacao: duas chamadas seguidas deixaram de dar uma" \
  'DUAS chamadas seguidas dão UMA' /tmp/bossaos-visitante-dedup.txt 'PAR: uma chamada legítima'
repor_base; BASE_MEXIDA=0

echo
echo "9. CONTROLO NEGATIVO — «IGNORA TUDO»: a janela passa a ser infinita"
# ── E este e o que a regua nomeia pelo nome ──────────────────────────────────
#
# «Sem o par, "ignora tudo" passa o teste.» Uma janela infinita deduplica sempre:
# passa o controlo 8 com folga, e engole a chamada de quem esperou e ninguem veio
# — que e' pior do que nao limitar, porque a pessoa deixa de ter forma de o dizer.
#
# O que tem de acender e' o PAR, e o controlo 8 tem de continuar verde: se os dois
# caissem, o detector estaria a medir 'alguma coisa parou'.
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
CREATE OR REPLACE FUNCTION chamar_a_sala(
  p_token_hash text, p_tipo "TipoDeChamada", p_janela_segundos integer
)
RETURNS TABLE (call_id uuid, pedida_em timestamptz, atendida_em timestamptz, deduplicada boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_guest uuid; v_org uuid; v_loc uuid; v_mesa uuid; v_sessao uuid;
  v_id uuid; v_pedida timestamptz; v_atendida timestamptz;
BEGIN
  SELECT a.guest_id, a.organization_id, a.location_id, a.table_id, a.table_session_id
    INTO v_guest, v_org, v_loc, v_mesa, v_sessao
  FROM visitante_activo(p_token_hash) a;
  IF v_guest IS NULL THEN RETURN; END IF;
  SELECT c.id, c.pedida_em, c.atendida_em INTO v_id, v_pedida, v_atendida
  FROM guest_calls c
  WHERE c.table_session_id = v_sessao AND c.tipo = p_tipo
  ORDER BY c.pedida_em DESC LIMIT 1 FOR UPDATE;
  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, v_pedida, v_atendida, true;
    RETURN;
  END IF;
  INSERT INTO guest_calls (
    id, organization_id, location_id, table_id, table_session_id,
    guest_session_id, tipo, updated_at
  ) VALUES (
    gen_random_uuid(), v_org, v_loc, v_mesa, v_sessao, v_guest, p_tipo, now()
  ) RETURNING id, guest_calls.pedida_em INTO v_id, v_pedida;
  RETURN QUERY SELECT v_id, v_pedida, NULL::timestamptz, false;
END;
$$;
PSQL
exigir_vermelho "caiu o PAR: uma chamada legitima depois da janela foi engolida" \
  'PAR: uma chamada legítima' /tmp/bossaos-visitante-ignora.txt 'DUAS chamadas seguidas dão UMA'
repor_base; BASE_MEXIDA=0

echo
echo "10. CONTROLO NEGATIVO — a janela passa a ser por TELEMOVEL e nao por mesa"
# Quem tem a fotografia do QR abre outra sessao e chama outra vez. Uma janela por
# sessao limitava cada telemovel e nao limitava nada.
BASE_MEXIDA=1
psql "$MIGRATION_DATABASE_URL" -q >/dev/null 2>&1 <<'PSQL'
CREATE OR REPLACE FUNCTION chamar_a_sala(
  p_token_hash text, p_tipo "TipoDeChamada", p_janela_segundos integer
)
RETURNS TABLE (call_id uuid, pedida_em timestamptz, atendida_em timestamptz, deduplicada boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_guest uuid; v_org uuid; v_loc uuid; v_mesa uuid; v_sessao uuid;
  v_id uuid; v_pedida timestamptz; v_atendida timestamptz;
BEGIN
  SELECT a.guest_id, a.organization_id, a.location_id, a.table_id, a.table_session_id
    INTO v_guest, v_org, v_loc, v_mesa, v_sessao
  FROM visitante_activo(p_token_hash) a;
  IF v_guest IS NULL THEN RETURN; END IF;
  SELECT c.id, c.pedida_em, c.atendida_em INTO v_id, v_pedida, v_atendida
  FROM guest_calls c
  WHERE c.guest_session_id = v_guest AND c.tipo = p_tipo
    AND c.pedida_em > now() - make_interval(secs => p_janela_segundos)
  ORDER BY c.pedida_em DESC LIMIT 1 FOR UPDATE;
  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, v_pedida, v_atendida, true;
    RETURN;
  END IF;
  INSERT INTO guest_calls (
    id, organization_id, location_id, table_id, table_session_id,
    guest_session_id, tipo, updated_at
  ) VALUES (
    gen_random_uuid(), v_org, v_loc, v_mesa, v_sessao, v_guest, p_tipo, now()
  ) RETURNING id, guest_calls.pedida_em INTO v_id, v_pedida;
  RETURN QUERY SELECT v_id, v_pedida, NULL::timestamptz, false;
END;
$$;
PSQL
exigir_vermelho "caiu a unidade: um segundo telemovel contornou o limite" \
  'por MESA, e não por telemóvel' /tmp/bossaos-visitante-telemovel.txt
repor_base; BASE_MEXIDA=0

echo
echo "11. CONTROLO NEGATIVO — a confirmacao de atendimento deixa de chegar ao visitante"
# «Sem ela, quem chamou nao sabe se alguem vem, e volta a carregar.» A chamada
# fica atendida do lado da sala e o visitante nunca sabe — que e' o pior dos dois
# mundos: o aviso sai da fila e a pessoa continua a carregar.
plantar <<'PYCONFIRMA' || true
import io
p = 'packages/db/src/visitante.ts'
s = io.open(p, encoding='utf-8').read()
antigo = "    atendidaEm: l.atendida_em, atendidaPor: l.atendida_por,"
assert antigo in s, 'a leitura do atendimento nao esta onde se esperava'
novo = "    atendidaEm: null, atendidaPor: null,"
io.open(p, 'w', encoding='utf-8').write(s.replace(antigo, novo))
PYCONFIRMA
exigir_vermelho "caiu a confirmacao: quem chamou deixou de saber que alguem foi" \
  'CONFIRMAÇÃO fecha o ciclo' /tmp/bossaos-visitante-confirma.txt
cp "$ORIG_VISITANTE" "$VISITANTE"

echo
echo "12. Reposto — tem de voltar ao verde"
if correr /tmp/bossaos-visitante-reposto.txt; then
  read -r g c <<<"$(analisar /tmp/bossaos-visitante-reposto.txt)"
  verde "reposto: $g grupos, $c casos"
else
  vermelho "NÃO voltou ao verde depois dos controlos"
  grep -E '^ *not ok' /tmp/bossaos-visitante-reposto.txt | head -6
fi

echo
if (( falhas == 0 )); then printf '\033[32m%s\033[0m\n' "Visitante provado: 0 falhas."
else printf '\033[31m%s\033[0m\n' "$falhas FALHA(S)."; fi
exit $(( falhas > 0 ? 1 : 0 ))

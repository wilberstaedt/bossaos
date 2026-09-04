-- ── E17 · as chamadas da mesa (ponto 4 do enunciado) ───────────────────────
--
-- «Chamar equipa e pedir conta com limites de frequência, deduplicação e
-- confirmação de atendimento.»
--
-- O que isto impede: quem tem o QR — e basta uma fotografia — carrega em chamar
-- sem parar, e quem serve recebe avisos que não distingue de chamadas reais numa
-- sala cheia. E a confirmação é a outra metade: sem ela, quem chamou não sabe se
-- alguém vem, e volta a carregar.
--
-- O carimbo que o Prisma gerou ordenava antes das outras: renomeado para o fim.

-- CreateEnum
CREATE TYPE "TipoDeChamada" AS ENUM ('AJUDA', 'CONTA');

-- CreateTable
CREATE TABLE "guest_calls" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "table_session_id" UUID NOT NULL,
    "guest_session_id" UUID NOT NULL,
    "tipo" "TipoDeChamada" NOT NULL,
    "pedida_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendida_em" TIMESTAMPTZ(6),
    "atendida_por" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "guest_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_calls_organization_id_location_id_atendida_em_idx" ON "guest_calls"("organization_id", "location_id", "atendida_em");

-- CreateIndex
CREATE INDEX "guest_calls_table_session_id_tipo_pedida_em_idx" ON "guest_calls"("table_session_id", "tipo", "pedida_em");

-- CreateIndex
CREATE UNIQUE INDEX "guest_calls_organization_id_id_key" ON "guest_calls"("organization_id", "id");

-- AddForeignKey
ALTER TABLE "guest_calls" ADD CONSTRAINT "guest_calls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_calls" ADD CONSTRAINT "guest_calls_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_calls" ADD CONSTRAINT "guest_calls_organization_id_table_id_fkey" FOREIGN KEY ("organization_id", "table_id") REFERENCES "service_tables"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_calls" ADD CONSTRAINT "guest_calls_organization_id_table_session_id_fkey" FOREIGN KEY ("organization_id", "table_session_id") REFERENCES "table_sessions"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_calls" ADD CONSTRAINT "guest_calls_organization_id_guest_session_id_fkey" FOREIGN KEY ("organization_id", "guest_session_id") REFERENCES "guest_sessions"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- O que faz o limite ser verdade
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "guest_calls" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "guest_calls"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

GRANT SELECT, INSERT, UPDATE ON "guest_calls" TO bossaos_app;

-- Uma chamada não se apaga. É o registo de que alguém pediu ajuda — e o que se
-- pergunta quando um cliente diz que ninguém foi lá é exactamente isto: houve
-- chamada, a que horas, e quem a atendeu. Apagá-la fazia a pergunta ficar sem
-- resposta.
REVOKE DELETE ON "guest_calls" FROM bossaos_app;

-- ── A porta do visitante: CHAMAR, com a janela lá dentro ──────────────────
--
-- Quem chama não tem sessão de inquilino, como em todo o E17. E a decisão de
-- deduplicar vive **na porta** e não em quem chama: uma verificação feita antes
-- do `INSERT`, do lado da aplicação, é a mesma corrida do E13 com outro nome —
-- dois toques ao mesmo tempo lêem ambos «não há chamada aberta» e escrevem duas.
--
-- Aqui a leitura e a escrita são o mesmo acto, dentro da mesma instrução.
CREATE OR REPLACE FUNCTION chamar_a_sala(
  p_token_hash text, p_tipo "TipoDeChamada", p_janela_segundos integer
)
RETURNS TABLE (call_id uuid, pedida_em timestamptz, atendida_em timestamptz, deduplicada boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_guest uuid; v_org uuid; v_loc uuid; v_mesa uuid; v_sessao uuid;
  v_id uuid; v_pedida timestamptz; v_atendida timestamptz;
BEGIN
  -- A mesma porta estreita de sempre: activa E com a mesa por fechar. Sem ela,
  -- uma credencial revogada continuava a poder chamar.
  SELECT a.guest_id, a.organization_id, a.location_id, a.table_id, a.table_session_id
    INTO v_guest, v_org, v_loc, v_mesa, v_sessao
  FROM visitante_activo(p_token_hash) a;

  IF v_guest IS NULL THEN RETURN; END IF;

  -- ── A DEDUPLICAÇÃO, e é por MESA ────────────────────────────────────────
  --
  -- A chave é (sessão de mesa, tipo) dentro da janela. Por telemóvel não
  -- limitava nada: quem tem a fotografia do QR abre outra sessão e chama outra
  -- vez. E por mesa é a unidade certa do outro lado — duas pessoas sentadas
  -- juntas a carregarem no botão são uma chamada, não duas.
  --
  -- `FOR UPDATE` porque duas chamadas simultâneas na mesma mesa é exactamente o
  -- caso: sem o bloqueio, as duas leem que não há nada e as duas escrevem.
  SELECT c.id, c.pedida_em, c.atendida_em INTO v_id, v_pedida, v_atendida
  FROM guest_calls c
  WHERE c.table_session_id = v_sessao
    AND c.tipo = p_tipo
    AND c.pedida_em > now() - make_interval(secs => p_janela_segundos)
  ORDER BY c.pedida_em DESC
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NOT NULL THEN
    -- Já houve uma dentro da janela: é a mesma chamada. Devolve-se a que existe,
    -- **com o estado dela** — se alguém já a atendeu, quem carregou outra vez vê
    -- isso, que é a informação que o faria parar de carregar.
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

REVOKE ALL ON FUNCTION chamar_a_sala(text, "TipoDeChamada", integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION chamar_a_sala(text, "TipoDeChamada", integer) TO bossaos_app;

-- ── E a leitura do estado, para o visitante saber se alguém vem ───────────
CREATE OR REPLACE FUNCTION chamadas_da_visita(p_token_hash text)
RETURNS TABLE (
  call_id uuid, tipo "TipoDeChamada", pedida_em timestamptz,
  atendida_em timestamptz, atendida_por text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT c.id, c.tipo, c.pedida_em, c.atendida_em, c.atendida_por
  FROM visitante_activo(p_token_hash) a
  JOIN guest_calls c ON c.table_session_id = a.table_session_id
  ORDER BY c.pedida_em DESC
$$;

REVOKE ALL ON FUNCTION chamadas_da_visita(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION chamadas_da_visita(text) TO bossaos_app;

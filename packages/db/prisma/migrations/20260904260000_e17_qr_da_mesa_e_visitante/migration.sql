-- ── E17 · o QR da mesa e o visitante ───────────────────────────────────────
--
-- Um QR numa mesa é um segredo que qualquer pessoa fotografa. A resposta óbvia —
-- «então roda-se» — cria o problema oposto se rodar significar revogar: os
-- clientes a meio da refeição perdem o carrinho e a sessão, o restaurante aprende
-- isso uma vez e nunca mais roda. O token volta a ser eterno, agora com a ilusão
-- de que não é.
--
-- São DOIS actos, e a diferença está na forma: a `guest_sessions` não guarda a
-- geração do QR que a abriu. Sem esse campo, ninguém pode escrever a comparação
-- que faria a rotação expulsar gente da mesa — é preciso uma migração para o
-- acrescentar, e uma migração é revista.
--
-- O carimbo que o Prisma gerou ordenava antes do E16, de que isto depende:
-- renomeado para ordenar no fim.

-- CreateEnum
CREATE TYPE "EstadoDoVisitante" AS ENUM ('ACTIVA', 'REVOGADA');

-- AlterTable
ALTER TABLE "service_tables" ADD COLUMN     "qr_geracao" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qr_rodado_em" TIMESTAMPTZ(6),
ADD COLUMN     "qr_segredo_hash" TEXT;

-- CreateTable
CREATE TABLE "guest_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "table_session_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "estado" "EstadoDoVisitante" NOT NULL DEFAULT 'ACTIVA',
    "aberta_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_vez_em" TIMESTAMPTZ(6),
    "revogada_em" TIMESTAMPTZ(6),
    "revogada_por" TEXT,
    "revogada_motivo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_sessions_token_hash_key" ON "guest_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "guest_sessions_organization_id_location_id_estado_idx" ON "guest_sessions"("organization_id", "location_id", "estado");

-- CreateIndex
CREATE INDEX "guest_sessions_table_session_id_idx" ON "guest_sessions"("table_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "guest_sessions_organization_id_id_key" ON "guest_sessions"("organization_id", "id");

-- AddForeignKey
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_organization_id_table_id_fkey" FOREIGN KEY ("organization_id", "table_id") REFERENCES "service_tables"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_organization_id_table_session_id_fkey" FOREIGN KEY ("organization_id", "table_session_id") REFERENCES "table_sessions"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- O que faz a regra ser verdade
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "guest_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "guest_sessions"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

GRANT SELECT, INSERT, UPDATE ON "guest_sessions" TO bossaos_app;

-- Uma sessão de visitante não se apaga: revoga-se, ou morre com a mesa. Apagá-la
-- fazia desaparecer o rasto de quem pediu o quê — e é o rasto que serve a quem
-- se queixa de pedidos que não fez, que é o caso em que a revogação existe.
REVOKE DELETE ON "guest_sessions" FROM bossaos_app;

-- ── A porta ESTREITA do visitante ─────────────────────────────────────────
--
-- Quem chega pelo QR não tem sessão de inquilino: não há `app.organization_id`,
-- e por isso não há política de linha que o deixe ler nada. É a mesma situação
-- da carta pública do E09, e a resposta é a mesma — uma porta estreita, e não
-- privilégio ao runtime.
--
-- ── E a porta encerra a regra, para nenhum leitor a poder esquecer ────────
--
-- «Uma sessão de visitante não sobrevive ao fecho da mesa.» Isso é **derivado**,
-- e a derivação vive AQUI, num sítio só. Espalhada por consultas, o dia em que
-- alguém escrevesse `WHERE estado = 'ACTIVA'` e se esquecesse da mesa era o dia
-- em que a conta fechada continuava a aceitar pedidos.
--
-- Repare no que a função NÃO recebe e NÃO consulta: a geração do QR. Rodar não
-- passa por aqui, e por isso não pode fechar nada.
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
    -- Dela: ninguém a revogou.
    AND g.estado = 'ACTIVA'
    -- E da mesa: a conta ainda não fechou. As duas, sempre.
    AND ts.estado <> 'FECHADA'
$$;

REVOKE ALL ON FUNCTION visitante_activo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION visitante_activo(text) TO bossaos_app;

-- ── A porta que ABRE uma sessão de visitante ──────────────────────────────
--
-- Recebe o resumo do segredo do QR e devolve a mesa **apenas se** houver uma
-- sessão de mesa aberta. É aqui que «mesa fechada com QR válido não abre sessão
-- nenhuma» é uma propriedade e não uma promessa: sem sessão aberta a função não
-- devolve linha, e quem chamar não tem a que se prender.
--
-- Uma prova que só teste com a mesa aberta não mede isto — está escrito no
-- contrato, e o controlo negativo 3 planta exactamente essa cegueira.
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
    -- O segredo ACTUAL da mesa. Um QR antigo não casa — e é por isso que rodar
    -- impede sessões novas sem tocar nas que já existem.
    AND t.qr_segredo_hash IS NOT NULL
    AND t.qr_segredo_hash = p_segredo_hash
$$;

REVOKE ALL ON FUNCTION mesa_do_qr(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mesa_do_qr(text, text) TO bossaos_app;

-- ── E a INSERÇÃO da sessão de visitante, também pela porta ────────────────
--
-- Quem chega pelo QR não tem contexto de inquilino, e a política de linha do
-- `WITH CHECK` recusaria a escrita. Dar contexto ao runtime aqui era abrir a
-- organização inteira a quem tem um autocolante.
--
-- Esta função escreve UMA linha, com os identificadores que a `mesa_do_qr`
-- devolveu — e volta a verificar a mesa aberta, porque entre ler e escrever a
-- equipa pode ter fechado a conta.
CREATE OR REPLACE FUNCTION abrir_visitante(
  p_slug text, p_segredo_hash text, p_token_hash text
)
RETURNS TABLE (guest_id uuid, table_session_id uuid, mesa_codigo text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid; v_loc uuid; v_mesa uuid; v_sessao uuid; v_codigo text; v_id uuid;
BEGIN
  SELECT m.organization_id, m.location_id, m.table_id, m.table_session_id, m.mesa_codigo
    INTO v_org, v_loc, v_mesa, v_sessao, v_codigo
  FROM mesa_do_qr(p_slug, p_segredo_hash) m;

  -- Sem mesa aberta com aquele segredo, não há sessão. Devolve ZERO linhas, e
  -- não uma linha com campos a null — quem chama tem de distinguir «abriu» de
  -- «não abriu», e uma linha vazia convida a tratar as duas como a mesma coisa.
  IF v_sessao IS NULL THEN RETURN; END IF;

  INSERT INTO guest_sessions (
    id, organization_id, location_id, table_id, table_session_id, token_hash, updated_at
  ) VALUES (
    gen_random_uuid(), v_org, v_loc, v_mesa, v_sessao, p_token_hash, now()
  ) RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_sessao, v_codigo;
END;
$$;

REVOKE ALL ON FUNCTION abrir_visitante(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION abrir_visitante(text, text, text) TO bossaos_app;

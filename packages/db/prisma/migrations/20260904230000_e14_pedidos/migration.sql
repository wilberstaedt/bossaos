-- ── E14 · motor de pedidos e entrega confiável ─────────────────────────────
--
-- A primeira etapa onde um defeito cobra dinheiro duas vezes ou faz desaparecer
-- o trabalho de alguém a meio de um serviço. As garantias estão na FORMA — o que
-- vem no fim deste ficheiro é o que o Prisma não exprime, e é a parte que
-- carrega os três aceites.

-- CreateEnum
CREATE TYPE "EstadoDePedido" AS ENUM ('RASCUNHO', 'ACEITE', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoDeLinha" AS ENUM ('PROPOSTA', 'ACEITE', 'REJEITADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MotivoDeRejeicao" AS ENUM ('ESGOTADO', 'SEM_PRECO', 'PRECO_DIVERGENTE', 'PRODUTO_DESCONHECIDO');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "table_session_id" UUID,
    "canal" "Canal" NOT NULL,
    "numero" TEXT NOT NULL,
    "estado" "EstadoDePedido" NOT NULL DEFAULT 'RASCUNHO',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "aberto_por" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "submission_id" UUID,
    "product_id" UUID,
    "nome" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "preco_menor" INTEGER,
    "moeda" CHAR(3),
    "opcoes" JSONB,
    "preco_proposto_menor" INTEGER,
    "estado" "EstadoDeLinha" NOT NULL DEFAULT 'PROPOSTA',
    "motivo_rejeicao" "MotivoDeRejeicao",
    "aceite_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_submissions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "command_id" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "resposta" JSONB NOT NULL,
    "criado_por" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "accao" TEXT NOT NULL,
    "detalhe" JSONB,
    "actor_email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "aceitacao_automatica" BOOLEAN NOT NULL DEFAULT true,
    "maximo_por_linha" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_organization_id_location_id_estado_idx" ON "orders"("organization_id", "location_id", "estado");

-- CreateIndex
CREATE INDEX "orders_table_session_id_idx" ON "orders"("table_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_organization_id_id_key" ON "orders"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_location_id_numero_key" ON "orders"("location_id", "numero");

-- CreateIndex
CREATE INDEX "order_lines_organization_id_order_id_idx" ON "order_lines"("organization_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_lines_organization_id_id_key" ON "order_lines"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "order_submissions_command_id_key" ON "order_submissions"("command_id");

-- CreateIndex
CREATE INDEX "order_submissions_organization_id_order_id_idx" ON "order_submissions"("organization_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_submissions_organization_id_id_key" ON "order_submissions"("organization_id", "id");

-- CreateIndex
CREATE INDEX "order_events_organization_id_order_id_created_at_idx" ON "order_events"("organization_id", "order_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_rules_location_id_key" ON "order_rules"("location_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_organization_id_order_id_fkey" FOREIGN KEY ("organization_id", "order_id") REFERENCES "orders"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_submissions" ADD CONSTRAINT "order_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_submissions" ADD CONSTRAINT "order_submissions_organization_id_order_id_fkey" FOREIGN KEY ("organization_id", "order_id") REFERENCES "orders"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_organization_id_order_id_fkey" FOREIGN KEY ("organization_id", "order_id") REFERENCES "orders"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_rules" ADD CONSTRAINT "order_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_rules" ADD CONSTRAINT "order_rules_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- O que faz os três aceites serem verdade
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Isolamento por inquilino ──────────────────────────────────────────────
ALTER TABLE "orders"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_lines"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_events"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_rules"       ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "orders"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "order_lines"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "order_submissions"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "order_events"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "order_rules"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

GRANT SELECT, INSERT, UPDATE, DELETE ON "orders"            TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "order_lines"       TO bossaos_app;
GRANT SELECT, INSERT                 ON "order_submissions" TO bossaos_app;
GRANT SELECT, INSERT                 ON "order_events"      TO bossaos_app;
GRANT SELECT, INSERT, UPDATE         ON "order_rules"       TO bossaos_app;

-- ── O envio não se reescreve nem se apaga ─────────────────────────────────
--
-- É a metade do aceite 1 que não é a chave única. Um envio que se possa apagar
-- é uma chave que volta a ficar livre — e o reenvio, que tinha de devolver a
-- mesma resposta, cria um segundo pedido. A imutabilidade não é higiene: é a
-- condição para a chave única querer dizer alguma coisa ao longo do tempo.
REVOKE UPDATE, DELETE ON "order_submissions" FROM bossaos_app;
REVOKE UPDATE, DELETE ON "order_events"      FROM bossaos_app;

-- ── E a linha ACEITE não muda de preço ────────────────────────────────────
--
-- O aceite 3 já está garantido pela forma — o preço é copiado para a linha, e
-- uma publicação nova escreve noutra tabela. Isto fecha o caminho que sobra: o
-- próprio produto a reescrever a linha depois de ela ter sido aceite.
--
-- Um gatilho e não um privilégio, porque a coluna TEM de ser escrita uma vez —
-- é o acto de aceitar — e o que não pode é ser escrita OUTRA vez. Privilégio de
-- coluna não distingue as duas.
CREATE OR REPLACE FUNCTION linha_aceite_nao_muda_de_preco()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.estado = 'ACEITE'
     AND (NEW.preco_menor IS DISTINCT FROM OLD.preco_menor
          OR NEW.moeda IS DISTINCT FROM OLD.moeda
          OR NEW.quantidade IS DISTINCT FROM OLD.quantidade) THEN
    RAISE EXCEPTION
      'linha ja aceite nao muda de preco nem de quantidade (linha %)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER linha_aceite_imutavel
  BEFORE UPDATE ON "order_lines"
  FOR EACH ROW EXECUTE FUNCTION linha_aceite_nao_muda_de_preco();

-- Cancelar continua a poder: muda o ESTADO, não o preço. É a diferença entre
-- «esta linha não vai» e «esta linha custava outra coisa».

-- ── E16 · produção, estações e KDS ─────────────────────────────────────────
--
-- O modo de falha desta área NÃO DÁ ERRO. Numa cozinha, quando isto parte, não
-- aparece uma mensagem vermelha: aparece um prato que nunca é feito, e ninguém
-- descobre até o cliente perguntar. Do ponto de vista do software nada correu
-- mal — o pedido simplesmente nunca chegou ao ecrã.
--
-- Por isso as garantias estão na FORMA. O que vem no fim deste ficheiro é o que
-- o Prisma não exprime, e é a parte que carrega os aceites.

-- CreateEnum
CREATE TYPE "TipoDeEstacao" AS ENUM ('PREPARACAO', 'EXPO');

-- CreateEnum
CREATE TYPE "EstadoDaProducao" AS ENUM ('POR_INICIAR', 'EM_PREPARO', 'PRONTA', 'ENTREGUE', 'CANCELADA');

-- CreateTable
CREATE TABLE "production_stations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoDeEstacao" NOT NULL DEFAULT 'PREPARACAO',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "limite_visivel" INTEGER NOT NULL DEFAULT 12,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "production_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "station_id" UUID NOT NULL,
    "product_id" UUID,
    "category_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "line_id" UUID NOT NULL,
    "station_id" UUID,
    "estado" "EstadoDaProducao" NOT NULL DEFAULT 'POR_INICIAR',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciada_em" TIMESTAMPTZ(6),
    "pronta_em" TIMESTAMPTZ(6),
    "entregue_em" TIMESTAMPTZ(6),
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "motivo_prioridade" TEXT,
    "motivo_cancelamento" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "production_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_events" (
    "cursor" BIGSERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "task_id" UUID,
    "order_id" UUID NOT NULL,
    "accao" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "detalhe" JSONB,
    "actor_email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_events_pkey" PRIMARY KEY ("cursor")
);

-- CreateIndex
CREATE INDEX "production_stations_organization_id_location_id_idx" ON "production_stations"("organization_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_stations_organization_id_id_key" ON "production_stations"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "production_stations_location_id_nome_key" ON "production_stations"("location_id", "nome");

-- CreateIndex
CREATE INDEX "routing_rules_organization_id_location_id_idx" ON "routing_rules"("organization_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "routing_rules_location_id_station_id_product_id_key" ON "routing_rules"("location_id", "station_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "routing_rules_location_id_station_id_category_id_key" ON "routing_rules"("location_id", "station_id", "category_id");

-- CreateIndex
CREATE INDEX "production_tasks_organization_id_location_id_estado_idx" ON "production_tasks"("organization_id", "location_id", "estado");

-- CreateIndex
CREATE INDEX "production_tasks_organization_id_order_id_idx" ON "production_tasks"("organization_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_tasks_organization_id_id_key" ON "production_tasks"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "production_tasks_line_id_station_id_key" ON "production_tasks"("line_id", "station_id");

-- CreateIndex
CREATE INDEX "production_events_organization_id_location_id_cursor_idx" ON "production_events"("organization_id", "location_id", "cursor");

-- AddForeignKey
ALTER TABLE "production_stations" ADD CONSTRAINT "production_stations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_stations" ADD CONSTRAINT "production_stations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_organization_id_station_id_fkey" FOREIGN KEY ("organization_id", "station_id") REFERENCES "production_stations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_organization_id_category_id_fkey" FOREIGN KEY ("organization_id", "category_id") REFERENCES "categories"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_organization_id_order_id_fkey" FOREIGN KEY ("organization_id", "order_id") REFERENCES "orders"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_organization_id_line_id_fkey" FOREIGN KEY ("organization_id", "line_id") REFERENCES "order_lines"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_organization_id_station_id_fkey" FOREIGN KEY ("organization_id", "station_id") REFERENCES "production_stations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_events" ADD CONSTRAINT "production_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_events" ADD CONSTRAINT "production_events_organization_id_task_id_fkey" FOREIGN KEY ("organization_id", "task_id") REFERENCES "production_tasks"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- O que faz os aceites serem verdade
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Isolamento por inquilino ──────────────────────────────────────────────
ALTER TABLE "production_stations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routing_rules"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "production_tasks"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "production_events"   ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "production_stations"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "routing_rules"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "production_tasks"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "production_events"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

GRANT SELECT, INSERT, UPDATE, DELETE ON "production_stations" TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "routing_rules"       TO bossaos_app;
GRANT SELECT, INSERT, UPDATE         ON "production_tasks"    TO bossaos_app;
GRANT SELECT, INSERT                 ON "production_events"   TO bossaos_app;
GRANT USAGE, SELECT ON SEQUENCE "production_events_cursor_seq" TO bossaos_app;

-- ── O histórico não se reescreve nem se apaga ─────────────────────────────
--
-- É o que faz o cursor querer dizer alguma coisa ao longo do tempo. Um evento
-- que se possa apagar deixa um buraco na sequência — e o cliente que detecta um
-- intervalo desconhecido vai buscar o estado autoritativo por nada, sempre.
--
-- Uma tarefa também não se apaga: o que se faz a uma tarefa é CANCELÁ-LA, com
-- motivo. Apagá-la fazia desaparecer o tempo e os ingredientes que já foram
-- gastos nela, que é precisamente o que o contrato manda registar.
REVOKE UPDATE, DELETE ON "production_events" FROM bossaos_app;
REVOKE DELETE          ON "production_tasks"  FROM bossaos_app;

-- ── A regra aponta a UM alvo: produto ou categoria, nunca ambos ───────────
--
-- Sem isto, uma regra com os dois preenchidos casa duas vezes com o mesmo
-- produto e a base recusa a segunda tarefa pelo índice único — o sintoma seria
-- uma linha a perder uma estação sem ninguém perceber porquê. E uma regra sem
-- alvo nenhum não encaminha nada: existe na lista e não faz nada, que é pior do
-- que não existir.
ALTER TABLE "routing_rules" ADD CONSTRAINT "regra_tem_exactamente_um_alvo"
  CHECK (num_nonnulls(product_id, category_id) = 1);

-- ── O carimbo de criação é do SERVIDOR, e não do cliente ──────────────────
--
-- «Os temporizadores contam a partir do carimbo do servidor, nunca do relógio do
-- tablet» (`kds-e-tempo-real.md`). O tablet da cozinha é exactamente o aparelho
-- que ninguém acerta, e com o relógio dele um bilhete velho podia parecer novo.
--
-- O `DEFAULT now()` não chega: um cliente pode mandar um valor e o `DEFAULT`
-- nunca é usado. Este gatilho **ignora** o que vier de fora e escreve o relógio
-- da base — a garantia deixa de depender de quem escreve se lembrar.
CREATE OR REPLACE FUNCTION producao_carimbo_do_servidor()
RETURNS TRIGGER AS $$
BEGIN
  NEW.criada_em := COALESCE(OLD.criada_em, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tarefa_carimbo_do_servidor
  BEFORE INSERT OR UPDATE ON "production_tasks"
  FOR EACH ROW EXECUTE FUNCTION producao_carimbo_do_servidor();

-- ── Uma versão antiga NUNCA se aplica sobre uma mais recente ──────────────
--
-- «Eventos chegam repetidos e fora de ordem — isso é normal, não é avaria. O que
-- não pode acontecer é um evento atrasado reabrir um bilhete que já saiu.»
--
-- Esta é a metade da garantia que vive na BASE, e vale mesmo quando quem escreve
-- se engana: a versão de uma tarefa só sobe. Uma escrita que a faça descer é
-- recusada, e o ecrã não pode regredir por causa dela.
--
-- A outra metade — o cliente a descartar um evento atrasado — vive na lógica e
-- tem prova própria. As duas falham por motivos diferentes, que é o que faz uma
-- redundância valer alguma coisa.
CREATE OR REPLACE FUNCTION tarefa_versao_so_sobe()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.versao < OLD.versao THEN
    RAISE EXCEPTION 'versao_regrediu: a tarefa % esta na versao %, e tentou-se escrever %',
      OLD.id, OLD.versao, NEW.versao
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tarefa_versao_monotona
  BEFORE UPDATE ON "production_tasks"
  FOR EACH ROW EXECUTE FUNCTION tarefa_versao_so_sobe();

-- ── O estado de PRODUÇÃO do pedido DERIVA, e não se escreve ───────────────
--
-- `tarefas-de-producao-e-estacoes.md`, invariante 2: *«o estado do pedido deriva
-- das tarefas; nunca se escreve directamente. Guardar o estado do pedido em
-- paralelo cria duas verdades, e a que o expo mostra passa a depender de quem
-- escreveu por último.»*
--
-- `orders.estado` continua a existir e a ser escrito — mas só no que é do E14: o
-- ciclo COMERCIAL do pedido (rascunho, aceite, entregue, cancelado). Os dois
-- estados de PRODUÇÃO, `EM_PREPARO` e `PRONTO`, passam a ser derivados das
-- tarefas e a base recusa-os por escrita directa.
--
-- Sem este gatilho a regra era prosa: o ecrã de edição do E14 tinha-os na lista
-- de escolhas e alguém os poria à mão, criando a segunda verdade que o contrato
-- proíbe. Prosa não é uma verificação — é a lição que atravessou este projecto
-- inteiro.
CREATE OR REPLACE FUNCTION pedido_nao_escreve_estado_de_producao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado IN ('EM_PREPARO', 'PRONTO')
     AND (TG_OP = 'INSERT' OR NEW.estado IS DISTINCT FROM OLD.estado) THEN
    RAISE EXCEPTION 'estado_de_producao_e_derivado: % nao se escreve no pedido; deriva das tarefas de producao',
      NEW.estado
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pedido_estado_de_producao_deriva
  BEFORE INSERT OR UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION pedido_nao_escreve_estado_de_producao();

-- ── E20 · um pedido para as 20h não é trabalho para agora ──────────────────
--
-- «O ecrã do KDS é um sítio onde tudo o que aparece é para fazer: pôr lá o que
-- não é para agora não é um incómodo visual, é ensinar a cozinha a ignorar o
-- ecrã.» E a resposta oposta — «só aparece quando for a hora» — tem o defeito
-- simétrico: um pedido que aparece às 19h55 para as 20h não se faz a tempo.
--
-- A produção vê o pedido a partir do seu MOMENTO DE PRODUÇÃO, que é a hora de
-- entrega menos o preparo.

-- ── O canal que faltava, e é uma DIMENSÃO, não uma tabela ─────────────────
--
-- «A tentação é uma tabela de takeaway ao lado — parece mais simples e é a
-- decisão mais cara do projecto depois de tomada.» Com duas tabelas, o filtro
-- por canal passa e o KDS parte; ou pior, passam os dois e os números do
-- relatório deixam de bater.
ALTER TYPE "Canal" ADD VALUE IF NOT EXISTS 'DELIVERY';

-- ── O preparo, que não existia em lado nenhum ─────────────────────────────
--
-- Sem ele o momento de produção não é derivável. Fica no produto porque é do
-- produto: um bife demora o que demora, em qualquer canal.
ALTER TABLE "products"
  ADD COLUMN "preparo_min" INTEGER NOT NULL DEFAULT 15;

ALTER TABLE "products"
  ADD CONSTRAINT "preparo_nao_negativo" CHECK ("preparo_min" >= 0);

ALTER TABLE "orders"
  -- A hora combinada com a pessoa. UTC, sempre; resolvida pelo fuso da unidade
  -- antes de chegar aqui.
  ADD COLUMN "entregar_as"  TIMESTAMPTZ(6),
  -- ── DERIVADO. Nunca escrito por quem pede ──────────────────────────────
  --
  -- «Nunca escrito pelo cliente, que não sabe quanto demora.» Há um gatilho
  -- em baixo a garanti-lo: um valor vindo de fora é substituído, não recusado
  -- com erro — porque quem o mandou não estava a atacar, estava a copiar um
  -- exemplo.
  ADD COLUMN "producao_em"  TIMESTAMPTZ(6),
  -- O maior preparo das linhas, guardado no momento em que o pedido é aceite.
  -- Recalcular a partir do catálogo mais tarde daria um momento de produção que
  -- muda sozinho quando alguém edita um produto.
  ADD COLUMN "preparo_min"  INTEGER,
  -- A identidade do pedido no sistema de quem o mandou. É a chave da
  -- idempotência do conector externo.
  ADD COLUMN "externo_id"   TEXT,
  ADD COLUMN "externo_canal" TEXT;

CREATE UNIQUE INDEX "um_pedido_por_id_externo"
  ON "orders"("location_id", "externo_canal", "externo_id")
  WHERE "externo_id" IS NOT NULL;

CREATE INDEX "orders_location_id_producao_em_idx"
  ON "orders"("location_id", "producao_em");

-- ── O momento de produção deriva, e o gatilho é quem o garante ────────────
--
-- Sem isto, `producao_em` era mais uma coluna que alguém podia escrever — e a
-- primeira vez que a escrevesse errada, a comida saía à hora errada sem nada
-- dar erro.
--
-- Um pedido sem `entregar_as` é para AGORA, e o momento de produção é nulo: não
-- há nada a adiar. É a diferença entre «não tem hora» e «tem hora zero».
CREATE OR REPLACE FUNCTION pedido_deriva_momento_de_producao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entregar_as IS NULL THEN
    NEW.producao_em := NULL;
  ELSE
    NEW.producao_em := NEW.entregar_as - make_interval(mins => COALESCE(NEW.preparo_min, 0));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pedido_momento_de_producao_deriva
  BEFORE INSERT OR UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION pedido_deriva_momento_de_producao();

-- ── A área servida, e a taxa que NÃO se inventa ───────────────────────────
--
-- «Se não houver taxa definida para aquela área, o sistema não escolhe uma.»
-- Ausência não é política, e um valor por omissão que ninguém decidiu é uma
-- decisão do dono tomada por nós.
--
-- Por isso a taxa é `NOT NULL` **na área**: uma área existe com a sua taxa, ou
-- não existe. Não há linha de área sem preço, que seria o sítio exacto onde o
-- zero por omissão nasceria.
CREATE TABLE "delivery_areas" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    -- O código postal que a área serve. Simples de propósito: um polígono é
    -- outra etapa, e fingir que temos geografia era pior do que não ter.
    "codigo_postal" TEXT NOT NULL,
    "taxa_menor" INTEGER NOT NULL,
    "moeda" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "delivery_areas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_areas_organization_id_id_key" ON "delivery_areas"("organization_id", "id");
CREATE UNIQUE INDEX "uma_area_por_codigo_postal" ON "delivery_areas"("location_id", "codigo_postal");

ALTER TABLE "delivery_areas" ADD CONSTRAINT "delivery_areas_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_areas" ADD CONSTRAINT "delivery_areas_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_areas"
  ADD CONSTRAINT "taxa_nao_negativa" CHECK ("taxa_menor" >= 0);

ALTER TABLE "delivery_areas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "delivery_areas"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

-- ── A entrega: morada mínima, e nada mais ─────────────────────────────────
--
-- «Não exponha endereços ou telefones nas telas públicas de fila.» A morada vive
-- aqui, numa tabela à parte do pedido, para que uma consulta da fila não a
-- possa trazer por distracção — a projecção pública lê `orders`, e a morada não
-- está lá.
CREATE TABLE "order_deliveries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "area_id" UUID,
    "morada" TEXT NOT NULL,
    "codigo_postal" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "notas" TEXT,
    "taxa_menor" INTEGER NOT NULL,
    "moeda" TEXT NOT NULL,
    "entregue_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_deliveries_organization_id_id_key" ON "order_deliveries"("organization_id", "id");
CREATE UNIQUE INDEX "uma_entrega_por_pedido" ON "order_deliveries"("order_id");
CREATE UNIQUE INDEX "order_deliveries_organization_id_order_id_key" ON "order_deliveries"("organization_id", "order_id");

ALTER TABLE "order_deliveries" ADD CONSTRAINT "order_deliveries_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_deliveries" ADD CONSTRAINT "order_deliveries_organization_id_order_id_fkey"
  FOREIGN KEY ("organization_id", "order_id") REFERENCES "orders"("organization_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_deliveries" ADD CONSTRAINT "order_deliveries_organization_id_area_id_fkey"
  FOREIGN KEY ("organization_id", "area_id") REFERENCES "delivery_areas"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_deliveries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "order_deliveries"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

-- ── O conector externo: desligado, e visível como desligado ───────────────
--
-- Mesma forma do conector de mensageria do E19: `activo` sem `provedor` não é um
-- estado. «Uma integração que finge é pior do que uma que falta, porque a que
-- falta vê-se.»
CREATE TABLE "delivery_connectors" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "provedor" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "delivery_connectors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_connectors_location_id_key" ON "delivery_connectors"("location_id");
CREATE UNIQUE INDEX "delivery_connectors_organization_id_id_key" ON "delivery_connectors"("organization_id", "id");

ALTER TABLE "delivery_connectors" ADD CONSTRAINT "delivery_connectors_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_connectors" ADD CONSTRAINT "delivery_connectors_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_connectors"
  ADD CONSTRAINT "conector_de_entrega_activo_exige_provedor" CHECK (
    "activo" = false OR "provedor" IS NOT NULL);

ALTER TABLE "delivery_connectors" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "delivery_connectors"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

-- ── O mapeamento do catálogo externo ──────────────────────────────────────
--
-- O que lá fora se chama «Burger 4» é aqui um `product_id`. Sem este mapa, cada
-- pedido externo obrigava alguém a adivinhar — e adivinhar num pedido é servir
-- outra coisa.
CREATE TABLE "external_catalog_mappings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "canal_externo" TEXT NOT NULL,
    "id_externo" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "external_catalog_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_catalog_mappings_organization_id_id_key"
  ON "external_catalog_mappings"("organization_id", "id");
CREATE UNIQUE INDEX "um_mapa_por_id_externo"
  ON "external_catalog_mappings"("location_id", "canal_externo", "id_externo");

ALTER TABLE "external_catalog_mappings" ADD CONSTRAINT "external_catalog_mappings_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_catalog_mappings" ADD CONSTRAINT "external_catalog_mappings_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_catalog_mappings" ADD CONSTRAINT "external_catalog_mappings_organization_id_product_id_fkey"
  FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "external_catalog_mappings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "external_catalog_mappings"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

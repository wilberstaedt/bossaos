-- E26 · Compras e fornecedores
-- Contrato: docs/architecture/compras-e-fornecedores.md
--
-- Encomendado, recebido e facturado vivem em três tabelas porque são três
-- factos, ditos por gente diferente, em momentos diferentes. Não há coluna
-- `divergencia`: as diferenças derivam-se da comparação, como o saldo de stock
-- e o estado da conta.

CREATE TABLE "suppliers" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  "contacto"        TEXT,
  "nif"             TEXT,
  "arquivado_em"    TIMESTAMPTZ(6),
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "um_fornecedor_por_nome" ON "suppliers" ("location_id", "nome");
CREATE INDEX "suppliers_org" ON "suppliers" ("organization_id");

-- ── O artigo deste fornecedor, e o factor que NÃO se adivinha ──────────────
--
-- «Sem factor de conversão, recusa-se» — e a recusa está na FORMA, não num `if`
-- que alguém tem de se lembrar de escrever. Um saco de 25 kg lido como uma
-- unidade dá stock de 1 onde há 25 000 g, e o inventário só o revela ao fim do
-- mês, sem causa aparente.
CREATE TABLE "supplier_items" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"   UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "supplier_id"       UUID NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
  "item_id"           UUID NOT NULL REFERENCES "stock_items"("id") ON DELETE CASCADE,
  "unidade_de_compra" TEXT   NOT NULL,
  "factor_mili"       BIGINT NOT NULL,
  "preco_menor"       BIGINT,
  "moeda"             TEXT   NOT NULL DEFAULT 'EUR',
  "criado_em"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "factor_de_compra_tem_de_ser_positivo" CHECK ("factor_mili" > 0),
  CONSTRAINT "unidade_de_compra_nao_e_vazia" CHECK (length(btrim("unidade_de_compra")) > 0)
);
CREATE UNIQUE INDEX "um_artigo_por_fornecedor_e_insumo"
  ON "supplier_items" ("supplier_id", "item_id");

CREATE TABLE "purchase_orders" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "supplier_id"     UUID NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
  "numero"          TEXT NOT NULL,
  -- Só ABERTA ou FECHADA. Um estado `RECEBIDA` obrigava a escolher entre
  -- «recebida» e «recebida a menos», e a escolha apagava a diferença.
  "estado"          TEXT NOT NULL DEFAULT 'ABERTA',
  "criada_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "criada_por"      TEXT,
  CONSTRAINT "estado_da_encomenda_conhecido" CHECK ("estado" IN ('ABERTA', 'FECHADA'))
);
CREATE UNIQUE INDEX "um_numero_por_unidade" ON "purchase_orders" ("location_id", "numero");

CREATE TABLE "purchase_order_lines" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"   UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "purchase_order_id" UUID NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
  "supplier_item_id"  UUID NOT NULL REFERENCES "supplier_items"("id") ON DELETE RESTRICT,
  "encomendado_mili"  BIGINT NOT NULL,
  CONSTRAINT "encomendado_tem_de_ser_positivo" CHECK ("encomendado_mili" > 0)
);
CREATE UNIQUE INDEX "um_artigo_por_encomenda"
  ON "purchase_order_lines" ("purchase_order_id", "supplier_item_id");

CREATE TABLE "receipts" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"   UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "purchase_order_id" UUID NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
  "recebida_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "recebida_por"      TEXT,
  "nota"              TEXT
);
CREATE INDEX "receipts_por_encomenda" ON "receipts" ("purchase_order_id");

CREATE TABLE "receipt_lines" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"        UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "receipt_id"             UUID NOT NULL REFERENCES "receipts"("id") ON DELETE CASCADE,
  "purchase_order_line_id" UUID NOT NULL REFERENCES "purchase_order_lines"("id") ON DELETE CASCADE,
  "recebido_mili"          BIGINT NOT NULL,
  "custo_total_menor"      BIGINT NOT NULL,
  "moeda"                  TEXT   NOT NULL DEFAULT 'EUR',
  CONSTRAINT "recebido_tem_de_ser_positivo" CHECK ("recebido_mili" > 0),
  CONSTRAINT "custo_nao_e_negativo" CHECK ("custo_total_menor" >= 0)
);
CREATE INDEX "receipt_lines_por_linha" ON "receipt_lines" ("purchase_order_line_id");

CREATE TABLE "supplier_invoices" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"   UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "supplier_id"       UUID NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
  "purchase_order_id" UUID REFERENCES "purchase_orders"("id") ON DELETE SET NULL,
  "numero"            TEXT NOT NULL,
  "emitida_em"        TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "um_numero_por_fornecedor"
  ON "supplier_invoices" ("supplier_id", "numero");

CREATE TABLE "supplier_invoice_lines" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "invoice_id"       UUID NOT NULL REFERENCES "supplier_invoices"("id") ON DELETE CASCADE,
  "supplier_item_id" UUID NOT NULL REFERENCES "supplier_items"("id") ON DELETE RESTRICT,
  "facturado_mili"   BIGINT NOT NULL,
  "total_menor"      BIGINT NOT NULL,
  "moeda"            TEXT   NOT NULL DEFAULT 'EUR',
  CONSTRAINT "facturado_tem_de_ser_positivo" CHECK ("facturado_mili" > 0)
);
CREATE INDEX "supplier_invoice_lines_por_factura" ON "supplier_invoice_lines" ("invoice_id");

-- ── Só a RECEPÇÃO mexe no stock ───────────────────────────────────────────
--
-- A garantia é pela AUSÊNCIA: o movimento ganha `receipt_line_id` e não ganha
-- `purchase_order_line_id` nem `supplier_invoice_line_id`. Uma coluna que não
-- existe não pode apontar para o sítio errado.
ALTER TABLE "stock_movements"
  ADD COLUMN "receipt_line_id" UUID
    REFERENCES "receipt_lines"("id") ON DELETE SET NULL;

-- E a identidade é a do ACONTECIMENTO: gravar a mesma recepção duas vezes é UMA
-- entrada. Um duplo carregar no botão com o camionista à espera é o cenário
-- provável, não o raro.
CREATE UNIQUE INDEX "uma_entrada_por_linha_de_recepcao"
  ON "stock_movements" ("receipt_line_id")
  WHERE "receipt_line_id" IS NOT NULL AND "tipo" = 'ENTRADA';

-- ── E a encomenda NÃO pode mexer no stock, mesmo que alguém tente ──────────
--
-- Um movimento cuja razão diga que veio de uma encomenda, sem recepção por
-- trás, é o defeito que a régua nomeia: a cozinha vê farinha que está dentro de
-- um camião. A forma recusa-o.
CREATE OR REPLACE FUNCTION entrada_de_compra_exige_recepcao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."tipo" = 'ENTRADA'
     AND NEW."receipt_line_id" IS NULL
     AND NEW."motivo" LIKE 'encomenda%' THEN
    RAISE EXCEPTION 'ENTRADA_SEM_RECEPCAO: uma encomenda é uma intenção; só a recepção mexe no stock';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "compra_so_entra_por_recepcao"
  BEFORE INSERT OR UPDATE ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION entrada_de_compra_exige_recepcao();

ALTER TABLE "suppliers"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_items"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_orders"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_lines"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipts"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipt_lines"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_invoices"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_invoice_lines" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_por_org" ON "suppliers"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "supplier_items_por_org" ON "supplier_items"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "purchase_orders_por_org" ON "purchase_orders"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "purchase_order_lines_por_org" ON "purchase_order_lines"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "receipts_por_org" ON "receipts"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "receipt_lines_por_org" ON "receipt_lines"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "supplier_invoices_por_org" ON "supplier_invoices"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "supplier_invoice_lines_por_org" ON "supplier_invoice_lines"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());

-- ── E25 · o stock não é uma coluna ────────────────────────────────────────
--
-- «Quem o guardar como número e o for actualizando perde-o na primeira
-- transacção que reverte — e o sintoma não é um erro, é uma contagem que não
-- bate ao fim do mês sem ninguém saber desde quando.»

CREATE TYPE "TipoDeMovimentoDeStock" AS ENUM (
  'ENTRADA', 'CONSUMO', 'QUEBRA', 'AJUSTE', 'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA'
);

-- ── O insumo ──────────────────────────────────────────────────────────────
--
-- As quantidades são INTEIRAS, em milésimos da unidade: 1 kg é 1_000_000, 1 g é
-- 1000. `0,1 + 0,2` não é `0,3`, e três gramas por prato viram um quilo por mês.
-- O sufixo `_mili` diz a escala, como o `_menor` diz no dinheiro.
CREATE TABLE "stock_items" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  "unidade"         TEXT NOT NULL,
  -- ── DERIVADO. Ninguém escreve aqui ──────────────────────────────────────
  --
  -- Há coluna porque a leitura tem de ser barata, mas o gatilho recalcula-a a
  -- cada movimento e substitui o que venha de fora. É a mesma forma do
  -- `producao_em` do E20: não é uma regra que se respeita, é uma coisa que não
  -- se consegue fazer.
  "saldo_mili"      BIGINT NOT NULL DEFAULT 0,
  "minimo_mili"     BIGINT,
  "criado_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "unidade_conhecida" CHECK ("unidade" IN ('KG', 'L', 'UN')),
  CONSTRAINT "nome_do_insumo" CHECK (length(btrim("nome")) > 0)
);
CREATE UNIQUE INDEX "um_insumo_por_nome_e_unidade"
  ON "stock_items" ("location_id", "nome");
-- Os que estão a dever. É esta a lista que a tela mostra, e é ela que impede o
-- negativo de ser silencioso.
CREATE INDEX "insumos_em_divida" ON "stock_items" ("location_id")
  WHERE "saldo_mili" < 0;

-- ── Os movimentos: cada um com momento, autor e razão ─────────────────────
CREATE TABLE "stock_movements" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "item_id"         UUID NOT NULL REFERENCES "stock_items"("id") ON DELETE CASCADE,
  "tipo"            "TipoDeMovimentoDeStock" NOT NULL,
  -- Sempre POSITIVA. O sinal vem do tipo, e não do número: um consumo com
  -- quantidade negativa seria uma entrada disfarçada, e ninguém daria por isso
  -- a ler o relatório.
  "quantidade_mili" BIGINT NOT NULL,
  "motivo"          TEXT NOT NULL,
  "actor"           UUID REFERENCES "users"("id") ON DELETE SET NULL,
  -- De onde veio, quando veio do serviço.
  "order_line_id"   UUID REFERENCES "order_lines"("id") ON DELETE SET NULL,
  "criado_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "quantidade_positiva" CHECK ("quantidade_mili" > 0),
  CONSTRAINT "movimento_com_motivo" CHECK (length(btrim("motivo")) > 0)
);
CREATE INDEX "movimentos_por_insumo" ON "stock_movements" ("item_id", "criado_em");
-- A mesma linha de pedido não consome duas vezes. É a identidade do
-- acontecimento outra vez: servir duas vezes o mesmo prato é um só consumo.
CREATE UNIQUE INDEX "um_consumo_por_linha_e_insumo"
  ON "stock_movements" ("order_line_id", "item_id")
  WHERE "order_line_id" IS NOT NULL AND "tipo" = 'CONSUMO';

-- ── O saldo, derivado por GATILHO ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION stock_recalcula_saldo(o_item UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE "stock_items" SET "saldo_mili" = COALESCE((
    SELECT SUM(CASE
      WHEN m."tipo" IN ('ENTRADA', 'AJUSTE', 'TRANSFERENCIA_ENTRADA') THEN m."quantidade_mili"
      ELSE -m."quantidade_mili"
    END)
    FROM "stock_movements" m WHERE m."item_id" = o_item
  ), 0)
  WHERE "id" = o_item;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION stock_saldo_deriva()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM stock_recalcula_saldo(OLD."item_id");
    RETURN OLD;
  END IF;
  PERFORM stock_recalcula_saldo(NEW."item_id");
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "movimentos_derivam_saldo"
  AFTER INSERT OR UPDATE OR DELETE ON "stock_movements"
  FOR EACH ROW EXECUTE FUNCTION stock_saldo_deriva();

-- ── E um saldo escrito de fora é REPOSTO ──────────────────────────────────
--
-- Sem isto, a coluna derivada continuava a aceitar um `UPDATE` directo — e a
-- primeira pessoa que o fizesse teria um saldo que a soma dos movimentos
-- desmente, exactamente o defeito que esta etapa existe para impedir.
CREATE OR REPLACE FUNCTION stock_saldo_nao_se_escreve()
RETURNS TRIGGER AS $$
BEGIN
  -- Sem escotilha: recalcula-se SEMPRE a partir dos movimentos. Uma condição de
  -- escape aqui — «excepto quando a aplicação disser que é recálculo» — seria
  -- uma porta das traseiras, e uma guarda com porta das traseiras não é uma
  -- guarda. O recálculo interno escreve o mesmo valor, por isso não colide.
  IF NEW."saldo_mili" IS DISTINCT FROM OLD."saldo_mili" THEN
    NEW."saldo_mili" := COALESCE((
      SELECT SUM(CASE
        WHEN m."tipo" IN ('ENTRADA', 'AJUSTE', 'TRANSFERENCIA_ENTRADA') THEN m."quantidade_mili"
        ELSE -m."quantidade_mili"
      END)
      FROM "stock_movements" m WHERE m."item_id" = NEW."id"
    ), 0);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "saldo_de_stock_nao_se_escreve"
  BEFORE UPDATE ON "stock_items"
  FOR EACH ROW EXECUTE FUNCTION stock_saldo_nao_se_escreve();

-- ── A ficha técnica: uma ÁRVORE ───────────────────────────────────────────
--
-- Um prato consome ingredientes; um ingrediente pode ser uma sub-receita que
-- consome outros. Vender um prato desce até às FOLHAS — desconta os
-- ingredientes reais, e não a sub-receita como se fosse um produto comprado.
CREATE TABLE "recipes" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  -- A ficha de um produto da carta, ou uma sub-receita sem produto.
  "product_id"      UUID REFERENCES "products"("id") ON DELETE SET NULL,
  "rende_mili"      BIGINT NOT NULL DEFAULT 1000,
  "criada_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "rendimento_positivo" CHECK ("rende_mili" > 0)
);
CREATE UNIQUE INDEX "uma_ficha_por_produto"
  ON "recipes" ("product_id") WHERE "product_id" IS NOT NULL;
CREATE INDEX "fichas_por_unidade" ON "recipes" ("location_id");

-- Uma linha da ficha aponta OU para um insumo OU para outra ficha. Nunca as
-- duas, nunca nenhuma: sem isto havia linhas que não descontam nada e ninguém
-- daria por elas até a contagem não bater.
CREATE TABLE "recipe_lines" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "recipe_id"       UUID NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "item_id"         UUID REFERENCES "stock_items"("id") ON DELETE RESTRICT,
  "sub_recipe_id"   UUID REFERENCES "recipes"("id") ON DELETE RESTRICT,
  "quantidade_mili" BIGINT NOT NULL,
  CONSTRAINT "linha_aponta_a_um_so" CHECK (
    ("item_id" IS NOT NULL AND "sub_recipe_id" IS NULL)
    OR ("item_id" IS NULL AND "sub_recipe_id" IS NOT NULL)
  ),
  CONSTRAINT "quantidade_de_linha_positiva" CHECK ("quantidade_mili" > 0)
);
CREATE INDEX "linhas_por_ficha" ON "recipe_lines" ("recipe_id");

-- ── O ciclo é recusado NA ESCRITA ─────────────────────────────────────────
--
-- «Não detectado em serviço, quando o desconto entrar em recursão a meio de um
-- sábado.» Em serviço, o que se vê não é um ciclo: é o sistema a parar.
--
-- A travessia é recursiva e pára no primeiro reencontro. Corre uma vez por
-- escrita de linha — que é raro — e nunca no caminho do serviço, que é quente.
CREATE OR REPLACE FUNCTION ficha_recusa_ciclo()
RETURNS TRIGGER AS $$
DECLARE
  encontrou BOOLEAN;
BEGIN
  IF NEW."sub_recipe_id" IS NULL THEN RETURN NEW; END IF;
  IF NEW."sub_recipe_id" = NEW."recipe_id" THEN
    RAISE EXCEPTION 'FICHA_CICLICA: uma ficha não pode conter-se a si própria'
      USING ERRCODE = 'check_violation';
  END IF;
  WITH RECURSIVE descendo AS (
    SELECT l."sub_recipe_id" AS ficha
      FROM "recipe_lines" l
     WHERE l."recipe_id" = NEW."sub_recipe_id" AND l."sub_recipe_id" IS NOT NULL
    UNION
    SELECT l."sub_recipe_id"
      FROM "recipe_lines" l
      JOIN descendo d ON l."recipe_id" = d.ficha
     WHERE l."sub_recipe_id" IS NOT NULL
  )
  SELECT EXISTS (SELECT 1 FROM descendo WHERE ficha = NEW."recipe_id") INTO encontrou;
  IF encontrou THEN
    RAISE EXCEPTION 'FICHA_CICLICA: esta linha fecharia um ciclo na árvore da ficha'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "linhas_de_ficha_recusam_ciclo"
  BEFORE INSERT OR UPDATE ON "recipe_lines"
  FOR EACH ROW EXECUTE FUNCTION ficha_recusa_ciclo();

ALTER TABLE "stock_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "stock_items"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "stock_movements"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "recipes"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
ALTER TABLE "recipe_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "recipe_lines"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

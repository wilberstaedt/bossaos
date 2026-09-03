-- CreateEnum
CREATE TYPE "EstadoDeCatalogo" AS ENUM ('RASCUNHO', 'ACTIVO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('CARTA', 'SITE', 'SALA', 'TPV', 'TAKEAWAY', 'KIOSK');

-- CreateEnum
CREATE TYPE "EstadoDeAlergenio" AS ENUM ('CONTEM', 'PODE_CONTER', 'NAO_CONTEM');

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "location_id" UUID,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "periodo_de" TIMESTAMPTZ(6),
    "periodo_ate" TIMESTAMPTZ(6),
    "estado" "EstadoDeCatalogo" NOT NULL DEFAULT 'RASCUNHO',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_channels" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "canal" "Canal" NOT NULL,

    CONSTRAINT "menu_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 1,
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "category_id" UUID,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "sku" TEXT,
    "estado" "EstadoDeCatalogo" NOT NULL DEFAULT 'RASCUNHO',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_translations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "origem_versao" INTEGER NOT NULL,
    "revisto_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 1,
    "predefinida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "location_id" UUID,
    "canal" "Canal",
    "de_quando" TIMESTAMPTZ(6),
    "ate_quando" TIMESTAMPTZ(6),
    "montante_menor" INTEGER NOT NULL,
    "moeda" CHAR(3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_groups" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "minimo" INTEGER NOT NULL DEFAULT 0,
    "maximo" INTEGER,
    "destino" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_options" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 1,
    "preco_menor" INTEGER,
    "moeda" CHAR(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "modifier_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_modifier_groups" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "product_modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergens" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "regiao" TEXT NOT NULL DEFAULT 'UE',
    "ordem" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allergens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_allergens" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "allergen_id" UUID NOT NULL,
    "estado" "EstadoDeAlergenio" NOT NULL,
    "revisto_por" TEXT,
    "revisto_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_allergens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_dietary_tags" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_dietary_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_channels" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "canal" "Canal" NOT NULL,
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_availability" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "location_id" UUID,
    "bloqueado" BOOLEAN NOT NULL DEFAULT true,
    "ate" TIMESTAMPTZ(6),
    "motivo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menus_organization_id_idx" ON "menus"("organization_id");

-- CreateIndex
CREATE INDEX "menus_organization_id_brand_id_idx" ON "menus"("organization_id", "brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "menus_organization_id_id_key" ON "menus"("organization_id", "id");

-- CreateIndex
CREATE INDEX "menu_channels_organization_id_idx" ON "menu_channels"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_channels_organization_id_menu_id_canal_key" ON "menu_channels"("organization_id", "menu_id", "canal");

-- CreateIndex
CREATE INDEX "categories_organization_id_idx" ON "categories"("organization_id");

-- CreateIndex
CREATE INDEX "categories_organization_id_brand_id_idx" ON "categories"("organization_id", "brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_organization_id_id_key" ON "categories"("organization_id", "id");

-- CreateIndex
CREATE INDEX "menu_categories_organization_id_idx" ON "menu_categories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_organization_id_menu_id_category_id_key" ON "menu_categories"("organization_id", "menu_id", "category_id");

-- CreateIndex
CREATE INDEX "products_organization_id_idx" ON "products"("organization_id");

-- CreateIndex
CREATE INDEX "products_organization_id_brand_id_idx" ON "products"("organization_id", "brand_id");

-- CreateIndex
CREATE INDEX "products_organization_id_category_id_idx" ON "products"("organization_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_brand_id_sku_key" ON "products"("organization_id", "brand_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_id_key" ON "products"("organization_id", "id");

-- CreateIndex
CREATE INDEX "product_translations_organization_id_idx" ON "product_translations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_translations_organization_id_product_id_locale_key" ON "product_translations"("organization_id", "product_id", "locale");

-- CreateIndex
CREATE INDEX "product_variants_organization_id_idx" ON "product_variants"("organization_id");

-- CreateIndex
CREATE INDEX "product_variants_organization_id_product_id_idx" ON "product_variants"("organization_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_organization_id_id_key" ON "product_variants"("organization_id", "id");

-- CreateIndex
CREATE INDEX "price_rules_organization_id_idx" ON "price_rules"("organization_id");

-- CreateIndex
CREATE INDEX "price_rules_organization_id_product_id_idx" ON "price_rules"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "modifier_groups_organization_id_idx" ON "modifier_groups"("organization_id");

-- CreateIndex
CREATE INDEX "modifier_groups_organization_id_brand_id_idx" ON "modifier_groups"("organization_id", "brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "modifier_groups_organization_id_id_key" ON "modifier_groups"("organization_id", "id");

-- CreateIndex
CREATE INDEX "modifier_options_organization_id_idx" ON "modifier_options"("organization_id");

-- CreateIndex
CREATE INDEX "modifier_options_organization_id_group_id_idx" ON "modifier_options"("organization_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "modifier_options_organization_id_id_key" ON "modifier_options"("organization_id", "id");

-- CreateIndex
CREATE INDEX "product_modifier_groups_organization_id_idx" ON "product_modifier_groups"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_modifier_groups_organization_id_product_id_group_id_key" ON "product_modifier_groups"("organization_id", "product_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "allergens_codigo_key" ON "allergens"("codigo");

-- CreateIndex
CREATE INDEX "product_allergens_organization_id_idx" ON "product_allergens"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_allergens_organization_id_product_id_allergen_id_key" ON "product_allergens"("organization_id", "product_id", "allergen_id");

-- CreateIndex
CREATE INDEX "product_dietary_tags_organization_id_idx" ON "product_dietary_tags"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_dietary_tags_organization_id_product_id_codigo_key" ON "product_dietary_tags"("organization_id", "product_id", "codigo");

-- CreateIndex
CREATE INDEX "product_channels_organization_id_idx" ON "product_channels"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_channels_organization_id_product_id_canal_key" ON "product_channels"("organization_id", "product_id", "canal");

-- CreateIndex
CREATE INDEX "product_availability_organization_id_idx" ON "product_availability"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_availability_organization_id_product_id_location_id_key" ON "product_availability"("organization_id", "product_id", "location_id");

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_organization_id_brand_id_fkey" FOREIGN KEY ("organization_id", "brand_id") REFERENCES "brands"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_channels" ADD CONSTRAINT "menu_channels_organization_id_menu_id_fkey" FOREIGN KEY ("organization_id", "menu_id") REFERENCES "menus"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_brand_id_fkey" FOREIGN KEY ("organization_id", "brand_id") REFERENCES "brands"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_organization_id_menu_id_fkey" FOREIGN KEY ("organization_id", "menu_id") REFERENCES "menus"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_organization_id_category_id_fkey" FOREIGN KEY ("organization_id", "category_id") REFERENCES "categories"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_brand_id_fkey" FOREIGN KEY ("organization_id", "brand_id") REFERENCES "brands"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_category_id_fkey" FOREIGN KEY ("organization_id", "category_id") REFERENCES "categories"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_organization_id_variant_id_fkey" FOREIGN KEY ("organization_id", "variant_id") REFERENCES "product_variants"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_organization_id_brand_id_fkey" FOREIGN KEY ("organization_id", "brand_id") REFERENCES "brands"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_organization_id_group_id_fkey" FOREIGN KEY ("organization_id", "group_id") REFERENCES "modifier_groups"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_organization_id_group_id_fkey" FOREIGN KEY ("organization_id", "group_id") REFERENCES "modifier_groups"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allergens" ADD CONSTRAINT "product_allergens_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allergens" ADD CONSTRAINT "product_allergens_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "allergens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_dietary_tags" ADD CONSTRAINT "product_dietary_tags_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_channels" ADD CONSTRAINT "product_channels_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_availability" ADD CONSTRAINT "product_availability_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_availability" ADD CONSTRAINT "product_availability_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- A parte escrita à mão. O Prisma gera as tabelas; as regras que a base tem de
-- garantir e a fronteira de privilégios escrevem-se aqui.

-- ── A biblioteca de alérgenos: os catorze do anexo II do 1169/2011 ─────────
--
-- Semeada e não inventada. É a lista **legal** da jurisdição onde o piloto
-- opera, e o conjunto é fechado por lei e não por nós. Outras regiões têm outras
-- listas — a australiana inclui o gergelim desde 2024, a brasileira segue a RDC
-- 26/2015 — e entram com os mercados, pela coluna `regiao`.
INSERT INTO "allergens" (id, codigo, regiao, ordem) VALUES
  (gen_random_uuid(), 'gluten',          'UE',  1),
  (gen_random_uuid(), 'crustaceos',      'UE',  2),
  (gen_random_uuid(), 'ovos',            'UE',  3),
  (gen_random_uuid(), 'peixe',           'UE',  4),
  (gen_random_uuid(), 'amendoins',       'UE',  5),
  (gen_random_uuid(), 'soja',            'UE',  6),
  (gen_random_uuid(), 'leite',           'UE',  7),
  (gen_random_uuid(), 'frutos-de-casca', 'UE',  8),
  (gen_random_uuid(), 'aipo',            'UE',  9),
  (gen_random_uuid(), 'mostarda',        'UE', 10),
  (gen_random_uuid(), 'sesamo',          'UE', 11),
  (gen_random_uuid(), 'sulfitos',        'UE', 12),
  (gen_random_uuid(), 'tremoco',         'UE', 13),
  (gen_random_uuid(), 'moluscos',        'UE', 14)
ON CONFLICT (codigo) DO NOTHING;

-- **O runtime LÊ a biblioteca e não a escreve.**
--
-- É a mesma decisão do catálogo de planos do E05, pela mesma razão: uma lista
-- de alérgenos que o processo do restaurante pode reescrever é um restaurante a
-- apagar um alérgeno da lista. O que ele escreve são as DECLARAÇÕES, que são
-- dele; a lista do que existe para declarar não é.
REVOKE ALL    ON "allergens" FROM bossaos_app;
GRANT  SELECT ON "allergens" TO   bossaos_app;
REVOKE ALL    ON "allergens" FROM bossaos_auth;

-- ── Regras que a BASE recusa ───────────────────────────────────────────────

-- Dinheiro em unidades mínimas inteiras. A coluna já é `integer`, o que torna
-- um valor fraccionário impossível de guardar — esta é a moeda.
ALTER TABLE "price_rules"
  ADD CONSTRAINT "preco_moeda_iso" CHECK (moeda ~ '^[A-Z]{3}$');
ALTER TABLE "modifier_options"
  ADD CONSTRAINT "opcao_moeda_iso" CHECK (moeda IS NULL OR moeda ~ '^[A-Z]{3}$');
-- Um acréscimo sem moeda, ou uma moeda sem acréscimo, é meia informação. E
-- `NULL` continua a ser diferente de zero: não acrescenta nada ≠ acrescenta 0,00.
ALTER TABLE "modifier_options"
  ADD CONSTRAINT "opcao_preco_com_moeda"
  CHECK ((preco_menor IS NULL) = (moeda IS NULL));

-- A janela de um preço tem de fazer sentido. Fim antes do início é um preço que
-- nunca se aplica, e um preço que nunca se aplica é um preço em falta.
ALTER TABLE "price_rules"
  ADD CONSTRAINT "preco_janela_valida"
  CHECK (de_quando IS NULL OR ate_quando IS NULL OR ate_quando > de_quando);

-- A forma do grupo de modificadores, com as MESMAS regras do domínio. Lá diz-se
-- qual grupo e porquê, para o ecrã poder apontar; aqui impede-se quem escrever
-- por outro caminho.
ALTER TABLE "modifier_groups"
  ADD CONSTRAINT "grupo_bem_formado"
  CHECK (
    minimo >= 0
    AND (maximo IS NULL OR maximo >= 1)
    AND (maximo IS NULL OR maximo >= minimo)
    -- Obrigatório com mínimo zero satisfaz-se sem escolher nada: é opcional com
    -- outro nome, e o ecrã diria "obrigatório" a um grupo que não obriga.
    AND NOT (obrigatorio AND minimo = 0)
  );

ALTER TABLE "categories"      ADD CONSTRAINT "categoria_ordem" CHECK (ordem >= 1);
ALTER TABLE "menu_categories" ADD CONSTRAINT "seccao_ordem"    CHECK (ordem >= 1);
ALTER TABLE "product_variants" ADD CONSTRAINT "variante_ordem" CHECK (ordem >= 1);
ALTER TABLE "modifier_options" ADD CONSTRAINT "opcao_ordem"    CHECK (ordem >= 1);

-- Os três idiomas que o E02 fixou. Uma tradução em francês entraria na base e
-- não teria onde ser mostrada.
ALTER TABLE "product_translations"
  ADD CONSTRAINT "traducao_idioma" CHECK (locale IN ('es-ES', 'pt-BR', 'en'));

-- Um período de menu com fim antes do início nunca está activo.
ALTER TABLE "menus"
  ADD CONSTRAINT "menu_periodo_valido"
  CHECK (periodo_de IS NULL OR periodo_ate IS NULL OR periodo_ate > periodo_de);

-- ── Isolamento por inquilino ───────────────────────────────────────────────
-- `USING` e `WITH CHECK` nas duas, como em todas as tabelas de inquilino desde
-- o E03. Sem o segundo, um `UPDATE` move uma linha para outra organização e ela
-- deixa de ser vista — o que parece funcionar e é perda de dados.

ALTER TABLE "menus"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_channels"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_categories"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_translations"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variants"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "price_rules"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "modifier_groups"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "modifier_options"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_modifier_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_allergens"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_dietary_tags"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_channels"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_availability"    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'menus','menu_channels','menu_categories','categories','products',
    'product_translations','product_variants','price_rules','modifier_groups',
    'modifier_options','product_modifier_groups','product_allergens',
    'product_dietary_tags','product_channels','product_availability'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual())',
      t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO bossaos_app', t);
    -- A autenticação não tem nada que ver com o catálogo.
    EXECUTE format('REVOKE ALL ON %I FROM bossaos_auth', t);
  END LOOP;
END $$;

-- ── O que o `@@unique` com coluna anulável NÃO garante ─────────────────────
--
-- `UNIQUE (organization_id, product_id, location_id)` não impede dois bloqueios
-- globais do mesmo produto: no PostgreSQL **`NULL` é distinto de `NULL`**, e
-- duas linhas com `location_id IS NULL` passam as duas. O resultado seria dois
-- bloqueios para a mesma coisa, um deles invisível a quem desbloqueasse.
--
-- O índice parcial fecha exactamente esse caso, e só esse.
CREATE UNIQUE INDEX "disponibilidade_global_unica"
  ON "product_availability" (organization_id, product_id)
  WHERE location_id IS NULL;

-- E o mesmo para o SKU: `UNIQUE (organization_id, brand_id, sku)` já deixa
-- vários `NULL` passarem, o que aqui é o comportamento QUERIDO — nem todo o
-- produto tem SKU, e dois sem SKU não são o mesmo produto. Fica escrito para
-- não ser "corrigido" por engano.

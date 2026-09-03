-- CreateEnum
CREATE TYPE "estado_de_membro" AS ENUM ('ACTIVO', 'SUSPENSO', 'REVOGADO');

-- CreateEnum
CREATE TYPE "papel" AS ENUM ('OWNER', 'ORG_ADMIN', 'BRAND_MANAGER', 'VENUE_MANAGER', 'FLOOR_MANAGER', 'HOST', 'WAITER', 'KITCHEN', 'BARTENDER', 'EXPO', 'CASHIER', 'FINANCE', 'INVENTORY', 'MARKETING', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "moeda" CHAR(3) NOT NULL,
    "fuso" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "estado" "estado_de_membro" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "papel" "papel" NOT NULL,
    "brand_id" UUID,
    "location_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "brands_organization_id_idx" ON "brands"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_organization_id_id_key" ON "brands"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_organization_id_slug_key" ON "brands"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "locations_organization_id_idx" ON "locations"("organization_id");

-- CreateIndex
CREATE INDEX "locations_organization_id_brand_id_idx" ON "locations"("organization_id", "brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_organization_id_id_key" ON "locations"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_organization_id_slug_key" ON "locations"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organization_id_id_key" ON "memberships"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organization_id_user_id_key" ON "memberships"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "role_assignments_organization_id_idx" ON "role_assignments"("organization_id");

-- CreateIndex
CREATE INDEX "role_assignments_organization_id_membership_id_idx" ON "role_assignments"("organization_id", "membership_id");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_brand_id_fkey" FOREIGN KEY ("organization_id", "brand_id") REFERENCES "brands"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_organization_id_membership_id_fkey" FOREIGN KEY ("organization_id", "membership_id") REFERENCES "memberships"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_organization_id_brand_id_fkey" FOREIGN KEY ("organization_id", "brand_id") REFERENCES "brands"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- Isolamento por linha (CT-04 · docs/architecture/domain-model.md)
--
-- O Prisma não gere políticas. Este bloco é escrito à mão, revisto antes de ser
-- aplicado, e é a segunda das três camadas de isolamento — a que continua de pé
-- quando um `findMany` esquece o filtro.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Leitura do contexto ────────────────────────────────────────────────────
--
-- `current_setting(..., true)` devolve NULL em vez de erro quando não há
-- contexto, e NULL compara falso: **sem contexto, nega**. É a direcção segura.
--
-- O `NULLIF(..., '')` não é zelo: `set_config` com cadeia vazia devolve '', e
-- ''::uuid **rebenta** em vez de dar NULL. Sem isto, uma limpeza de contexto mal
-- feita trocava "negar" por "erro de sintaxe" no meio de um serviço.
CREATE FUNCTION app_organizacao_actual() RETURNS uuid
  LANGUAGE sql STABLE
  SET search_path = pg_catalog
  AS $$ SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid $$;

CREATE FUNCTION app_utilizador_actual() RETURNS uuid
  LANGUAGE sql STABLE
  SET search_path = pg_catalog
  AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;

-- ── Organizations ──────────────────────────────────────────────────────────
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "organizations"
  USING      (id = app_organizacao_actual())
  WITH CHECK (id = app_organizacao_actual());

-- Caminho de identidade: sem contexto de organização ainda, quem entrou precisa
-- de saber em que organizações é membro. Só LEITURA, e só onde há membership.
CREATE POLICY identidade_le_as_suas ON "organizations"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "memberships" m
    WHERE m.organization_id = "organizations".id
      AND m.user_id = app_utilizador_actual()
  ));

-- ── Tabelas de inquilino ───────────────────────────────────────────────────
--
-- USING **e** WITH CHECK, os dois. Sem o segundo, um UPDATE move a linha para
-- outra organização e ela deixa de ser vista: parece que funcionou e é perda de
-- dados. Sem o primeiro, lê-se tudo.
ALTER TABLE "brands"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "locations"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_assignments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "brands"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

CREATE POLICY tenant_isolation ON "locations"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

CREATE POLICY tenant_isolation ON "memberships"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

CREATE POLICY tenant_isolation ON "role_assignments"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

-- A outra metade do caminho de identidade: as MINHAS filiações, sem contexto de
-- organização. Leitura apenas — entrar numa organização é o que dá escrita.
CREATE POLICY identidade_le_as_suas ON "memberships"
  FOR SELECT
  USING (user_id = app_utilizador_actual());

-- ── Users: identidade global, e mesmo assim fechada ────────────────────────
--
-- O CT-04 chama a identidade de excepção documentada, e podia ficar por aqui uma
-- tabela aberta ao runtime. Não fica: com contexto de utilizador vê-se uma linha
-- — a própria. Sem contexto, nenhuma.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY identidade_propria ON "users"
  USING      (id = app_utilizador_actual())
  WITH CHECK (id = app_utilizador_actual());

-- O email guarda-se em minúsculas. Sem isto, a procura por email falharia para
-- quem se registasse com maiúsculas e a interface diria "não existe" a uma
-- conta que existe.
ALTER TABLE "users" ADD CONSTRAINT users_email_minusculas CHECK (email = lower(email));

-- ── Autenticação global: a interface mínima separada ───────────────────────
--
-- O CT-04 pede uma interface mínima e separada para identidade. Antes de haver
-- sessão não há `app.user_id`, logo a política acima nega tudo — e é suposto
-- negar. Esta função é a única porta, e devolve **só o id**: nem nome, nem
-- data, nem a existência de mais nenhuma linha.
--
-- SECURITY DEFINER corre como o dono (a credencial de migração), que não está
-- sujeito ao RLS. `search_path` fixo porque é isso que impede alguém de
-- redefinir `lower` ou `users` num esquema seu e sequestrar a função.
CREATE FUNCTION identidade_por_email(p_email text) RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = pg_catalog, public
  AS $$ SELECT id FROM public.users WHERE email = lower(p_email) $$;

REVOKE ALL ON FUNCTION identidade_por_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identidade_por_email(text) TO bossaos_app;

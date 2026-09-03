-- CreateEnum
CREATE TYPE "estado_de_subscricao" AS ENUM ('ACTIVA', 'SUSPENSA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "origem_de_concessao" AS ENUM ('PLANO', 'ADICIONAL', 'PILOTO');

-- CreateTable
CREATE TABLE "plan_definitions" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "promessa" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "publico" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plan_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_capabilities" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "capacidade" TEXT NOT NULL,
    "quota" INTEGER,

    CONSTRAINT "plan_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "estado" "estado_de_subscricao" NOT NULL DEFAULT 'ACTIVA',
    "valido_de" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valido_ate" TIMESTAMPTZ(6),
    "descer_para_plano_id" UUID,
    "descer_em" TIMESTAMPTZ(6),
    "tolerancia_ate" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_grants" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "capacidade" TEXT NOT NULL,
    "quota" INTEGER,
    "location_id" UUID,
    "valido_ate" TIMESTAMPTZ(6),
    "origem" "origem_de_concessao" NOT NULL DEFAULT 'PLANO',
    "motivo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "entitlement_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ligada" BOOLEAN NOT NULL DEFAULT false,
    "descricao" TEXT,
    "organization_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_revisions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "primaria" TEXT NOT NULL,
    "acento" TEXT NOT NULL,
    "fundo" TEXT NOT NULL,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theme_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_definitions_codigo_key" ON "plan_definitions"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "plan_capabilities_plan_id_capacidade_key" ON "plan_capabilities"("plan_id", "capacidade");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "entitlement_grants_organization_id_idx" ON "entitlement_grants"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_grants_organization_id_capacidade_location_id_key" ON "entitlement_grants"("organization_id", "capacidade", "location_id");

-- CreateIndex
CREATE INDEX "feature_flags_nome_idx" ON "feature_flags"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_nome_organization_id_key" ON "feature_flags"("nome", "organization_id");

-- CreateIndex
CREATE INDEX "theme_revisions_organization_id_activa_idx" ON "theme_revisions"("organization_id", "activa");

-- AddForeignKey
ALTER TABLE "plan_capabilities" ADD CONSTRAINT "plan_capabilities_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_grants" ADD CONSTRAINT "entitlement_grants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_grants" ADD CONSTRAINT "entitlement_grants_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_revisions" ADD CONSTRAINT "theme_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- E05 — a fronteira dos três catálogos
-- ═══════════════════════════════════════════════════════════════════════════

-- ── O catálogo de planos é GLOBAL e o runtime não o escreve ────────────────
--
-- A mesma armadilha do E04: o `ALTER DEFAULT PRIVILEGES` do E01 acabou de dar
-- INSERT, UPDATE e DELETE ao runtime nestas tabelas. Um catálogo de planos que
-- o processo do restaurante pode reescrever é um restaurante a dar-se um plano.
--
-- Não levam política de linha porque não são de inquilino: são o mesmo catálogo
-- para todos, e todos têm de o poder LER (é o que desenha o selector de planos).
REVOKE ALL      ON "plan_definitions"  FROM bossaos_app;
REVOKE ALL      ON "plan_capabilities" FROM bossaos_app;
GRANT  SELECT   ON "plan_definitions"  TO   bossaos_app;
GRANT  SELECT   ON "plan_capabilities" TO   bossaos_app;

-- ── A assinatura e as concessões são de inquilino ──────────────────────────
--
-- Leitura sim: a organização vê o que tem. Escrita **não**: conceder-se uma
-- capacidade a si próprio é o defeito inteiro desta etapa numa linha. Quem
-- concede é a migração ou o controlo interno, com a credencial de migração.
ALTER TABLE "subscriptions"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entitlement_grants" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "subscriptions"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

CREATE POLICY tenant_isolation ON "entitlement_grants"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

REVOKE INSERT, UPDATE, DELETE ON "subscriptions"      FROM bossaos_app;
REVOKE INSERT, UPDATE, DELETE ON "entitlement_grants" FROM bossaos_app;

-- ── Flags: global OU da minha organização ──────────────────────────────────
--
-- Uma flag sem organização é global; com organização é uma libertação
-- controlada a um inquilino. A política deixa ver as duas e mais nenhuma — sem
-- o `IS NULL` o runtime não veria as globais, e sem a segunda metade veria as
-- libertações controladas dos outros clientes, o que diz o que estamos a testar
-- e com quem.
ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;

CREATE POLICY leitura_de_flags ON "feature_flags"
  FOR SELECT
  USING (organization_id IS NULL OR organization_id = app_organizacao_actual());

REVOKE INSERT, UPDATE, DELETE ON "feature_flags" FROM bossaos_app;

-- ── Tema: a organização edita o seu, se o plano deixar ─────────────────────
--
-- Aqui a escrita é do runtime, de propósito: mudar as cores do próprio site é
-- uma acção do cliente. O que a base **não** faz é verificar se o plano
-- permite — isso é o motor de capacidades, e há uma prova que desliga essa
-- verificação e exige que o Starter passe a conseguir gravar. Se continuar
-- bloqueado com ela desligada, o que estava a bloquear era outra coisa.
ALTER TABLE "theme_revisions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "theme_revisions"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

-- ── Os três planos, sem um único número comercial ──────────────────────────
--
-- Nome e promessa vêm do atlas (ORG-010). Preço não vem: o atlas diz "Precio
-- según propuesta", e é isso que fica. Mensalidades, taxas e testes gratuitos
-- são decisão do Matheus e entram em configuração — não aqui.
INSERT INTO "plan_definitions" (id, codigo, nome, promessa, ordem, publico, updated_at) VALUES
  (gen_random_uuid(), 'STARTER',    'Starter',    'Publica bien',        1, true, now()),
  (gen_random_uuid(), 'RESTAURANT', 'Restaurant', 'Conecta el servicio', 2, true, now()),
  (gen_random_uuid(), 'PRO',        'Pro',        'Amplía tu gestión',   3, true, now())
ON CONFLICT (codigo) DO NOTHING;

-- O que cada plano inclui, em capacidades BOOLEANAS — essas não são números
-- comerciais, são o âmbito funcional que o atlas descreve por extenso.
INSERT INTO "plan_capabilities" (id, plan_id, capacidade, quota)
SELECT gen_random_uuid(), p.id, c.capacidade, NULL
FROM "plan_definitions" p
JOIN (VALUES
  -- Starter: "Carta digital y QR", "Site del restaurante", "Colores BossaOS"
  ('STARTER',    'carta.digital'),
  ('STARTER',    'site.restaurante'),
  -- Restaurant: "Todo lo de Starter" + "Reservas, sala y KDS" + "Tus colores propios"
  ('RESTAURANT', 'carta.digital'),
  ('RESTAURANT', 'site.restaurante'),
  ('RESTAURANT', 'reservas'),
  ('RESTAURANT', 'sala'),
  ('RESTAURANT', 'kds'),
  ('RESTAURANT', 'tema.coresProprias'),
  -- Pro: "Todo lo de Restaurant" + "TPV, stock y gestión" + "Tus colores propios"
  ('PRO',        'carta.digital'),
  ('PRO',        'site.restaurante'),
  ('PRO',        'reservas'),
  ('PRO',        'sala'),
  ('PRO',        'kds'),
  ('PRO',        'tema.coresProprias'),
  ('PRO',        'tpv'),
  ('PRO',        'stock')
) AS c(codigo, capacidade) ON c.codigo = p.codigo
ON CONFLICT (plan_id, capacidade) DO NOTHING;

-- As capacidades QUANTITATIVAS ficam deliberadamente de fora.
--
-- "Não invente limites quantitativos" (E05, respeitar 1). Sem linha, o motor
-- nega — que é a direcção certa. Quando o E07 trouxer produtos, a quota tem de
-- ser configurada ou não se cria nenhum; e isso é o comportamento correcto, com
-- o número a ser decidido por quem vende, não por quem programa.
--
-- A única excepção é a que o próprio E05 autoriza: **"habilite apenas a
-- primeira unidade de piloto e bloqueie expansão não contratada"**. Uma
-- unidade, com motivo escrito, para o piloto poder existir.
INSERT INTO "entitlement_grants"
  (id, organization_id, capacidade, quota, origem, motivo, updated_at)
SELECT gen_random_uuid(), o.id, 'unidades', 1, 'PILOTO',
       'Piloto de uma unidade (E05): expansao nao contratada fica bloqueada ate haver configuracao comercial.',
       now()
FROM "organizations" o
ON CONFLICT (organization_id, capacidade, location_id) DO NOTHING;

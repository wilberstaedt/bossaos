-- ── E13 · sala, sessões, dispositivos e PIN ────────────────────────────────
--
-- A primeira etapa em que duas pessoas mexem na mesma coisa ao mesmo tempo, e é
-- isso que decide a forma destas tabelas — não a arrumação.
--
-- O que está aqui e o Prisma não sabe exprimir vem no fim do ficheiro, e é a
-- parte que carrega o aceite 1: **um índice único PARCIAL** que torna a segunda
-- sessão activa da mesma mesa impossível de escrever.

-- CreateEnum
CREATE TYPE "TipoDeZona" AS ENUM ('SALA', 'TERRACO', 'BARRA', 'PRIVADO');

-- CreateEnum
CREATE TYPE "EstadoDeSessao" AS ENUM ('ABERTA', 'A_ENCERRAR', 'FECHADA');

-- CreateEnum
CREATE TYPE "EstadoDeDispositivo" AS ENUM ('PENDENTE', 'ACTIVO', 'REVOGADO');

-- CreateEnum
CREATE TYPE "Estacao" AS ENUM ('SALA', 'COZINHA', 'BALCAO', 'GERENCIA');

-- CreateTable
CREATE TABLE "service_areas" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoDeZona" NOT NULL DEFAULT 'SALA',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_tables" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL DEFAULT 2,
    "pos_x" INTEGER,
    "pos_y" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "service_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_combinations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "table_combinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_combination_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "combination_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,

    CONSTRAINT "table_combination_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "estado" "EstadoDeSessao" NOT NULL DEFAULT 'ABERTA',
    "comensais" INTEGER NOT NULL DEFAULT 1,
    "responsavel_id" UUID,
    "aberta_por" TEXT NOT NULL,
    "aberta_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechada_por" TEXT,
    "fechada_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "table_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_session_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "accao" TEXT NOT NULL,
    "detalhe" JSONB,
    "actor_email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_session_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "estacao" "Estacao" NOT NULL DEFAULT 'SALA',
    "estado" "EstadoDeDispositivo" NOT NULL DEFAULT 'PENDENTE',
    "aprovado_por_id" UUID,
    "aprovado_em" TIMESTAMPTZ(6),
    "revogado_por_id" UUID,
    "revogado_em" TIMESTAMPTZ(6),
    "revogado_motivo" TEXT,
    "ultimo_visto_em" TIMESTAMPTZ(6),
    "rascunhos_por_enviar" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_pairings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "criado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_pairings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_pins" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "resumo" TEXT NOT NULL,
    "sal" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_ate" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "operator_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_shifts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "aberta_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminada_em" TIMESTAMPTZ(6),

    CONSTRAINT "device_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_types" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "inicio_minutos" INTEGER NOT NULL,
    "fim_minutos" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_areas_organization_id_location_id_idx" ON "service_areas"("organization_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_areas_organization_id_id_key" ON "service_areas"("organization_id", "id");

-- CreateIndex
CREATE INDEX "service_tables_organization_id_location_id_idx" ON "service_tables"("organization_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_tables_organization_id_id_key" ON "service_tables"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "service_tables_location_id_codigo_key" ON "service_tables"("location_id", "codigo");

-- CreateIndex
CREATE INDEX "table_combinations_organization_id_location_id_idx" ON "table_combinations"("organization_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "table_combinations_organization_id_id_key" ON "table_combinations"("organization_id", "id");

-- CreateIndex
CREATE INDEX "table_combination_members_organization_id_table_id_idx" ON "table_combination_members"("organization_id", "table_id");

-- CreateIndex
CREATE UNIQUE INDEX "table_combination_members_combination_id_table_id_key" ON "table_combination_members"("combination_id", "table_id");

-- CreateIndex
CREATE INDEX "table_sessions_organization_id_location_id_estado_idx" ON "table_sessions"("organization_id", "location_id", "estado");

-- CreateIndex
CREATE INDEX "table_sessions_table_id_idx" ON "table_sessions"("table_id");

-- CreateIndex
CREATE UNIQUE INDEX "table_sessions_organization_id_id_key" ON "table_sessions"("organization_id", "id");

-- CreateIndex
CREATE INDEX "table_session_events_organization_id_session_id_created_at_idx" ON "table_session_events"("organization_id", "session_id", "created_at");

-- CreateIndex
CREATE INDEX "devices_organization_id_location_id_estado_idx" ON "devices"("organization_id", "location_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "devices_organization_id_id_key" ON "devices"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairings_token_hash_key" ON "device_pairings"("token_hash");

-- CreateIndex
CREATE INDEX "device_pairings_organization_id_device_id_idx" ON "device_pairings"("organization_id", "device_id");

-- CreateIndex
CREATE INDEX "operator_pins_organization_id_location_id_idx" ON "operator_pins"("organization_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "operator_pins_location_id_membership_id_key" ON "operator_pins"("location_id", "membership_id");

-- CreateIndex
CREATE INDEX "device_shifts_organization_id_device_id_terminada_em_idx" ON "device_shifts"("organization_id", "device_id", "terminada_em");

-- CreateIndex
CREATE INDEX "service_types_organization_id_location_id_idx" ON "service_types"("organization_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_types_location_id_nome_key" ON "service_types"("location_id", "nome");

-- AddForeignKey
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tables" ADD CONSTRAINT "service_tables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tables" ADD CONSTRAINT "service_tables_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tables" ADD CONSTRAINT "service_tables_organization_id_area_id_fkey" FOREIGN KEY ("organization_id", "area_id") REFERENCES "service_areas"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_combinations" ADD CONSTRAINT "table_combinations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_combinations" ADD CONSTRAINT "table_combinations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_combination_members" ADD CONSTRAINT "table_combination_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_combination_members" ADD CONSTRAINT "table_combination_members_organization_id_combination_id_fkey" FOREIGN KEY ("organization_id", "combination_id") REFERENCES "table_combinations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_combination_members" ADD CONSTRAINT "table_combination_members_organization_id_table_id_fkey" FOREIGN KEY ("organization_id", "table_id") REFERENCES "service_tables"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_organization_id_table_id_fkey" FOREIGN KEY ("organization_id", "table_id") REFERENCES "service_tables"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_organization_id_responsavel_id_fkey" FOREIGN KEY ("organization_id", "responsavel_id") REFERENCES "memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_session_events" ADD CONSTRAINT "table_session_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_session_events" ADD CONSTRAINT "table_session_events_organization_id_session_id_fkey" FOREIGN KEY ("organization_id", "session_id") REFERENCES "table_sessions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_pairings" ADD CONSTRAINT "device_pairings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_pairings" ADD CONSTRAINT "device_pairings_organization_id_device_id_fkey" FOREIGN KEY ("organization_id", "device_id") REFERENCES "devices"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_pins" ADD CONSTRAINT "operator_pins_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_pins" ADD CONSTRAINT "operator_pins_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_pins" ADD CONSTRAINT "operator_pins_organization_id_membership_id_fkey" FOREIGN KEY ("organization_id", "membership_id") REFERENCES "memberships"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_shifts" ADD CONSTRAINT "device_shifts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_shifts" ADD CONSTRAINT "device_shifts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- O que o Prisma não exprime, e é o que faz o aceite 1 ser verdade
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Duas aberturas concorrentes da mesma mesa produzem uma única sessão activa.»
--
-- A tentação é consultar antes de inserir. Não serve, e a razão está escrita no
-- E09 a propósito do endereço público: *«não se consulta antes; duas pessoas a
-- escolher no mesmo segundo leem ambas que está livre»*. Uma consulta prévia
-- estreita a janela da corrida — passa a maior parte das vezes — e isso é PIOR do
-- que falhar sempre, porque o defeito deixa de ser reproduzível.
--
-- Aqui a segunda linha é **impossível de escrever**. O PostgreSQL recusa-a com
-- `23505`, e o serviço traduz isso em «a mesa já está aberta».
--
-- E a condição `estado <> 'FECHADA'` é o par do aceite: quando a sessão fecha,
-- a linha SAI do índice e a mesa volta a poder abrir. Um índice único sobre
-- `(table_id)` sem condição passaria o aceite 1 e deixava cada mesa do
-- restaurante inutilizável depois do primeiro serviço.
CREATE UNIQUE INDEX "uma_sessao_activa_por_mesa"
  ON "table_sessions" ("table_id")
  WHERE estado <> 'FECHADA';

-- ── Um turno aberto por dispositivo, pela mesma razão ─────────────────────
--
-- Dois operadores a entrar no mesmo tablet ao mesmo tempo é o aceite 1 outra vez
-- por outra porta: o segundo substitui o primeiro, e a atribuição dos pedidos
-- passa a depender de quem carregou primeiro.
CREATE UNIQUE INDEX "um_turno_aberto_por_dispositivo"
  ON "device_shifts" ("device_id")
  WHERE terminada_em IS NULL;

-- ── Isolamento por inquilino ──────────────────────────────────────────────
ALTER TABLE "service_areas"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_tables"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_combinations"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_combination_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_sessions"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_session_events"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "devices"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_pairings"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "operator_pins"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_shifts"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_types"             ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "service_areas"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "service_tables"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "table_combinations"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "table_combination_members"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "table_sessions"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "table_session_events"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "devices"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "device_pairings"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "operator_pins"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "device_shifts"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "service_types"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

-- ── Privilégios ───────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON "service_areas"             TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "service_tables"            TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "table_combinations"        TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "table_combination_members" TO bossaos_app;
GRANT SELECT, INSERT, UPDATE         ON "table_sessions"            TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "devices"                   TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "device_pairings"           TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "operator_pins"             TO bossaos_app;
GRANT SELECT, INSERT, UPDATE         ON "device_shifts"             TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "service_types"             TO bossaos_app;

-- ── O histórico é append-only, e por privilégio ───────────────────────────
--
-- O E13 pede a sessão «com histórico». Um histórico que o runtime possa reescrever
-- não é histórico: é uma versão dos factos. A mesma decisão que `audit_events`
-- do E04 e `menu_revisions` do E08.
--
-- E `table_sessions` perde o DELETE pela mesma razão: uma sessão que se apague
-- leva com ela a noite inteira de uma mesa, e «arquivar respeita sessões abertas»
-- deixaria de ter como ser verificado depois do facto.
GRANT SELECT, INSERT ON "table_session_events" TO bossaos_app;
REVOKE UPDATE, DELETE ON "table_session_events" FROM bossaos_app;
REVOKE DELETE ON "table_sessions" FROM bossaos_app;

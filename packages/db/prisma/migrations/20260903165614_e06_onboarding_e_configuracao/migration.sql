-- DropForeignKey
ALTER TABLE "platform_staff" DROP CONSTRAINT "platform_staff_user_id_fkey";

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "idioma_principal" TEXT;

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "contacto_email" TEXT,
ADD COLUMN     "contacto_telefone" TEXT,
ADD COLUMN     "localidade" TEXT,
ADD COLUMN     "morada" TEXT,
ALTER COLUMN "moeda" DROP NOT NULL,
ALTER COLUMN "fuso" DROP NOT NULL;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "fuso" TEXT,
ADD COLUMN     "moeda_padrao" CHAR(3),
ADD COLUMN     "nome_legal" TEXT,
ADD COLUMN     "pais" CHAR(2),
ADD COLUMN     "responsavel" TEXT;

-- CreateTable
CREATE TABLE "schedule_days" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "dia" INTEGER NOT NULL,
    "fechado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "motivo" TEXT NOT NULL,
    "fechado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_intervals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "dia_id" UUID,
    "excepcao_id" UUID,
    "inicio_min" INTEGER NOT NULL,
    "fim_min" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "organization_id" UUID NOT NULL,
    "passo" INTEGER NOT NULL DEFAULT 1,
    "concluido_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("organization_id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "accao" TEXT NOT NULL,
    "organization_id" UUID,
    "resultado_tipo" TEXT NOT NULL,
    "resultado_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_days_organization_id_idx" ON "schedule_days"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_days_organization_id_location_id_dia_key" ON "schedule_days"("organization_id", "location_id", "dia");

-- CreateIndex
CREATE INDEX "schedule_exceptions_organization_id_idx" ON "schedule_exceptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_exceptions_organization_id_location_id_data_key" ON "schedule_exceptions"("organization_id", "location_id", "data");

-- CreateIndex
CREATE INDEX "schedule_intervals_organization_id_idx" ON "schedule_intervals"("organization_id");

-- CreateIndex
CREATE INDEX "schedule_intervals_dia_id_idx" ON "schedule_intervals"("dia_id");

-- CreateIndex
CREATE INDEX "schedule_intervals_excepcao_id_idx" ON "schedule_intervals"("excepcao_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_organization_id_idx" ON "idempotency_keys"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_chave_actor_id_accao_key" ON "idempotency_keys"("chave", "actor_id", "accao");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_descer_para_plano_id_fkey" FOREIGN KEY ("descer_para_plano_id") REFERENCES "plan_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_intervals" ADD CONSTRAINT "schedule_intervals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_intervals" ADD CONSTRAINT "schedule_intervals_dia_id_fkey" FOREIGN KEY ("dia_id") REFERENCES "schedule_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_intervals" ADD CONSTRAINT "schedule_intervals_excepcao_id_fkey" FOREIGN KEY ("excepcao_id") REFERENCES "schedule_exceptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- A parte escrita à mão. O Prisma gera as tabelas; a segurança e as regras que
-- a base tem de garantir escrevem-se aqui, porque nenhum gerador as inventa.

-- ── Regras que a BASE recusa, não o formulário ─────────────────────────────
--
-- `domain-model.md`: *"Validar no formulário e não na base é ter a regra
-- enquanto ninguém corre dois pedidos ao mesmo tempo."* Estas são as mesmas
-- regras que `packages/domain/src/horarios.ts` verifica, postas onde não há
-- forma de as contornar.

-- Um intervalo pertence a um dia da semana OU a uma excepção. Nunca aos dois,
-- nunca a nenhum. Sem isto, um intervalo órfão fica invisível e um intervalo com
-- os dois pais aparece duas vezes.
ALTER TABLE "schedule_intervals"
  ADD CONSTRAINT "intervalo_tem_um_dono"
  CHECK ((dia_id IS NULL) <> (excepcao_id IS NULL));

-- 20:00→01:00 escreve-se 1200→1500. O que não se escreve é fim antes do início,
-- duração zero, ou mais de 24 horas — que não são serviços, são erros de entrada.
ALTER TABLE "schedule_intervals"
  ADD CONSTRAINT "intervalo_bem_formado"
  CHECK (
    inicio_min >= 0 AND inicio_min < 1440
    AND fim_min > inicio_min
    AND fim_min - inicio_min <= 1440
  );

-- ISO 8601: 1 = segunda … 7 = domingo. Zero não é um dia.
ALTER TABLE "schedule_days"
  ADD CONSTRAINT "dia_iso" CHECK (dia BETWEEN 1 AND 7);

ALTER TABLE "onboarding_progress"
  ADD CONSTRAINT "passo_de_dez" CHECK (passo BETWEEN 1 AND 10);

-- Códigos de país e moeda em maiúsculas, com o comprimento certo. Um "eur" em
-- minúsculas passa despercebido até ao dia em que se compara com "EUR".
ALTER TABLE "organizations"
  ADD CONSTRAINT "pais_iso" CHECK (pais IS NULL OR pais ~ '^[A-Z]{2}$');
ALTER TABLE "organizations"
  ADD CONSTRAINT "moeda_padrao_iso" CHECK (moeda_padrao IS NULL OR moeda_padrao ~ '^[A-Z]{3}$');
ALTER TABLE "locations"
  ADD CONSTRAINT "moeda_iso" CHECK (moeda IS NULL OR moeda ~ '^[A-Z]{3}$');

-- ── Isolamento por inquilino ───────────────────────────────────────────────
-- `USING` e `WITH CHECK`, os dois. Sem o segundo, um `UPDATE` move uma linha
-- para outra organização e ela deixa de ser vista — o que parece funcionar e é
-- perda de dados.

ALTER TABLE "schedule_days"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_exceptions"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_intervals"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "onboarding_progress"  ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "schedule_days"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

CREATE POLICY tenant_isolation ON "schedule_exceptions"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

CREATE POLICY tenant_isolation ON "schedule_intervals"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

CREATE POLICY tenant_isolation ON "onboarding_progress"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

-- ── As chaves de idempotência são da PESSOA, não da organização ────────────
--
-- E têm de ser: a criação da própria organização também é idempotente, e nesse
-- momento ainda não há organização a que a chave possa pertencer. A política
-- prende-se a `app_utilizador_actual()`, o mesmo GUC do caminho de identidade do
-- E03 — que está definido nos dois caminhos, porque `comEscopoDoPedido` passa
-- sempre o actor.
--
-- O efeito lateral é desejável: a chave "abc" de duas pessoas diferentes são
-- duas operações diferentes, e nenhuma vê a da outra.
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;

CREATE POLICY actor_isolation ON "idempotency_keys"
  USING      (actor_id = app_utilizador_actual())
  WITH CHECK (actor_id = app_utilizador_actual());

-- ── Privilégios ────────────────────────────────────────────────────────────
-- Estas são tabelas de INQUILINO: o runtime escreve-as. Ao contrário do
-- catálogo de planos do E05, que ele só lê.
GRANT SELECT, INSERT, UPDATE, DELETE ON "schedule_days"       TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "schedule_exceptions" TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "schedule_intervals"  TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "onboarding_progress" TO bossaos_app;
GRANT SELECT, INSERT                 ON "idempotency_keys"    TO bossaos_app;

-- Uma chave de idempotência não se actualiza nem se apaga: o registo de que uma
-- operação já foi feita é o que impede a segunda. Poder apagá-lo era poder
-- duplicar à segunda tentativa.
REVOKE UPDATE, DELETE ON "idempotency_keys" FROM bossaos_app;

-- A autenticação não tem nada que ver com nada disto.
REVOKE ALL ON "schedule_days"       FROM bossaos_auth;
REVOKE ALL ON "schedule_exceptions" FROM bossaos_auth;
REVOKE ALL ON "schedule_intervals"  FROM bossaos_auth;
REVOKE ALL ON "onboarding_progress" FROM bossaos_auth;
REVOKE ALL ON "idempotency_keys"    FROM bossaos_auth;

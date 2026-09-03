-- CreateEnum
CREATE TYPE "estado_de_convite" AS ENUM ('PENDENTE', 'ACEITE', 'REVOGADO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image" TEXT;

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" UUID NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "issuer" TEXT NOT NULL DEFAULT 'credential',
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(6),
    "refresh_token_expires_at" TIMESTAMPTZ(6),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "papel" "papel" NOT NULL,
    "brand_id" UUID,
    "location_id" UUID,
    "token_hash" TEXT NOT NULL,
    "estado" "estado_de_convite" NOT NULL DEFAULT 'PENDENTE',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "convidado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_email" TEXT,
    "accao" TEXT NOT NULL,
    "alvo_tipo" TEXT,
    "alvo_id" UUID,
    "motivo" TEXT,
    "detalhe" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_id_account_id_key" ON "accounts"("provider_id", "account_id");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_organization_id_idx" ON "invitations"("organization_id");

-- CreateIndex
CREATE INDEX "invitations_organization_id_email_idx" ON "invitations"("organization_id", "email");

-- CreateIndex
CREATE INDEX "audit_events_organization_id_created_at_idx" ON "audit_events"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_brand_id_fkey" FOREIGN KEY ("organization_id", "brand_id") REFERENCES "brands"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_convidado_por_id_fkey" FOREIGN KEY ("convidado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- E04 — a fronteira entre os três acessos
--
-- O CT-04 manda separar migração, runtime, autenticação global e leitura
-- pública. O E03 fez os dois primeiros; este faz o terceiro.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tabelas de inquilino novas: a mesma política do E03 ────────────────────
ALTER TABLE "invitations"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "invitations"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

CREATE POLICY tenant_isolation ON "audit_events"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

-- ── A armadilha do E01, fechada ────────────────────────────────────────────
--
-- `ALTER DEFAULT PRIVILEGES` (scripts/dev-db.sh) concede ao runtime SELECT,
-- INSERT, UPDATE e DELETE em TODAS as tabelas novas que a migração criar. Foi a
-- decisão certa para tabelas de inquilino — poupa vir aqui a cada migração — mas
-- significa que `sessions`, `accounts` e `verifications` nascem **legíveis pelo
-- runtime** sem ninguém ter decidido isso.
--
-- Uma sessão é uma credencial viva. O processo que serve o catálogo de um
-- restaurante não precisa de conseguir ler a sessão de ninguém.
REVOKE ALL ON "sessions"      FROM bossaos_app;
REVOKE ALL ON "accounts"      FROM bossaos_app;
REVOKE ALL ON "verifications" FROM bossaos_app;

-- Defesa em profundidade: mesmo que um GRANT distraído volte a abrir, a
-- política nega. Duas fechaduras diferentes na mesma porta.
ALTER TABLE "sessions"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY so_autenticacao ON "sessions"      FOR ALL TO bossaos_auth USING (true) WITH CHECK (true);
CREATE POLICY so_autenticacao ON "accounts"      FOR ALL TO bossaos_auth USING (true) WITH CHECK (true);
CREATE POLICY so_autenticacao ON "verifications" FOR ALL TO bossaos_auth USING (true) WITH CHECK (true);

-- ── O que a autenticação pode, e mais nada ─────────────────────────────────
--
-- Tabela a tabela, escrito à mão. Não há `GRANT ... ON ALL TABLES` aqui de
-- propósito: com ele, a próxima tabela de facturação nascia legível pelo
-- processo que autentica, e ninguém teria decidido isso.
GRANT SELECT, INSERT, UPDATE, DELETE ON "sessions"      TO bossaos_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON "accounts"      TO bossaos_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON "verifications" TO bossaos_auth;
GRANT SELECT, INSERT, UPDATE          ON "users"        TO bossaos_auth;

-- A autenticação precisa de procurar por email antes de haver sessão, e por
-- isso vê a tabela de identidades inteira. O runtime continua a ver uma linha:
-- a política do E03 mantém-se e esta acrescenta-se, presa ao PAPEL.
CREATE POLICY autenticacao_ve_identidades ON "users"
  FOR ALL TO bossaos_auth
  USING (true) WITH CHECK (true);

-- ── Auditoria que não se pode reescrever ───────────────────────────────────
--
-- Um rasto que se edita não é auditoria. O gatilho recusa UPDATE e DELETE a
-- todos, incluindo ao dono das tabelas — a única forma de mexer é uma migração
-- que remova o gatilho, e isso fica no histórico.
CREATE FUNCTION audit_events_apenas_insercao() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = pg_catalog
  AS $$
BEGIN
  RAISE EXCEPTION 'audit_events e append-only: % nao e permitido', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER audit_events_sem_update
  BEFORE UPDATE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION audit_events_apenas_insercao();

CREATE TRIGGER audit_events_sem_delete
  BEFORE DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION audit_events_apenas_insercao();

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "two_factors" (
    "id" UUID NOT NULL,
    "secret" TEXT NOT NULL,
    "backup_codes" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failed_verification_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),

    CONSTRAINT "two_factors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "two_factors_user_id_idx" ON "two_factors"("user_id");

-- CreateIndex
CREATE INDEX "two_factors_secret_idx" ON "two_factors"("secret");

-- AddForeignKey
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A tabela do segundo factor pertence ao caminho de autenticação, como as
-- outras três. O `ALTER DEFAULT PRIVILEGES` do E01 acabou de a conceder ao
-- runtime; retira-se, e a política tranca por baixo.
REVOKE ALL ON "two_factors" FROM bossaos_app;
ALTER TABLE "two_factors" ENABLE ROW LEVEL SECURITY;
CREATE POLICY so_autenticacao ON "two_factors" FOR ALL TO bossaos_auth USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON "two_factors" TO bossaos_auth;

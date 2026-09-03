-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "public_slug" TEXT;

-- CreateTable
CREATE TABLE "menu_views" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "idioma" TEXT NOT NULL,
    "canal" "Canal" NOT NULL,
    "origem" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_views_organization_id_idx" ON "menu_views"("organization_id");

-- CreateIndex
CREATE INDEX "menu_views_organization_id_location_id_created_at_idx" ON "menu_views"("organization_id", "location_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "locations_public_slug_key" ON "locations"("public_slug");

-- AddForeignKey
ALTER TABLE "menu_views" ADD CONSTRAINT "menu_views_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_views" ADD CONSTRAINT "menu_views_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- A parte escrita à mão.
--
-- Nota de processo: esta migração foi gerada com `prisma migrate diff` e não com
-- `migrate dev`. O `migrate dev` falhou com "permission denied to terminate
-- process" — o Postgres desta máquina serve também outro projecto, e o passo da
-- base sombra tenta terminar ligações de outro papel. Não é defeito do schema, e
-- a cadeia continua a ser verificada do zero pelo `provar-migracoes-do-zero.sh`.

-- ── O endereço público ─────────────────────────────────────────────────────
--
-- Único no MUNDO e não por organização: vai para um URL na internet aberta, e
-- dois inquilinos a disputar `/r/la-societat/` é a carta de um servida ao cliente
-- do outro. O `slug` interno continua único só dentro da organização, que é o
-- que deixa duas cadeias ter ambas uma unidade `centro`.
--
-- A forma é a de um segmento de URL. Sem isto, alguém escreve `../admin` e o
-- endereço deixa de apontar para onde diz.
ALTER TABLE "locations"
  ADD CONSTRAINT "public_slug_forma"
  CHECK (public_slug IS NULL OR public_slug ~ '^[a-z0-9]([a-z0-9-]{1,60}[a-z0-9])?$');

-- ── O que a tabela de consultas NÃO pode ter ───────────────────────────────
--
-- A minimização não é uma intenção: é uma restrição. `origem` é a CATEGORIA de
-- onde a consulta veio, e não o endereço de proveniência — o `Referer` completo
-- é ele próprio um dado sobre a pessoa, e um campo de texto livre acabava por o
-- receber inteiro numa alteração distraída.
ALTER TABLE "menu_views"
  ADD CONSTRAINT "consulta_origem"
  CHECK (origem IN ('qr', 'link', 'directo', 'motor-de-busca'));
ALTER TABLE "menu_views"
  ADD CONSTRAINT "consulta_idioma" CHECK (idioma IN ('es-ES', 'pt-BR', 'en'));

-- ── Política de linha e privilégios ────────────────────────────────────────
ALTER TABLE "menu_views" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "menu_views"
  USING (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());
GRANT SELECT, INSERT ON "menu_views" TO bossaos_app;
-- **Sem UPDATE nem DELETE.** Uma consulta é um facto que aconteceu; apagá-la é
-- reescrever o que se mediu, e o relatório passa a poder ser arranjado.
REVOKE UPDATE, DELETE ON "menu_views" FROM bossaos_app;
REVOKE ALL ON "menu_views" FROM bossaos_auth;

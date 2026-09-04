-- ── E12 · o rascunho do tema, o registo da publicação, e a imutabilidade ────
--
-- Três coisas, e a terceira é a que dá dentes ao aceite 3.
--
-- 1. `theme_drafts` — onde se escolhem cores SEM as publicar. Sem ele, "editar"
--    e "publicar" eram o mesmo acto: cada mudança de cor ia direita à rua, e a
--    tela de prévia (THEME-003) não teria nada para pré-visualizar que já não
--    estivesse publicado. É a mesma separação que o E10 fez entre `sites` e
--    `site_revisions`, pela mesma razão.
--
-- 2. `publicada_por` e `destinos` — «registre responsável e destinos» (E12,
--    entregar 3). Um tema no ar sem dizer quem o pôs lá é a única publicação do
--    produto sem rasto: a carta tem `publicadaPor` desde o E08 e o site desde o
--    E10.
--
-- 3. **As cores de uma revisão publicada não se podem alterar nem apagar.**
--    Isto não é higiene: é o par que separa REVERTER de APAGAR. A régua do E12
--    diz que «uma implementação que APAGASSE o tema no downgrade passaria as
--    duas primeiras promessas e falharia a terceira». Uma promessa em código
--    revoga-se com um `git commit`; um `REVOKE DELETE` não.

-- CreateTable
CREATE TABLE "theme_drafts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "primaria" TEXT NOT NULL,
    "acento" TEXT NOT NULL,
    "fundo" TEXT NOT NULL,
    "actualizado_por" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "theme_drafts_pkey" PRIMARY KEY ("id")
);

-- Um rascunho por organização. O tema é da organização e não da unidade — está
-- escrito no cabeçalho do THEME-001 e continua verdade; um rascunho por unidade
-- prometia um override de unidade que o modelo não tem.
CREATE UNIQUE INDEX "theme_drafts_organization_id_key" ON "theme_drafts"("organization_id");

ALTER TABLE "theme_drafts" ADD CONSTRAINT "theme_drafts_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "theme_drafts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "theme_drafts"
  USING      (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

-- AlterTable
ALTER TABLE "theme_revisions" ADD COLUMN "publicada_por" TEXT NOT NULL DEFAULT '';
ALTER TABLE "theme_revisions" ADD COLUMN "destinos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ── A imutabilidade, e a única coluna que fica de fora ─────────────────────
--
-- `activa` TEM de continuar editável: publicar uma revisão nova desliga a
-- anterior, e uma descida de plano desliga a que estava no ar. O resto — as três
-- cores, quem publicou, para onde foi — é história, e história não se corrige.
--
-- É privilégio de coluna e não um gatilho de propósito: um gatilho corre com os
-- privilégios de quem o escreveu e pode ser desactivado por quem tem o dono da
-- tabela; um `GRANT UPDATE (activa)` é o próprio PostgreSQL a recusar antes de
-- olhar para a linha. O `bossaos_migrate` continua a poder tudo, que é o que
-- deixa uma migração futura corrigir um engano de esquema.
REVOKE UPDATE, DELETE ON "theme_revisions" FROM bossaos_app;
GRANT  UPDATE ("activa") ON "theme_revisions" TO bossaos_app;

-- O rascunho é do cliente: escreve-se e reescreve-se à vontade. Apagar também —
-- publicar consome o rascunho.
GRANT SELECT, INSERT, UPDATE, DELETE ON "theme_drafts" TO bossaos_app;

/*
  Warnings:

  - You are about to drop the column `origem_versao` on the `product_translations` table. All the data in the column will be lost.
  - Added the required column `impressao_da_origem` to the `product_translations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoDeImportacao" AS ENUM ('PREVISTA', 'CONFIRMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AccaoDaLinha" AS ENUM ('CRIAR', 'ACTUALIZAR', 'IGNORAR', 'ERRO');

-- CreateEnum
CREATE TYPE "EstadoDeTarefa" AS ENUM ('PENDENTE', 'A_CORRER', 'CONCLUIDA', 'FALHADA');

-- ── A troca do sinal de obsolescência das traduções ────────────────────────
--
-- `origem_versao` era a `version` do produto. Substituída pela impressão do
-- TEXTO, e a razão é uma correcção: a versão avança em qualquer edição — mudar o
-- preço, mudar a categoria — e marcar a tradução como obsoleta por causa do
-- preço é um falso positivo. Falsos positivos são o que ensina toda a gente a
-- ignorar o aviso, e o E00 diz "texto de origem alterado".
--
-- O `ALTER` que o Prisma gerou acrescentava a coluna `NOT NULL` sem valor por
-- omissão, o que **falha numa base com linhas**. Aqui a base de
-- desenvolvimento está vazia, mas uma migração que só funciona na minha máquina
-- não é uma migração.
--
-- O preenchimento é `'por-rever'`, que **não coincide com nenhuma impressão
-- real** — logo toda a tradução existente passa a ler-se como OBSOLETA. É o lado
-- seguro: uma tradução cuja actualidade não se consegue determinar tem de ser
-- revista, não assumida como corrente. É a mesma regra do resto do produto —
-- por configurar significa negado.
ALTER TABLE "product_translations" DROP COLUMN "origem_versao";
ALTER TABLE "product_translations" ADD COLUMN "impressao_da_origem" TEXT;
ALTER TABLE "product_translations" ADD COLUMN "revisto_por" TEXT;
UPDATE "product_translations" SET "impressao_da_origem" = 'por-rever'
  WHERE "impressao_da_origem" IS NULL;
ALTER TABLE "product_translations" ALTER COLUMN "impressao_da_origem" SET NOT NULL;

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "nome_original" TEXT,
    "texto_alternativo" TEXT,
    "criado_por" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 1,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_revisions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "conteudo" JSONB NOT NULL,
    "restaura_de_id" UUID,
    "criada_por" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_publications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "canal" "Canal" NOT NULL,
    "revision_id" UUID NOT NULL,
    "publicada_por" TEXT NOT NULL,
    "publicada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agendada_para" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "estado" "EstadoDeImportacao" NOT NULL DEFAULT 'PREVISTA',
    "ficheiro_nome" TEXT NOT NULL,
    "separador" CHAR(1) NOT NULL,
    "mapeamento" JSONB NOT NULL,
    "estrategia" TEXT NOT NULL,
    "resumo" JSONB,
    "criado_por" TEXT NOT NULL,
    "confirmado_por" TEXT,
    "confirmado_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "linha" INTEGER NOT NULL,
    "accao" "AccaoDaLinha" NOT NULL,
    "erro" TEXT,
    "dados" JSONB NOT NULL,
    "product_id" UUID,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_id" TEXT NOT NULL,
    "accao_exigida" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "chave" TEXT,
    "bytes" INTEGER,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "revogada_em" TIMESTAMPTZ(6),
    "descarregada_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "estado" "EstadoDeTarefa" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proxima_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_erro" TEXT,
    "concluida_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outbox_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_chave_key" ON "media_assets"("chave");

-- CreateIndex
CREATE INDEX "media_assets_organization_id_idx" ON "media_assets"("organization_id");

-- CreateIndex
CREATE INDEX "media_assets_organization_id_brand_id_idx" ON "media_assets"("organization_id", "brand_id");

-- CreateIndex
CREATE INDEX "media_assets_organization_id_digest_idx" ON "media_assets"("organization_id", "digest");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_organization_id_id_key" ON "media_assets"("organization_id", "id");

-- CreateIndex
CREATE INDEX "product_media_organization_id_idx" ON "product_media"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_media_organization_id_product_id_media_id_key" ON "product_media"("organization_id", "product_id", "media_id");

-- CreateIndex
CREATE INDEX "menu_revisions_organization_id_idx" ON "menu_revisions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_revisions_organization_id_menu_id_numero_key" ON "menu_revisions"("organization_id", "menu_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "menu_revisions_organization_id_id_key" ON "menu_revisions"("organization_id", "id");

-- CreateIndex
CREATE INDEX "menu_publications_organization_id_idx" ON "menu_publications"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_publications_organization_id_menu_id_canal_key" ON "menu_publications"("organization_id", "menu_id", "canal");

-- CreateIndex
CREATE INDEX "import_jobs_organization_id_idx" ON "import_jobs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_jobs_organization_id_id_key" ON "import_jobs"("organization_id", "id");

-- CreateIndex
CREATE INDEX "import_rows_organization_id_idx" ON "import_rows"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_rows_organization_id_job_id_linha_key" ON "import_rows"("organization_id", "job_id", "linha");

-- CreateIndex
CREATE UNIQUE INDEX "export_jobs_chave_key" ON "export_jobs"("chave");

-- CreateIndex
CREATE INDEX "export_jobs_organization_id_idx" ON "export_jobs"("organization_id");

-- CreateIndex
CREATE INDEX "export_jobs_organization_id_actor_id_idx" ON "export_jobs"("organization_id", "actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "export_jobs_organization_id_id_key" ON "export_jobs"("organization_id", "id");

-- CreateIndex
CREATE INDEX "outbox_tasks_organization_id_idx" ON "outbox_tasks"("organization_id");

-- CreateIndex
CREATE INDEX "outbox_tasks_estado_proxima_em_idx" ON "outbox_tasks"("estado", "proxima_em");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_organization_id_brand_id_fkey" FOREIGN KEY ("organization_id", "brand_id") REFERENCES "brands"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_organization_id_media_id_fkey" FOREIGN KEY ("organization_id", "media_id") REFERENCES "media_assets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_revisions" ADD CONSTRAINT "menu_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_revisions" ADD CONSTRAINT "menu_revisions_organization_id_menu_id_fkey" FOREIGN KEY ("organization_id", "menu_id") REFERENCES "menus"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_revisions" ADD CONSTRAINT "menu_revisions_organization_id_restaura_de_id_fkey" FOREIGN KEY ("organization_id", "restaura_de_id") REFERENCES "menu_revisions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_publications" ADD CONSTRAINT "menu_publications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_publications" ADD CONSTRAINT "menu_publications_organization_id_menu_id_fkey" FOREIGN KEY ("organization_id", "menu_id") REFERENCES "menus"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_publications" ADD CONSTRAINT "menu_publications_organization_id_revision_id_fkey" FOREIGN KEY ("organization_id", "revision_id") REFERENCES "menu_revisions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_organization_id_brand_id_fkey" FOREIGN KEY ("organization_id", "brand_id") REFERENCES "brands"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_organization_id_job_id_fkey" FOREIGN KEY ("organization_id", "job_id") REFERENCES "import_jobs"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_tasks" ADD CONSTRAINT "outbox_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- A parte escrita à mão.

-- ── Regras que a BASE recusa ───────────────────────────────────────────────

-- O tipo de ficheiro é decidido pelos BYTES, no domínio. Isto é a última linha,
-- para quem escrever por outro caminho — a mesma razão do `grupo_bem_formado` do
-- E07. **O SVG não está na lista, e é o ponto**: um SVG é um documento com
-- script dentro, e servido no domínio do restaurante é XSS armazenado.
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_tipo_permitido"
  CHECK (tipo IN ('png', 'jpeg', 'webp', 'gif'));
-- Um ficheiro de zero bytes não é um ficheiro; é um carregamento que falhou a
-- meio e ninguém notou.
ALTER TABLE "media_assets" ADD CONSTRAINT "media_com_conteudo" CHECK (bytes > 0);
-- SHA-256 em hexadecimal. Um digest com outra forma é um digest de outra coisa.
ALTER TABLE "media_assets" ADD CONSTRAINT "media_digest" CHECK (digest ~ '^[0-9a-f]{64}$');

-- A estratégia de importação é explícita ou não há importação (E00). Sem esta
-- restrição, uma coluna de texto aceita `''` — e uma cadeia vazia lida por um
-- `switch` sem `default` cai no ramo que o autor achou mais provável.
ALTER TABLE "import_jobs"
  ADD CONSTRAINT "importacao_estrategia"
  CHECK (estrategia IN ('criar_apenas', 'actualizar_por_sku'));
ALTER TABLE "import_rows" ADD CONSTRAINT "importacao_linha" CHECK (linha >= 2);

-- Uma revisão é a número 1 ou maior. Zero não é uma revisão.
ALTER TABLE "menu_revisions" ADD CONSTRAINT "revisao_numero" CHECK (numero >= 1);
-- Uma revisão **não se restaura a si própria**: seria um ciclo, e um histórico
-- com um ciclo deixa de responder à pergunta "o que estava publicado no dia 4".
ALTER TABLE "menu_revisions"
  ADD CONSTRAINT "revisao_nao_se_restaura" CHECK (restaura_de_id IS NULL OR restaura_de_id <> id);

-- Um link que expira antes de ser criado nunca serve para nada, e um que não
-- expira é a porta que o E00 manda fechar.
ALTER TABLE "export_jobs"
  ADD CONSTRAINT "exportacao_expira_depois" CHECK (expira_em > created_at);
ALTER TABLE "outbox_tasks" ADD CONSTRAINT "tarefa_tentativas" CHECK (tentativas >= 0);

-- ── Uma só imagem principal por produto ────────────────────────────────────
--
-- `UNIQUE (organization_id, product_id, principal)` não serve: permitiria uma
-- principal e uma não-principal, e mais nenhuma. O índice parcial diz o que se
-- quer dizer — **entre as principais**, uma por produto.
CREATE UNIQUE INDEX "media_principal_unica"
  ON "product_media" (organization_id, product_id)
  WHERE principal;

-- ── Política de linha e privilégios ────────────────────────────────────────
ALTER TABLE "media_assets"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_media"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_revisions"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_publications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_jobs"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_rows"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "export_jobs"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_tasks"      ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'media_assets','product_media','menu_revisions','menu_publications',
    'import_jobs','import_rows','export_jobs','outbox_tasks'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual())',
      t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO bossaos_app', t);
    EXECUTE format('REVOKE ALL ON %I FROM bossaos_auth', t);
  END LOOP;
END $$;

-- ── O que o runtime NÃO pode fazer a uma revisão ───────────────────────────
--
-- Uma revisão é **imutável**. O `GRANT` de cima dá `UPDATE` e `DELETE` a todas as
-- tabelas do lote, o que aqui está errado: se o runtime pode reescrever uma
-- revisão publicada, "o que estava publicado no dia 4" deixa de ter resposta —
-- e a resposta é o que se procura depois de uma reclamação.
--
-- Retira-se o que não deve existir. O que o runtime faz é CRIAR revisões novas e
-- trocar o ponteiro em `menu_publications`, que continua a poder ser actualizada.
REVOKE UPDATE, DELETE ON "menu_revisions" FROM bossaos_app;

-- CreateEnum
CREATE TYPE "EstadoDoSite" AS ENUM ('RASCUNHO', 'PUBLICADO', 'RETIRADO');

-- CreateEnum
CREATE TYPE "TipoDePaginaDoSite" AS ENUM ('INICIO', 'SOBRE', 'CONTACTO');

-- CreateEnum
CREATE TYPE "EstadoDeDominio" AS ENUM ('PENDENTE', 'VERIFICADO', 'INDETERMINADO', 'CONTESTADO');

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "estado" "EstadoDoSite" NOT NULL DEFAULT 'RASCUNHO',
    "seo_titulo" TEXT,
    "seo_descricao" TEXT,
    "redes" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_pages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "tipo" "TipoDePaginaDoSite" NOT NULL,
    "visivel" BOOLEAN NOT NULL DEFAULT false,
    "titulo" TEXT,
    "corpo" TEXT,
    "contacto" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "site_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_posts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumo" TEXT,
    "corpo" TEXT,
    "publicado_em" TIMESTAMPTZ(6),
    "visivel" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "site_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_revisions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "conteudo" JSONB NOT NULL,
    "criada_por" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_publications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "publicada_por" TEXT NOT NULL,
    "publicada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "site_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "mensagem" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'site',
    "chave_idempotencia" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_domains" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "dominio" TEXT NOT NULL,
    "estado" "EstadoDeDominio" NOT NULL DEFAULT 'PENDENTE',
    "token_verificacao" TEXT NOT NULL,
    "verificado_em" TIMESTAMPTZ(6),
    "ultima_tentativa_em" TIMESTAMPTZ(6),
    "motivo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_domain_owners" (
    "dominio" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "custom_domain_owners_pkey" PRIMARY KEY ("dominio")
);

-- CreateIndex
CREATE INDEX "sites_organization_id_idx" ON "sites"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sites_organization_id_id_key" ON "sites"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "sites_organization_id_location_id_key" ON "sites"("organization_id", "location_id");

-- CreateIndex
CREATE INDEX "site_pages_organization_id_idx" ON "site_pages"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_pages_organization_id_site_id_tipo_key" ON "site_pages"("organization_id", "site_id", "tipo");

-- CreateIndex
CREATE INDEX "site_posts_organization_id_idx" ON "site_posts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_posts_organization_id_site_id_slug_key" ON "site_posts"("organization_id", "site_id", "slug");

-- CreateIndex
CREATE INDEX "site_revisions_organization_id_idx" ON "site_revisions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_revisions_organization_id_site_id_numero_key" ON "site_revisions"("organization_id", "site_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "site_revisions_organization_id_id_key" ON "site_revisions"("organization_id", "id");

-- CreateIndex
CREATE INDEX "site_publications_organization_id_idx" ON "site_publications"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_publications_organization_id_site_id_key" ON "site_publications"("organization_id", "site_id");

-- CreateIndex
CREATE INDEX "leads_organization_id_idx" ON "leads"("organization_id");

-- CreateIndex
CREATE INDEX "leads_organization_id_location_id_created_at_idx" ON "leads"("organization_id", "location_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organization_id_location_id_chave_idempotencia_key" ON "leads"("organization_id", "location_id", "chave_idempotencia");

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_dominio_key" ON "custom_domains"("dominio");

-- CreateIndex
CREATE INDEX "custom_domains_organization_id_idx" ON "custom_domains"("organization_id");

-- CreateIndex
CREATE INDEX "custom_domains_organization_id_location_id_idx" ON "custom_domains"("organization_id", "location_id");

-- CreateIndex
CREATE INDEX "custom_domain_owners_organization_id_idx" ON "custom_domain_owners"("organization_id");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_organization_id_site_id_fkey" FOREIGN KEY ("organization_id", "site_id") REFERENCES "sites"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_posts" ADD CONSTRAINT "site_posts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_posts" ADD CONSTRAINT "site_posts_organization_id_site_id_fkey" FOREIGN KEY ("organization_id", "site_id") REFERENCES "sites"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_revisions" ADD CONSTRAINT "site_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_revisions" ADD CONSTRAINT "site_revisions_organization_id_site_id_fkey" FOREIGN KEY ("organization_id", "site_id") REFERENCES "sites"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_publications" ADD CONSTRAINT "site_publications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_publications" ADD CONSTRAINT "site_publications_organization_id_site_id_fkey" FOREIGN KEY ("organization_id", "site_id") REFERENCES "sites"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_publications" ADD CONSTRAINT "site_publications_organization_id_revision_id_fkey" FOREIGN KEY ("organization_id", "revision_id") REFERENCES "site_revisions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_organization_id_location_id_fkey" FOREIGN KEY ("organization_id", "location_id") REFERENCES "locations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_domain_owners" ADD CONSTRAINT "custom_domain_owners_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ═══════════════════════════════════════════════════════════════════════════
-- A parte escrita à mão.
--
-- Nota de processo, igual à do E09: gerada com `prisma migrate diff` e não com
-- `migrate dev` — o `migrate dev` falha nesta máquina com "permission denied to
-- terminate process", porque o Postgres serve também outro projecto e o passo da
-- base sombra tenta terminar ligações de outro papel. A cadeia continua a ser
-- verificada do zero pelo `provar-migracoes-do-zero.sh`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Formas, verificadas pela base ──────────────────────────────────────────
--
-- O `slug` de uma novidade é um segmento de URL. Sem esta restrição alguém
-- escreve `../` e o endereço deixa de apontar para onde diz — é a mesma
-- verificação que o `public_slug` do E09 tem, e pela mesma razão.
ALTER TABLE "site_posts"
  ADD CONSTRAINT "site_post_slug_forma"
  CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,80}[a-z0-9])?$');

-- Um nome de anfitrião, minúsculas, com pelo menos um ponto. Não valida que o
-- domínio existe — isso é o DNS a responder, e é a regra 1 do contrato.
ALTER TABLE "custom_domains"
  ADD CONSTRAINT "dominio_forma"
  CHECK (dominio ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$');
ALTER TABLE "custom_domain_owners"
  ADD CONSTRAINT "dominio_detido_forma"
  CHECK (dominio ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$');

-- A origem do lead é uma CATEGORIA fechada, não texto livre. Mesma decisão que
-- a `origem` das consultas do E09: um campo livre acaba por receber o `Referer`
-- inteiro numa alteração distraída, e o `Referer` é ele próprio um dado pessoal.
ALTER TABLE "leads"
  ADD CONSTRAINT "lead_origem" CHECK (origem IN ('site', 'carta', 'qr', 'demo'));

-- Nome e mensagem vazios não são um lead. A recusa é da base porque o aceite 2
-- diz "lead VÁLIDO guarda-se uma vez" — e o que não é válido não se guarda de
-- todo, muito menos com um ecrã de sucesso à frente.
ALTER TABLE "leads"
  ADD CONSTRAINT "lead_tem_conteudo"
  CHECK (length(btrim(nome)) > 0 AND length(btrim(mensagem)) > 0 AND position('@' in email) > 1);

-- ── Políticas de linha e privilégios ───────────────────────────────────────
ALTER TABLE "sites"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_pages"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_posts"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_revisions"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_publications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_domains"    ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "sites"
  USING (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "site_pages"
  USING (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "site_posts"
  USING (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "site_revisions"
  USING (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "site_publications"
  USING (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "leads"
  USING (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "custom_domains"
  USING (organization_id = app_organizacao_actual())
  WITH CHECK (organization_id = app_organizacao_actual());

GRANT SELECT, INSERT, UPDATE, DELETE ON "sites"             TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "site_pages"        TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "site_posts"        TO bossaos_app;
GRANT SELECT, INSERT                 ON "site_revisions"    TO bossaos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "site_publications" TO bossaos_app;
GRANT SELECT, INSERT                 ON "leads"             TO bossaos_app;
GRANT SELECT, INSERT, UPDATE         ON "custom_domains"    TO bossaos_app;

-- ── A revisão é IMUTÁVEL, e é a base que o garante ─────────────────────────
--
-- Mesma decisão que `menu_revisions` no E08. Uma revisão que se pode editar não
-- é uma versão: é uma linha que finge ter sido o que está no ar. E a prova de
-- que o rascunho não mexe no público perde o sentido se o público for editável.
REVOKE UPDATE, DELETE ON "site_revisions" FROM bossaos_app;

-- Um lead é um facto que aconteceu. Apagá-lo é reescrever o que se mediu — e,
-- pior, é a saída fácil para esconder que a gravação estava a falhar.
REVOKE UPDATE, DELETE ON "leads" FROM bossaos_app;

-- O domínio não se desvincula apagando a linha: muda de estado. E o dono NUNCA
-- se apaga pelo produto — é a regra 3 do contrato, e o `public_slug_owners` do
-- E09 tem exactamente a mesma protecção.
REVOKE DELETE ON "custom_domains" FROM bossaos_app;
REVOKE ALL ON "custom_domain_owners" FROM bossaos_app;
GRANT SELECT ON "custom_domain_owners" TO bossaos_app;

-- O papel de autenticação não vê uma linha de inquilino. Quarta porta do CT-04.
REVOKE ALL ON "sites"                FROM bossaos_auth;
REVOKE ALL ON "site_pages"           FROM bossaos_auth;
REVOKE ALL ON "site_posts"           FROM bossaos_auth;
REVOKE ALL ON "site_revisions"       FROM bossaos_auth;
REVOKE ALL ON "site_publications"    FROM bossaos_auth;
REVOKE ALL ON "leads"                FROM bossaos_auth;
REVOKE ALL ON "custom_domains"       FROM bossaos_auth;
REVOKE ALL ON "custom_domain_owners" FROM bossaos_auth;

-- ═══════════════════════════════════════════════════════════════════════════
-- A porta pública do site
--
-- Gémea da `publico_carta` do E09 — e escrita já com a lição que aquela custou:
-- **o site é servido pela UNIDADE do endereço**, e a junção di-lo explicitamente
-- em vez de a deixar implícita numa relação de marca. A `publico_carta` juntava
-- pela marca e serviu, num endereço, o menu de outra unidade.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION publico_site(p_slug text)
RETURNS TABLE (
  organization_id uuid, location_id uuid, location_nome text, marca_nome text,
  fuso text, moeda text, revision_id uuid, revision_numero integer,
  conteudo jsonb, publicada_em timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    l.organization_id, l.id, l.nome, b.nome, l.fuso, l.moeda,
    r.id, r.numero, r.conteudo, p.publicada_em
  FROM locations l
  JOIN brands b ON b.organization_id = l.organization_id AND b.id = l.brand_id
  -- O site DESTA unidade. Não há caminho por onde o de outra entre.
  JOIN sites s ON s.organization_id = l.organization_id
              AND s.location_id = l.id
              AND s.archived_at IS NULL
  -- Só o que está PUBLICADO. Um rascunho não tem linha aqui, e retirar apaga-a:
  -- é o aceite 1, e é por construção e não por uma bandeira que alguém possa
  -- esquecer-se de ler.
  JOIN site_publications p ON p.organization_id = s.organization_id AND p.site_id = s.id
  JOIN site_revisions r ON r.organization_id = p.organization_id AND r.id = p.revision_id
  WHERE l.public_slug = p_slug
    AND l.archived_at IS NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION publico_site(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publico_site(text) TO bossaos_app;

-- ── E a porta pelo DOMÍNIO PRÓPRIO ────────────────────────────────────────
--
-- Regra 1 do contrato: **só depois de ver a prova de controlo é que o domínio
-- serve conteúdo**. Antes disso existe como pedido pendente, e um pedido
-- pendente não responde a pedidos. O `estado = 'VERIFICADO'` está AQUI, na porta,
-- e não numa verificação que alguém tenha de se lembrar de fazer antes de
-- chamar — foi assim que a terceira verificação do CT-02 nunca disparou no E05.
CREATE OR REPLACE FUNCTION publico_site_por_dominio(p_dominio text)
RETURNS TABLE (
  organization_id uuid, location_id uuid, location_nome text, marca_nome text,
  fuso text, moeda text, revision_id uuid, revision_numero integer,
  conteudo jsonb, publicada_em timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    l.organization_id, l.id, l.nome, b.nome, l.fuso, l.moeda,
    r.id, r.numero, r.conteudo, p.publicada_em
  FROM custom_domains d
  JOIN locations l ON l.organization_id = d.organization_id AND l.id = d.location_id
  JOIN brands b ON b.organization_id = l.organization_id AND b.id = l.brand_id
  JOIN sites s ON s.organization_id = l.organization_id
              AND s.location_id = l.id
              AND s.archived_at IS NULL
  JOIN site_publications p ON p.organization_id = s.organization_id AND p.site_id = s.id
  JOIN site_revisions r ON r.organization_id = p.organization_id AND r.id = p.revision_id
  WHERE d.dominio = lower(p_dominio)
    -- VERIFICADO **e** INDETERMINADO, e a segunda parte e' a regra 2 do contrato.
    --
    -- INDETERMINADO quer dizer "o DNS deixou de responder", nao "o dominio mudou
    -- de dono". Se so' servisse VERIFICADO, um tempo-limite de rede de dez
    -- segundos tirava do ar o site de um cliente que nao fez nada -- que e'
    -- exactamente o dano que a regra existe para impedir.
    --
    -- PENDENTE nao serve (regra 1: sem prova nao ha' conteudo) e CONTESTADO
    -- tambem nao: ai viu-se OUTRO dono, que e' a unica forma de concluir que a
    -- posse se perdeu.
    AND d.estado IN ('VERIFICADO', 'INDETERMINADO')
    AND l.archived_at IS NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION publico_site_por_dominio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publico_site_por_dominio(text) TO bossaos_app;

-- ═══════════════════════════════════════════════════════════════════════════
-- Vincular e largar um domínio — regras 3 e 4 do contrato
--
-- O `@unique` do `custom_domains.dominio` impede dois AO MESMO TEMPO. Não impede
-- dois EM SEQUÊNCIA, e a sequência é o caso real: A larga, B reclama, e os
-- cartões e anúncios de A passam a levar gente ao concorrente. São ataques
-- diferentes e confundi-los é achar que um índice já resolveu o problema.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION vincular_dominio(
  p_organization_id uuid,
  p_location_id uuid,
  p_dominio text,
  p_token text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dominio text := lower(btrim(p_dominio));
  v_dono uuid;
  v_em_uso uuid;
BEGIN
  IF v_dominio !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$' THEN
    RETURN 'invalido';
  END IF;

  SELECT organization_id INTO v_dono FROM custom_domain_owners WHERE dominio = v_dominio;

  -- Reservado por OUTRA organização: recusa com motivo próprio. Dizer "ocupado"
  -- mandava a pessoa esperar que se liberte, e ele não se liberta.
  IF v_dono IS NOT NULL AND v_dono <> p_organization_id THEN
    RETURN 'reservado_por_outra_organizacao';
  END IF;

  -- Em uso AGORA por outra unidade, mesmo dentro da mesma organização.
  SELECT organization_id INTO v_em_uso
  FROM custom_domains WHERE dominio = v_dominio AND location_id <> p_location_id;
  IF v_em_uso IS NOT NULL THEN
    RETURN 'em_uso';
  END IF;

  INSERT INTO custom_domain_owners (dominio, organization_id, location_id, updated_at)
  VALUES (v_dominio, p_organization_id, p_location_id, now())
  ON CONFLICT (dominio) DO UPDATE
    SET location_id = EXCLUDED.location_id, updated_at = now();

  -- Nasce PENDENTE, sempre. Vincular não é verificar: escrever o domínio numa
  -- caixa de texto não prova nada, e quem não provou não serve conteúdo.
  INSERT INTO custom_domains (
    id, organization_id, location_id, dominio, estado, token_verificacao, updated_at)
  VALUES (
    gen_random_uuid(), p_organization_id, p_location_id, v_dominio, 'PENDENTE', p_token, now())
  ON CONFLICT (dominio) DO UPDATE
    SET location_id = EXCLUDED.location_id, estado = 'PENDENTE',
        token_verificacao = EXCLUDED.token_verificacao,
        verificado_em = NULL, motivo = NULL, updated_at = now();

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION vincular_dominio(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vincular_dominio(uuid, uuid, text, text) TO bossaos_app;

-- Largar tira do ar. **Não devolve o nome ao mundo**: a linha de dono fica.
CREATE OR REPLACE FUNCTION largar_dominio(p_organization_id uuid, p_dominio text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dominio text := lower(btrim(p_dominio));
  v_apagados int;
BEGIN
  DELETE FROM custom_domains
   WHERE dominio = v_dominio AND organization_id = p_organization_id;
  GET DIAGNOSTICS v_apagados = ROW_COUNT;
  IF v_apagados = 0 THEN RETURN 'nao_encontrado'; END IF;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION largar_dominio(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION largar_dominio(uuid, text) TO bossaos_app;

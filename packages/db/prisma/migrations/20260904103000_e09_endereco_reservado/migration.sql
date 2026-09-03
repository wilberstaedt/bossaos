-- ── O endereço público não se liberta ──────────────────────────────────────
--
-- O `@unique` em `locations.public_slug` impede **dois ao mesmo tempo**. Não
-- impede **dois em sequência**: A publica com `marina-centro`, apaga-o, e B
-- reclama-o. A partir daí todos os QR impressos de A servem a carta de B — sem
-- erro, sem aviso, e sem ninguém do lado de A poder dar por isso. O papel não se
-- actualiza.
--
-- São ataques diferentes e é fácil confundi-los: o primeiro falha ruidosamente
-- na base, o segundo passa por uma operação perfeitamente legítima.
--
-- Esta tabela guarda quem teve cada endereço. Uma linha aqui **nunca se apaga**
-- por limpar um campo: libertar é uma acção deliberada de plataforma, e não um
-- efeito lateral.
-- A forma é a que o Prisma gera, e isso não é cosmético: com `DEFAULT now()` no
-- `updated_at` ou com a chave estrangeira em linha, `migrate diff` acusa desvio
-- entre o schema e a base — e um desvio permanente ensina toda a gente a ignorar
-- o comando que o deteta. O `@updatedAt` do Prisma é do lado da aplicação.
CREATE TABLE "public_slug_owners" (
  "slug"            TEXT NOT NULL,
  "organization_id" UUID NOT NULL,
  -- A unidade que o teve primeiro. Serve o rasto; a reserva é da ORGANIZAÇÃO,
  -- porque mudar a carta de unidade dentro da mesma cadeia é legítimo.
  "location_id"     UUID,
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "public_slug_owners_pkey" PRIMARY KEY ("slug")
);

ALTER TABLE "public_slug_owners"
  ADD CONSTRAINT "public_slug_owners_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "public_slug_owners_organization_id_idx"
  ON "public_slug_owners"(organization_id);

ALTER TABLE "public_slug_owners"
  ADD CONSTRAINT "reserva_slug_forma"
  CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,60}[a-z0-9])?$');

-- ── O runtime não escreve aqui directamente ────────────────────────────────
--
-- Se pudesse, uma rota podia apagar a reserva de outro e reclamar o endereço —
-- que é exactamente o que a tabela existe para impedir. Escreve-se só pela
-- função abaixo, que decide.
ALTER TABLE "public_slug_owners" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "public_slug_owners"
  USING (organization_id = app_organizacao_actual());
GRANT SELECT ON "public_slug_owners" TO bossaos_app;
REVOKE INSERT, UPDATE, DELETE ON "public_slug_owners" FROM bossaos_app;
REVOKE ALL ON "public_slug_owners" FROM bossaos_auth;

-- ── A porta estreita que reserva ───────────────────────────────────────────
--
-- `SECURITY DEFINER` porque a pergunta que ela faz — "este endereço já foi de
-- alguém?" — atravessa inquilinos por natureza, e nenhum inquilino pode ler a
-- resposta directamente. Devolve um motivo e não um booleano: "ocupado" e
-- "reservado por outra organização" mandam a pessoa a sítios diferentes.
CREATE OR REPLACE FUNCTION reservar_endereco_publico(
  p_organization_id uuid,
  p_location_id uuid,
  p_slug text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dono uuid;
  v_em_uso uuid;
BEGIN
  IF p_slug !~ '^[a-z0-9]([a-z0-9-]{1,60}[a-z0-9])?$' THEN
    RETURN 'invalido';
  END IF;

  SELECT organization_id INTO v_dono FROM public_slug_owners WHERE slug = p_slug;

  -- Reservado por OUTRA organização: recusa, e com um motivo próprio. Dizer
  -- "ocupado" mandava a pessoa esperar que se liberte, e ele não se liberta.
  IF v_dono IS NOT NULL AND v_dono <> p_organization_id THEN
    RETURN 'reservado_por_outra_organizacao';
  END IF;

  -- Em uso AGORA por outra unidade, mesmo dentro da mesma organização: duas
  -- unidades não podem responder no mesmo endereço.
  SELECT organization_id INTO v_em_uso
  FROM locations WHERE public_slug = p_slug AND id <> p_location_id;
  IF v_em_uso IS NOT NULL THEN
    RETURN 'em_uso';
  END IF;

  INSERT INTO public_slug_owners (slug, organization_id, location_id, updated_at)
  VALUES (p_slug, p_organization_id, p_location_id, now())
  ON CONFLICT (slug) DO UPDATE
    SET location_id = EXCLUDED.location_id, updated_at = now();

  UPDATE locations SET public_slug = p_slug
  WHERE id = p_location_id AND organization_id = p_organization_id;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION reservar_endereco_publico(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reservar_endereco_publico(uuid, uuid, text) TO bossaos_app;

-- ── Largar o endereço: tira-o do ar, NÃO o devolve ao mundo ────────────────
--
-- A reserva fica. É a diferença entre "o link morre" e "o endereço volta ao
-- mercado", e a segunda nunca acontece por limpar um campo.
CREATE OR REPLACE FUNCTION largar_endereco_publico(
  p_organization_id uuid,
  p_location_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE locations SET public_slug = NULL
  WHERE id = p_location_id AND organization_id = p_organization_id
$$;

REVOKE ALL ON FUNCTION largar_endereco_publico(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION largar_endereco_publico(uuid, uuid) TO bossaos_app;

-- ── Semear as reservas do que já está publicado ────────────────────────────
--
-- Sem isto, uma unidade que já tinha endereço antes desta migração ficava sem
-- reserva — e bastava largá-lo para outro o apanhar. A migração tem de deixar o
-- sistema no estado que a regra descreve, e não só a regra escrita.
INSERT INTO public_slug_owners (slug, organization_id, location_id, updated_at)
SELECT public_slug, organization_id, id, now() FROM locations WHERE public_slug IS NOT NULL
ON CONFLICT (slug) DO NOTHING;

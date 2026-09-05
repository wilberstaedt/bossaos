-- E27 · CRM, fidelidade e campanhas
-- Contrato: docs/architecture/consentimento-e-campanhas.md
--
-- Nesta etapa um defeito não estraga um número: manda uma mensagem a uma pessoa
-- que não a pediu. Por isso a garantia central está AQUI, num gatilho, e não no
-- código da aplicação.

CREATE TYPE "FinalidadeDeContacto"    AS ENUM ('SERVICO', 'CAMPANHA');
CREATE TYPE "CanalDeContacto"         AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "AccaoDeConsentimento"    AS ENUM ('DADO', 'RETIRADO');
CREATE TYPE "TipoDeMovimentoDePontos" AS ENUM ('GANHO', 'RESGATE', 'AJUSTE', 'EXPIRACAO');

-- Repare-se no que NÃO existe nesta tabela: nenhuma coluna «aceita campanhas».
CREATE TABLE "customers" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  "email"           TEXT,
  "telefone"        TEXT,
  "origem"          TEXT,
  "saldo_pontos"    BIGINT NOT NULL DEFAULT 0,
  "juntado_a_id"    UUID REFERENCES "customers"("id") ON DELETE SET NULL,
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "customers_por_unidade" ON "customers" ("location_id");

CREATE TABLE "consent_events" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "customer_id"     UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "finalidade"      "FinalidadeDeContacto" NOT NULL,
  "canal"           "CanalDeContacto" NOT NULL,
  "accao"           "AccaoDeConsentimento" NOT NULL,
  -- Sem origem, um consentimento não se consegue defender a ninguém.
  "origem"          TEXT NOT NULL,
  "expira_em"       TIMESTAMPTZ(6),
  "momento"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "origem_do_consentimento_nao_e_vazia" CHECK (length(btrim("origem")) > 0)
);
CREATE INDEX "consent_events_por_pessoa"
  ON "consent_events" ("customer_id", "finalidade", "canal", "momento");

CREATE TABLE "loyalty_movements" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "customer_id"     UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "tipo"            "TipoDeMovimentoDePontos" NOT NULL,
  -- Sempre positiva: o sinal vem do tipo. A mesma regra do stock no E25.
  "pontos"          BIGINT NOT NULL,
  "motivo"          TEXT   NOT NULL,
  "momento"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "pontos_tem_de_ser_positivo" CHECK ("pontos" > 0)
);
CREATE INDEX "loyalty_movements_por_pessoa" ON "loyalty_movements" ("customer_id");

CREATE TABLE "loyalty_rewards" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT   NOT NULL,
  "custo_pontos"    BIGINT NOT NULL,
  "valor_menor"     BIGINT NOT NULL,
  "moeda"           TEXT   NOT NULL DEFAULT 'EUR',
  "arquivada_em"    TIMESTAMPTZ(6),
  CONSTRAINT "custo_em_pontos_positivo" CHECK ("custo_pontos" > 0),
  CONSTRAINT "valor_da_recompensa_nao_negativo" CHECK ("valor_menor" >= 0)
);

-- O segmento guarda CRITÉRIOS. Não há tabela de membros, de propósito.
CREATE TABLE "segments" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  "regra"           JSONB NOT NULL,
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "um_segmento_por_nome" ON "segments" ("location_id", "nome");

CREATE TABLE "campaign_templates" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  "canal"           "CanalDeContacto" NOT NULL,
  "assunto"         TEXT,
  "corpo"           TEXT NOT NULL,
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "um_modelo_de_campanha_por_nome" ON "campaign_templates" ("location_id", "nome");

CREATE TABLE "campaigns" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  "canal"           "CanalDeContacto" NOT NULL,
  "segment_id"      UUID NOT NULL REFERENCES "segments"("id") ON DELETE RESTRICT,
  "template_id"     UUID NOT NULL REFERENCES "campaign_templates"("id") ON DELETE RESTRICT,
  -- Não há ENVIADA: o que foi enviado deriva-se dos envios, e uma campanha a
  -- meio é justamente o estado que interessa para a retirada valer.
  "estado"          TEXT NOT NULL DEFAULT 'RASCUNHO',
  "criada_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "criada_por"      TEXT,
  CONSTRAINT "estado_da_campanha_conhecido"
    CHECK ("estado" IN ('RASCUNHO', 'A_ENVIAR', 'TERMINADA'))
);
CREATE UNIQUE INDEX "uma_campanha_por_nome" ON "campaigns" ("location_id", "nome");

CREATE TABLE "campaign_deliveries" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "campaign_id"     UUID NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "customer_id"     UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "canal"           "CanalDeContacto" NOT NULL,
  "estado"          TEXT NOT NULL DEFAULT 'POR_ENVIAR',
  "gravado_em"      TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
-- A mesma pessoa não recebe a mesma campanha duas vezes, nem que se carregue
-- duas vezes no botão.
CREATE UNIQUE INDEX "um_envio_por_pessoa_e_campanha"
  ON "campaign_deliveries" ("campaign_id", "customer_id");

CREATE TABLE "feedback_entries" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "customer_id"     UUID REFERENCES "customers"("id") ON DELETE SET NULL,
  "nota"            INT NOT NULL,
  "comentario"      TEXT,
  "origem"          TEXT,
  "momento"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "nota_de_1_a_5" CHECK ("nota" BETWEEN 1 AND 5)
);

-- ── O estado do consentimento DERIVA-SE, e é a base que o calcula ─────────
--
-- O último acontecimento de cada (pessoa, finalidade, canal) manda, e um
-- consentimento com `expira_em` passado não autoriza nada. A comparação é com o
-- relógio da BASE, e não com o do processo: o contacto deixado à porta tem uma
-- finalidade que acaba, e quem decide que acabou é o relógio.
CREATE OR REPLACE FUNCTION tem_consentimento(
  p_customer UUID, p_finalidade "FinalidadeDeContacto", p_canal "CanalDeContacto"
) RETURNS BOOLEAN AS $$
DECLARE
  ultimo RECORD;
BEGIN
  SELECT c."accao", c."expira_em" INTO ultimo
    FROM "consent_events" c
   WHERE c."customer_id" = p_customer
     AND c."finalidade"  = p_finalidade
     AND c."canal"       = p_canal
   ORDER BY c."momento" DESC, c."id" DESC
   LIMIT 1;

  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF ultimo."accao" = 'RETIRADO' THEN RETURN FALSE; END IF;
  IF ultimo."expira_em" IS NOT NULL AND ultimo."expira_em" <= now() THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ── A GARANTIA CENTRAL DESTA ETAPA ────────────────────────────────────────
--
-- Não se grava um envio de campanha para quem não tenha, NAQUELE INSTANTE,
-- consentimento vivo de CAMPANHA naquele canal.
--
-- É isto que faz a retirada valer «antes do próximo envio» em vez de «a partir
-- da próxima campanha»: entre construir a audiência e despachar a milésima
-- mensagem passam minutos, e a verificação acontece a cada gravação.
--
-- E a ordem é gravar ANTES de despachar — a mesma decisão da assinatura antes do
-- efeito no E23. Recusada a gravação, não há nada despachado: um defeito na
-- aplicação não consegue enviar, porque não consegue registar.
CREATE OR REPLACE FUNCTION campanha_exige_consentimento()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT tem_consentimento(NEW."customer_id", 'CAMPANHA', NEW."canal") THEN
    RAISE EXCEPTION
      'SEM_CONSENTIMENTO_DE_CAMPANHA: dados para prestar serviço não dão permissão de campanha';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "envio_exige_consentimento_vivo"
  BEFORE INSERT ON "campaign_deliveries"
  FOR EACH ROW EXECUTE FUNCTION campanha_exige_consentimento();

-- ── O saldo de pontos deriva-se, como o saldo de stock no E25 ─────────────
CREATE OR REPLACE FUNCTION pontos_saldo_nao_se_escreve()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."saldo_pontos" IS DISTINCT FROM OLD."saldo_pontos" THEN
    NEW."saldo_pontos" := COALESCE((SELECT SUM(CASE
        WHEN m."tipo" IN ('GANHO', 'AJUSTE') THEN m."pontos"
        ELSE -m."pontos" END)
      FROM "loyalty_movements" m WHERE m."customer_id" = NEW."id"), 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "saldo_de_pontos_nao_se_escreve"
  BEFORE UPDATE ON "customers"
  FOR EACH ROW EXECUTE FUNCTION pontos_saldo_nao_se_escreve();

CREATE OR REPLACE FUNCTION pontos_derivam_saldo()
RETURNS TRIGGER AS $$
DECLARE alvo UUID;
BEGIN
  alvo := COALESCE(NEW."customer_id", OLD."customer_id");
  UPDATE "customers" SET "saldo_pontos" = COALESCE((SELECT SUM(CASE
      WHEN m."tipo" IN ('GANHO', 'AJUSTE') THEN m."pontos"
      ELSE -m."pontos" END)
    FROM "loyalty_movements" m WHERE m."customer_id" = alvo), 0)
  WHERE "id" = alvo;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "movimentos_derivam_pontos"
  AFTER INSERT OR UPDATE OR DELETE ON "loyalty_movements"
  FOR EACH ROW EXECUTE FUNCTION pontos_derivam_saldo();

ALTER TABLE "customers"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_events"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "loyalty_movements"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "loyalty_rewards"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "segments"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_templates"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback_entries"    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_por_org" ON "customers"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "consent_events_por_org" ON "consent_events"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "loyalty_movements_por_org" ON "loyalty_movements"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "loyalty_rewards_por_org" ON "loyalty_rewards"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "segments_por_org" ON "segments"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "campaign_templates_por_org" ON "campaign_templates"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "campaigns_por_org" ON "campaigns"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "campaign_deliveries_por_org" ON "campaign_deliveries"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "feedback_entries_por_org" ON "feedback_entries"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());

-- ── A porta estreita do feedback público ──────────────────────────────────
--
-- Quem responde «como foi a tua visita» está na rua e não tem sessão de
-- inquilino, por isso a RLS não tem escopo por onde deixar passar. É a mesma
-- forma das outras portas estreitas do produto: `SECURITY DEFINER` com
-- `search_path` fixo, a fazer UMA coisa e a não devolver catálogo nenhum.
--
-- E é aqui que está a fronteira mais fácil de estragar da etapa: alguém escreve
-- que gostou do jantar, deixa o email para o caso de haver resposta, e passa a
-- receber promoções para sempre. O consentimento de campanha entra por um
-- argumento SEPARADO, e por omissão é falso.
CREATE OR REPLACE FUNCTION registar_feedback_publico(
  p_slug TEXT,
  p_nota INT,
  p_comentario TEXT,
  p_email TEXT,
  p_consente_campanha BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  u RECORD;
  pessoa UUID;
  resposta UUID;
BEGIN
  SELECT * INTO u FROM unidade_publica(p_slug);
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p_nota IS NULL OR p_nota < 1 OR p_nota > 5 THEN RETURN NULL; END IF;

  IF p_email IS NOT NULL AND length(btrim(p_email)) > 0 THEN
    SELECT c."id" INTO pessoa FROM "customers" c
     WHERE c."location_id" = u.location_id AND lower(c."email") = lower(btrim(p_email))
       AND c."juntado_a_id" IS NULL
     LIMIT 1;
    IF pessoa IS NULL THEN
      INSERT INTO "customers" ("organization_id", "location_id", "nome", "email", "origem")
      VALUES (u.organization_id, u.location_id, btrim(p_email), btrim(p_email), 'feedback')
      RETURNING "id" INTO pessoa;
    END IF;

    -- ── Só entra consentimento se a pessoa o tiver dado, e só o de CAMPANHA
    --
    -- Deixar o email para haver resposta NÃO é aceitar publicidade. Se a
    -- resposta for «não», não se escreve acontecimento nenhum de campanha — e
    -- não escrever é o que faz `tem_consentimento` devolver falso.
    IF p_consente_campanha THEN
      INSERT INTO "consent_events"
        ("organization_id", "customer_id", "finalidade", "canal", "accao", "origem")
      VALUES (u.organization_id, pessoa, 'CAMPANHA', 'EMAIL', 'DADO', 'feedback público');
    END IF;
  END IF;

  INSERT INTO "feedback_entries"
    ("organization_id", "location_id", "customer_id", "nota", "comentario", "origem")
  VALUES (u.organization_id, u.location_id, pessoa, p_nota,
          NULLIF(btrim(COALESCE(p_comentario, '')), ''), 'menu público')
  RETURNING "id" INTO resposta;

  RETURN resposta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

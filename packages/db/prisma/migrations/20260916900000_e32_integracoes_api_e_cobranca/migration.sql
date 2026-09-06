-- E32 · Integrações, API e cobrança do SaaS
-- Contrato: docs/architecture/integracoes-e-cobranca-do-saas.md (por FRONTEIRA)
--
-- ── A etapa de maior risco do produto, e a razão não é técnica ─────────────
--
-- É a primeira em que um estranho fala com o sistema **sem passar por tela
-- nenhuma**. Nas outras, quem age está numa sessão que alguém abriu; aqui chega
-- um pedido com uma chave, ou um webhook de fora, e o produto decide sozinho se
-- acredita.
--
-- E é a primeira em que **o defeito rende dinheiro a quem o encontrar**. Não é
-- um erro que prejudica: é uma porta que se atravessa de propósito.

CREATE TYPE "EscopoDeApi" AS ENUM (
  'CATALOGO_LER', 'CATALOGO_ESCREVER',
  'PEDIDOS_LER',  'PEDIDOS_ESCREVER',
  'RELATORIOS_LER'
);

CREATE TYPE "EstadoDaEntrega" AS ENUM
  ('POR_ENVIAR', 'ENTREGUE', 'FALHOU', 'DESISTIU');

CREATE TYPE "EstadoDoEventoDeCobranca" AS ENUM (
  'RECEBIDO',
  -- Chegou, a assinatura confere, e **não há ligação nossa** para este cliente
  -- do provedor. Não é erro do provedor nem defeito nosso: é a resposta certa a
  -- um evento que ninguém pediu. Fica parado e não muda nada.
  'SEM_VINCULO',
  'APLICADO',
  'RECUSADO'
);

CREATE TYPE "EstadoDaIntegracao" AS ENUM
  ('DESLIGADA', 'CONFIGURADA', 'ACTIVA', 'ERRO');

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA 1 · nasce uma chave de API (INT-008)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- **Repare-se no que esta tabela não tem: a chave.** Guarda-se o resumo, e o
-- resumo não abre nada. Um ecrã que consiga mostrar outra vez uma chave antiga
-- prova que ela está guardada em claro — e aqui não há onde a guardar.
--
-- Garantia por AUSÊNCIA: não é que ninguém a escreva, é que não existe coluna.
CREATE TABLE "api_keys" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,

  -- O que se mostra na lista para a pessoa reconhecer a chave sem a ver: os
  -- primeiros caracteres. Não abre nada e não é segredo.
  "prefixo"         TEXT NOT NULL,
  "resumo"          TEXT NOT NULL UNIQUE,

  "escopos"         "EscopoDeApi"[] NOT NULL,

  -- ── Prazo OBRIGATÓRIO, e é a diferença que interessa ────────────────────
  --
  -- Uma chave sem prazo é uma chave para sempre — incluindo depois de a pessoa
  -- que a criou sair da empresa. `NOT NULL` e não «por omissão daqui a um ano»:
  -- quem cria escolhe, e não pode escolher «nunca».
  "expira_em"       TIMESTAMPTZ(6) NOT NULL,

  "revogada_em"     TIMESTAMPTZ(6),
  "revogada_por"    TEXT,
  "criada_por"      TEXT NOT NULL,
  "criada_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "ultimo_uso_em"   TIMESTAMPTZ(6),

  -- Uma chave sem âmbito é uma chave de administrador com outro nome.
  CONSTRAINT "chave_tem_ambito" CHECK (coalesce(array_length("escopos", 1), 0) >= 1),
  -- Revogar sem dizer quem não se audita daqui a seis meses. Mesma forma da
  -- homologação do E31 e da revogação de dispositivo do E13.
  CONSTRAINT "revogacao_tem_assinatura"
    CHECK (("revogada_em" IS NULL) = ("revogada_por" IS NULL))
);
CREATE INDEX "api_keys_por_org" ON "api_keys" ("organization_id", "revogada_em");

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA 3 · sai um webhook nosso (INT-009, PLAT-015)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE "webhook_endpoints" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "url"             TEXT NOT NULL,
  -- O segredo com que assinamos o que enviamos. Resumo, como as chaves.
  "segredo_resumo"  TEXT NOT NULL,
  "eventos"         TEXT[] NOT NULL,
  "activo"          BOOLEAN NOT NULL DEFAULT TRUE,
  "criado_por"      TEXT NOT NULL,
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  -- Só `https`. Não é preferência: um destino em texto simples põe o corpo
  -- assinado — e os dados do restaurante dentro dele — na rede de quem estiver
  -- no caminho. A validação do endereço interno é do lado do código, porque
  -- envolve resolver nomes; isto é o que a base consegue garantir sozinha.
  CONSTRAINT "destino_e_https" CHECK ("url" LIKE 'https://%'),
  CONSTRAINT "assina_pelo_menos_um_evento" CHECK (coalesce(array_length("eventos", 1), 0) >= 1)
);
CREATE INDEX "webhook_endpoints_por_org" ON "webhook_endpoints" ("organization_id", "activo");

CREATE TABLE "webhook_deliveries" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "endpoint_id"     UUID NOT NULL REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE,
  "evento"          TEXT NOT NULL,
  -- A versão viaja com a entrega. Um consumidor que receba um corpo novo sem
  -- saber que o formato mudou parte em silêncio.
  "versao"          INT  NOT NULL DEFAULT 1,
  -- O identificador que o consumidor usa para descartar repetições. Reenviar é
  -- normal — a rede falha —, e sem isto quem recebe processa a venda duas vezes.
  "entrega_id"      UUID NOT NULL DEFAULT gen_random_uuid(),
  "corpo"           TEXT NOT NULL,
  "assinatura"      TEXT NOT NULL,
  "estado"          "EstadoDaEntrega" NOT NULL DEFAULT 'POR_ENVIAR',
  "tentativas"      INT  NOT NULL DEFAULT 0,
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "entregue_em"     TIMESTAMPTZ(6),
  "resposta_estado" INT,

  CONSTRAINT "entrega_conta_tentativas" CHECK ("tentativas" >= 0)
);
CREATE UNIQUE INDEX "uma_entrega_por_identificador"
  ON "webhook_deliveries" ("organization_id", "entrega_id");
CREATE INDEX "webhook_deliveries_por_estado"
  ON "webhook_deliveries" ("organization_id", "estado");

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA 4 · entra um webhook do provedor de pagamento
-- ═══════════════════════════════════════════════════════════════════════════
--
-- **A fronteira mais perigosa do produto, e vale dizer porquê em voz alta.**
--
-- Um webhook que altera concessões comerciais é, do outro lado, um pedido para
-- mudar quanto alguém paga. Se ele aceitar o `organization_id` que vem no corpo,
-- qualquer pessoa que descubra o endereço dá a si própria o plano que quiser —
-- e o sistema regista tudo como legítimo, porque foi.

-- A LIGAÇÃO, criada por alguém autenticado, do nosso lado.
--
-- É esta tabela que autoriza. O corpo do webhook não autoriza nada: no máximo
-- sugere, e a sugestão confirma-se contra o que já sabemos.
CREATE TABLE "saas_customers" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"     UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "provedor"            TEXT NOT NULL,
  "provedor_cliente_id" TEXT NOT NULL,
  -- Quem ligou, e quando. Uma ligação anónima é uma ligação que ninguém revê.
  "criado_por"          TEXT NOT NULL,
  "criado_em"           TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
-- Um cliente do provedor pertence a UMA organização. Sem isto, dois inquilinos
-- podiam reclamar o mesmo cliente e o evento seguinte escolhia um deles à sorte.
CREATE UNIQUE INDEX "um_cliente_por_provedor"
  ON "saas_customers" ("provedor", "provedor_cliente_id");
CREATE UNIQUE INDEX "uma_ligacao_por_organizacao"
  ON "saas_customers" ("organization_id", "provedor");

-- O EVENTO, como chegou.
--
-- ── Repare-se no que esta tabela NÃO tem ────────────────────────────────
--
-- Não tem `organization_id` que o webhook possa preencher. Tem
-- `organization_id_alegado` — o que o corpo *disse*, guardado para se poder
-- comparar e denunciar — e `organization_id_resolvido`, que **só a função
-- privilegiada escreve**, e sempre a partir da `saas_customers`.
--
-- Não é disciplina de quem escreve o código: é a forma da tabela. Um caminho
-- que quisesse confiar no corpo teria de escrever numa coluna cujo nome diz, em
-- voz alta, que ela é uma alegação.
CREATE TABLE "saas_billing_events" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "provedor"                 TEXT NOT NULL,
  -- Identidade do acontecimento, do lado do provedor. Reenviar é normal.
  "provedor_evento_id"       TEXT NOT NULL,
  "tipo"                     TEXT NOT NULL,
  -- O cliente VERIFICADO no provedor. É por aqui, e só por aqui, que se resolve.
  "provedor_cliente_id"      TEXT NOT NULL,

  -- ── O plano vem do corpo, e isso ESTÁ certo ───────────────────────────
  --
  -- Parece contradizer o resto, e não contradiz: o corpo é assinado pelo
  -- provedor, portanto o que ele diz sobre o PRODUTO que foi comprado é
  -- verificável. O que ele diz sobre QUEM comprou não é — porque o «quem» do
  -- nosso lado é uma coisa que o provedor não conhece.
  --
  -- É a distinção que decide a etapa: a assinatura autentica a ORIGEM, não
  -- autoriza o ALVO.
  "plano_codigo"             TEXT,

  "organization_id_alegado"  UUID,
  "organization_id_resolvido" UUID REFERENCES "organizations"("id") ON DELETE SET NULL,

  "corpo_cru"                TEXT NOT NULL,
  "assinatura_confere"       BOOLEAN NOT NULL,
  "estado"                   "EstadoDoEventoDeCobranca" NOT NULL DEFAULT 'RECEBIDO',
  "motivo"                   TEXT,
  "recebido_em"              TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "resolvido_em"             TIMESTAMPTZ(6),

  -- Resolvido é o mesmo que ter carimbo. As duas leituras do «já se tratou
  -- disto?» — pelo estado e pela data — não podem discordar.
  CONSTRAINT "resolvido_e_o_mesmo_que_ter_carimbo"
    CHECK (("estado" IN ('RECEBIDO')) = ("resolvido_em" IS NULL))
);
CREATE UNIQUE INDEX "um_evento_por_identidade_do_provedor"
  ON "saas_billing_events" ("provedor", "provedor_evento_id");
CREATE INDEX "saas_billing_events_por_estado"
  ON "saas_billing_events" ("estado", "recebido_em");

-- ── O GATILHO QUE DECIDE A ETAPA ──────────────────────────────────────────
--
-- A coluna resolvida só pode conter a organização que a `saas_customers` liga a
-- este cliente do provedor. Não «deve»: **não pode**.
--
-- Isto existe porque a garantia anterior — o `REVOKE` do E05 sobre
-- `entitlement_grants` — protege a concessão, e não protege *isto*. Um caminho
-- que resolvesse a organização a partir do corpo escreveria aqui um valor
-- errado, e a função privilegiada, a jusante, concederia de boa fé sobre ele.
--
-- Aqui a mentira não chega a ser escrita.
CREATE OR REPLACE FUNCTION resolucao_vem_da_ligacao_verificada()
RETURNS TRIGGER AS $$
DECLARE
  v_ligada UUID;
BEGIN
  IF NEW."organization_id_resolvido" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "organization_id" INTO v_ligada
    FROM "saas_customers"
   WHERE "provedor" = NEW."provedor"
     AND "provedor_cliente_id" = NEW."provedor_cliente_id";

  IF v_ligada IS NULL THEN
    RAISE EXCEPTION 'evento_sem_ligacao_verificada'
      USING HINT = 'nao ha saas_customers para ' || NEW."provedor" || '/' || NEW."provedor_cliente_id";
  END IF;

  IF v_ligada <> NEW."organization_id_resolvido" THEN
    RAISE EXCEPTION 'resolucao_nao_bate_com_a_ligacao'
      USING HINT = 'a ligacao aponta a outra organizacao';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "resolucao_so_pela_ligacao"
  BEFORE INSERT OR UPDATE ON "saas_billing_events"
  FOR EACH ROW EXECUTE FUNCTION resolucao_vem_da_ligacao_verificada();

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA 5 · o dinheiro do SaaS não é o dinheiro da refeição (ORG-011)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Duas contabilidades, e não se tocam. Esta tabela é a assinatura que o
-- RESTAURANTE nos paga; o jantar do cliente vive em `bills` e `payments`, do
-- E22, e não há chave estrangeira entre as duas famílias — de propósito.
--
-- Um total que as some responde a uma pergunta que ninguém faz, e esconde as
-- duas que se fazem: «quanto facturou a casa» e «quanto é que ela me paga».
CREATE TABLE "saas_invoices" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"     UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "provedor"            TEXT NOT NULL,
  "provedor_factura_id" TEXT NOT NULL,
  "numero"              TEXT NOT NULL,
  "montante_menor"      INT  NOT NULL,
  "moeda"               CHAR(3) NOT NULL,
  "estado"              TEXT NOT NULL,
  "emitida_em"          TIMESTAMPTZ(6) NOT NULL,
  "paga_em"             TIMESTAMPTZ(6)
);
CREATE UNIQUE INDEX "uma_factura_por_provedor"
  ON "saas_invoices" ("provedor", "provedor_factura_id");
CREATE INDEX "saas_invoices_por_org" ON "saas_invoices" ("organization_id", "emitida_em");

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA 6 · não há provedor, e diz-se (INT-001, INT-002, PLAT-020)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Um conector que finge funcionar é pior do que um que diz que não está ligado:
-- o primeiro só se descobre quando um cliente contava com ele.
CREATE TABLE "integrations" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "familia"         TEXT NOT NULL,
  "provedor"        TEXT NOT NULL,
  "estado"          "EstadoDaIntegracao" NOT NULL DEFAULT 'DESLIGADA',
  -- O que falta para ela funcionar, em palavras. `DESLIGADA` sem requisitos é
  -- um beco: quem lê não sabe o que fazer a seguir.
  "requisitos"      TEXT,
  "ultimo_erro"     TEXT,
  "actualizada_em"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "desligada_diz_o_que_falta"
    CHECK ("estado" <> 'DESLIGADA' OR "requisitos" IS NOT NULL)
);
CREATE UNIQUE INDEX "uma_integracao_por_provedor"
  ON "integrations" ("organization_id", "familia", "provedor");

-- O registo do que aconteceu numa integração (INT-010).
--
-- **Sem segredos.** Não há coluna para credencial, e o corpo guardado passa
-- pela redacção do lado do código antes de chegar aqui.
CREATE TABLE "integration_logs" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "integration_id"  UUID REFERENCES "integrations"("id") ON DELETE SET NULL,
  -- QUEM chamou. A chave identifica-se pelo id, **nunca pelo valor** — daqui a
  -- um ano alguém pergunta quem fez uma alteração, e «uma chave de API» não é
  -- resposta.
  "api_key_id"      UUID REFERENCES "api_keys"("id") ON DELETE SET NULL,
  "accao"           TEXT NOT NULL,
  "resultado"       TEXT NOT NULL,
  "detalhe"         JSONB NOT NULL DEFAULT '{}'::jsonb,
  "ocorrido_em"     TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "integration_logs_por_org"
  ON "integration_logs" ("organization_id", "ocorrido_em" DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A `saas_billing_events` fica de FORA, e é uma decisão, não um esquecimento:
-- ela não tem `organization_id` para a política usar. Quando o evento chega,
-- ainda não se sabe de quem é — e é exactamente esse o ponto da fronteira 4.
-- Quem lhe toca é a credencial de migração, pela função privilegiada.
ALTER TABLE "api_keys"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_endpoints"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_deliveries"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saas_customers"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saas_invoices"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integrations"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integration_logs"    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_por_org" ON "api_keys"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "webhook_endpoints_por_org" ON "webhook_endpoints"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "webhook_deliveries_por_org" ON "webhook_deliveries"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "saas_customers_por_org" ON "saas_customers"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "saas_invoices_por_org" ON "saas_invoices"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "integrations_por_org" ON "integrations"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "integration_logs_por_org" ON "integration_logs"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());

-- ── A FRONTEIRA DO E05 SOBREVIVE A ESTA ETAPA ─────────────────────────────
--
-- O E05 tirou ao runtime a escrita em `subscriptions` e `entitlement_grants`, e
-- esta etapa **não lha devolve**. Um webhook que escrevesse lá contornava essa
-- fronteira por fora, e seria o mesmo defeito com carimbo de integração.
--
-- Estas linhas são redundantes com o E05 de propósito: se alguém, um dia,
-- conceder escrita ao runtime para «a tela funcionar», tem de o fazer DEPOIS
-- desta migração — e este comentário fica no caminho dele.
REVOKE INSERT, UPDATE, DELETE ON "subscriptions"      FROM bossaos_app;
REVOKE INSERT, UPDATE, DELETE ON "entitlement_grants" FROM bossaos_app;

-- E o evento de cobrança é do mesmo lado da fronteira: o runtime GRAVA o que
-- chega (é ele que atende a porta) e **não resolve nem aplica**.
GRANT  SELECT, INSERT         ON "saas_billing_events" TO bossaos_app;
REVOKE UPDATE, DELETE         ON "saas_billing_events" FROM bossaos_app;

-- ═══════════════════════════════════════════════════════════════════════════
-- A PORTA PRIVILEGIADA: aplicar um evento de cobrança
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `SECURITY DEFINER`, e corre como o dono — que é quem pode escrever em
-- `subscriptions` e `entitlement_grants`. É a ÚNICA forma de um evento chegar a
-- mudar uma concessão.
--
-- E repare-se no que ela ignora: o `organization_id_alegado`. Ele é lido, é
-- comparado, e é registado quando diverge — mas nunca decide nada.
CREATE OR REPLACE FUNCTION aplicar_evento_de_cobranca(p_evento UUID)
RETURNS "EstadoDoEventoDeCobranca"
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_evento   "saas_billing_events"%ROWTYPE;
  v_org      UUID;
  v_plano    UUID;
  v_motivo   TEXT;
BEGIN
  SELECT * INTO v_evento FROM "saas_billing_events" WHERE "id" = p_evento;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'evento_desconhecido';
  END IF;
  IF v_evento."estado" <> 'RECEBIDO' THEN
    -- Já foi tratado. Reenviar é normal e não pode aplicar duas vezes.
    RETURN v_evento."estado";
  END IF;

  -- Uma assinatura que não confere não chega aqui, mas se chegar não passa.
  IF NOT v_evento."assinatura_confere" THEN
    UPDATE "saas_billing_events"
       SET "estado" = 'RECUSADO', "resolvido_em" = now(),
           "motivo" = 'assinatura nao confere'
     WHERE "id" = p_evento;
    RETURN 'RECUSADO';
  END IF;

  -- ── A LIGAÇÃO, e só a ligação ──────────────────────────────────────────
  SELECT "organization_id" INTO v_org
    FROM "saas_customers"
   WHERE "provedor" = v_evento."provedor"
     AND "provedor_cliente_id" = v_evento."provedor_cliente_id";

  IF v_org IS NULL THEN
    -- Não há ligação criada do nosso lado por alguém autenticado. Fica parado.
    -- **Não muda nada**, e diz-se porquê.
    UPDATE "saas_billing_events"
       SET "estado" = 'SEM_VINCULO', "resolvido_em" = now(),
           "motivo" = 'nao ha ligacao verificada para este cliente do provedor'
     WHERE "id" = p_evento;
    RETURN 'SEM_VINCULO';
  END IF;

  -- O corpo alegou outra organização? Isso não muda o resultado — muda o que
  -- fica escrito. Um evento que alegou o que não era é a assinatura de uma
  -- tentativa, e quem for ver daqui a um ano tem de a encontrar.
  IF v_evento."organization_id_alegado" IS NOT NULL
     AND v_evento."organization_id_alegado" <> v_org THEN
    v_motivo := 'o corpo alegou outra organizacao e foi ignorado';
  END IF;

  SELECT "id" INTO v_plano FROM "plan_definitions"
   WHERE "codigo" = v_evento."plano_codigo";

  IF v_plano IS NULL THEN
    -- Um plano que não conhecemos não se aproxima do mais parecido. Recusa-se,
    -- e fica escrito qual era — senão o defeito aparece como «o cliente ficou
    -- no plano errado» daqui a um mês, sem rasto de porquê.
    UPDATE "saas_billing_events"
       SET "estado" = 'RECUSADO', "resolvido_em" = now(),
           "motivo" = coalesce(v_motivo || '; ', '')
             || 'plano desconhecido: ' || coalesce(v_evento."plano_codigo", '(nenhum)')
     WHERE "id" = p_evento;
    RETURN 'RECUSADO';
  END IF;

  UPDATE "subscriptions"
     SET "plan_id" = v_plano, "estado" = 'ACTIVA', "updated_at" = now()
   WHERE "organization_id" = v_org;

  UPDATE "saas_billing_events"
     SET "estado" = 'APLICADO', "resolvido_em" = now(),
         "organization_id_resolvido" = v_org,
         "motivo" = v_motivo
   WHERE "id" = p_evento;

  RETURN 'APLICADO';
END;
$$;

-- Quem atende a porta pode mandar aplicar; o que ele **não** pode é escolher a
-- organização. A função é que decide, e decide pela ligação.
REVOKE ALL     ON FUNCTION aplicar_evento_de_cobranca(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION aplicar_evento_de_cobranca(UUID) TO bossaos_app;

-- ── E23 · a fronteira ─────────────────────────────────────────────────────
--
-- O E22 guarda o dinheiro dentro de casa. Esta é a única etapa em que o produto
-- fala com um sistema que não controla, que responde quando quer, que repete o
-- que já disse, e que às vezes não responde de todo.

-- ── A identidade é a do ACONTECIMENTO ─────────────────────────────────────
--
-- «Um webhook chega DUAS vezes, e isso não é avaria»: é o funcionamento normal
-- de qualquer adquirente sério, que reenvia até ter a certeza de que ouvimos.
--
-- A forma já está escrita e não se inventa outra — é a da mensageria do E19: a
-- identidade é a do acontecimento, não do pagamento nem do momento. Um reenvio
-- traz o mesmo `evento_id` e deduplica; um facto novo traz identidade nova e
-- entra. **É um índice, e não um `if`**: dois processos a receber o mesmo
-- reenvio ao mesmo tempo não conseguem gravá-lo duas vezes.
CREATE TABLE "provider_events" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "provedor"        TEXT NOT NULL,
  -- O identificador que o adquirente dá ao acontecimento. É isto que deduplica.
  "evento_id"       TEXT NOT NULL,
  "tipo"            TEXT NOT NULL,
  -- A conta a que o acontecimento diz respeito. Pode ser nula: um acontecimento
  -- de um pagamento que não conhecemos é para guardar, não para deitar fora —
  -- é assim que se vê que o adquirente sabe de algo que nós não sabemos.
  "bill_id"         UUID REFERENCES "bills"("id") ON DELETE SET NULL,
  "attempt_id"      UUID REFERENCES "payment_attempts"("id") ON DELETE SET NULL,
  -- O estado AUTORIZADO pelo provedor, e o momento em que ELE diz que aconteceu.
  -- «Eventos fora de ordem devem ser reconciliados com o estado autorizado do
  -- provedor» — por isso guarda-se o estado dele, e não a nossa transição.
  "estado_provedor" TEXT NOT NULL,
  "montante_menor"  INTEGER,
  "ocorrido_em"     TIMESTAMPTZ NOT NULL,
  "recebido_em"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- O corpo, para auditoria. NUNCA a assinatura nem qualquer segredo: um
  -- segredo em registo é um segredo publicado.
  "corpo"           JSONB,
  CONSTRAINT "evento_com_provedor" CHECK (length(btrim("provedor")) > 0),
  CONSTRAINT "evento_com_id" CHECK (length(btrim("evento_id")) > 0)
);
-- A garantia, na forma. Não há aqui um `if já existe`.
CREATE UNIQUE INDEX "um_acontecimento_por_provedor"
  ON "provider_events" ("provedor", "evento_id");
CREATE INDEX "eventos_por_tentativa" ON "provider_events" ("attempt_id", "ocorrido_em");
CREATE INDEX "eventos_por_conta" ON "provider_events" ("bill_id");

-- ── A ligação ao adquirente ───────────────────────────────────────────────
--
-- «Não presuma que a conta do SaaS pode receber vendas dos restaurantes»: o
-- merchant é do restaurante, e fica registado por unidade. Sem `merchant_id`, a
-- ligação não está pronta — e não há aqui coluna nenhuma para uma chave secreta,
-- de propósito: segredo vive no ambiente, não na base nem no endereço.
CREATE TABLE "payment_connectors" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "provedor"        TEXT,
  "merchant_id"     TEXT,
  "activo"          BOOLEAN NOT NULL DEFAULT false,
  "criado_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "actualizado_em"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ligado exige provedor E merchant. «Marque integração pendente e não declare
  -- pagamento real pronto» — um conector ligado sem titularidade era exactamente
  -- essa declaração falsa, e aqui não se consegue escrever.
  CONSTRAINT "ligado_exige_titularidade" CHECK (
    "activo" = false OR ("provedor" IS NOT NULL AND "merchant_id" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "um_conector_de_pagamento_por_unidade"
  ON "payment_connectors" ("location_id");

-- ── A gorjeta é dinheiro que NÃO é da casa ────────────────────────────────
--
-- Somá-la à venda faz o relatório de receita mentir e a partilha da equipa
-- desaparecer. Fica ao lado do pagamento, e o `montante_menor` do E22 continua a
-- ser só o que se cobrou pela comida.
ALTER TABLE "payments"
  ADD COLUMN "gorjeta_menor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "provedor" TEXT,
  ADD COLUMN "provedor_ref" TEXT;
ALTER TABLE "payments"
  ADD CONSTRAINT "gorjeta_nao_negativa" CHECK ("gorjeta_menor" >= 0);
-- O mesmo pagamento do adquirente não entra duas vezes.
CREATE UNIQUE INDEX "uma_captura_por_referencia_do_provedor"
  ON "payments" ("provedor", "provedor_ref")
  WHERE "provedor" IS NOT NULL AND "provedor_ref" IS NOT NULL;

ALTER TABLE "refunds" ADD COLUMN "provedor_ref" TEXT;
CREATE UNIQUE INDEX "uma_devolucao_por_referencia_do_provedor"
  ON "refunds" ("provedor_ref") WHERE "provedor_ref" IS NOT NULL;

-- ── O rasto do adquirente também não se apaga ─────────────────────────────
CREATE TRIGGER "eventos_do_provedor_sao_imutaveis"
  BEFORE UPDATE OR DELETE ON "provider_events"
  FOR EACH ROW EXECUTE FUNCTION registo_imutavel();

-- ── Isolamento por inquilino ──────────────────────────────────────────────
ALTER TABLE "provider_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "provider_events"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

ALTER TABLE "payment_connectors" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payment_connectors"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

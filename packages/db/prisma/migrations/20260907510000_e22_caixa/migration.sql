-- ── E22 · a caixa é dinheiro real de gente real ───────────────────────────
--
-- «Movimentos imutáveis. Contagem gera diferença; diferença exige autorização.
-- Reabrir é acto auditado, com actor e motivo.»
--
-- Tudo o que abre, fecha ou corrige uma caixa deixa rasto que não se apaga. Por
-- isso o ESTADO da caixa não é uma coluna: deriva-se dos acontecimentos, como o
-- estado da conta se deriva dos pagamentos e a posição na espera se deriva do
-- grupo. Sem coluna, não há sítio onde alguém feche uma caixa sem ficar registo.

CREATE TYPE "AcontecimentoDeCaixa" AS ENUM (
  'ABERTURA', 'CONTAGEM', 'FECHO', 'REABERTURA'
);

CREATE TYPE "TipoDeMovimento" AS ENUM ('ENTRADA', 'SAIDA');

-- ── A caixa: identidade, fundo e moeda. Mais nada ─────────────────────────
CREATE TABLE "cash_registers" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  "moeda"           CHAR(3) NOT NULL,
  "fundo_menor"     INTEGER NOT NULL,
  "criada_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fundo_nao_negativo" CHECK ("fundo_menor" >= 0),
  CONSTRAINT "moeda_da_caixa_iso" CHECK ("moeda" ~ '^[A-Z]{3}$')
);
CREATE INDEX "caixas_por_unidade" ON "cash_registers" ("location_id");

-- ── O rasto, que não se apaga ─────────────────────────────────────────────
--
-- Abrir, contar, fechar e reabrir são acontecimentos, todos com actor. O motivo é
-- obrigatório onde uma decisão foi tomada — fechar com diferença, e reabrir.
CREATE TABLE "cash_register_events" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "register_id"     UUID NOT NULL REFERENCES "cash_registers"("id") ON DELETE CASCADE,
  "tipo"            "AcontecimentoDeCaixa" NOT NULL,
  "actor"           UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  -- Só a CONTAGEM traz um número, e é o ÚNICO número que um humano escreve nesta
  -- tabela. O esperado e a diferença derivam-se: uma diferença guardada é uma
  -- diferença que se pode editar até dar zero.
  "contado_menor"   INTEGER,
  "motivo"          TEXT,
  -- Quem autorizou o fecho com diferença. Sem isto, «divergência exige
  -- autorização» era uma frase e não uma condição.
  "autorizado_por"  UUID REFERENCES "users"("id") ON DELETE RESTRICT,
  "criado_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "contado_so_na_contagem" CHECK (
    ("tipo" = 'CONTAGEM' AND "contado_menor" IS NOT NULL AND "contado_menor" >= 0) OR
    ("tipo" <> 'CONTAGEM' AND "contado_menor" IS NULL)
  ),
  -- Reabrir sem dizer porquê é o mesmo que reabrir sem ninguém saber.
  CONSTRAINT "reabertura_com_motivo" CHECK (
    "tipo" <> 'REABERTURA' OR length(btrim(COALESCE("motivo", ''))) > 0
  )
);
CREATE INDEX "acontecimentos_por_caixa"
  ON "cash_register_events" ("register_id", "criado_em");

-- ── Os movimentos: só dinheiro FÍSICO ─────────────────────────────────────
--
-- «Cartão e liquidação do adquirente não entram no caixa como notas — esse é o
-- erro que faz a contagem nunca bater e a equipa desistir de contar.»
--
-- Não há aqui coluna de meio de pagamento, de propósito: **tudo o que está nesta
-- tabela é dinheiro**. Não é uma regra que alguém tenha de respeitar ao escrever
-- a consulta; é uma coluna que não existe.
CREATE TABLE "cash_movements" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "register_id"     UUID NOT NULL REFERENCES "cash_registers"("id") ON DELETE CASCADE,
  "tipo"            "TipoDeMovimento" NOT NULL,
  "montante_menor"  INTEGER NOT NULL,
  "motivo"          TEXT NOT NULL,
  "actor"           UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  -- Quando o movimento vem de um pagamento em dinheiro. Único: o mesmo pagamento
  -- não entra duas vezes na gaveta.
  "payment_id"      UUID REFERENCES "payments"("id") ON DELETE RESTRICT,
  -- A correcção é um registo NOVO que aponta para o que corrige.
  "corrige_id"      UUID REFERENCES "cash_movements"("id") ON DELETE RESTRICT,
  "criado_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "movimento_positivo" CHECK ("montante_menor" > 0),
  CONSTRAINT "movimento_com_motivo" CHECK (length(btrim("motivo")) > 0)
);
CREATE UNIQUE INDEX "um_movimento_por_pagamento"
  ON "cash_movements" ("payment_id") WHERE "payment_id" IS NOT NULL;
CREATE UNIQUE INDEX "uma_correccao_por_movimento"
  ON "cash_movements" ("corrige_id") WHERE "corrige_id" IS NOT NULL;
CREATE INDEX "movimentos_por_caixa" ON "cash_movements" ("register_id");

-- ── Imutáveis, os dois ────────────────────────────────────────────────────
CREATE TRIGGER "movimentos_sao_imutaveis"
  BEFORE UPDATE OR DELETE ON "cash_movements"
  FOR EACH ROW EXECUTE FUNCTION registo_imutavel();

CREATE TRIGGER "acontecimentos_de_caixa_sao_imutaveis"
  BEFORE UPDATE OR DELETE ON "cash_register_events"
  FOR EACH ROW EXECUTE FUNCTION registo_imutavel();

-- ── Uma caixa fechada não recebe movimentos ───────────────────────────────
--
-- Sem isto, o dinheiro entrava numa gaveta já contada e a contagem passava a
-- estar errada depois de assinada — e ninguém dava por isso, porque o movimento
-- é legítimo em todo o resto.
CREATE OR REPLACE FUNCTION caixa_fechada_recusa_movimento()
RETURNS TRIGGER AS $$
DECLARE
  ultimo "AcontecimentoDeCaixa";
BEGIN
  SELECT e."tipo" INTO ultimo FROM "cash_register_events" e
   WHERE e."register_id" = NEW."register_id"
   ORDER BY e."criado_em" DESC, e."id" DESC LIMIT 1;
  IF ultimo = 'FECHO' THEN
    RAISE EXCEPTION 'CAIXA_FECHADA: a caixa % está fechada; reabra-a com motivo', NEW."register_id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "caixa_fechada_nao_recebe"
  BEFORE INSERT ON "cash_movements"
  FOR EACH ROW EXECUTE FUNCTION caixa_fechada_recusa_movimento();

-- ── Isolamento por inquilino ──────────────────────────────────────────────
ALTER TABLE "cash_registers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cash_registers"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

ALTER TABLE "cash_register_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cash_register_events"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

ALTER TABLE "cash_movements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cash_movements"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

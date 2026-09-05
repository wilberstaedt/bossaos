-- ── E22 · a conta não é o que se recebeu ──────────────────────────────────
--
-- «Um erro aqui não é um defeito: é uma cobrança a mais no cartão de alguém, ou
-- uma noite de caixa que não fecha.»
--
-- Quatro entidades, e cada uma existe porque as outras não servem: a conta é a
-- OBRIGAÇÃO, a tentativa saiu daqui, o pagamento é o confirmado, a devolução não
-- é um pagamento negativo. Colapsar duas num campo é o erro estrutural da área.

-- ── O estado da conta NÃO é uma coluna ────────────────────────────────────
--
-- «É derivado dos pagamentos, não escrito na conta.» É a mesma decisão da
-- posição na lista de espera do E19, e pela mesma razão: uma coluna `estado` é
-- um sítio onde alguém pode escrever «liquidada» sem existir um pagamento, e uma
-- conta liquidada sem pagamento é uma afirmação sem prova.
--
-- Sem coluna, ninguém consegue mostrar um número errado. O estado deriva-se de
-- somar o confirmado e comparar com o devido.

CREATE TYPE "EstadoDaTentativa" AS ENUM (
  'CRIADA', 'PROCESSANDO', 'INDETERMINADA', 'CONFIRMADA', 'FALHOU', 'CANCELADA'
);

CREATE TYPE "MeioDePagamento" AS ENUM ('DINHEIRO', 'CARTAO', 'FORA_DA_BOSSAOS');

CREATE TYPE "TipoDeAjuste" AS ENUM ('DESCONTO', 'CORTESIA');

CREATE TYPE "BaseDoAjuste" AS ENUM ('LINHA', 'CONTA');

-- ── A conta ───────────────────────────────────────────────────────────────
--
-- Aberta por uma sessão de mesa, ou solta no balcão. A moeda vive aqui: somar
-- moedas diferentes é o erro que só aparece quando alguém tenta conciliar.
CREATE TABLE "bills" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "session_id"      UUID REFERENCES "table_sessions"("id") ON DELETE SET NULL,
  "numero"          TEXT NOT NULL,
  "moeda"           CHAR(3) NOT NULL,
  -- Derivado por gatilho a partir das linhas e dos ajustes. Ver mais abaixo:
  -- não é um valor que alguém escreve, é uma soma que a base faz.
  "devido_menor"    INTEGER NOT NULL DEFAULT 0,
  "fechada_em"      TIMESTAMPTZ,
  "fechada_por"     UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "criada_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "actualizada_em"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "moeda_iso" CHECK ("moeda" ~ '^[A-Z]{3}$'),
  -- «O devido nunca é negativo»: um desconto maior que a conta seria troco
  -- escondido, que é exactamente o que o CT-11 proíbe.
  CONSTRAINT "devido_nao_negativo" CHECK ("devido_menor" >= 0)
);
CREATE UNIQUE INDEX "um_numero_de_conta_por_unidade"
  ON "bills" ("location_id", "numero");
CREATE INDEX "bills_por_sessao" ON "bills" ("session_id");
CREATE INDEX "bills_abertas" ON "bills" ("location_id") WHERE "fechada_em" IS NULL;

-- ── A linha da conta ──────────────────────────────────────────────────────
--
-- Aponta para a linha do pedido, e guarda o preço UNITÁRIO que valia no momento
-- em que entrou na conta. Ler o preço do produto mais tarde daria uma conta cujo
-- valor muda quando alguém edita a carta — o mesmo defeito da taxa de entrega do
-- E20, e a mesma resposta: copia-se.
CREATE TABLE "bill_lines" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "bill_id"         UUID NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
  "order_line_id"   UUID REFERENCES "order_lines"("id") ON DELETE SET NULL,
  "nome"            TEXT NOT NULL,
  "quantidade"      INTEGER NOT NULL DEFAULT 1,
  "unitario_menor"  INTEGER NOT NULL,
  "criada_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "quantidade_positiva" CHECK ("quantidade" > 0),
  CONSTRAINT "unitario_nao_negativo" CHECK ("unitario_menor" >= 0)
);
CREATE INDEX "bill_lines_por_conta" ON "bill_lines" ("bill_id");
-- Uma linha de pedido não pode estar em duas contas ao mesmo tempo. Sem isto,
-- transferir um item era copiá-lo: a soma das duas contas passava a ser maior
-- que o pedido, e ninguém dava por isso até ao fecho de caixa.
CREATE UNIQUE INDEX "uma_conta_por_linha_de_pedido"
  ON "bill_lines" ("order_line_id") WHERE "order_line_id" IS NOT NULL;

-- ── O ajuste: desconto e cortesia, com alçada e MOTIVO ────────────────────
--
-- «Desconto/estorno não reescrevem a venda original.» Por isso o ajuste é uma
-- linha ao lado e nunca um `UPDATE` no preço: a venda fica como foi, e o que se
-- tirou vê-se, com quem autorizou e porquê.
--
-- A cortesia é um desconto de cem por cento? Não: são dois factos diferentes de
-- gestão — um é preço, o outro é oferta da casa — e o relatório que os junta
-- perde a informação que interessa. Ficam com tipo próprio.
CREATE TABLE "bill_adjustments" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "bill_id"         UUID NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
  "bill_line_id"    UUID REFERENCES "bill_lines"("id") ON DELETE CASCADE,
  "tipo"            "TipoDeAjuste" NOT NULL,
  "base"            "BaseDoAjuste" NOT NULL,
  "montante_menor"  INTEGER NOT NULL,
  -- «Com alçada, motivo e regras de arredondamento.» O motivo não é opcional:
  -- um desconto sem motivo é indistinguível de um erro de dedo, e é o campo que
  -- o gerente lê quando a caixa não bate.
  "motivo"          TEXT NOT NULL,
  "autorizado_por"  UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "criado_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ajuste_positivo" CHECK ("montante_menor" > 0),
  CONSTRAINT "motivo_nao_vazio" CHECK (length(btrim("motivo")) > 0),
  -- Um ajuste de LINHA tem linha; um de CONTA não tem. Sem isto havia dois
  -- sítios a dizer coisas diferentes sobre o mesmo ajuste.
  CONSTRAINT "base_diz_onde_pega" CHECK (
    ("base" = 'LINHA' AND "bill_line_id" IS NOT NULL) OR
    ("base" = 'CONTA' AND "bill_line_id" IS NULL)
  )
);
CREATE INDEX "ajustes_por_conta" ON "bill_adjustments" ("bill_id");

-- ── A tentativa, que não prova que chegou ─────────────────────────────────
--
-- «O estado que mais dói: indeterminado.» Uma tentativa com timeout NÃO falhou —
-- não se sabe. E é por isso que ela é uma tabela e não um campo no pagamento:
-- um campo obrigaria a decidir, e decidir sem saber é cobrar duas vezes.
CREATE TABLE "payment_attempts" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "bill_id"         UUID NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
  "estado"          "EstadoDaTentativa" NOT NULL DEFAULT 'CRIADA',
  "meio"            "MeioDePagamento" NOT NULL,
  "montante_menor"  INTEGER NOT NULL,
  -- A chave do comando. «Idempotente pela chave» — reenviar a mesma tentativa
  -- não cria outra cobrança, e é a base a garanti-lo, não o cuidado de quem
  -- escreve o cliente HTTP.
  "chave_idempotente" TEXT NOT NULL,
  "criada_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "resolvida_em"    TIMESTAMPTZ,
  CONSTRAINT "tentativa_positiva" CHECK ("montante_menor" > 0)
);
CREATE UNIQUE INDEX "uma_tentativa_por_chave"
  ON "payment_attempts" ("organization_id", "chave_idempotente");
CREATE INDEX "tentativas_por_conta" ON "payment_attempts" ("bill_id");
-- As que ficaram por reconciliar. É esta a lista que impede a caixa de fechar.
CREATE INDEX "tentativas_por_reconciliar" ON "payment_attempts" ("bill_id")
  WHERE "estado" IN ('CRIADA', 'PROCESSANDO', 'INDETERMINADA');

-- ── O pagamento: o confirmado, e não reversível por edição ────────────────
--
-- Nasce de uma tentativa e só de uma. Não tem estado: existir É estar
-- confirmado. Um `Payment` com `estado = falhou` seria dinheiro que se
-- desconta somando — e somar o que falhou é como as contas passam a mentir.
CREATE TABLE "payments" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "bill_id"         UUID NOT NULL REFERENCES "bills"("id") ON DELETE CASCADE,
  "attempt_id"      UUID NOT NULL UNIQUE REFERENCES "payment_attempts"("id") ON DELETE RESTRICT,
  "meio"            "MeioDePagamento" NOT NULL,
  "montante_menor"  INTEGER NOT NULL,
  -- «Troco é recebido menos devido, sem receita adicional.» Guarda-se o
  -- RECEBIDO, e o troco deriva-se. Guardar o troco era guardar a subtracção, e
  -- uma subtracção guardada é uma subtracção que pode discordar das parcelas.
  "recebido_menor"  INTEGER,
  "confirmado_em"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "pagamento_positivo" CHECK ("montante_menor" > 0),
  -- Recebido só faz sentido em dinheiro físico, e nunca é menos do que se cobra.
  CONSTRAINT "recebido_so_em_dinheiro" CHECK (
    ("meio" = 'DINHEIRO' AND "recebido_menor" >= "montante_menor") OR
    ("meio" <> 'DINHEIRO' AND "recebido_menor" IS NULL)
  )
);
CREATE INDEX "payments_por_conta" ON "payments" ("bill_id");

-- ── A devolução, que NÃO é um pagamento negativo ──────────────────────────
--
-- «Refund parcial é saldo derivado, não um campo.» Não há coluna `devolvido` no
-- pagamento: há linhas de devolução, e o que resta calcula-se. Uma coluna seria
-- o sítio onde duas devoluções concorrentes escrevem por cima uma da outra.
CREATE TABLE "refunds" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "payment_id"      UUID NOT NULL REFERENCES "payments"("id") ON DELETE RESTRICT,
  "montante_menor"  INTEGER NOT NULL,
  "motivo"          TEXT NOT NULL,
  "autorizado_por"  UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "chave_idempotente" TEXT NOT NULL,
  "criado_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "devolucao_positiva" CHECK ("montante_menor" > 0),
  CONSTRAINT "devolucao_com_motivo" CHECK (length(btrim("motivo")) > 0)
);
-- «Repetir o mesmo refund não devolve duas vezes — é idempotente pela chave.»
CREATE UNIQUE INDEX "uma_devolucao_por_chave"
  ON "refunds" ("organization_id", "chave_idempotente");
CREATE INDEX "refunds_por_pagamento" ON "refunds" ("payment_id");

-- ── O devido é DERIVADO, e o gatilho é quem o garante ─────────────────────
--
-- Mesma decisão do momento de produção do E20: não é uma coluna que alguém
-- escreve, é uma soma que a base faz. A diferença entre uma regra que se pode
-- desrespeitar e uma coisa que não se consegue fazer.
--
-- «Somatório das partes deve ser exatamente o total»: se o total for escrito à
-- mão em vez de somado, a primeira linha esquecida é uma conta que fecha a menos
-- e ninguém dá por isso.
CREATE OR REPLACE FUNCTION conta_recalcula_devido(a_conta UUID)
RETURNS VOID AS $$
DECLARE
  bruto   INTEGER;
  abatido INTEGER;
BEGIN
  SELECT COALESCE(SUM("quantidade" * "unitario_menor"), 0) INTO bruto
    FROM "bill_lines" WHERE "bill_id" = a_conta;
  SELECT COALESCE(SUM("montante_menor"), 0) INTO abatido
    FROM "bill_adjustments" WHERE "bill_id" = a_conta;
  -- O GREATEST não é conveniência: o CHECK `devido_nao_negativo` recusaria o
  -- negativo e a operação rebentava com uma mensagem sobre uma coluna, em vez de
  -- sobre o que se passou. O motor recusa o ajuste excessivo ANTES, com nome.
  UPDATE "bills"
     SET "devido_menor" = GREATEST(bruto - abatido, 0), "actualizada_em" = now()
   WHERE "id" = a_conta;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION conta_devido_deriva()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM conta_recalcula_devido(OLD."bill_id");
    RETURN OLD;
  END IF;
  PERFORM conta_recalcula_devido(NEW."bill_id");
  IF TG_OP = 'UPDATE' AND OLD."bill_id" <> NEW."bill_id" THEN
    PERFORM conta_recalcula_devido(OLD."bill_id");
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "bill_lines_derivam_devido"
  AFTER INSERT OR UPDATE OR DELETE ON "bill_lines"
  FOR EACH ROW EXECUTE FUNCTION conta_devido_deriva();

CREATE TRIGGER "ajustes_derivam_devido"
  AFTER INSERT OR UPDATE OR DELETE ON "bill_adjustments"
  FOR EACH ROW EXECUTE FUNCTION conta_devido_deriva();

-- ── O que está pago não se move, e não se apaga ───────────────────────────
--
-- «Itens já liquidados não podem ser movidos silenciosamente.» O advérbio é o
-- que interessa: o problema não é mover, é mover sem ninguém saber. Aqui a base
-- recusa, e a recusa tem nome.
CREATE OR REPLACE FUNCTION conta_liquidada_recusa_mexer()
RETURNS TRIGGER AS $$
DECLARE
  a_conta UUID;
  pago    INTEGER;
BEGIN
  a_conta := COALESCE(NEW."bill_id", OLD."bill_id");
  SELECT COALESCE(SUM(p."montante_menor"), 0) INTO pago
    FROM "payments" p WHERE p."bill_id" = a_conta;
  IF pago > 0 THEN
    RAISE EXCEPTION 'CONTA_COM_PAGAMENTO: a conta % já tem % em pagamentos confirmados', a_conta, pago
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "linhas_de_conta_paga_nao_se_mexem"
  BEFORE UPDATE OR DELETE ON "bill_lines"
  FOR EACH ROW EXECUTE FUNCTION conta_liquidada_recusa_mexer();

-- ── Movimento imutável: o pagamento e a devolução não se editam ───────────
--
-- «Um `Payment` editável é histórico que se reescreve.» Correcção gera registo
-- novo — uma devolução, um ajuste — e nunca um UPDATE.
CREATE OR REPLACE FUNCTION registo_imutavel()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'REGISTO_IMUTAVEL: % não se altera nem se apaga; a correcção é um registo novo', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "payments_sao_imutaveis"
  BEFORE UPDATE OR DELETE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION registo_imutavel();

CREATE TRIGGER "refunds_sao_imutaveis"
  BEFORE UPDATE OR DELETE ON "refunds"
  FOR EACH ROW EXECUTE FUNCTION registo_imutavel();

CREATE TRIGGER "ajustes_sao_imutaveis"
  BEFORE UPDATE OR DELETE ON "bill_adjustments"
  FOR EACH ROW EXECUTE FUNCTION registo_imutavel();

-- ── Isolamento por inquilino ──────────────────────────────────────────────
--
-- Dinheiro de um restaurante não se lê do outro. Não há aqui nenhuma porta
-- estreita: nenhuma destas tabelas tem superfície pública, e por isso nenhuma
-- precisa de `SECURITY DEFINER`. Uma porta que não é precisa é uma porta a
-- menos para alguém empurrar.
ALTER TABLE "bills" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bills"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

ALTER TABLE "bill_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bill_lines"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

ALTER TABLE "bill_adjustments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bill_adjustments"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

ALTER TABLE "payment_attempts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payment_attempts"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payments"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "refunds"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

-- ── Corrigir um ajuste é um REGISTO NOVO, e não um UPDATE ─────────────────
--
-- O gatilho acima torna o ajuste imutável, e isso está certo. Mas sem mais nada
-- um desconto posto por engano ficava para sempre: não se edita, não se apaga, e
-- não havia como o desfazer. Imutável sem reversão não é rigor, é uma armadilha.
--
-- «Correções não reescrevem registro original»: a reversão é outra linha, que
-- aponta para a que anula. Fica o histórico das duas — o desconto errado e quem
-- o desfez — que é exactamente o que o gerente precisa de ver quando a caixa não
-- bate.
ALTER TABLE "bill_adjustments"
  ADD COLUMN "reverte_id" UUID REFERENCES "bill_adjustments"("id") ON DELETE RESTRICT;

-- Um ajuste só se reverte UMA vez. Sem isto, duas reversões da mesma linha
-- devolviam o desconto duas vezes ao devido.
CREATE UNIQUE INDEX "uma_reversao_por_ajuste"
  ON "bill_adjustments" ("reverte_id") WHERE "reverte_id" IS NOT NULL;

-- ── O devido passa a ignorar o par anulado ────────────────────────────────
--
-- Some da conta a reversão (que não é um abatimento) E o ajuste que ela reverte.
-- As duas linhas continuam a existir e a ver-se; o que muda é o que conta.
CREATE OR REPLACE FUNCTION conta_recalcula_devido(a_conta UUID)
RETURNS VOID AS $$
DECLARE
  bruto   INTEGER;
  abatido INTEGER;
BEGIN
  SELECT COALESCE(SUM("quantidade" * "unitario_menor"), 0) INTO bruto
    FROM "bill_lines" WHERE "bill_id" = a_conta;
  SELECT COALESCE(SUM(a."montante_menor"), 0) INTO abatido
    FROM "bill_adjustments" a
   WHERE a."bill_id" = a_conta
     AND a."reverte_id" IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM "bill_adjustments" r WHERE r."reverte_id" = a."id"
     );
  UPDATE "bills"
     SET "devido_menor" = GREATEST(bruto - abatido, 0), "actualizada_em" = now()
   WHERE "id" = a_conta;
END; $$ LANGUAGE plpgsql;

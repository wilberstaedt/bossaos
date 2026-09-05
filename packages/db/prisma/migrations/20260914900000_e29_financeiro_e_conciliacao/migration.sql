-- E29 · Financeiro e conciliação
-- Contrato: docs/architecture/conciliacao-e-fecho.md (escrito por FRONTEIRA)
--
-- Um sistema financeiro errado dá números CERTOS: não parte, não estoira, soma
-- bem uma realidade que não existe. Por isso todas as garantias desta etapa
-- estão aqui, e nenhuma delas é uma coluna que alguém escreve.

CREATE TYPE "EstadoDaCorrespondencia" AS ENUM ('SUGERIDA', 'CONFIRMADA', 'RECUSADA');
CREATE TYPE "TipoDeMovimentoFinanceiro" AS ENUM
  ('RECEITA', 'DESPESA', 'DEVOLUCAO', 'TAXA', 'AJUSTE');

CREATE TABLE "bank_accounts" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  "moeda"           TEXT NOT NULL DEFAULT 'EUR',
  "arquivada_em"    TIMESTAMPTZ(6)
);
CREATE UNIQUE INDEX "uma_conta_por_nome" ON "bank_accounts" ("location_id", "nome");

CREATE TABLE "statement_imports" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "account_id"      UUID NOT NULL REFERENCES "bank_accounts"("id") ON DELETE CASCADE,
  "ficheiro"        TEXT NOT NULL,
  -- As contagens ficam GUARDADAS. Uma importação que ignora 200 linhas em
  -- silêncio é indistinguível de uma que não leu o ficheiro.
  "novas"           INT NOT NULL DEFAULT 0,
  "ja_vistas"       INT NOT NULL DEFAULT 0,
  "importado_por"   TEXT,
  "importado_em"    TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE "bank_lines" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "account_id"      UUID NOT NULL REFERENCES "bank_accounts"("id") ON DELETE CASCADE,
  "import_id"       UUID REFERENCES "statement_imports"("id") ON DELETE SET NULL,
  "data_valor"      DATE   NOT NULL,
  "montante_menor"  BIGINT NOT NULL,
  "moeda"           TEXT   NOT NULL DEFAULT 'EUR',
  "referencia"      TEXT,
  "ordem_no_dia"    INT    NOT NULL,
  "descricao"       TEXT,
  "criada_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ordem_no_dia_positiva" CHECK ("ordem_no_dia" >= 1)
);

-- ── A IDENTIDADE DE UMA LINHA NÃO VEM DO BANCO ────────────────────────────
--
-- Bancos repetem referências, mudam formatos e reemitem extractos. A identidade
-- é DERIVADA: conta, data-valor, montante, referência e a ordem dentro do dia.
--
-- A ordem existe por causa do PAR: duas linhas legítimas iguais no mesmo dia são
-- um caso real, e um detector de duplicados sem esse caso apaga factos
-- verdadeiros. Com a ordem, a segunda linha legítima é a nº 2 e entra; a
-- reimportação do mesmo ficheiro traz outra vez a nº 1 e é recusada.
--
-- E a garantia é por IMPOSSIBILIDADE: índice único na base, não um `if`.
CREATE UNIQUE INDEX "uma_linha_por_impressao_digital" ON "bank_lines"
  ("account_id", "data_valor", "montante_menor", COALESCE("referencia", ''), "ordem_no_dia");
CREATE INDEX "bank_lines_por_conta_e_data" ON "bank_lines" ("account_id", "data_valor");

CREATE TABLE "accounting_periods" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "de"              DATE NOT NULL,
  "ate"             DATE NOT NULL,
  "estado"          TEXT NOT NULL DEFAULT 'ABERTO',
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "periodo_comeca_antes_de_acabar" CHECK ("ate" >= "de"),
  CONSTRAINT "estado_do_periodo_conhecido" CHECK ("estado" IN ('ABERTO', 'FECHADO'))
);
CREATE UNIQUE INDEX "um_periodo_por_inicio" ON "accounting_periods" ("location_id", "de");

CREATE TABLE "period_events" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "period_id"       UUID NOT NULL REFERENCES "accounting_periods"("id") ON DELETE CASCADE,
  "tipo"            TEXT NOT NULL,
  "autor"           TEXT NOT NULL,
  "motivo"          TEXT,
  "momento"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "acontecimento_de_periodo_conhecido" CHECK ("tipo" IN ('FECHO', 'REABERTURA')),
  -- Reabrir sem motivo é um interruptor com outro nome.
  CONSTRAINT "reabertura_exige_motivo" CHECK
    ("tipo" <> 'REABERTURA' OR length(btrim(COALESCE("motivo", ''))) > 0)
);

CREATE TABLE "financial_movements" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"   UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"       UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "tipo"              "TipoDeMovimentoFinanceiro" NOT NULL,
  "conceito"          TEXT   NOT NULL,
  "montante_menor"    BIGINT NOT NULL,
  "moeda"             TEXT   NOT NULL DEFAULT 'EUR',
  -- ── TRÊS datas, e não são intermutáveis ─────────────────────────────────
  --
  -- Caixa usa a data-valor; resultado usa a ocorrência. Uma devolução a 3 de
  -- Outubro de uma venda de 28 de Setembro entra no caixa de Outubro e no
  -- resultado de Setembro, e as duas leituras estão certas.
  "ocorrencia_em"     DATE NOT NULL,
  "valor_em"          DATE NOT NULL,
  "registo_em"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "origem_tipo"       TEXT,
  "origem_id"         UUID,
  "centro_de_custo"   TEXT,
  "ajusta_periodo_id" UUID REFERENCES "accounting_periods"("id") ON DELETE SET NULL,
  "motivo"            TEXT
);
CREATE INDEX "movimentos_por_valor" ON "financial_movements" ("location_id", "valor_em");
CREATE INDEX "movimentos_por_ocorrencia" ON "financial_movements" ("location_id", "ocorrencia_em");

CREATE TABLE "reconciliations" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "bank_line_id"    UUID NOT NULL REFERENCES "bank_lines"("id") ON DELETE CASCADE,
  "movement_id"     UUID NOT NULL REFERENCES "financial_movements"("id") ON DELETE CASCADE,
  "estado"          "EstadoDaCorrespondencia" NOT NULL DEFAULT 'SUGERIDA',
  "semelhanca"      INT NOT NULL DEFAULT 0,
  "confirmada_por"  TEXT,
  "confirmada_em"   TIMESTAMPTZ(6),
  "criada_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "semelhanca_de_0_a_100" CHECK ("semelhanca" BETWEEN 0 AND 100),
  -- ── Nenhuma correspondência se auto-confirma ──────────────────────────
  --
  -- Nem a 100%. Confirmada exige autor e momento: quem concilia responde pelo
  -- que conciliou, e daqui a um ano alguém vai perguntar quem foi. A forma
  -- impede a confirmação anónima; um `if` na aplicação não impede nada.
  CONSTRAINT "confirmada_tem_autor_e_momento" CHECK
    ("estado" <> 'CONFIRMADA'
     OR (length(btrim(COALESCE("confirmada_por", ''))) > 0 AND "confirmada_em" IS NOT NULL))
);
CREATE UNIQUE INDEX "uma_correspondencia_por_par"
  ON "reconciliations" ("bank_line_id", "movement_id");

CREATE TABLE "exchange_rates" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "de"              TEXT NOT NULL,
  "para"            TEXT NOT NULL,
  "taxa_micro"      BIGINT NOT NULL,
  -- Sem fonte, um total convertido é uma opinião com aspecto de facto.
  "fonte"           TEXT NOT NULL,
  "em_vigor_de"     DATE NOT NULL,
  CONSTRAINT "taxa_positiva" CHECK ("taxa_micro" > 0),
  CONSTRAINT "fonte_da_taxa_nao_e_vazia" CHECK (length(btrim("fonte")) > 0)
);
CREATE UNIQUE INDEX "uma_taxa_por_dia"
  ON "exchange_rates" ("organization_id", "de", "para", "em_vigor_de");

-- ── FECHAR PROÍBE, e a recusa é da BASE ───────────────────────────────────
--
-- Fechar não é copiar totais para uma tabela: isso cria uma segunda verdade que
-- envelhece. Fechar é impedir movimentos novos com data dentro do período.
--
-- E o ajuste pós-fecho passa: nasce no período aberto a apontar para o fechado.
-- O passado não se reescreve, acrescenta-se-lhe — a mesma forma da correcção de
-- ponto do E28 e do estorno do E22.
CREATE OR REPLACE FUNCTION periodo_fechado_recusa_movimento()
RETURNS TRIGGER AS $$
DECLARE
  fechado RECORD;
BEGIN
  -- Um ajuste declarado é a porta legítima, e não precisa de ser proibido.
  IF NEW."ajusta_periodo_id" IS NOT NULL THEN RETURN NEW; END IF;

  SELECT p."id", p."de", p."ate" INTO fechado
    FROM "accounting_periods" p
   WHERE p."location_id" = NEW."location_id"
     AND p."estado" = 'FECHADO'
     AND NEW."ocorrencia_em" BETWEEN p."de" AND p."ate"
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'PERIODO_FECHADO: % está fechado; um ajuste nasce no período aberto a apontar para ele',
      fechado."id" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "periodo_fechado_nao_recebe"
  BEFORE INSERT OR UPDATE ON "financial_movements"
  FOR EACH ROW EXECUTE FUNCTION periodo_fechado_recusa_movimento();

ALTER TABLE "bank_accounts"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "statement_imports"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_lines"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_movements"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reconciliations"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounting_periods"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "period_events"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exchange_rates"       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts_por_org" ON "bank_accounts"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "statement_imports_por_org" ON "statement_imports"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "bank_lines_por_org" ON "bank_lines"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "financial_movements_por_org" ON "financial_movements"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "reconciliations_por_org" ON "reconciliations"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "accounting_periods_por_org" ON "accounting_periods"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "period_events_por_org" ON "period_events"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "exchange_rates_por_org" ON "exchange_rates"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());

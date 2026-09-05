-- ── E24 · um PDF bonito não é um documento fiscal ─────────────────────────
--
-- O que torna um documento fiscal é o **registo aceite** pela autoridade ou pelo
-- fornecedor homologado — não o ficheiro que se imprime.
--
-- Esta migração constrói a FORMA: fila de emissão, estados, encadeamento,
-- imutabilidade. **Não constrói o formato**, e a razão está no ADR 0002: a
-- Orden HAC/1177/2024, que traz as especificações técnicas, não foi lida. O que
-- não se verificou não se codifica com ar de certeza.

CREATE TYPE "EstadoDoDocumento" AS ENUM (
  -- Ainda não saiu daqui.
  'PENDENTE',
  -- Saiu e não há resposta. É o estado que dói, e é o que costuma ser colapsado
  -- em «falhou» — a mesma lição do indeterminado do E22.
  'ENVIADO',
  -- O fornecedor ou a autoridade aceitou. SÓ AQUI é um documento fiscal.
  'ACEITE',
  -- Rejeitado, com motivo. É um estado, não um erro que se deita fora.
  'REJEITADO',
  -- Anulado por outro documento. O original fica.
  'ANULADO'
);

CREATE TYPE "TipoDeDocumento" AS ENUM ('FACTURA', 'RECTIFICATIVA', 'ANULACAO');

-- ── O documento ───────────────────────────────────────────────────────────
CREATE TABLE "fiscal_documents" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "bill_id"         UUID REFERENCES "bills"("id") ON DELETE SET NULL,
  "tipo"            "TipoDeDocumento" NOT NULL DEFAULT 'FACTURA',
  "estado"          "EstadoDoDocumento" NOT NULL DEFAULT 'PENDENTE',
  -- ── A identidade é a do ACONTECIMENTO ───────────────────────────────────
  --
  -- Mesma família do E23, e a chave já existe. Uma emissão repetida por reenvio,
  -- clique duplo ou reprocessamento traz o mesmo acontecimento e devolve o MESMO
  -- documento. Uma correcção é um facto novo, e sai.
  "acontecimento"   TEXT NOT NULL,
  -- Encadeamento: o RD 1007/2023, art. 10.1.ñ, exige que o registo de alta leve
  -- parte da huella do registo imediatamente anterior. Guardamos a ligação e o
  -- resumo; o ALGORITMO não está aqui fixado, porque a ordem técnica que o
  -- define não foi lida — ver ADR 0002.
  "anterior_id"     UUID REFERENCES "fiscal_documents"("id") ON DELETE RESTRICT,
  "resumo"          TEXT,
  -- Quem o rejeitou e porquê. Sem motivo, uma rejeição é um beco.
  "motivo_rejeicao" TEXT,
  -- O documento que este corrige. «Corrige-se com outro documento, e os dois
  -- ficam» — não há aqui nenhum caminho que reescreva o original.
  "corrige_id"      UUID REFERENCES "fiscal_documents"("id") ON DELETE RESTRICT,
  "numero_provedor" TEXT,
  "provedor"        TEXT,
  "criado_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "enviado_em"      TIMESTAMPTZ,
  "respondido_em"   TIMESTAMPTZ,
  CONSTRAINT "acontecimento_nao_vazio" CHECK (length(btrim("acontecimento")) > 0),
  -- Rejeitado exige motivo. Uma rejeição sem motivo não é visível a quem a tem
  -- de corrigir, e a régua pede exactamente isso.
  CONSTRAINT "rejeitado_com_motivo" CHECK (
    "estado" <> 'REJEITADO' OR length(btrim(COALESCE("motivo_rejeicao", ''))) > 0
  ),
  -- Aceite exige número do fornecedor. É o que distingue «aceite» de «achamos
  -- que sim»: sem número, ninguém o pode ir verificar.
  CONSTRAINT "aceite_com_numero" CHECK (
    "estado" <> 'ACEITE' OR length(btrim(COALESCE("numero_provedor", ''))) > 0
  ),
  -- Uma correcção é de OUTRO documento, nunca dela própria.
  CONSTRAINT "correccao_de_outro" CHECK ("corrige_id" IS NULL OR "corrige_id" <> "id")
);

-- «Emitir duas vezes não emite dois documentos» — e a garantia é um índice, não
-- um `if já existe`: entre a procura e a inserção cabe o segundo processo.
CREATE UNIQUE INDEX "um_documento_por_acontecimento"
  ON "fiscal_documents" ("organization_id", "acontecimento");
CREATE UNIQUE INDEX "uma_correccao_por_documento"
  ON "fiscal_documents" ("corrige_id") WHERE "corrige_id" IS NOT NULL;
CREATE INDEX "documentos_por_conta" ON "fiscal_documents" ("bill_id");
CREATE INDEX "documentos_por_estado" ON "fiscal_documents" ("location_id", "estado");

-- ── Um documento fiscal não se reescreve ──────────────────────────────────
--
-- «Corrige-se com outro documento, e os dois ficam.» O que a base deixa mudar é
-- só o caminho legítimo do estado — e nada mais: nem o valor, nem a conta, nem o
-- acontecimento que lhe deu identidade.
CREATE OR REPLACE FUNCTION documento_fiscal_nao_se_reescreve()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DOCUMENTO_IMUTAVEL: um documento fiscal não se apaga; corrige-se com outro'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."acontecimento" <> OLD."acontecimento"
     OR NEW."bill_id" IS DISTINCT FROM OLD."bill_id"
     OR NEW."tipo" <> OLD."tipo"
     OR NEW."corrige_id" IS DISTINCT FROM OLD."corrige_id" THEN
    RAISE EXCEPTION 'DOCUMENTO_IMUTAVEL: o que identifica o documento não se altera'
      USING ERRCODE = 'check_violation';
  END IF;
  -- Um documento ACEITE está fechado: a partir daí só o anula outro documento.
  IF OLD."estado" = 'ACEITE' AND NEW."estado" <> 'ACEITE' AND NEW."estado" <> 'ANULADO' THEN
    RAISE EXCEPTION 'DOCUMENTO_IMUTAVEL: um documento aceite não volta atrás'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "documentos_fiscais_nao_se_reescrevem"
  BEFORE UPDATE OR DELETE ON "fiscal_documents"
  FOR EACH ROW EXECUTE FUNCTION documento_fiscal_nao_se_reescreve();

-- ── O conector fiscal ─────────────────────────────────────────────────────
--
-- Sem fornecedor homologado, a emissão real fica BLOQUEADA. O `CHECK` garante-o:
-- activo exige provedor e ambiente, e não há aqui coluna para credencial —
-- segredo vive no ambiente, como no E23.
CREATE TABLE "fiscal_connectors" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL UNIQUE REFERENCES "locations"("id") ON DELETE CASCADE,
  "provedor"        TEXT,
  "ambiente"        TEXT,
  "nif"             TEXT,
  "activo"          BOOLEAN NOT NULL DEFAULT false,
  "criado_em"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "actualizado_em"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fiscal_ligado_exige_provedor" CHECK (
    "activo" = false OR ("provedor" IS NOT NULL AND "ambiente" IS NOT NULL AND "nif" IS NOT NULL)
  ),
  -- «Sandbox» nunca é produção. Escrever o ambiente evita a pior confusão desta
  -- área: julgar que se emitiu a sério contra um servidor de ensaio.
  CONSTRAINT "ambiente_conhecido" CHECK (
    "ambiente" IS NULL OR "ambiente" IN ('SANDBOX', 'PRODUCAO')
  )
);

ALTER TABLE "fiscal_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fiscal_documents"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

ALTER TABLE "fiscal_connectors" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fiscal_connectors"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

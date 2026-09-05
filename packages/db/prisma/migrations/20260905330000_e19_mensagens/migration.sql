-- ── E19 · a fila de mensagens ──────────────────────────────────────────────
--
-- «Templates transacionais, fila, resultado por provedor, histórico e reenvio
-- deduplicado.» É a família que já apareceu duas vezes neste projecto — entrega
-- repetível com efeitos deduplicados — e o que se esquece é sempre o mesmo:
-- reenviar não pode entregar duas vezes ao cliente.
--
-- ── A MENSAGEM e a TENTATIVA são duas tabelas ─────────────────────────────
--
-- Uma linha por envio dava um histórico e nenhuma deduplicação: cada carregar no
-- botão criava outra linha, e nada distinguia «tentei outra vez» de «o cliente
-- recebeu duas vezes».
--
-- Aqui a MENSAGEM existe uma vez por (reserva, tipo) — é a restrição única — e
-- as TENTATIVAS penduram-se nela. Reenviar acrescenta uma tentativa; entregar
-- outra vez é impossível, porque a entrega é um carimbo na mensagem e um carimbo
-- que já existe não se escreve de novo.
--
-- E uma mensagem DIFERENTE para a mesma reserva tem chave diferente, logo é
-- enviada. Sem essa metade, «engole tudo o que se parece» satisfazia o teste.

ALTER TABLE "reservation_messages"
  ADD COLUMN "location_id"  UUID,
  ADD COLUMN "idioma"       TEXT NOT NULL DEFAULT 'es-ES',
  ADD COLUMN "assunto"      TEXT,
  ADD COLUMN "corpo"        TEXT,
  ADD COLUMN "entregue_em"  TIMESTAMPTZ(6),
  ADD COLUMN "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ── A chave da deduplicação ───────────────────────────────────────────────
--
-- Uma mensagem por reserva e tipo. É isto que faz o reenvio ser um facto novo
-- sobre a MESMA mensagem, em vez de uma mensagem nova.
CREATE UNIQUE INDEX "uma_mensagem_por_reserva_e_tipo"
  ON "reservation_messages"("reservation_id", "tipo");

-- ── E o estado ganha o que faltava ────────────────────────────────────────
--
-- `PENDENTE` é o estado de quem ainda não foi entregue — e é onde uma mensagem
-- fica quando não há provedor configurado. Não é `FALHADA`: falhar é ter tentado
-- e não ter conseguido; sem provedor não se chegou a tentar, e chamar-lhe falha
-- manda alguém procurar um erro que não existe.
ALTER TYPE "estado_da_mensagem" ADD VALUE IF NOT EXISTS 'PENDENTE' BEFORE 'ENVIADA';

-- ── Uma ENVIADA tem de ter carimbo ────────────────────────────────────────
--
-- «Uma reserva confirmada com email por enviar continua confirmada.» A recíproca
-- também tem de ser verdade no modelo: uma mensagem marcada como entregue sem
-- saber quando é um histórico que não se pode auditar.
ALTER TABLE "reservation_messages"
  ADD CONSTRAINT "mensagem_entregue_tem_carimbo" CHECK (
    ("estado" <> 'ENVIADA' OR "entregue_em" IS NOT NULL)
  );

-- CreateTable — as TENTATIVAS
CREATE TABLE "reservation_message_attempts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "provedor" TEXT,
    "resultado" TEXT NOT NULL,
    "erro" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_message_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reservation_message_attempts_organization_id_id_key"
  ON "reservation_message_attempts"("organization_id", "id");
CREATE INDEX "reservation_message_attempts_message_id_created_at_idx"
  ON "reservation_message_attempts"("message_id", "created_at");

ALTER TABLE "reservation_message_attempts" ADD CONSTRAINT "reservation_message_attempts_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_message_attempts" ADD CONSTRAINT "reservation_message_attempts_organization_id_message_id_fkey"
  FOREIGN KEY ("organization_id", "message_id") REFERENCES "reservation_messages"("organization_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservation_message_attempts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "reservation_message_attempts"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

-- ── E os TEMPLATES ────────────────────────────────────────────────────────
--
-- Um por unidade, tipo e idioma. O idioma faz parte da chave porque a mesma
-- confirmação escrita em espanhol e em inglês são dois textos, e não duas
-- traduções de um — quem escreve o de inglês não está a traduzir, está a
-- escrever para outra pessoa.
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "idioma" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "message_templates_organization_id_id_key" ON "message_templates"("organization_id", "id");
CREATE UNIQUE INDEX "um_template_por_unidade_tipo_idioma"
  ON "message_templates"("location_id", "tipo", "idioma");

ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "message_templates"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

-- ── O CONECTOR, que nasce desligado e é visível como desligado ────────────
--
-- «Sem provedor configurado, o conector fica desligado e visível como desligado
-- — não a fingir que enviou.»
--
-- `provedor` anulável é o estado por omissão, e é o que a tela lê para o dizer.
-- Não há caminho que marque uma mensagem como ENVIADA sem provedor: sem ele, a
-- mensagem fica PENDENTE com o motivo escrito, que é a verdade.
CREATE TABLE "messaging_connectors" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "provedor" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "messaging_connectors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "messaging_connectors_location_id_key" ON "messaging_connectors"("location_id");
CREATE UNIQUE INDEX "messaging_connectors_organization_id_id_key" ON "messaging_connectors"("organization_id", "id");

ALTER TABLE "messaging_connectors" ADD CONSTRAINT "messaging_connectors_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messaging_connectors" ADD CONSTRAINT "messaging_connectors_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Activo SEM provedor não é um estado ───────────────────────────────────
--
-- É a garantia na forma: ninguém pode ligar o conector sem dizer quem entrega. O
-- «activo» sozinho seria exactamente o «a fingir que enviou» que o enunciado
-- proíbe, e ficaria a uma linha de distância de alguém o ligar por engano.
ALTER TABLE "messaging_connectors"
  ADD CONSTRAINT "conector_activo_exige_provedor" CHECK (
    "activo" = false OR "provedor" IS NOT NULL
  );

ALTER TABLE "messaging_connectors" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "messaging_connectors"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

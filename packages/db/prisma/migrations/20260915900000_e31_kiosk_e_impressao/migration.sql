-- E31 · Kiosk, terminais e impressão
-- Contrato: docs/architecture/kiosk-e-impressao.md (escrito por FRONTEIRA)
--
-- Todas as etapas anteriores acabavam DENTRO do sistema. Esta acaba num pedaço
-- de papel e num ecrã sozinho num corredor — e nos dois sítios o produto perde
-- a capacidade de verificar aquilo que afirma.
--
-- Por isso nada aqui é uma coluna de confiança. O que o produto não pode
-- verificar, não afirma; e o que ele afirma, a base obriga.

CREATE TYPE "EstadoDaSessaoDeKiosk" AS ENUM (
  'ABERTA',
  -- Os TRÊS caminhos de saída. Estão no mesmo enum de propósito: são o mesmo
  -- acontecimento visto de três lados, e quem escrever um caminho que limpa
  -- menos do que os outros deixa o carrinho do cliente anterior no ecrã do
  -- seguinte. O motivo distingue-os; o efeito não pode distinguir.
  'CONCLUIDA', 'ABANDONADA', 'REINICIADA'
);

CREATE TYPE "LigacaoDeImpressora" AS ENUM ('REDE', 'USB', 'PONTE');

CREATE TYPE "TipoDeDocumentoImpresso" AS ENUM
  ('COMANDA', 'CONTA', 'RECIBO', 'DOCUMENTO_FISCAL');

-- ── OS TRÊS ESTADOS, E O TERCEIRO É O QUE COSTUMA FALTAR ────────────────────
--
-- «Entregue à ponte» NÃO é «imprimiu». O papel pode ter acabado, a tampa pode
-- estar aberta, a impressora pode estar desligada. Chamar impresso ao que foi
-- enviado é a mesma família de erro que chamar entregue a um HTTP 200.
--
-- Repare-se no que NÃO está aqui: não há `IMPRESSO`. Há resposta do aparelho ou
-- não há — e «não sei» não é um valor desta lista porque **deriva** do tempo
-- sem resposta. Um estado que se pode derivar nunca se escreve; se estivesse
-- aqui, alguém acabaria por o escrever à mão e ele deixaria de querer dizer
-- «ninguém respondeu» para passar a querer dizer «alguém achou».
CREATE TYPE "EstadoDeEnvioDeImpressao" AS ENUM (
  'POR_ENVIAR', 'ENTREGUE_A_PONTE',
  'CONFIRMADO_PELO_APARELHO', 'RECUSADO_PELO_APARELHO'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- IMPRESSORAS (DEV-005)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE "printers" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  "destino"         "Estacao" NOT NULL,
  "modelo"          TEXT NOT NULL,
  "ligacao"         "LigacaoDeImpressora" NOT NULL,
  "endereco"        TEXT,
  "activa"          BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── HOMOLOGAÇÃO: NULO QUER DIZER POR TESTAR, E NUNCA APROVADO ────────────
  --
  -- «Uma linha vazia lê-se como uma linha aprovada, e as duas custam a mesma
  -- tinta.» Não há coluna booleana `homologada` de propósito: um booleano tem
  -- duas respostas e aqui há três — sim, não, e NÃO MEDI. A ausência de data é
  -- a terceira, e é a única que o produto pode afirmar sem aparelho a sério.
  "homologada_em"     TIMESTAMPTZ(6),
  "homologada_por"    TEXT,
  "homologacao_notas" TEXT,

  "criada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  -- Uma homologação sem quem a assinou não se audita daqui a seis meses. As
  -- duas colunas andam juntas ou não andam.
  CONSTRAINT "homologacao_tem_assinatura"
    CHECK (("homologada_em" IS NULL) = ("homologada_por" IS NULL))
);
CREATE UNIQUE INDEX "uma_impressora_por_nome" ON "printers" ("location_id", "nome");
CREATE INDEX "printers_por_destino" ON "printers" ("organization_id", "location_id", "destino");

-- ═══════════════════════════════════════════════════════════════════════════
-- SESSÕES DE KIOSK (KIOSK-001..007)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── A FRONTEIRA 1, RESOLVIDA NO PRINCÍPIO E NÃO NO BOTÃO ────────────────────
--
-- O aceite pede duas coisas que puxam ao contrário: dois clientes seguidos não
-- partilham nada, E apagar os dados da pessoa não pode perder a confirmação do
-- pedido. Quem tentar resolver isto no botão de reiniciar falha numa das duas.
--
-- Repare-se no que esta tabela NÃO tem: nome, email, telefone, nada da pessoa.
-- Não é disciplina de quem escreve o código — é AUSÊNCIA. Uma coluna que não
-- existe não fica com os dados do cliente anterior, e nenhum botão de limpar
-- precisa de se lembrar dela.
--
-- Os dados da pessoa, quando existem, vivem em `customers` com finalidade e
-- prazo (contrato do E27), e o pedido REFERE-OS pela `order_contacts`. Apagar a
-- pessoa não apaga o pedido porque nunca foram a mesma coisa.
CREATE TABLE "kiosk_sessions" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "device_id"       UUID NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "idioma"          TEXT NOT NULL,
  "estado"          "EstadoDaSessaoDeKiosk" NOT NULL DEFAULT 'ABERTA',

  -- O pedido e a conta que esta sessão construiu. `SET NULL` e não `CASCADE`:
  -- se o pedido desaparecer, a sessão continua a ser um facto que aconteceu.
  "order_id" UUID REFERENCES "orders"("id") ON DELETE SET NULL,
  "bill_id"  UUID REFERENCES "bills"("id")  ON DELETE SET NULL,

  "aberta_em"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "terminada_em"     TIMESTAMPTZ(6),
  "terminada_motivo" TEXT,

  -- Aberta é exactamente o mesmo que não ter fim. Sem isto, uma sessão podia
  -- estar `CONCLUIDA` sem data ou `ABERTA` com data, e as duas leituras do
  -- «acabou?» — pelo estado e pela data — passavam a poder discordar.
  CONSTRAINT "aberta_e_o_mesmo_que_sem_fim"
    CHECK (("estado" = 'ABERTA') = ("terminada_em" IS NULL))
);

-- ── UM KIOSK TEM NO MÁXIMO UMA SESSÃO ABERTA ───────────────────────────────
--
-- É a garantia que faz «dois clientes seguidos não partilham nada» ser
-- verdadeira por ESTRUTURA e não por o código se lembrar. Abrir a segunda sem
-- fechar a primeira é recusado pela base: não há caminho que deixe duas vivas.
CREATE UNIQUE INDEX "uma_sessao_aberta_por_kiosk"
  ON "kiosk_sessions" ("device_id") WHERE "estado" = 'ABERTA';
-- E a outra metade do mesmo aceite: uma sessão nova não pode apontar para o
-- carrinho nem para a conta da anterior. A primeira metade impede duas sessões
-- vivas; esta impede que a segunda herde o que era da primeira.
CREATE UNIQUE INDEX "um_pedido_por_sessao_de_kiosk" ON "kiosk_sessions" ("order_id");
CREATE UNIQUE INDEX "uma_conta_por_sessao_de_kiosk" ON "kiosk_sessions" ("bill_id");
CREATE INDEX "kiosk_sessions_por_unidade"
  ON "kiosk_sessions" ("organization_id", "location_id", "estado");

-- ═══════════════════════════════════════════════════════════════════════════
-- O CONTACTO DO PEDIDO — a referência, e não a cópia
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Isto é a Fronteira 1 escrita em SQL. O `orders` continua sem saber quem é a
-- pessoa; quando há pessoa, a ligação vive AQUI, com finalidade e prazo.
--
-- `ON DELETE CASCADE` no cliente e no pedido, e é o ponto todo: apagar a pessoa
-- leva a LIGAÇÃO e deixa o pedido — número, linhas, valor, estado — de pé.
-- Se isto fosse uma coluna em `orders`, apagar a pessoa ou apagava o pedido ou
-- era recusado, e as duas são a falha que o aceite descreve.
CREATE TABLE "order_contacts" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "order_id"        UUID NOT NULL REFERENCES "orders"("id")    ON DELETE CASCADE,
  "customer_id"     UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "finalidade"      "FinalidadeDeContacto" NOT NULL,
  "expira_em"       TIMESTAMPTZ(6) NOT NULL,
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "um_contacto_por_pedido" ON "order_contacts" ("order_id");
CREATE INDEX "order_contacts_por_pessoa" ON "order_contacts" ("organization_id", "customer_id");

-- ═══════════════════════════════════════════════════════════════════════════
-- FILA DE IMPRESSÃO (KDS-016, DEV-006)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE "print_jobs" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "printer_id"      UUID NOT NULL REFERENCES "printers"("id") ON DELETE RESTRICT,

  "tipo"         "TipoDeDocumentoImpresso" NOT NULL,
  "documento_id" UUID NOT NULL,

  -- 1 é o original. 2 em diante é reimpressão, e o número vai NO PAPEL.
  "via" INT NOT NULL DEFAULT 1 CHECK ("via" >= 1),

  -- A identidade é DERIVADA (ver o gatilho). Está guardada porque é sobre ela
  -- que a restrição única trabalha, mas ninguém a escolhe.
  "identidade" TEXT NOT NULL,

  "estado" "EstadoDeEnvioDeImpressao" NOT NULL DEFAULT 'POR_ENVIAR',

  -- O que foi ENVIADO, tal como foi enviado. Sem isto, uma comanda reimpressa
  -- não se consegue distinguir da original depois do facto, e a pergunta «o que
  -- é que a cozinha viu?» não tem resposta.
  "conteudo" TEXT NOT NULL,

  "criado_em"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "entregue_em"   TIMESTAMPTZ(6),
  "respondido_em" TIMESTAMPTZ(6),
  -- O que o APARELHO disse. Não o que o software achou.
  "resposta"      TEXT,

  -- ── NÃO SE PODE AFIRMAR UMA RESPOSTA QUE NÃO HOUVE ──────────────────────
  --
  -- Os dois estados de resposta exigem carimbo E texto do aparelho; os outros
  -- dois proíbem-nos. É isto que impede o «entregue à ponte» de se promover a
  -- «imprimiu» com uma linha de código: não há como escrever a confirmação sem
  -- ter o que o aparelho respondeu.
  CONSTRAINT "resposta_do_aparelho_ou_nada" CHECK (
    ("estado" IN ('CONFIRMADO_PELO_APARELHO', 'RECUSADO_PELO_APARELHO'))
      = ("respondido_em" IS NOT NULL AND "resposta" IS NOT NULL)
  ),
  CONSTRAINT "entregue_a_ponte_tem_carimbo" CHECK (
    "estado" = 'POR_ENVIAR' OR "entregue_em" IS NOT NULL
  )
);

-- ── FILA IDEMPOTENTE ───────────────────────────────────────────────────────
--
-- O mesmo documento não produz duas comandas. Mesma figura da linha de extracto
-- do E29: a identidade deriva do conteúdo e a base recusa a segunda.
CREATE UNIQUE INDEX "um_envio_por_identidade" ON "print_jobs" ("organization_id", "identidade");
CREATE INDEX "print_jobs_por_estado" ON "print_jobs" ("organization_id", "location_id", "estado");

-- A identidade é derivada e o gatilho SOBREPÕE-SE ao que vier de fora. Um
-- número que se pode derivar nunca se escreve — e se se pudesse escrever, a
-- idempotência passava a depender de quem chama enviar a chave certa.
CREATE OR REPLACE FUNCTION identidade_de_impressao_deriva()
RETURNS TRIGGER AS $$
BEGIN
  NEW."identidade" := NEW."tipo" || ':' || NEW."documento_id" || ':' || NEW."via";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "identidade_de_impressao_e_derivada"
  BEFORE INSERT OR UPDATE ON "print_jobs"
  FOR EACH ROW EXECUTE FUNCTION identidade_de_impressao_deriva();

-- ── A SEGUNDA VIA DISTINGUE-SE NO PAPEL ────────────────────────────────────
--
-- Não no ecrã de quem reimprime: no papel que chega à cozinha, porque é lá que
-- a decisão errada custa. Uma segunda via sem marca é indistinguível de um
-- segundo pedido, e ninguém na cozinha tem como saber a diferença.
--
-- A marca procurada é `VIA <n>` — um NÚMERO, e por isso a garantia não depende
-- da língua em que o resto do talão está escrito.
CREATE OR REPLACE FUNCTION segunda_via_marcada_no_papel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."via" > 1 AND position('VIA ' || NEW."via" IN NEW."conteudo") = 0 THEN
    RAISE EXCEPTION 'reimpressao_sem_marca_no_papel'
      USING HINT = 'a via ' || NEW."via" || ' tem de dizer VIA ' || NEW."via" || ' no conteudo impresso';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "reimpressao_diz_no_papel_que_e_segunda_via"
  BEFORE INSERT OR UPDATE ON "print_jobs"
  FOR EACH ROW EXECUTE FUNCTION segunda_via_marcada_no_papel();

-- ── O REINICIAR NÃO ABANDONA UMA COBRANÇA INDETERMINADA ────────────────────
--
-- O cruzamento das duas coisas mais perigosas do produto: o estado que mais dói
-- e o botão que limpa tudo. A pessoa foi-se embora, o dinheiro pode ter saído
-- da conta dela, e não há ninguém no balcão para reclamar.
--
-- A base recusa FECHAR a sessão — pelos três caminhos, incluindo o concluído —
-- enquanto houver uma tentativa `INDETERMINADA` na conta dela. O kiosk fica
-- pausado (KIOSK-007) e alguém com acesso resolve. Parar a máquina é caro; a
-- alternativa é o produto decidir sozinho sobre dinheiro que não consegue ver.
CREATE OR REPLACE FUNCTION reiniciar_nao_abandona_cobranca()
RETURNS TRIGGER AS $$
DECLARE
  por_resolver INT;
BEGIN
  IF NEW."estado" = 'ABERTA' OR NEW."bill_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO por_resolver
    FROM "payment_attempts"
   WHERE "bill_id" = NEW."bill_id"
     AND "estado" = 'INDETERMINADA';

  IF por_resolver > 0 THEN
    RAISE EXCEPTION 'sessao_com_cobranca_indeterminada'
      USING HINT = 'ha ' || por_resolver || ' cobranca(s) por resolver nesta sessao de kiosk';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "fechar_sessao_nao_apaga_cobranca_por_resolver"
  BEFORE UPDATE ON "kiosk_sessions"
  FOR EACH ROW EXECUTE FUNCTION reiniciar_nao_abandona_cobranca();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "printers"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kiosk_sessions"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_contacts"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "print_jobs"      ENABLE ROW LEVEL SECURITY;

-- Sem `FORCE ROW LEVEL SECURITY`, e a decisão é de CONVENÇÃO e não de gosto: as
-- outras 30 migrações do projecto usam só `ENABLE`, e o dono da tabela — a
-- credencial de migração — passa por cima das políticas. Pôr `FORCE` só aqui
-- fazia estas quatro tabelas comportarem-se de forma diferente das outras 140,
-- e quem semeia dados de prova batia numa recusa que não bate em mais lado
-- nenhum. Medido: com `FORCE` a semente desta prova é recusada.
--
-- Fica a OBSERVAÇÃO, que é do sénior decidir e não minha para mudar aqui: o
-- projecto inteiro depende do desvio do dono. Se algum dia a credencial de
-- runtime for dona de alguma tabela, o RLS dela deixa de valer em silêncio.

CREATE POLICY "printers_por_org" ON "printers"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "kiosk_sessions_por_org" ON "kiosk_sessions"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "order_contacts_por_org" ON "order_contacts"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "print_jobs_por_org" ON "print_jobs"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());

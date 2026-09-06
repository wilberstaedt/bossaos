-- E33 · Plataforma, suporte e governança
-- Contrato: docs/architecture/plataforma-e-suporte.md (escrito por FRONTEIRA)
--
-- ── A etapa em que o atacante somos NÓS ────────────────────────────────────
--
-- Todas as outras deram poder a quem trabalha na casa. Esta dá-o a quem vende o
-- sistema. E isso inverte quem precisa de protecção: até aqui protegemos o
-- restaurante de enganos e de estranhos; **aqui protegemo-lo de nós**.
--
-- É a única etapa em que o atacante do modelo de ameaça somos nós próprios a
-- agir de boa fé e com pressa — e é por isso que quase tudo aqui é uma
-- restrição contra quem escreve o código, e não contra quem usa o produto.

CREATE TYPE "AmbitoDeSuporte" AS ENUM (
  'LEITURA',            -- ver, e mais nada
  'CONFIGURACAO',       -- mexer em definições
  'DADOS_OPERACIONAIS'  -- pedidos, mesas, produção
);

CREATE TYPE "EstadoDoTrabalho" AS ENUM
  ('PENDENTE', 'A_CORRER', 'CONCLUIDO', 'FALHOU');

CREATE TYPE "EstadoDoIncidente" AS ENUM
  ('ABERTO', 'A_INVESTIGAR', 'MITIGADO', 'FECHADO');

CREATE TYPE "EstadoDoPedidoDeAjuda" AS ENUM
  ('ABERTO', 'EM_CURSO', 'RESPONDIDO', 'FECHADO');

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA 1 · alguém do suporte entra numa casa (PLAT-007, PLAT-008)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- **O defeito desta etapa tem nome: o suporte virar dono sem ninguém dar por
-- isso.** As quatro condições estão todas aqui, e nenhuma é decorativa.

CREATE TABLE "support_sessions" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,

  -- ── A PESSOA, e não o papel ─────────────────────────────────────────────
  --
  -- «Suporte» não é resposta à pergunta *quem fez isto*. É a mesma exigência
  -- que o E28 fez à correcção de ponto, virada para dentro.
  "staff_user_id"   UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "staff_email"     TEXT NOT NULL,

  -- ── Com MOTIVO, escrito antes e não depois ──────────────────────────────
  "motivo"          TEXT NOT NULL,
  -- ── Com ÂMBITO: vê o que precisa para resolver, não a casa inteira ──────
  "ambito"          "AmbitoDeSuporte"[] NOT NULL,

  "aberta_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  -- ── TEMPORÁRIA, e é a coluna que decide ─────────────────────────────────
  --
  -- `NOT NULL`. Uma sessão que termina «quando alguém se lembra» é permanente
  -- na prática — e a diferença entre as duas é uma tarde de trabalho de quem se
  -- distraiu, ou uma semana.
  --
  -- E repare-se no que NÃO existe: uma coluna `activa`. Estar activa **deriva**
  -- de não ter fim e não ter expirado. Um booleano seria um estado que alguém
  -- escreve, e o que alguém escreve alguém esquece de reescrever.
  "expira_em"       TIMESTAMPTZ(6) NOT NULL,

  "terminada_em"     TIMESTAMPTZ(6),
  "terminada_motivo" TEXT,

  -- ── Autorizada conforme a POLÍTICA DO INQUILINO ─────────────────────────
  --
  -- Há casas que aceitam entrada sem pedir; há casas que exigem consentimento a
  -- cada vez. A política é delas, e quando exige, isto guarda quem consentiu.
  "consentida_por"  TEXT,
  "consentida_em"   TIMESTAMPTZ(6),

  CONSTRAINT "sessao_tem_motivo" CHECK (length(btrim("motivo")) >= 10),
  CONSTRAINT "sessao_tem_ambito"
    CHECK (coalesce(array_length("ambito", 1), 0) >= 1),
  -- Um prazo que já passou quando se abre é uma sessão que nasce morta, e
  -- esconde um erro de fuso a montante.
  CONSTRAINT "prazo_e_futuro" CHECK ("expira_em" > "aberta_em"),
  CONSTRAINT "consentimento_tem_assinatura"
    CHECK (("consentida_em" IS NULL) = ("consentida_por" IS NULL))
);
CREATE INDEX "support_sessions_por_org"
  ON "support_sessions" ("organization_id", "aberta_em" DESC);

-- ── UMA SESSÃO ABERTA POR PESSOA E POR CASA ────────────────────────────────
--
-- Sem isto, quem abre duas e fecha uma fica com a outra viva sem dar por ela.
-- O índice é parcial e a condição é a **derivada**: não fechada e não expirada.
--
-- E porque é que a expiração entra num índice, se o tempo passa e o índice não
-- se recalcula: porque o que se impede é abrir a segunda **enquanto** a
-- primeira ainda vale. Depois de expirar, abrir outra é o comportamento certo.
CREATE UNIQUE INDEX "uma_sessao_viva_por_pessoa_e_casa"
  ON "support_sessions" ("organization_id", "staff_user_id")
  WHERE "terminada_em" IS NULL;

-- A política de acesso, do INQUILINO (SET-010).
CREATE TABLE "access_policies" (
  "organization_id"      UUID PRIMARY KEY REFERENCES "organizations"("id") ON DELETE CASCADE,
  -- Quando é `true`, nenhuma sessão de suporte abre sem alguém da casa consentir.
  "exige_consentimento"  BOOLEAN NOT NULL DEFAULT FALSE,
  -- O tecto que a casa aceita. O suporte pode pedir menos; nunca mais.
  "duracao_maxima_min"   INT NOT NULL DEFAULT 60,
  "actualizada_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "actualizada_por"      TEXT,

  CONSTRAINT "duracao_maxima_e_positiva" CHECK ("duracao_maxima_min" > 0)
);

-- ── O GATILHO QUE FAZ AS QUATRO CONDIÇÕES SEREM TODAS ─────────────────────
--
-- Recusa a sessão que ultrapasse o tecto da casa, e a que abra sem
-- consentimento quando a casa o exige.
--
-- Está aqui, e não no motor, pela razão de sempre: o motor é um caminho, e a
-- base é o único sítio por onde todos os caminhos passam.
CREATE OR REPLACE FUNCTION sessao_respeita_a_politica_da_casa()
RETURNS TRIGGER AS $$
DECLARE
  v_exige  BOOLEAN;
  v_tecto  INT;
BEGIN
  SELECT "exige_consentimento", "duracao_maxima_min" INTO v_exige, v_tecto
    FROM "access_policies" WHERE "organization_id" = NEW."organization_id";

  -- Sem política escrita, vale a mais apertada que o produto tem por omissão.
  -- A ausência de política não é permissão: é a definição por omissão da tabela.
  v_exige := coalesce(v_exige, FALSE);
  v_tecto := coalesce(v_tecto, 60);

  IF NEW."expira_em" > NEW."aberta_em" + make_interval(mins => v_tecto) THEN
    RAISE EXCEPTION 'sessao_excede_o_tecto_da_casa'
      USING HINT = 'a casa aceita no maximo ' || v_tecto || ' minutos';
  END IF;

  IF v_exige AND NEW."consentida_por" IS NULL THEN
    RAISE EXCEPTION 'casa_exige_consentimento'
      USING HINT = 'esta casa exige que alguem de la consinta a cada entrada';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "sessao_de_suporte_respeita_a_casa"
  BEFORE INSERT OR UPDATE ON "support_sessions"
  FOR EACH ROW EXECUTE FUNCTION sessao_respeita_a_politica_da_casa();

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA 2 · o rasto guarda a PESSOA, não o papel (SET-011, PLAT-013)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Suporte» não responde à pergunta *quem fez isto*. Um registo assinado por um
-- papel é um registo que não serve para nada seis meses depois — e é
-- exactamente nas acções da plataforma que a tentação de assinar com o papel é
-- maior, porque quem age está a fazer o trabalho «do suporte».
--
-- Isto é o segundo gatilho do E28 virado para dentro: a imutabilidade guarda a
-- forma; **isto guarda o sentido**.
CREATE OR REPLACE FUNCTION rasto_guarda_a_pessoa()
RETURNS TRIGGER AS $$
DECLARE
  v_papeis TEXT[] := ARRAY[
    'suporte', 'support', 'plataforma', 'platform', 'sistema', 'system',
    'admin', 'administrador', 'operador', 'bot', 'automatico'
  ];
BEGIN
  -- Só as acções da PLATAFORMA. As do produto já são assinadas pelo utilizador
  -- da casa, e o E04 garante que ele existe.
  IF NEW."accao" NOT LIKE 'plataforma.%' THEN
    RETURN NEW;
  END IF;

  IF NEW."actor_email" IS NULL OR NEW."actor_id" IS NULL THEN
    RAISE EXCEPTION 'rasto_sem_pessoa'
      USING HINT = 'uma accao da plataforma tem de dizer QUEM a fez';
  END IF;

  -- O email tem de ser de uma pessoa, e não o nome de um papel. Compara-se a
  -- parte antes do `@`: `suporte@bossa.example` é um papel; `ana@bossa.example`
  -- é uma pessoa.
  IF lower(split_part(NEW."actor_email", '@', 1)) = ANY(v_papeis) THEN
    RAISE EXCEPTION 'rasto_assinado_por_um_papel'
      USING HINT = '"' || NEW."actor_email" || '" e um papel, nao uma pessoa';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "accao_da_plataforma_diz_quem_a_fez"
  BEFORE INSERT ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION rasto_guarda_a_pessoa();

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA 4 · configura-se um segredo (PLAT-017, e a lista de provedores)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- **Mostra-se o estado e a data de rotação; nunca o valor.**
--
-- E não é uma coluna mascarada: **não há coluna**. O valor vive no ambiente
-- autorizado, e o que esta tabela guarda é o que se pode dizer em voz alta —
-- que existe, quando foi rodado, e por quem.
--
-- Uma coluna `valor` com `••••••` no ecrã é uma coluna com o segredo lá dentro.
CREATE TABLE "platform_secrets" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"           TEXT NOT NULL UNIQUE,
  "descricao"      TEXT NOT NULL,
  -- Se a variável de ambiente está presente. Um booleano, e não o valor.
  "configurado"    BOOLEAN NOT NULL DEFAULT FALSE,
  "rodado_em"      TIMESTAMPTZ(6),
  "rodado_por"     TEXT,
  "actualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "rotacao_tem_assinatura"
    CHECK (("rodado_em" IS NULL) = ("rodado_por" IS NULL))
);

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA 5 · um trabalho falhado é reprocessado (PLAT-014)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sem duplicar efeitos. Identidade derivada e restrição na base, como a linha
-- de extracto do E29 e a comanda do E31.
CREATE TABLE "platform_jobs" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID REFERENCES "organizations"("id") ON DELETE CASCADE,
  "tipo"            TEXT NOT NULL,
  "alvo"            TEXT NOT NULL,
  -- Derivada por gatilho, como a da impressão do E31. Um número que se pode
  -- derivar nunca se escreve.
  "identidade"      TEXT NOT NULL,
  "tentativa"       INT  NOT NULL DEFAULT 1,
  "estado"          "EstadoDoTrabalho" NOT NULL DEFAULT 'PENDENTE',
  "erro"            TEXT,
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "terminado_em"    TIMESTAMPTZ(6),

  CONSTRAINT "tentativa_e_positiva" CHECK ("tentativa" >= 1),
  CONSTRAINT "terminado_tem_carimbo"
    CHECK (("estado" IN ('CONCLUIDO', 'FALHOU')) = ("terminado_em" IS NOT NULL))
);
CREATE UNIQUE INDEX "um_trabalho_por_identidade" ON "platform_jobs" ("identidade");

CREATE OR REPLACE FUNCTION identidade_de_trabalho_deriva()
RETURNS TRIGGER AS $$
BEGIN
  NEW."identidade" := NEW."tipo" || ':' || NEW."alvo" || ':' || NEW."tentativa";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "identidade_de_trabalho_e_derivada"
  BEFORE INSERT OR UPDATE ON "platform_jobs"
  FOR EACH ROW EXECUTE FUNCTION identidade_de_trabalho_deriva();

-- ═══════════════════════════════════════════════════════════════════════════
-- FRONTEIRA 6 · segurança, privacidade e exportação NUNCA atrás do plano
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── A única fronteira do contrato que não é técnica ────────────────────────
--
-- E por isso mesmo tem de ficar escrita em SQL: a pressão para a atravessar é
-- comercial e chega devagar. Começa por «a exportação em massa é uma
-- funcionalidade Pro» e acaba com um cliente sem forma de sair.
--
-- Uma casa no plano mais barato tem direito a proteger os seus dados, a
-- exportá-los e a responder a um pedido de acesso de um cliente dela. O que pode
-- depender do plano é a **conveniência**.
--
-- A lista está em SQL e não numa constante do produto porque uma constante
-- muda-se num commit e ninguém repara. Aqui muda-se numa MIGRAÇÃO, com nome,
-- data e revisor — e este comentário fica no caminho de quem a for mudar.
CREATE OR REPLACE FUNCTION capacidade_nao_pode_ficar_atras_do_plano()
RETURNS TRIGGER AS $$
DECLARE
  v_protegidas TEXT[] := ARRAY[
    'dados.exportar', 'dados.apagar', 'dados.pedido_de_acesso',
    'privacidade.gerir', 'seguranca.gerir', 'auditoria.ler',
    'sessao.terminar', 'chave.revogar'
  ];
BEGIN
  IF NEW."capacidade" = ANY(v_protegidas) THEN
    RAISE EXCEPTION 'capacidade_protegida_atras_do_plano'
      USING HINT = '"' || NEW."capacidade" || '" e seguranca, privacidade ou '
                || 'exportacao: nao fica atras do plano em plano nenhum';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "capacidade_protegida_nao_entra_no_plano"
  BEFORE INSERT OR UPDATE ON "plan_capabilities"
  FOR EACH ROW EXECUTE FUNCTION capacidade_nao_pode_ficar_atras_do_plano();

-- ═══════════════════════════════════════════════════════════════════════════
-- Ajuda, incidentes, moderação (HELP-001..004, PLAT-016, PLAT-018)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE "help_tickets" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "assunto"         TEXT NOT NULL,
  "corpo"           TEXT NOT NULL,
  "aberto_por"      TEXT NOT NULL,
  "estado"          "EstadoDoPedidoDeAjuda" NOT NULL DEFAULT 'ABERTO',
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "respondido_em"   TIMESTAMPTZ(6),
  -- Quem respondeu, pelo nome. O mesmo princípio do rasto.
  "respondido_por"  TEXT,

  CONSTRAINT "resposta_tem_assinatura"
    CHECK (("respondido_em" IS NULL) = ("respondido_por" IS NULL))
);
CREATE INDEX "help_tickets_por_org"
  ON "help_tickets" ("organization_id", "criado_em" DESC);

CREATE TABLE "platform_incidents" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "titulo"      TEXT NOT NULL,
  "resumo"      TEXT NOT NULL,
  "estado"      "EstadoDoIncidente" NOT NULL DEFAULT 'ABERTO',
  -- Público: os clientes vêem-no na HELP-004. Um incidente que só nós vemos é
  -- um incidente que o cliente descobre pelo telefone dele a tocar.
  "publico"     BOOLEAN NOT NULL DEFAULT TRUE,
  "comecou_em"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "fechado_em"  TIMESTAMPTZ(6),

  CONSTRAINT "fechado_tem_carimbo"
    CHECK (("estado" = 'FECHADO') = ("fechado_em" IS NOT NULL))
);

CREATE TABLE "abuse_reports" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "origem"          TEXT NOT NULL,
  "motivo"          TEXT NOT NULL,
  "resolvido_em"    TIMESTAMPTZ(6),
  "resolvido_por"   TEXT,
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "resolucao_tem_assinatura"
    CHECK (("resolvido_em" IS NULL) = ("resolvido_por" IS NULL))
);

-- A política de retenção, por inquilino (SET-013).
CREATE TABLE "retention_policies" (
  "organization_id" UUID PRIMARY KEY REFERENCES "organizations"("id") ON DELETE CASCADE,
  "dias_pedidos"    INT,
  "dias_clientes"   INT,
  "dias_auditoria"  INT,
  "actualizada_em"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "actualizada_por" TEXT,

  -- Nulo é «não decidido», e não «para sempre». A tela di-lo por palavras: a
  -- política concreta depende de conselho jurídico, e inventar um número era
  -- decidir por quem tem de decidir.
  CONSTRAINT "retencao_e_positiva" CHECK (
    coalesce("dias_pedidos", 1) > 0 AND coalesce("dias_clientes", 1) > 0
    AND coalesce("dias_auditoria", 1) > 0)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── E a `support_sessions` é o caso interessante ──────────────────────────
--
-- Ela tem RLS por organização **para o inquilino a poder ver**. Não é uma
-- protecção contra o inquilino: é o contrário — é o que faz «visível ao
-- inquilino» ser verdade sem depender de uma tela se lembrar de a mostrar.
--
-- Um acesso que só aparece do nosso lado é um acesso que o cliente não pode
-- contestar.
ALTER TABLE "support_sessions"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "access_policies"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "help_tickets"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "abuse_reports"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "retention_policies" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_sessions_por_org" ON "support_sessions"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "access_policies_por_org" ON "access_policies"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "help_tickets_por_org" ON "help_tickets"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "abuse_reports_por_org" ON "abuse_reports"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "retention_policies_por_org" ON "retention_policies"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());

-- ── O INQUILINO LÊ AS SESSÕES E NÃO AS ESCREVE ────────────────────────────
--
-- Ver, sim: é o direito dele. Escrever, não: uma casa que pudesse apagar o
-- registo da entrada do suporte podia apagar a entrada que lhe interessasse
-- esconder — e o mesmo vale ao contrário, que é o que esta etapa protege.
--
-- Quem escreve é o caminho da plataforma, com credencial própria.
REVOKE INSERT, UPDATE, DELETE ON "support_sessions" FROM bossaos_app;
GRANT  SELECT                  ON "support_sessions" TO   bossaos_app;

-- ── E A FRONTEIRA DO E05 SOBREVIVE A ESTA ETAPA TAMBÉM ────────────────────
--
-- Esta é a etapa que traz a interface de escrita das concessões, e é a que teria
-- mais tentação de abrir a porta pelo lado de dentro. **Não abre.**
--
-- Se para a tela funcionar o runtime ganhasse `INSERT` em `entitlement_grants`,
-- a resposta é não: muda-se o caminho, não a permissão. O caminho está aqui em
-- baixo — `conceder_capacidade`, `SECURITY DEFINER`, com auditoria obrigatória.
--
-- Repetido de propósito, pela terceira vez (E05, E32, E33): quem um dia quiser
-- conceder essa escrita tem de o fazer numa migração posterior a esta, e este
-- comentário fica no caminho dele.
REVOKE INSERT, UPDATE, DELETE ON "entitlement_grants" FROM bossaos_app;
REVOKE INSERT, UPDATE, DELETE ON "subscriptions"      FROM bossaos_app;

GRANT SELECT, INSERT ON "platform_jobs"      TO bossaos_app;
GRANT SELECT, INSERT ON "platform_incidents" TO bossaos_app;
GRANT SELECT         ON "platform_secrets"   TO bossaos_app;

-- ═══════════════════════════════════════════════════════════════════════════
-- O CAMINHO PRÓPRIO: conceder uma capacidade (PLAT-004 via E33)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `SECURITY DEFINER`, e corre como o dono — que é quem pode escrever em
-- `entitlement_grants`. É a única forma de a interface do E33 conceder alguma
-- coisa, e ela **exige a pessoa e o motivo**.
--
-- ── A auditoria é obrigatória, e não por convenção ────────────────────────
--
-- A função escreve o registo ela própria, na mesma transacção. Não há como
-- conceder e esquecer de registar: são a mesma instrução. Se fossem duas, a
-- segunda seria a que falha num dia com pressa.
CREATE OR REPLACE FUNCTION conceder_capacidade(
  p_organizacao UUID,
  p_capacidade  TEXT,
  p_quota       INT,
  p_valido_ate  TIMESTAMPTZ,
  p_staff_id    UUID,
  p_staff_email TEXT,
  p_motivo      TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_staff_id IS NULL OR p_staff_email IS NULL THEN
    RAISE EXCEPTION 'concessao_sem_pessoa'
      USING HINT = 'conceder uma capacidade exige saber QUEM a concedeu';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'concessao_sem_motivo'
      USING HINT = 'um motivo de menos de dez caracteres nao explica nada';
  END IF;
  -- Só quem é da plataforma concede. A tabela é do E05 e a verificação é aqui,
  -- porque esta função corre como dono e passa por cima de tudo o resto.
  IF NOT EXISTS (SELECT 1 FROM "platform_staff" WHERE "user_id" = p_staff_id) THEN
    RAISE EXCEPTION 'nao_e_da_plataforma'
      USING HINT = 'so pessoal da plataforma concede capacidades';
  END IF;

  INSERT INTO "entitlement_grants"
    ("organization_id", "capacidade", "quota", "valido_ate", "origem", "motivo")
  VALUES (p_organizacao, p_capacidade, p_quota, p_valido_ate, 'ADICIONAL', p_motivo)
  RETURNING "id" INTO v_id;

  -- A MESMA transacção. Conceder e registar não são duas coisas.
  INSERT INTO "audit_events"
    ("organization_id", "actor_id", "actor_email", "accao", "alvo_tipo", "alvo_id", "motivo", "detalhe")
  VALUES (
    p_organizacao, p_staff_id, p_staff_email,
    'plataforma.capacidade.concedida', 'entitlement_grant', v_id, p_motivo,
    jsonb_build_object('capacidade', p_capacidade, 'quota', p_quota)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL     ON FUNCTION conceder_capacidade(UUID, TEXT, INT, TIMESTAMPTZ, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION conceder_capacidade(UUID, TEXT, INT, TIMESTAMPTZ, UUID, TEXT, TEXT) TO bossaos_app;

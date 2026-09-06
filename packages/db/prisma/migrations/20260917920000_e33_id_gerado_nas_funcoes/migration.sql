-- E33 · as funções privilegiadas geram o `id` que o Prisma geraria
--
-- ── O defeito, e a razão pela qual ele só aparece aqui ────────────────────
--
-- `audit_events.id` e `entitlement_grants.id` **não têm valor por omissão na
-- base**. O `@default(uuid())` do Prisma é do lado do CLIENTE: quem escreve por
-- Prisma nunca dá por isso, porque ele preenche a coluna antes de enviar.
--
-- As funções desta etapa escrevem em SQL directo, e por isso são as primeiras a
-- encontrar a coluna a nu. `null value in column "id" violates not-null`.
--
-- A cura é gerar o identificador aqui. A alternativa — pôr
-- `DEFAULT gen_random_uuid()` nessas duas tabelas — mexia em duas tabelas com
-- vinte e oito etapas de idade para resolver um problema desta, e o risco não é
-- proporcional: uma migração que altera a `audit_events` toca no registo de
-- tudo o que já aconteceu.
--
-- Fica a OBSERVAÇÃO para o sénior: a diferença entre o que o schema declara e o
-- que a base garante é uma pegada de rato que só se vê quando alguém escreve
-- SQL directo. Há duas tabelas assim, e podem existir mais.
CREATE OR REPLACE FUNCTION conceder_capacidade(
  p_organizacao UUID, p_capacidade TEXT, p_quota INT, p_valido_ate TIMESTAMPTZ,
  p_staff_id UUID, p_staff_email TEXT, p_motivo TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
BEGIN
  IF p_staff_id IS NULL OR p_staff_email IS NULL THEN
    RAISE EXCEPTION 'concessao_sem_pessoa'
      USING HINT = 'conceder uma capacidade exige saber QUEM a concedeu';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'concessao_sem_motivo'
      USING HINT = 'um motivo de menos de dez caracteres nao explica nada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "platform_staff" WHERE "user_id" = p_staff_id) THEN
    RAISE EXCEPTION 'nao_e_da_plataforma'
      USING HINT = 'so pessoal da plataforma concede capacidades';
  END IF;

  INSERT INTO "entitlement_grants"
    ("id", "organization_id", "capacidade", "quota", "valido_ate", "origem", "motivo",
     "created_at", "updated_at")
  VALUES (v_id, p_organizacao, p_capacidade, p_quota, p_valido_ate, 'ADICIONAL',
          p_motivo, now(), now());

  INSERT INTO "audit_events"
    ("id", "organization_id", "actor_id", "actor_email", "accao", "alvo_tipo",
     "alvo_id", "motivo", "detalhe", "created_at")
  VALUES (gen_random_uuid(), p_organizacao, p_staff_id, p_staff_email,
          'plataforma.capacidade.concedida', 'entitlement_grant', v_id, p_motivo,
          jsonb_build_object('capacidade', p_capacidade, 'quota', p_quota), now());

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION abrir_sessao_de_suporte(
  p_organizacao UUID, p_staff_id UUID, p_staff_email TEXT, p_motivo TEXT,
  p_ambito "AmbitoDeSuporte"[], p_duracao_min INT, p_consentida_por TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id    UUID;
  v_agora TIMESTAMPTZ := now();
BEGIN
  IF p_staff_id IS NULL OR p_staff_email IS NULL THEN
    RAISE EXCEPTION 'sessao_sem_pessoa'
      USING HINT = 'uma sessao de suporte tem de dizer QUEM entrou';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "platform_staff" WHERE "user_id" = p_staff_id) THEN
    RAISE EXCEPTION 'nao_e_da_plataforma'
      USING HINT = 'so pessoal da plataforma abre sessoes de suporte';
  END IF;

  INSERT INTO "support_sessions" (
    "organization_id", "staff_user_id", "staff_email", "motivo", "ambito",
    "aberta_em", "expira_em", "consentida_por", "consentida_em")
  VALUES (
    p_organizacao, p_staff_id, p_staff_email, p_motivo, p_ambito,
    v_agora, v_agora + make_interval(mins => p_duracao_min),
    p_consentida_por,
    CASE WHEN p_consentida_por IS NULL THEN NULL ELSE v_agora END)
  RETURNING "id" INTO v_id;

  INSERT INTO "audit_events"
    ("id", "organization_id", "actor_id", "actor_email", "accao", "alvo_tipo",
     "alvo_id", "motivo", "created_at")
  VALUES (gen_random_uuid(), p_organizacao, p_staff_id, p_staff_email,
          'plataforma.suporte.entrou', 'support_session', v_id, p_motivo, now());

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION terminar_sessao_de_suporte(
  p_sessao UUID, p_motivo TEXT, p_staff_email TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org UUID;
  v_id  UUID;
BEGIN
  SELECT "organization_id", "staff_user_id" INTO v_org, v_id
    FROM "support_sessions" WHERE "id" = p_sessao AND "terminada_em" IS NULL;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE "support_sessions"
     SET "terminada_em" = now(), "terminada_motivo" = p_motivo
   WHERE "id" = p_sessao;

  INSERT INTO "audit_events"
    ("id", "organization_id", "actor_id", "actor_email", "accao", "alvo_tipo",
     "alvo_id", "motivo", "created_at")
  VALUES (gen_random_uuid(), v_org, v_id, p_staff_email,
          'plataforma.suporte.saiu', 'support_session', p_sessao, p_motivo, now());

  RETURN TRUE;
END;
$$;

-- E33 · o caminho próprio para abrir e fechar uma sessão de suporte
--
-- ── Porque é que isto existe, e o que ele prova ────────────────────────────
--
-- A migração anterior tirou ao runtime a escrita em `support_sessions`, e o
-- motor deixou de conseguir abrir sessões. **Isso não é um defeito: é a regra a
-- funcionar.** Quem escreve é o caminho da plataforma, com credencial própria.
--
-- A prova apanhou-o à primeira corrida, e é o mesmo desenho da
-- `conceder_capacidade`: `SECURITY DEFINER`, e a auditoria na MESMA instrução.
--
-- ── E a pessoa é obrigatória aqui, não só no gatilho ──────────────────────
--
-- O gatilho do rasto recusa uma acção da plataforma assinada por um papel. Isto
-- recusa-a mais cedo, e com uma mensagem que diz o que fazer. As duas verificam
-- a mesma coisa de propósito: a de baixo é a que garante, a de cima é a que
-- explica.
CREATE OR REPLACE FUNCTION abrir_sessao_de_suporte(
  p_organizacao   UUID,
  p_staff_id      UUID,
  p_staff_email   TEXT,
  p_motivo        TEXT,
  p_ambito        "AmbitoDeSuporte"[],
  p_duracao_min   INT,
  p_consentida_por TEXT
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

  -- A mesma transacção. Entrar numa casa e registar a entrada não são duas
  -- coisas — e a segunda seria a que falha num dia com pressa.
  INSERT INTO "audit_events"
    ("organization_id", "actor_id", "actor_email", "accao", "alvo_tipo", "alvo_id", "motivo")
  VALUES (p_organizacao, p_staff_id, p_staff_email,
          'plataforma.suporte.entrou', 'support_session', v_id, p_motivo);

  RETURN v_id;
END;
$$;

-- Fechar à mão. A expiração continua a valer sem isto — e é essa a diferença
-- entre uma sessão de suporte e uma chave que ficou com o canalizador.
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
    ("organization_id", "actor_id", "actor_email", "accao", "alvo_tipo", "alvo_id", "motivo")
  VALUES (v_org, v_id, p_staff_email,
          'plataforma.suporte.saiu', 'support_session', p_sessao, p_motivo);

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION abrir_sessao_de_suporte(UUID, UUID, TEXT, TEXT, "AmbitoDeSuporte"[], INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION abrir_sessao_de_suporte(UUID, UUID, TEXT, TEXT, "AmbitoDeSuporte"[], INT, TEXT) TO bossaos_app;
REVOKE ALL ON FUNCTION terminar_sessao_de_suporte(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION terminar_sessao_de_suporte(UUID, TEXT, TEXT) TO bossaos_app;

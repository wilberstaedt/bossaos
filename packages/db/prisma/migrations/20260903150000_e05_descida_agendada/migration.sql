-- Aplicar uma descida de plano JÁ AGENDADA, e nada mais do que isso.
--
-- ── Porque é que isto é uma função e não um UPDATE ──────────────────────────
--
-- A migração do E05 tirou ao runtime o INSERT, o UPDATE e o DELETE em
-- `subscriptions`: um catálogo comercial que o processo do restaurante reescreve
-- é um restaurante a dar-se um plano. Essa decisão mantém-se.
--
-- Só que a descida agendada TEM de ser efectivada por alguém, e quem a efectiva
-- é um trabalho de fundo — não uma pessoa da plataforma a carregar num botão à
-- meia-noite. Devolver o UPDATE ao runtime para isto seria trocar a fechadura
-- toda por causa de uma porta.
--
-- Isto é a porta: uma função que **não aceita o plano de destino como
-- argumento**. Ela só sabe mover a subscrição para o que a plataforma já
-- escreveu em `descer_para_plano_id`, e só depois de `descer_em` ter chegado.
-- Quem chamar isto mil vezes não consegue inventar um plano, antecipar uma data
-- nem subir de escalão.
--
-- E continua presa ao inquilino: `SECURITY DEFINER` corre como o dono das
-- tabelas, para quem a política de linha não se aplica — sem a verificação
-- abaixo, a organização A efectivava a descida da B. A verificação é a mesma
-- fonte de verdade do E03, `app_organizacao_actual()`.

CREATE OR REPLACE FUNCTION aplicar_descida_agendada(p_org uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- `search_path` fixo: sem isto, quem controlar o search_path da sessão põe uma
-- tabela `subscriptions` sua à frente da verdadeira. É a mesma precaução da
-- `identidade_por_email` do E03.
SET search_path = public, pg_temp
AS $$
DECLARE
  v_destino uuid;
  v_quando  timestamptz;
BEGIN
  IF p_org IS DISTINCT FROM app_organizacao_actual() THEN
    RAISE EXCEPTION 'descida fora do inquilino actual';
  END IF;

  SELECT descer_para_plano_id, descer_em
    INTO v_destino, v_quando
    FROM subscriptions
   WHERE organization_id = p_org;

  IF NOT FOUND                      THEN RETURN 'sem_subscricao'; END IF;
  IF v_destino IS NULL OR v_quando IS NULL THEN RETURN 'nada_agendado'; END IF;
  IF v_quando > now()               THEN RETURN 'ainda_nao';      END IF;

  UPDATE subscriptions
     SET plan_id               = v_destino,
         descer_para_plano_id  = NULL,
         descer_em             = NULL,
         updated_at            = now()
   WHERE organization_id = p_org;

  RETURN 'aplicada';
END;
$$;

-- O dono é quem migra. Executar é do runtime — é ele que corre o trabalho de
-- fundo — e de mais ninguém: a autenticação não tem nada que ver com planos.
REVOKE ALL     ON FUNCTION aplicar_descida_agendada(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION aplicar_descida_agendada(uuid) TO   bossaos_app;

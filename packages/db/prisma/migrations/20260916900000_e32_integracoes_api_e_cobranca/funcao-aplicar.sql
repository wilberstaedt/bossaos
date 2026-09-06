-- A funcao privilegiada, extraida da migracao para o guiao de controlos a
-- poder REPOR depois de a substituir por uma defeituosa.
--
-- Nao e uma copia a divergir: a migracao continua a ser a fonte, e este
-- ficheiro e o mesmo texto. Se um dia divergirem, o controlo 10 acusa — ele
-- verifica que a funcao reposta menciona `saas_customers`.

CREATE OR REPLACE FUNCTION aplicar_evento_de_cobranca(p_evento UUID)
RETURNS "EstadoDoEventoDeCobranca"
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_evento   "saas_billing_events"%ROWTYPE;
  v_org      UUID;
  v_plano    UUID;
  v_motivo   TEXT;
BEGIN
  SELECT * INTO v_evento FROM "saas_billing_events" WHERE "id" = p_evento;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'evento_desconhecido';
  END IF;
  IF v_evento."estado" <> 'RECEBIDO' THEN
    -- Já foi tratado. Reenviar é normal e não pode aplicar duas vezes.
    RETURN v_evento."estado";
  END IF;

  -- Uma assinatura que não confere não chega aqui, mas se chegar não passa.
  IF NOT v_evento."assinatura_confere" THEN
    UPDATE "saas_billing_events"
       SET "estado" = 'RECUSADO', "resolvido_em" = now(),
           "motivo" = 'assinatura nao confere'
     WHERE "id" = p_evento;
    RETURN 'RECUSADO';
  END IF;

  -- ── A LIGAÇÃO, e só a ligação ──────────────────────────────────────────
  SELECT "organization_id" INTO v_org
    FROM "saas_customers"
   WHERE "provedor" = v_evento."provedor"
     AND "provedor_cliente_id" = v_evento."provedor_cliente_id";

  IF v_org IS NULL THEN
    -- Não há ligação criada do nosso lado por alguém autenticado. Fica parado.
    -- **Não muda nada**, e diz-se porquê.
    UPDATE "saas_billing_events"
       SET "estado" = 'SEM_VINCULO', "resolvido_em" = now(),
           "motivo" = 'nao ha ligacao verificada para este cliente do provedor'
     WHERE "id" = p_evento;
    RETURN 'SEM_VINCULO';
  END IF;

  -- O corpo alegou outra organização? Isso não muda o resultado — muda o que
  -- fica escrito. Um evento que alegou o que não era é a assinatura de uma
  -- tentativa, e quem for ver daqui a um ano tem de a encontrar.
  IF v_evento."organization_id_alegado" IS NOT NULL
     AND v_evento."organization_id_alegado" <> v_org THEN
    v_motivo := 'o corpo alegou outra organizacao e foi ignorado';
  END IF;

  SELECT "id" INTO v_plano FROM "plan_definitions"
   WHERE "codigo" = v_evento."plano_codigo";

  IF v_plano IS NULL THEN
    -- Um plano que não conhecemos não se aproxima do mais parecido. Recusa-se,
    -- e fica escrito qual era — senão o defeito aparece como «o cliente ficou
    -- no plano errado» daqui a um mês, sem rasto de porquê.
    UPDATE "saas_billing_events"
       SET "estado" = 'RECUSADO', "resolvido_em" = now(),
           "motivo" = coalesce(v_motivo || '; ', '')
             || 'plano desconhecido: ' || coalesce(v_evento."plano_codigo", '(nenhum)')
     WHERE "id" = p_evento;
    RETURN 'RECUSADO';
  END IF;

  UPDATE "subscriptions"
     SET "plan_id" = v_plano, "estado" = 'ACTIVA', "updated_at" = now()
   WHERE "organization_id" = v_org;

  UPDATE "saas_billing_events"
     SET "estado" = 'APLICADO', "resolvido_em" = now(),
         "organization_id_resolvido" = v_org,
         "motivo" = v_motivo
   WHERE "id" = p_evento;

  RETURN 'APLICADO';
END;
$$;

-- Quem atende a porta pode mandar aplicar; o que ele **não** pode é escolher a
-- organização. A função é que decide, e decide pela ligação.
REVOKE ALL     ON FUNCTION aplicar_evento_de_cobranca(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION aplicar_evento_de_cobranca(UUID) TO bossaos_app;

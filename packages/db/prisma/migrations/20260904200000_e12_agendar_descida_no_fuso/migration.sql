-- ── Agendar uma descida NA DATA DO SÍTIO, e não à meia-noite de Greenwich ───
--
-- O `scripts/plataforma.mjs` escrevia `descer_em = new Date('2026-10-31')`. Em
-- JavaScript isso é **meia-noite UTC**, e a partir daí a data que a pessoa
-- escreveu deixa de ser a data em que a coisa acontece:
--
--   Europe/Madrid   (UTC+2)  → 31/10 às 02:00 locais. Tarde, mas no dia certo.
--   Pacific/Auckland(UTC+13) → 31/10 às 13:00 locais. A meio do serviço.
--   America/Los_Angeles(-7)  → **30/10 às 17:00** locais. **No dia anterior.**
--
-- A terceira é a que importa: o restaurante perde as cores um dia antes do que
-- lhe foi dito. É o defeito do E06 outra vez — dezanove asserções verdes sobre
-- um motor que ignorava o fuso da unidade — e desta vez apanhado antes de sair.
--
-- ── Porque é que a conversão vive em SQL e não em TypeScript ───────────────
--
-- Porque tem dois chamadores em runtimes diferentes: o script de plataforma
-- (Node, com `pg` directo) e, quando a E33 chegar, uma rota. Duas conversões dão
-- o mesmo resultado até ao dia em que uma delas mudar. O PostgreSQL faz
-- `AT TIME ZONE` com a base de fusos do sistema, incluindo mudanças de hora, e é
-- a mesma conta que a `momentoLocal` do domínio faz para MOSTRAR a data.
--
-- ── E a ausência de fuso NÃO vira UTC ─────────────────────────────────────
--
-- `locations.fuso` é anulável. Uma unidade sem fuso não tem "a data em que isto
-- acontece", e escolher UTC por ela seria política inventada — a mesma regra dos
-- alergénios e do DNS. Devolve `sem_fuso` e não escreve nada.
CREATE OR REPLACE FUNCTION agendar_descida(
  p_organization_id uuid,
  p_codigo          text,
  p_data            date,
  p_location_id     uuid
) RETURNS text
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_fuso    text;
  v_plano   uuid;
  v_quando  timestamptz;
  v_linhas  integer;
BEGIN
  SELECT l.fuso INTO v_fuso
    FROM public.locations l
   WHERE l.id = p_location_id
     AND l.organization_id = p_organization_id
     AND l.archived_at IS NULL;

  -- Unidade de outra organização e unidade inexistente saem iguais. Dizer
  -- "existe mas não é tua" é confirmar que existe.
  IF NOT FOUND THEN RETURN 'unidade_desconhecida'; END IF;
  IF v_fuso IS NULL OR v_fuso = '' THEN RETURN 'sem_fuso'; END IF;

  SELECT id INTO v_plano FROM public.plan_definitions WHERE codigo = p_codigo;
  IF NOT FOUND THEN RETURN 'plano_desconhecido'; END IF;

  -- A meia-noite local do dia escrito, convertida para instante pelo fuso da
  -- unidade. `timestamp AT TIME ZONE <zona>` lê a hora de parede naquela zona e
  -- devolve o instante — que é exactamente o inverso do que a leitura faz.
  v_quando := (p_data::timestamp) AT TIME ZONE v_fuso;

  UPDATE public.subscriptions
     SET descer_para_plano_id = v_plano,
         descer_em            = v_quando,
         updated_at           = now()
   WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_linhas = ROW_COUNT;
  IF v_linhas = 0 THEN RETURN 'sem_subscricao'; END IF;

  RETURN 'agendada';
END;
$$;

-- O runtime não tem `UPDATE` em `subscriptions` — é a decisão do E05 e continua
-- inteira: um restaurante que se pudesse dar um plano não tem plano nenhum. Esta
-- função não abre excepção nenhuma (não é `SECURITY DEFINER`): quem a chamar sem
-- privilégio de escrita continua a levar com a recusa do PostgreSQL.
REVOKE ALL ON FUNCTION agendar_descida(uuid, text, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION agendar_descida(uuid, text, date, uuid) TO bossaos_migrate;

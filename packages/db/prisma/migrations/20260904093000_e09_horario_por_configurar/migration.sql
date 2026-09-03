-- ── "Por configurar" é uma resposta, e a função perdia-a ────────────────────
--
-- A primeira versão de `publico_horario` fazia `JOIN schedule_days`. Uma unidade
-- que existe e **não tem um único dia configurado** devolvia zero linhas — o
-- mesmo que um endereço que não existe.
--
-- É a distinção do E06 a desaparecer numa camada nova: lá, um dia sem linha é
-- `por_configurar` e não `fechado`, precisamente porque um sistema booleano
-- obriga quem lê a escolher entre duas mentiras. Aqui, colapsar "não há unidade"
-- com "a unidade não configurou" faz o ecrã público não conseguir dizer qual das
-- duas é.
--
-- Com `LEFT JOIN` a partir de `locations`, uma unidade existente devolve sempre
-- pelo menos uma linha — com `dia` nulo quando não há nada. `null` volta a
-- significar só uma coisa: não há unidade neste endereço.
CREATE OR REPLACE FUNCTION publico_horario(p_slug text)
RETURNS TABLE (
  dia integer,
  fechado boolean,
  inicio_min integer,
  fim_min integer,
  fuso text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT d.dia, d.fechado, i.inicio_min, i.fim_min, l.fuso
  FROM locations l
  LEFT JOIN schedule_days d ON d.organization_id = l.organization_id AND d.location_id = l.id
  LEFT JOIN schedule_intervals i ON i.organization_id = d.organization_id AND i.dia_id = d.id
  WHERE l.public_slug = p_slug AND l.archived_at IS NULL
  ORDER BY d.dia, i.inicio_min
$$;

REVOKE ALL ON FUNCTION publico_horario(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publico_horario(text) TO bossaos_app;

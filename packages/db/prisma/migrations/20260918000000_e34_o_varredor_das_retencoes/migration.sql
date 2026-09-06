-- E34 · o varredor das retenções ganha quem o chame
--
-- ── A função existia e ninguém a corria ───────────────────────────────────
--
-- A `varrerRetencoesExpiradas` estava escrita, exportada, com um teste — e com
-- **zero chamadas no produto**. Falta a linha, não falta o worker: o
-- `apps/worker/src/index.ts` já é um ciclo que varre e já corre o
-- `varrerDescidas`.
--
-- ── E o risco é baixo porque a própria função o diz ───────────────────────
--
-- A documentação dela distingue **higiene de correcção**: a capacidade já fica
-- livre sem ela, porque a `ocupacaoNoIntervalo` compara `oferta_expira_em` com
-- `now()` e não conta as expiradas. O que ela evita é a lista de espera encher-se
-- de ofertas mortas no ecrã de quem trabalha a sala. Quem a escreveu previu a
-- pergunta e deixou lá a razão de a correcção não depender dela — e é por isso
-- que ligá-la é seguro em vez de ser um palpite.
--
-- ── Enumerar sem entrar em casa nenhuma ───────────────────────────────────
--
-- Mesma forma do `descidas_devidas()`: o worker precisa de saber ONDE há
-- trabalho sem estar dentro de um inquilino, e a função **recusa-se a responder
-- de dentro de um** — é isso que impede um restaurante de perguntar quem mais
-- tem ofertas por expirar.
--
-- E devolve só as unidades que TÊM ofertas expiradas: num ciclo em que não há
-- nada a fazer, o varredor não abre transacção nenhuma.
CREATE OR REPLACE FUNCTION unidades_com_retencoes_expiradas()
RETURNS TABLE (organization_id uuid, location_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF app_organizacao_actual() IS NOT NULL THEN
    RAISE EXCEPTION 'o varrimento de retenções não se faz de dentro de um inquilino';
  END IF;

  RETURN QUERY
    SELECT DISTINCT w."organization_id", w."location_id"
      FROM "waitlist_entries" w
     WHERE w."estado" = 'COM_OFERTA'
       AND w."oferta_expira_em" < now()
     ORDER BY w."organization_id", w."location_id";
END;
$$;

REVOKE ALL     ON FUNCTION unidades_com_retencoes_expiradas() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION unidades_com_retencoes_expiradas() TO   bossaos_app;

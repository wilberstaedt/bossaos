-- Quais organizações têm uma descida devida.
--
-- O trabalho de fundo tem de saber a quem aplicar, e essa pergunta atravessa
-- inquilinos — é exactamente a pergunta que o E03 existe para recusar. Por isso
-- não se abre a tabela: abre-se uma porta com uma condição que uma rota de
-- inquilino nunca satisfaz.
--
-- **A função só responde quando NÃO há contexto de inquilino.** Um pedido web
-- passa sempre por `comEscopo`, que define `app.organization_id` na transacção;
-- um varrimento de fundo corre fora dele. Se alguém chamar isto de dentro de um
-- pedido de inquilino, rebenta — e o inquilino que perguntasse "quem mais está a
-- descer de plano" recebia um erro em vez de uma lista.
--
-- Devolve só identificadores, e só de quem já passou da data. Nem nomes, nem
-- planos, nem quantos são no total.

CREATE OR REPLACE FUNCTION descidas_devidas()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF app_organizacao_actual() IS NOT NULL THEN
    RAISE EXCEPTION 'o varrimento de descidas não se faz de dentro de um inquilino';
  END IF;

  RETURN QUERY
    SELECT organization_id
      FROM subscriptions
     WHERE descer_para_plano_id IS NOT NULL
       AND descer_em IS NOT NULL
       AND descer_em <= now()
     ORDER BY descer_em;
END;
$$;

REVOKE ALL     ON FUNCTION descidas_devidas() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION descidas_devidas() TO   bossaos_app;

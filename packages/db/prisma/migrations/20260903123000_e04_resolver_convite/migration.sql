-- Resolver um convite ANTES de haver contexto de inquilino.
--
-- O problema: `invitations` tem política de linha por organização, e quem chega
-- com um convite ainda não pertence a organização nenhuma. Sem contexto, a
-- política nega — e nega bem.
--
-- A saída é a mesma que o E03 usou para a identidade: uma interface **mínima**,
-- `SECURITY DEFINER`, que devolve **só o identificador da organização**. Nem o
-- papel, nem o email, nem se o convite ainda é válido. Com esse identificador
-- abre-se a transacção com escopo, e aí dentro tudo o resto é lido pela via
-- normal, com a política activa.
--
-- Devolver só o `organization_id` é o que impede esta função de ser uma segunda
-- porta para a tabela: quem tiver um token descobre a que organização ele
-- pertence, o que é o mínimo indispensável para poder continuar — e já sabia,
-- porque estava escrito no email que recebeu.
--
-- `search_path` fixo porque é isso que impede alguém de redefinir `invitations`
-- num esquema seu e sequestrar a função.
CREATE FUNCTION organizacao_do_convite(p_token_hash text) RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = pg_catalog, public
  AS $$ SELECT organization_id FROM public.invitations WHERE token_hash = p_token_hash $$;

REVOKE ALL ON FUNCTION organizacao_do_convite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizacao_do_convite(text) TO bossaos_app;

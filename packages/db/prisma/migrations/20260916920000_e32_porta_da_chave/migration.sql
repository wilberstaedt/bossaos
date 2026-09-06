-- E32 · a porta estreita que resolve o inquilino de uma chave de API
--
-- ── O defeito, e quem o apanhou ────────────────────────────────────────────
--
-- A `autorizarChave` lia a `api_keys` pelo resumo, sem inquilino definido, para
-- descobrir **qual** é o inquilino. Não podia funcionar: a `api_keys` tem RLS
-- por organização, e sem `app.organization_id` a política não devolve linha
-- nenhuma. A chave certa dava 401.
--
-- Não apareceu nas provas de base porque lá o cliente é o dono da tabela e passa
-- por cima da política. Apareceu na prova de NAVEGADOR, com a credencial de
-- runtime a sério — **terceira vez nesta sessão que o navegador vê o que o motor
-- não vê**, depois da carta vazia do kiosk e das chaves em claro.
--
-- ── O que ela devolve, e o que não devolve ────────────────────────────────
--
-- Só o identificador da organização. Nem o resumo, nem os âmbitos, nem o prazo,
-- nem sequer o id da chave: quem chama ainda não provou nada, e o que sai daqui
-- é o mínimo para se poder abrir escopo e fazer a verificação a sério lá dentro.
--
-- É a mesma forma do `resolver_convite` do E04 — que devolve **só** o
-- identificador da organização — e pela mesma razão.
--
-- E não responde por chaves revogadas nem expiradas. A verificação séria é a do
-- motor, dentro do escopo; isto é uma segunda tranca, e existe porque uma chave
-- revogada não deve nem chegar a revelar a que organização pertenceu.
CREATE OR REPLACE FUNCTION organizacao_da_chave(p_resumo TEXT)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "organization_id" FROM "api_keys"
   WHERE "resumo" = p_resumo
     AND "revogada_em" IS NULL
     AND "expira_em" > now();
$$;

REVOKE ALL     ON FUNCTION organizacao_da_chave(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION organizacao_da_chave(TEXT) TO bossaos_app;

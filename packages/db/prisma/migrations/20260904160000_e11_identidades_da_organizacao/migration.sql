-- ═══════════════════════════════════════════════════════════════════════════
-- Correcção 5 do marco E11 — a tela de equipa devolvia 500, e NUNCA funcionou.
--
-- ── O defeito, e porque é que a base estava certa ─────────────────────────
--
-- `ORG-007` lia `users` pelo cliente do RUNTIME, e o runtime não pode ler
-- `users`. Isso não é defeito da base: é a separação de credenciais do E04, e é
-- a razão de o processo que serve o catálogo de um restaurante não conseguir ler
-- a sessão de ninguém. A junção devolvia nulos e `p.user.nome` rebentava.
--
-- O revisor confirmou a causa raiz sem aceitar declaração: a credencial de
-- execução devolve **0 linhas** de `users`, a de migração devolve 18.
--
-- ── A correcção que NÃO se pode fazer ─────────────────────────────────────
--
-- Dar `SELECT` em `users` ao runtime consertaria o ecrã hoje e trocaria um ecrã
-- partido por um buraco de segurança: uma injecção bem-sucedida numa rota
-- qualquer passaria a ler a identidade de toda a gente, de todos os inquilinos.
-- O revisor escreveu-o na correcção e é a metade que interessa.
--
-- ── A porta, e porque é que ela VERIFICA QUEM CHAMA ───────────────────────
--
-- Espelha a `identidade_por_email` do E03: uma interface mínima, `SECURITY
-- DEFINER`, com `search_path` fixo. Mas há uma diferença que obriga a mais.
--
-- Aquela devolve **só um id** — nem nome, nem data, nem a existência de outra
-- linha. Esta devolve nome e email, e por isso não pode aceitar a organização
-- que lhe passarem: sem verificação, qualquer rota do runtime enumerava a equipa
-- de qualquer inquilino, e o `SECURITY DEFINER` passava por cima do RLS a fazê-lo.
--
-- Por isso a função confirma que a organização pedida é a **do contexto da
-- sessão**. É o mesmo desenho das funções de plataforma do E05, que verificam
-- elas próprias quem as chama em vez de confiar em quem lhes liga. E falha
-- fechada: sem contexto, `app_organizacao_actual()` é `NULL`, a comparação dá
-- `NULL`, e não sai uma linha.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION identidades_da_organizacao(p_organization_id uuid)
RETURNS TABLE (id uuid, email text, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT u.id, u.email, u.nome
    FROM public.users u
   WHERE p_organization_id = public.app_organizacao_actual()
     AND EXISTS (
       SELECT 1 FROM public.memberships m
        WHERE m.user_id = u.id
          AND m.organization_id = p_organization_id)
$$;

REVOKE ALL ON FUNCTION identidades_da_organizacao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identidades_da_organizacao(uuid) TO bossaos_app;

-- E o papel de autenticação continua de fora: ele vê identidades pela sua
-- própria credencial e não tem nada que ver pertenças de inquilino.
REVOKE ALL ON FUNCTION identidades_da_organizacao(uuid) FROM bossaos_auth;

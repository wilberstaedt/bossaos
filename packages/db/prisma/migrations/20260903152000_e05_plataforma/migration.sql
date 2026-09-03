-- A superfície interna de plataforma (PLAT-002, 003, 004, 006, 010, 011).
--
-- ── O problema, dito antes da solução ──────────────────────────────────────
--
-- Esta superfície tem de ler ATRAVÉS de inquilinos: uma lista de organizações é
-- literalmente a pergunta que o E03 existe para recusar. Há três formas de a
-- responder e duas são más:
--
--   1. desligar a política de linha para quem é da plataforma — que é dar uma
--      chave mestra a um processo que também serve pedidos de restaurantes;
--   2. um quinto papel de base de dados — o CT-04 separa quatro acessos, e
--      acrescentar um quinto por causa de seis ecrãs internos é mudar o
--      contrato para acomodar uma tela;
--   3. portas estreitas: funções `SECURITY DEFINER` que devolvem exactamente o
--      que cada ecrã mostra, e que verificam elas próprias quem chama.
--
-- É a terceira, e é o mesmo padrão do `identidade_por_email` do E03.

CREATE TABLE "platform_staff" (
  "user_id"    uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "motivo"     text        NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- **Só quem migra escreve aqui.** É a mesma decisão do catálogo de planos, pela
-- mesma razão: uma tabela de "quem é da plataforma" que o processo do
-- restaurante pode escrever é um restaurante a dar-se acesso à plataforma. Nem
-- sequer se dá SELECT — o runtime nunca precisa de a ler directamente, só
-- através das funções abaixo, que a consultam por ele.
REVOKE ALL ON "platform_staff" FROM bossaos_app;
REVOKE ALL ON "platform_staff" FROM bossaos_auth;

-- Quem chama é da plataforma?
--
-- Lê `app_utilizador_actual()`, o mesmo GUC do E03. Sem sessão devolve falso —
-- `current_setting(..., true)` dá NULL e NULL não está em tabela nenhuma.
CREATE OR REPLACE FUNCTION plataforma_e_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM platform_staff WHERE user_id = app_utilizador_actual());
$$;

REVOKE ALL     ON FUNCTION plataforma_e_staff() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION plataforma_e_staff() TO   bossaos_app;

-- PLAT-002 · a lista de organizações.
--
-- Cada função verifica por si. Verificar só na rota deixaria a porta destrancada
-- para a próxima rota que se esquecesse — e "esquecer-se de verificar" foi
-- exactamente o defeito da flag que esta etapa apanhou.
CREATE OR REPLACE FUNCTION plataforma_organizacoes()
RETURNS TABLE (id uuid, slug text, nome text, plano text, estado text, unidades bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT plataforma_e_staff() THEN
    RAISE EXCEPTION 'sem acesso à plataforma';
  END IF;
  RETURN QUERY
    SELECT o.id, o.slug, o.nome,
           p.codigo,
           COALESCE(s.estado::text, 'SEM_PLANO'),
           (SELECT count(*) FROM locations l WHERE l.organization_id = o.id AND l.archived_at IS NULL)
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plan_definitions p ON p.id = s.plan_id
     WHERE o.archived_at IS NULL
     ORDER BY o.nome;
END;
$$;

-- PLAT-003 · o detalhe de uma organização.
CREATE OR REPLACE FUNCTION plataforma_organizacao(p_org uuid)
RETURNS TABLE (
  id uuid, slug text, nome text, plano text, estado text,
  unidades bigint, utilizadores bigint, descer_para text, descer_em timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT plataforma_e_staff() THEN
    RAISE EXCEPTION 'sem acesso à plataforma';
  END IF;
  RETURN QUERY
    SELECT o.id, o.slug, o.nome, p.codigo, COALESCE(s.estado::text, 'SEM_PLANO'),
           (SELECT count(*) FROM locations l WHERE l.organization_id = o.id AND l.archived_at IS NULL),
           (SELECT count(*) FROM memberships mm WHERE mm.organization_id = o.id AND mm.estado = 'ACTIVO'),
           d.codigo, s.descer_em
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plan_definitions p ON p.id = s.plan_id
      LEFT JOIN plan_definitions d ON d.id = s.descer_para_plano_id
     WHERE o.id = p_org AND o.archived_at IS NULL;
END;
$$;

-- PLAT-004 · as concessões de uma organização.
CREATE OR REPLACE FUNCTION plataforma_concessoes(p_org uuid)
RETURNS TABLE (capacidade text, quota int, origem text, valido_ate timestamptz, motivo text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT plataforma_e_staff() THEN
    RAISE EXCEPTION 'sem acesso à plataforma';
  END IF;
  RETURN QUERY
    SELECT g.capacidade, g.quota, g.origem::text, g.valido_ate, g.motivo
      FROM entitlement_grants g
     WHERE g.organization_id = p_org
     ORDER BY g.capacidade;
END;
$$;

-- PLAT-010 · as flags de lançamento.
CREATE OR REPLACE FUNCTION plataforma_flags()
RETURNS TABLE (nome text, organization_id uuid, organizacao text, ligada boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT plataforma_e_staff() THEN
    RAISE EXCEPTION 'sem acesso à plataforma';
  END IF;
  RETURN QUERY
    SELECT f.nome, f.organization_id, o.nome, f.ligada
      FROM feature_flags f
      LEFT JOIN organizations o ON o.id = f.organization_id
     ORDER BY f.nome, o.nome NULLS FIRST;
END;
$$;

REVOKE ALL     ON FUNCTION plataforma_organizacoes()      FROM PUBLIC;
REVOKE ALL     ON FUNCTION plataforma_organizacao(uuid)   FROM PUBLIC;
REVOKE ALL     ON FUNCTION plataforma_concessoes(uuid)    FROM PUBLIC;
REVOKE ALL     ON FUNCTION plataforma_flags()             FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION plataforma_organizacoes()      TO bossaos_app;
GRANT  EXECUTE ON FUNCTION plataforma_organizacao(uuid)   TO bossaos_app;
GRANT  EXECUTE ON FUNCTION plataforma_concessoes(uuid)    TO bossaos_app;
GRANT  EXECUTE ON FUNCTION plataforma_flags()             TO bossaos_app;

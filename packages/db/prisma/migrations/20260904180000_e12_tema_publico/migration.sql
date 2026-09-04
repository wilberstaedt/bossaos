-- ═══════════════════════════════════════════════════════════════════════════
-- E12 — o tema tem de CHEGAR à rota pública.
--
-- ── O aceite 1, e a palavra que o carrega ─────────────────────────────────
--
-- A régua diz «estados reais e o tema **efectivamente** aplicado», e diz como
-- vai ser atacado: guardar uma cor, ir à rota pública, e ler a cor que o
-- navegador **calcula** — não a que o CSS declara.
--
-- Hoje nenhuma rota pública aplica tema nenhum. O `temaActivo` existe desde o
-- E05 e lê-se com o cliente com escopo; uma rota pública não tem sessão, logo
-- não tem `app.organization_id`, logo a política de linha nega — e nega bem.
--
-- É o mesmo problema que a carta teve no E09, e leva a mesma solução: uma porta
-- estreita que abre **uma pergunta**, e não um privilégio.
--
-- ── O que esta porta NÃO faz ──────────────────────────────────────────────
--
-- Não aceita um identificador de organização: recebe o endereço público, que é
-- o que o visitante escreveu. Não devolve o histórico de revisões, nem quem as
-- criou, nem as inactivas. Devolve as três cores em vigor e a revisão de onde
-- vieram — porque a régua reprova «tema aplicado sem dizer de que revisão veio».
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION publico_tema(p_slug text)
RETURNS TABLE (primaria text, acento text, fundo text, padrao boolean, revisao_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
  SELECT t.primaria, t.acento, t.fundo, t.padrao, t.id
    FROM public.locations l
    JOIN public.theme_revisions t
      ON t.organization_id = l.organization_id AND t.activa = true
   WHERE l.public_slug = p_slug
     AND l.archived_at IS NULL
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION publico_tema(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publico_tema(text) TO bossaos_app;
REVOKE ALL ON FUNCTION publico_tema(text) FROM bossaos_auth;

-- ── A porta pública servia o menu de OUTRA unidade ─────────────────────────
--
-- `publico_carta` juntava `menus` pela MARCA e ignorava `menus.location_id` — a
-- coluna que existe desde o E07 precisamente para dizer "este menu é só desta
-- unidade". Uma cadeia com duas unidades e um menu próprio em cada servia, no
-- endereço público de uma, o menu da outra: `ORDER BY publicada_em DESC LIMIT 1`
-- escolhia o que tivesse sido publicado por último.
--
-- Apareceu a correr, e por um caminho lateral: a semeadura do arnês do navegador
-- publicou um segundo menu na mesma marca e a prova do E09 ficou vermelha num
-- caso que não tinha nada que ver com ela. O sintoma foi uma prova a falhar por
-- outro motivo — que é o que o guarda existe para dizer.
--
-- A regra é a do E07: menu sem unidade é da marca inteira; menu com unidade é só
-- dela. Aqui isso passa a estar escrito.
CREATE OR REPLACE FUNCTION publico_carta(p_slug text, p_canal "Canal")
RETURNS TABLE (
  organization_id uuid, location_id uuid, location_nome text, marca_nome text,
  fuso text, moeda text, revision_id uuid, revision_numero integer,
  conteudo jsonb, publicada_em timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    l.organization_id, l.id, l.nome, b.nome, l.fuso, l.moeda,
    r.id, r.numero, r.conteudo, p.publicada_em
  FROM locations l
  JOIN brands b ON b.organization_id = l.organization_id AND b.id = l.brand_id
  JOIN menus m ON m.organization_id = l.organization_id
              AND m.brand_id = l.brand_id
              AND m.archived_at IS NULL
              -- Menu da marca serve todas as unidades; menu de uma unidade serve
              -- só essa. É a decisão do CAT-002, agora respeitada aqui.
              AND (m.location_id IS NULL OR m.location_id = l.id)
  JOIN menu_publications p ON p.organization_id = m.organization_id
                          AND p.menu_id = m.id
                          AND p.canal = p_canal
  JOIN menu_revisions r ON r.organization_id = p.organization_id AND r.id = p.revision_id
  WHERE l.public_slug = p_slug
    AND l.archived_at IS NULL
    AND p.agendada_para IS NULL
  ORDER BY p.publicada_em DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION publico_carta(text, "Canal") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publico_carta(text, "Canal") TO bossaos_app;

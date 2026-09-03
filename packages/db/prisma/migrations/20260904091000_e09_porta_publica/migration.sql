-- ═══════════════════════════════════════════════════════════════════════════
-- A quarta porta do CT-04: leitura PÚBLICA do que está publicado.
--
-- Ficou por fazer no E07 e no E08, e é aqui que tem de existir: um pedido da
-- carta pública não tem sessão, logo não tem `app.organization_id`, logo a
-- política de linha nega tudo — e nega bem.
--
-- ── Porque uma função e não uma política de leitura pública ────────────────
--
-- Uma política `USING (true)` em `menu_publications` abria a tabela inteira a
-- quem tivesse a credencial do runtime. Uma função `SECURITY DEFINER` abre
-- **uma pergunta**: "o que está publicado neste endereço público, neste canal".
-- Não devolve rascunhos, não devolve outros canais, e não aceita um
-- identificador de organização — recebe o slug público, que é o que o mundo
-- conhece.
--
-- É o mesmo padrão das portas estreitas do E05 (`plataforma_*`), pela mesma
-- razão: alargar privilégios resolve o pedido de hoje e deixa a porta aberta.

CREATE OR REPLACE FUNCTION publico_carta(p_slug text, p_canal "Canal")
RETURNS TABLE (
  organization_id uuid,
  location_id uuid,
  location_nome text,
  marca_nome text,
  fuso text,
  moeda text,
  revision_id uuid,
  revision_numero integer,
  conteudo jsonb,
  publicada_em timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    l.organization_id, l.id, l.nome, b.nome, l.fuso, l.moeda,
    r.id, r.numero, r.conteudo, p.publicada_em
  FROM locations l
  JOIN brands b ON b.organization_id = l.organization_id AND b.id = l.brand_id
  JOIN menus m ON m.organization_id = l.organization_id
              AND m.brand_id = l.brand_id
              AND m.archived_at IS NULL
  JOIN menu_publications p ON p.organization_id = m.organization_id
                          AND p.menu_id = m.id
                          AND p.canal = p_canal
  JOIN menu_revisions r ON r.organization_id = p.organization_id AND r.id = p.revision_id
  WHERE l.public_slug = p_slug
    AND l.archived_at IS NULL
    -- Só o que está PUBLICADO. Um menu em rascunho não tem linha em
    -- `menu_publications`, e por isso nunca chega aqui.
    AND p.agendada_para IS NULL
  ORDER BY p.publicada_em DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION publico_carta(text, "Canal") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publico_carta(text, "Canal") TO bossaos_app;

-- ── Os horários da unidade, para o "fora de horas" ─────────────────────────
--
-- Mesma porta estreita: devolve os dias e os intervalos daquela unidade e mais
-- nada. O fuso vem junto de propósito — a régua nomeia o caso do E06 em que 19
-- asserções estavam verdes sobre um motor que ignorava o fuso, e uma função que
-- devolvesse horas sem o fuso convidava ao mesmo erro.
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
  JOIN schedule_days d ON d.organization_id = l.organization_id AND d.location_id = l.id
  LEFT JOIN schedule_intervals i ON i.organization_id = d.organization_id AND i.dia_id = d.id
  WHERE l.public_slug = p_slug AND l.archived_at IS NULL
  ORDER BY d.dia, i.inicio_min
$$;

REVOKE ALL ON FUNCTION publico_horario(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publico_horario(text) TO bossaos_app;

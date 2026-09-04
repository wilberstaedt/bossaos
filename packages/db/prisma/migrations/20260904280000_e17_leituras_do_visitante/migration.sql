-- ── E17 · as LEITURAS do visitante, pela porta ─────────────────────────────
--
-- A guarda `rotas-com-porta.test.ts` do E09 apanhou-me, e tinha razão: quatro
-- telas do visitante e a porta chegavam à base com `comEscopo` — consultas de
-- inquilino escritas numa página servida a partir de um endereço que vai
-- impresso num autocolante.
--
-- A regra do E09 foi escrita quando **tudo** debaixo de `/r/` era anónimo. O E17
-- traz um visitante com credencial, e a tentação era alargar a guarda para o
-- deixar passar. Alargar uma guarda para caber no que se escreveu é como se
-- desligam guardas.
--
-- A saída é a que o projecto usa desde o E09: **a leitura vive numa porta**. E o
-- ganho não é só passar a guarda — é que «a mesa 5 não vê a mesa 4» passa a estar
-- escrito em SQL, e não num filtro que a próxima página pode esquecer.

-- ── O que esta mesa pediu ─────────────────────────────────────────────────
--
-- Uma linha por LINHA de pedido, com os campos do pedido repetidos. Quem chama
-- agrupa. A alternativa — duas portas, uma de pedidos e outra de linhas — deixava
-- a segunda a aceitar um `order_id`, e aí o filtro da mesa voltava a ser
-- responsabilidade de quem chama.
CREATE OR REPLACE FUNCTION visitante_ve_pedidos(p_token_hash text)
RETURNS TABLE (
  order_id uuid, numero text, canal "Canal", criado_em timestamptz,
  linha_id uuid, nome text, quantidade integer,
  preco_menor integer, moeda char(3),
  linha_estado "EstadoDeLinha", motivo_rejeicao "MotivoDeRejeicao", linha_pai_id uuid
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT o.id, o.numero, o.canal, o.created_at,
         l.id, l.nome, l.quantidade, l.preco_menor, l.moeda,
         l.estado, l.motivo_rejeicao, l.linha_pai_id
  FROM visitante_activo(p_token_hash) a
  -- O filtro é a SESSÃO DE MESA da credencial, e não um identificador que
  -- alguém tenha passado. É isto que faz o convidado da mesa 5 não ver a 4.
  JOIN orders o ON o.organization_id = a.organization_id
               AND o.table_session_id = a.table_session_id
  LEFT JOIN order_lines l ON l.organization_id = o.organization_id AND l.order_id = o.id
  ORDER BY o.created_at DESC, l.created_at ASC
$$;

REVOKE ALL ON FUNCTION visitante_ve_pedidos(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION visitante_ve_pedidos(text) TO bossaos_app;

-- ── E como vai a produção ─────────────────────────────────────────────────
--
-- Só o estado de cada tarefa, sem estação e sem quem a faz: o cliente não tem
-- nada que saber que a batata está na fritadeira e quem lá está. O que ele
-- precisa é da contagem — `2/3` — e essa deriva daqui.
CREATE OR REPLACE FUNCTION visitante_ve_producao(p_token_hash text)
RETURNS TABLE (order_id uuid, estado "EstadoDaProducao")
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT t.order_id, t.estado
  FROM visitante_activo(p_token_hash) a
  JOIN orders o ON o.organization_id = a.organization_id
               AND o.table_session_id = a.table_session_id
  JOIN production_tasks t ON t.organization_id = o.organization_id AND t.order_id = o.id
$$;

REVOKE ALL ON FUNCTION visitante_ve_producao(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION visitante_ve_producao(text) TO bossaos_app;

-- ── E o sinal de vida ─────────────────────────────────────────────────────
--
-- `visitanteFalou` escrevia com o cliente do runtime **sem escopo de inquilino**.
-- A política de linha recusava a escrita e a função devolvia `count: 0` — sem
-- erro, sem sintoma, e o QR-006 mostrava «nunca pediu nada» sobre alguém que
-- tinha acabado de pedir.
--
-- É o mesmo modo de falha do ORG-007: não estoira, mente.
CREATE OR REPLACE FUNCTION visitante_falou(p_token_hash text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE guest_sessions g SET ultima_vez_em = now(), updated_at = now()
  FROM visitante_activo(p_token_hash) a
  WHERE g.id = a.guest_id
$$;

REVOKE ALL ON FUNCTION visitante_falou(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION visitante_falou(text) TO bossaos_app;

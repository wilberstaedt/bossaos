-- E34 · o rasto do suporte não se separa da leitura
--
-- ── O buraco, e está na metade que a J15 existe para provar ────────────────
--
-- A primeira versão do `suporte_le_pedido` juntava a sessão **só** na CTE que
-- escreve o rasto, e prendia as duas metades com
-- `WHERE (SELECT count(*) FROM rasto) >= 0`. **Zero é maior ou igual a zero.**
--
-- Com um `p_sessao` que não casa com sessão nenhuma, o `INSERT` insere zero
-- linhas, a condição continua verdadeira, e **a leitura devolve os dados sem
-- deixar rasto**. Reproduzido numa réplica com a mesma composição, dentro de uma
-- transacção revertida: com sessão que existe, dados e 1 rasto; com sessão
-- inventada, **os mesmos dados** e o rasto na mesma 1.
--
-- Não havia fuga: a leitura continuava guardada pelo predicado. O que havia era
-- um acesso que pode acontecer sem ficar escrito — e isso contradiz a linha da
-- própria decisão: *«um registo que só apanha alguns acessos é pior do que
-- nenhum, porque dá a sensação de vigilância sem a ter»*.
--
-- E o mesmo defeito tinha um segundo efeito: com uma sessão válida **de outro
-- agente**, o registo nomeava esse outro, porque o `staff_user_id` e o
-- `staff_email` saíam da sessão que o chamador escolheu.
--
-- ── A cura junta as duas metades numa só ──────────────────────────────────
--
-- A sessão entra no `lido`. Sem sessão válida **do próprio agente**, para
-- **aquela** organização, não há dados NEM rasto — e deixa de poder existir um
-- sem o outro, porque os dois saem da mesma linha.
--
-- O `WHERE` da contagem sai: nunca serviu para nada. Uma CTE que escreve corre
-- sempre e por inteiro, seja ou não lida pela consulta principal — o
-- acoplamento verdadeiro é os dois lerem o mesmo `lido`.
CREATE OR REPLACE FUNCTION suporte_le_pedido(p_pedido uuid, p_sessao uuid)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH lido AS (
    SELECT o."id", o."numero", o."canal", o."estado", o."created_at",
           o."organization_id",
           s."staff_user_id", s."staff_email"
      FROM "orders" o
      -- ── As três condições, e nenhuma é decorativa ─────────────────────
      --
      -- A sessão é a que o chamador diz, MAS tem de ser da organização daquele
      -- pedido e do agente que está a chamar. Sem a segunda, um agente lia a
      -- casa errada com uma sessão sua; sem a terceira, usava a concessão de
      -- outro — e o rasto nomeava esse outro.
      JOIN "support_sessions" s
        ON s."id" = p_sessao
       AND s."organization_id" = o."organization_id"
       AND s."staff_user_id" = app_utilizador_actual()
     WHERE o."id" = p_pedido
       -- E a concessão continua a ser verificada pelo mesmo predicado da
       -- política: viva, não terminada, e com âmbito que permita ler.
       AND suporte_com_concessao_viva(o."organization_id")
  ),
  linhas AS (
    SELECT l."order_id",
           jsonb_agg(jsonb_build_object(
             'id', l."id", 'nome', l."nome",
             'quantidade', l."quantidade", 'estado', l."estado")
             ORDER BY l."id") AS itens
      FROM "order_lines" l JOIN lido ON lido."id" = l."order_id"
     GROUP BY l."order_id"
  ),
  rasto AS (
    INSERT INTO "audit_events"
      ("id", "organization_id", "actor_id", "actor_email", "accao", "alvo_tipo", "alvo_id", "detalhe")
    SELECT gen_random_uuid(), lido."organization_id",
           lido."staff_user_id", lido."staff_email",
           'plataforma.suporte.pedido.lido', 'pedido', lido."id",
           jsonb_build_object('sessao', p_sessao, 'pedido', lido."id")
      FROM lido
    RETURNING 1
  )
  SELECT jsonb_build_object(
           'id', lido."id", 'numero', lido."numero", 'canal', lido."canal",
           'estado', lido."estado", 'createdAt', lido."created_at",
           'linhas', coalesce(linhas.itens, '[]'::jsonb))
    FROM lido LEFT JOIN linhas ON linhas."order_id" = lido."id";
$$;

REVOKE ALL     ON FUNCTION suporte_le_pedido(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION suporte_le_pedido(uuid, uuid) TO   bossaos_app;

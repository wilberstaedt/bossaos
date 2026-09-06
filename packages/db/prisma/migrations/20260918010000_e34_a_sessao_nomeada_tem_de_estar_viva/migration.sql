-- E34 · a sessão NOMEADA também tem de estar viva
--
-- ── O defeito, e quem o pôs lá ────────────────────────────────────────────
--
-- A correcção 13 acrescentou três condições ao `JOIN` da sessão — `s.id`, a
-- organização e o agente — e **não** acrescentou a liveness da sessão nomeada.
-- Três linhas abaixo ficou um comentário a prometer que *«a concessão continua
-- a ser verificada: viva, não terminada, e com âmbito que permita ler»*. O
-- comentário promete o que o código não faz: quem verifica isso é o
-- `suporte_com_concessao_viva(org)`, e a pergunta dele é outra — **«este agente
-- tem ALGUMA concessão viva nesta casa?»**, e não «é ESTA».
--
-- ── Medido a 07/09, ao escrever a prova concorrente do acesso ─────────────
--
--   1. sessão A (DADOS_OPERACIONAIS) viva                    → lê. Correcto.
--   2. A revogada, nenhuma outra viva                        → não lê. Correcto.
--   3. A revogada, **B viva**, a ler com o id de A            → **LÊ**,
--      e o rasto nomeia A.
--
-- E a variante que dói mais: uma sessão C de âmbito `LEITURA` — que **enquanto
-- viva recusou** ler o pedido — passa a ler depois de terminada, desde que o
-- mesmo agente tenha uma sessão de dados operacionais aberta. O rasto fica com
-- o email e o motivo de C.
--
-- ── O que se estraga, e o que NÃO se estraga ─────────────────────────────
--
-- Não há fuga de dados: continua a só ler quem tem, naquele instante, uma
-- concessão viva e em âmbito para aquela casa. O que se estraga é o **rasto**,
-- que é a razão de ser desta etapa — o agente escolhe qual das suas sessões
-- passadas fica escrita, e a casa lê um acesso atribuído a uma sessão já
-- fechada, com um motivo que não é o do acesso e, no caso de C, com um âmbito
-- que nunca o permitiria.
--
-- É a mesma família do defeito que a
-- `e34_o_rasto_do_suporte_nao_se_separa_da_leitura` fechou: lá o rasto podia
-- nomear **outro agente**; aqui nomeava **outra sessão do próprio**.
--
-- E não estava aberto pela rota — o `sessaoAutoriza` recusa antes uma sessão
-- terminada ou fora de âmbito. Mas o argumento escrito na migração anterior é
-- que a garantia não pode depender disso: *«a alternativa era a base confiar
-- que alguém verificou»*.
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
      -- ── As SEIS condições da sessão nomeada, e nenhuma é decorativa ────
      --
      -- As três primeiras vêm da correcção 13 e dizem de QUEM é a sessão: sem a
      -- segunda, um agente lia a casa errada com uma sessão sua; sem a terceira,
      -- usava a concessão de outro — e o rasto nomeava esse outro.
      --
      -- As três últimas são a correcção 14 e dizem se ela VALE AGORA. Sem elas,
      -- uma sessão já revogada — ou que nunca teve âmbito para isto — voltava a
      -- servir de nome ao acesso, bastando que o mesmo agente tivesse outra
      -- aberta. São as mesmas três metades do `sessaoViva` + âmbito que o
      -- `suporte_com_concessao_viva` aplica à CASA, aqui aplicadas à SESSÃO.
      JOIN "support_sessions" s
        ON s."id" = p_sessao
       AND s."organization_id" = o."organization_id"
       AND s."staff_user_id" = app_utilizador_actual()
       AND s."terminada_em" IS NULL
       AND s."expira_em" > now()
       AND 'DADOS_OPERACIONAIS' = ANY (s."ambito")
     WHERE o."id" = p_pedido
       -- ── E o predicado da política fica, sabendo-se REDUNDANTE ─────────
       --
       -- Com as seis condições acima, uma linha em `lido` já satisfaz por
       -- construção o `EXISTS` do predicado: é ela própria a concessão viva e em
       -- âmbito deste agente para esta casa. Fica escrito aqui que é redundante,
       -- em vez de se prometer que faz um trabalho que já está feito.
       --
       -- E fica: é o MESMO predicado da política `suporte_le_pedidos` sobre
       -- `orders`, e tê-lo nos dois sítios é o que impede a função e a política
       -- de divergirem sem ninguém dar por isso. Tirar uma guarda no mesmo
       -- movimento em que se corrige um defeito é como se ganham dois.
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
  -- O rasto continua a sair do MESMO `lido` que os dados: sem linha lida não há
  -- linha escrita, e não há caminho em que o suporte leia e nada fique escrito.
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

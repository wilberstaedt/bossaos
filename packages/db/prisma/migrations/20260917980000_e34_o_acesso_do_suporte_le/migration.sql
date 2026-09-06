-- E34 · o acesso do suporte LÊ o que lhe foi concedido
--
-- ── O defeito, e como apareceu ─────────────────────────────────────────────
--
-- A J15 abriu uma sessão de suporte com âmbito de dados operacionais, com motivo
-- e com fim, e a leitura do pedido devolveu **404 para todos os pedidos de todas
-- as casas**. A rota corre por `comIdentidade`, que define só `app.user_id`; a
-- `orders` tem uma política única, `tenant_isolation`, com
-- `organization_id = app_organizacao_actual()`. Sem organização no contexto o
-- predicado nunca é verdadeiro e não há linha nenhuma.
--
-- É a TERCEIRA vez que a RLS morde um caminho de leitura da plataforma: a chave
-- de API no E32, as sessões de suporte no E33, e agora os pedidos. E as três
-- passaram despercebidas às provas de base pela mesma razão — nelas o cliente é
-- o dono da tabela e passa por cima da política.
--
-- Ninguém tinha visto porque **nenhuma prova abre esta porta**:
-- `provar-plataforma.sh` e `provas/plataforma.test.ts` têm zero referências a
-- `api/plataforma/suporte`, e exercitam o `sessaoAutoriza` por dentro, com
-- escopo de organização. A peça estava provada em três sítios e o caminho estava
-- partido.
--
-- ── Uma POLÍTICA, e não uma porta estreita ────────────────────────────────
--
-- É o que o E33 decidiu para o mesmo problema, e o argumento fica: «uma porta
-- estreita protege as chamadas que existem; uma política protege a tabela» —
-- incluindo as consultas que ninguém escreveu ainda.
--
-- ── E a organização NÃO vem do chamador ───────────────────────────────────
--
-- O predicado recebe a organização **da linha** que a política está a filtrar, e
-- verifica que existe uma concessão viva **desta pessoa** para ela. Um predicado
-- que aceitasse uma organização vinda de fora era uma porta com a fechadura do
-- lado de dentro.
--
-- Sem sessão devolve falso pelo mesmo motivo que o `plataforma_e_staff()`:
-- `app_utilizador_actual()` dá NULL, e NULL não casa com coluna nenhuma.
CREATE OR REPLACE FUNCTION suporte_com_concessao_viva(org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM support_sessions s
     WHERE s.organization_id = org
       AND s.staff_user_id   = app_utilizador_actual()
       -- As mesmas duas metades do `sessaoViva` do domínio: não terminada E não
       -- expirada. Escritas aqui porque é aqui que a base decide, e repetidas de
       -- propósito — a alternativa era a base confiar que alguém verificou.
       AND s.terminada_em IS NULL
       AND s.expira_em > now()
       -- O âmbito que permite ler dados operacionais. `LEITURA` não chega: é o
       -- que distingue ver que a casa existe de ver o que ela vendeu.
       AND 'DADOS_OPERACIONAIS' = ANY (s.ambito)
  );
$$;

REVOKE ALL     ON FUNCTION suporte_com_concessao_viva(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION suporte_com_concessao_viva(uuid) TO   bossaos_app;

-- ── FOR SELECT, e mais nada ───────────────────────────────────────────────
--
-- O suporte vê o que a concessão diz. Escrever continua no caminho privilegiado
-- com auditoria na mesma instrução, como o E33 estabeleceu — uma política de
-- escrita aqui desfazia a fronteira que a etapa inteira existe para manter.
CREATE POLICY "suporte_le_pedidos" ON "orders"
  FOR SELECT USING (suporte_com_concessao_viva("organization_id"));

-- As linhas vêm no mesmo `select` da rota, e sem elas o pedido chega vazio — que
-- é a forma de verde vazio que este projecto reprova em toda a parte.
CREATE POLICY "suporte_le_linhas_do_pedido" ON "order_lines"
  FOR SELECT USING (suporte_com_concessao_viva("organization_id"));

-- ── E a auditoria escreve-se na MESMA INSTRUÇÃO da leitura ─────────────────
--
-- «Um registo que só apanha alguns acessos dá a sensação de vigilância sem a
-- ter.» Se a leitura fosse uma chamada e o registo outra, existiria um caminho —
-- uma excepção pelo meio, um `return` cedo — em que o suporte lê e nada fica
-- escrito. Aqui é uma instrução só: a CTE que insere alimenta-se da CTE que lê,
-- e sem linha lida não há linha escrita.
--
-- ── Porque é `SECURITY DEFINER`, tendo já a política ──────────────────────
--
-- Porque a ESCRITA do rasto não passa pela RLS deste caminho: a `audit_events`
-- exige `organization_id = app_organizacao_actual()` para inserir, e aqui não há
-- organização no contexto — de propósito, que é a decisão inteira. O E33 já
-- tinha resolvido isto assim para a concessão: caminho privilegiado, com a
-- auditoria na mesma instrução.
--
-- E a garantia não se perde por ser privilegiada: a função chama o **mesmo
-- predicado** que a política usa. Quem não tem concessão viva não lê aqui nem lá.
CREATE OR REPLACE FUNCTION suporte_le_pedido(p_pedido uuid, p_sessao uuid)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH lido AS (
    SELECT o."id", o."numero", o."canal", o."estado", o."created_at",
           o."organization_id"
      FROM "orders" o
     WHERE o."id" = p_pedido
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
           s."staff_user_id", s."staff_email",
           'plataforma.suporte.pedido.lido', 'pedido', lido."id",
           jsonb_build_object('sessao', p_sessao, 'pedido', lido."id")
      FROM lido JOIN "support_sessions" s ON s."id" = p_sessao
    RETURNING 1
  )
  SELECT jsonb_build_object(
           'id', lido."id", 'numero', lido."numero", 'canal', lido."canal",
           'estado', lido."estado", 'createdAt', lido."created_at",
           'linhas', coalesce(linhas.itens, '[]'::jsonb))
    FROM lido LEFT JOIN linhas ON linhas."order_id" = lido."id"
   WHERE (SELECT count(*) FROM rasto) >= 0;
$$;

REVOKE ALL     ON FUNCTION suporte_le_pedido(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION suporte_le_pedido(uuid, uuid) TO   bossaos_app;

-- A quota de marcas, com o mesmo piloto de uma que o E05 deu às unidades.
--
-- O E06 manda que "criação adicional verifica a concessão contratada". Sem uma
-- concessão de `marcas`, o CT-02 diz que a resposta é NEGADO — e isso incluiria
-- a primeira marca, a do arranque, que ninguém pode criar sem plano nenhum.
--
-- É o mesmo problema que o E05 resolveu para as unidades e resolve-se da mesma
-- maneira: **uma** concessão de piloto, escrita, auditável, e igual para todos.
-- Não é um valor comercial inventado: é o mínimo para o produto arrancar, e é o
-- que o prompt do E05 autoriza por extenso ("sem configuração comercial,
-- habilite apenas a primeira unidade de piloto").
INSERT INTO "entitlement_grants" (id, organization_id, capacidade, quota, origem, motivo, updated_at)
SELECT gen_random_uuid(), o.id, 'marcas', 1, 'PILOTO', 'piloto: a primeira marca', now()
  FROM organizations o
 WHERE NOT EXISTS (
   SELECT 1 FROM entitlement_grants g
    WHERE g.organization_id = o.id AND g.capacidade = 'marcas' AND g.location_id IS NULL
 );

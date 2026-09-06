-- E31 · a porta do kiosk devolvia o slug ERRADO
--
-- ── O defeito, e quem o apanhou ────────────────────────────────────────────
--
-- A `kiosk_do_aparelho` devolvia `locations.slug` — o identificador INTERNO da
-- unidade (`puerto`), o que aparece no endereço de gestão. A carta do kiosk é
-- servida pela `publico_carta`, que espera o `public_slug`, que é outro
-- (`insp-marina-oropesa`).
--
-- Resultado: a carta vinha vazia, e vinha vazia **em silêncio** — a tela
-- mostrava «ainda não escolheste nada» e ninguém dizia que a pergunta tinha
-- sido feita com a chave errada. O motor estava verde: 21 casos e 8 controlos,
-- nenhum deles a passar por aqui, porque nenhum deles abre uma carta.
--
-- Quem o apanhou foi a prova de NAVEGADOR, à primeira corrida. É a diferença
-- que a régua desta etapa nomeia: **o teste passa e não sai papel** — aqui,
-- o motor passa e não sai carta.
--
-- E a lição do nome: duas colunas chamadas «slug» na mesma tabela, uma interna
-- e uma pública, são duas coisas diferentes com o mesmo nome curto. Ao devolver
-- a errada, o tipo estava certo e o valor estava errado — que é o modo de falha
-- que nenhum compilador apanha.
--
-- `public_slug` é ANULÁVEL: uma unidade sem endereço público não tem carta para
-- servir. Devolve-se como está, e a tela trata a ausência — em vez de a porta
-- inventar um endereço que não existe.
CREATE OR REPLACE FUNCTION kiosk_do_aparelho(p_device UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_slug TEXT,
  location_id UUID,
  location_slug TEXT,
  location_nome TEXT,
  fuso TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.slug, l.id, l.public_slug, l.nome, l.fuso
    FROM devices d
    JOIN locations l     ON l.id = d.location_id
    JOIN organizations o ON o.id = d.organization_id
   WHERE d.id = p_device
     AND d.estado = 'ACTIVO';
$$;

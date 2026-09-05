-- ── E19 · a porta da reserva pública ───────────────────────────────────────
--
-- Quem reserva está em casa, três dias antes, e não tem — nem pode ter — sessão
-- de visitante. A regra da pasta `/r/` («nada sem sessão de visitante») tornaria
-- a reserva pública impossível, e por isso esta porta fica FORA dela.
--
-- O que a protege não é uma credencial. É:
--   1. uma porta estreita que só devolve unidades PUBLICADAS;
--   2. um limite por unidade e por janela, aqui dentro, com `FOR UPDATE`;
--   3. a chave idempotente que o motor do E18 já exige.

-- ── 1. Quem é esta unidade, e só se estiver publicada ─────────────────────
--
-- Uma unidade sem endereço público não existe para esta porta. Devolver linha
-- para uma unidade não publicada era transformar a porta num catálogo de
-- restaurantes que ainda não abriram.
CREATE OR REPLACE FUNCTION unidade_publica(p_slug TEXT)
RETURNS TABLE (
  organization_id UUID, location_id UUID, nome TEXT, fuso TEXT, moeda TEXT,
  reservas_activas BOOLEAN
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $f$
  SELECT l.organization_id, l.id, l.nome, l.fuso, l.moeda,
         COALESCE(s.activo, false)
    FROM locations l
    LEFT JOIN reservation_settings s ON s.location_id = l.id
   WHERE l.public_slug = p_slug AND l.archived_at IS NULL
   LIMIT 1
$f$;

-- ── 2. O limite da janela, contado onde não se pode contornar ─────────────
--
-- «Sem ele um guião enche a agenda de um sábado em segundos e o restaurante
-- descobre à porta.»
--
-- Conta as reservas de origem PÚBLICO criadas naquela unidade na janela, e
-- serializa com um lock por unidade — a mesma decisão do E18, pela mesma razão:
-- é um ler-depois-escrever, e sem serialização dez pedidos simultâneos lêem
-- todos a mesma contagem antiga.
--
-- Devolve TRUE quando ainda cabe. Não devolve quantas faltam: quem está do lado
-- de fora não precisa de saber a que ritmo pode insistir.
CREATE OR REPLACE FUNCTION cabe_no_limite_publico(
  p_location_id UUID, p_janela_segundos INT, p_maximo INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  v_quantas INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('reserva-publica:' || p_location_id::text));
  SELECT count(*) INTO v_quantas
    FROM reservations
   WHERE location_id = p_location_id
     AND origem = 'PUBLICO'
     AND created_at > now() - make_interval(secs => p_janela_segundos);
  RETURN v_quantas < p_maximo;
END;
$f$;

REVOKE ALL ON FUNCTION unidade_publica(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION cabe_no_limite_publico(UUID, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION unidade_publica(TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION cabe_no_limite_publico(UUID, INT, INT) TO PUBLIC;

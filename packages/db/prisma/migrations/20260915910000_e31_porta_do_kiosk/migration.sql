-- E31 · A porta estreita do kiosk
--
-- ── Porque é que isto existe ───────────────────────────────────────────────
--
-- O KDS exige uma pessoa com sessão iniciada: alguém entra no tablet da cozinha
-- e ele fica em modo quiosque. **O kiosk do corredor não tem ninguém.** É um
-- ecrã sozinho, e a primeira coisa que ele precisa de saber é a que organização
-- pertence — que é exactamente a pergunta que o RLS não deixa fazer sem já se
-- saber a resposta.
--
-- É a mesma figura do `unidade_publica` do E09 e do `resolver_convite` do E04:
-- uma porta estreita que corre como o dono, devolve **só o que a casca precisa**
-- e nada mais, e depois disso abre-se escopo normal.
--
-- ── O que ela NÃO devolve, e é a decisão ──────────────────────────────────
--
-- Não devolve nada do que está dentro da organização: nem produtos, nem
-- pedidos, nem outros aparelhos. Devolve os identificadores e o nome da unidade
-- — o suficiente para a casca saber onde está, e insuficiente para servir de
-- oráculo a quem experimente identificadores à sorte.
--
-- E só responde por aparelhos ACTIVOS. Um aparelho por parear ou revogado dá
-- ausência, não um erro que diga «existe mas não podes» — a mesma regra do E04.
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
  SELECT o.id, o.slug, l.id, l.slug, l.nome, l.fuso
    FROM devices d
    JOIN locations l     ON l.id = d.location_id
    JOIN organizations o ON o.id = d.organization_id
   WHERE d.id = p_device
     AND d.estado = 'ACTIVO';
$$;

REVOKE ALL ON FUNCTION kiosk_do_aparelho(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kiosk_do_aparelho(UUID) TO PUBLIC;

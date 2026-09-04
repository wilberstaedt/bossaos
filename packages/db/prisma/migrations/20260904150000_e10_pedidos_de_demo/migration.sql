-- ═══════════════════════════════════════════════════════════════════════════
-- MKT-007 · o pedido de demo
--
-- ── Porque é que isto NÃO cabe na tabela `leads` ──────────────────────────
--
-- Um lead do E10 pertence a uma unidade de um inquilino: tem `organization_id`,
-- tem política de linha, e o restaurante que o recebe é quem lhe responde.
--
-- Quem pede uma demo da BossaOS **não é inquilino de ninguém**. Não há
-- organização a que o prender, e forçar uma — uma organização "plataforma",
-- digamos — poria correio de estranhos dentro do espaço de dados de um cliente.
--
-- A alternativa que eu recusei foi a mais barata: desenhar o formulário e não
-- gravar nada, com um ecrã de "obrigado" à frente. É exactamente o defeito que
-- o aceite 2 desta etapa persegue, e seria eu a escrevê-lo de propósito na
-- página que existe para angariar clientes.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE "demo_requests" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "restaurante" TEXT NOT NULL,
    "telefone" TEXT,
    "mensagem" TEXT,
    "idioma" TEXT NOT NULL,
    "chave_idempotencia" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

-- Guarda-se uma vez. A decisão é da restrição, não de um `if`: dois cliques
-- simultâneos leem os dois "não existe" e gravam os dois.
CREATE UNIQUE INDEX "demo_requests_chave_key" ON "demo_requests"("chave_idempotencia");
CREATE INDEX "demo_requests_created_at_idx" ON "demo_requests"("created_at");

ALTER TABLE "demo_requests"
  ADD CONSTRAINT "demo_idioma" CHECK (idioma IN ('es-ES', 'pt-BR', 'en'));
ALTER TABLE "demo_requests"
  ADD CONSTRAINT "demo_tem_conteudo"
  CHECK (length(btrim(nome)) > 0 AND length(btrim(restaurante)) > 0 AND position('@' in email) > 1);

-- ── Quem pode ler e quem pode escrever ────────────────────────────────────
--
-- O runtime **não lê**. Um pedido de demo tem o nome, o correio e o telefone de
-- uma pessoa que ainda não é cliente de ninguém, e nenhuma rota do produto tem
-- razão para os ler. Escreve-se pela porta e lê-se pelo controlo de plataforma,
-- que é o mesmo desenho do `platform_staff` do E05.
REVOKE ALL ON "demo_requests" FROM bossaos_app;
REVOKE ALL ON "demo_requests" FROM bossaos_auth;

CREATE OR REPLACE FUNCTION registar_pedido_de_demo(
  p_nome text, p_email text, p_restaurante text,
  p_telefone text, p_mensagem text, p_idioma text, p_chave text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO demo_requests (
    id, nome, email, restaurante, telefone, mensagem, idioma, chave_idempotencia)
  VALUES (
    gen_random_uuid(), btrim(p_nome), btrim(p_email), btrim(p_restaurante),
    nullif(btrim(coalesce(p_telefone, '')), ''), nullif(btrim(coalesce(p_mensagem, '')), ''),
    p_idioma, p_chave);
  RETURN 'ok';
EXCEPTION
  -- **Só** a violação de unicidade, e mais nada. Um `WHEN others` aqui era o
  -- mesmo `catch` largo que o aceite 2 proíbe: transformava uma base em baixo
  -- num ecrã de obrigado.
  WHEN unique_violation THEN
    RETURN 'repetido';
END;
$$;

REVOKE ALL ON FUNCTION registar_pedido_de_demo(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registar_pedido_de_demo(text, text, text, text, text, text, text) TO bossaos_app;

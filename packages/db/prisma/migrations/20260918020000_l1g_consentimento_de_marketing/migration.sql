-- ═══════════════════════════════════════════════════════════════════════════
-- MKT-007 · o consentimento para marketing, separado do contacto pedido
--
-- ── Porque é que isto é uma COLUNA e não uma linha de texto no ecrã ───────
--
-- O §6.7 manda «diferenciar contacto transaccional de consentimento para
-- marketing». A diferença tem de existir onde os dados vivem: quem preenche
-- este formulário está a PEDIR uma demonstração, e responder-lhe é o objecto do
-- pedido. Mandar-lhe outra coisa depois é uma decisão diferente da pessoa, e uma
-- decisão que não está gravada não existe.
--
-- ── E porque é que são DUAS colunas ───────────────────────────────────────
--
-- Um booleano diz que alguém consentiu e não diz quando. Um consentimento sem
-- data não se prova mais tarde, e é a mesma razão pela qual o tempo do KDS vem
-- do carimbo do servidor e nunca do relógio da tablet: o registo do facto tem
-- de trazer o momento.
--
-- `false` e `NULL` são a resposta segura. Uma caixa de verificação que não é
-- marcada **não é enviada pelo navegador** — chega ausente, não chega `false`.
-- O valor por omissão é portanto o que uma pessoa que não marcou produz, e
-- nenhum caminho escreve `true` sem a caixa ter sido marcada.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "demo_requests"
  ADD COLUMN "consentimento_marketing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentimento_em" TIMESTAMPTZ(6);

-- As duas contam a mesma história ou não contam nenhuma: consentimento marcado
-- sem data, ou data sem consentimento, são registos que não se sabem ler. A
-- restrição existe para essa combinação não poder ser gravada por engano.
ALTER TABLE "demo_requests"
  ADD CONSTRAINT "demo_consentimento_datado"
  CHECK (("consentimento_marketing" = true  AND "consentimento_em" IS NOT NULL)
      OR ("consentimento_marketing" = false AND "consentimento_em" IS NULL));

-- ── A porta passa a saber o consentimento ────────────────────────────────
--
-- O runtime continua sem `SELECT` nesta tabela: escreve por aqui e mais nada. O
-- que muda é que a porta deixa de conseguir gravar um pedido SEM dizer o que a
-- pessoa respondeu sobre marketing — o parâmetro não tem valor por omissão.
CREATE OR REPLACE FUNCTION registar_pedido_de_demo(
  p_nome text, p_email text, p_restaurante text,
  p_telefone text, p_mensagem text, p_idioma text, p_chave text,
  p_consentimento boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO demo_requests (
    id, nome, email, restaurante, telefone, mensagem, idioma, chave_idempotencia,
    consentimento_marketing, consentimento_em)
  VALUES (
    gen_random_uuid(), btrim(p_nome), btrim(p_email), btrim(p_restaurante),
    nullif(btrim(coalesce(p_telefone, '')), ''), nullif(btrim(coalesce(p_mensagem, '')), ''),
    p_idioma, p_chave,
    coalesce(p_consentimento, false),
    -- A data é do SERVIDOR e nunca vem no formulário. Uma data de consentimento
    -- que o cliente pudesse escolher não era prova de nada.
    CASE WHEN coalesce(p_consentimento, false) THEN now() ELSE NULL END);
  RETURN 'ok';
EXCEPTION
  -- **Só** a violação de unicidade, e mais nada. Um `WHEN others` aqui era o
  -- mesmo `catch` largo que o aceite 2 proíbe: transformava uma base em baixo
  -- num ecrã de obrigado.
  WHEN unique_violation THEN
    RETURN 'repetido';
END;
$$;

REVOKE ALL ON FUNCTION registar_pedido_de_demo(text, text, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registar_pedido_de_demo(text, text, text, text, text, text, text, boolean) TO bossaos_app;

-- ── A porta antiga MORRE, e é de propósito ───────────────────────────────
--
-- Sete argumentos e oito argumentos não se substituem em Postgres: convivem
-- como sobrecarga. Deixar a de sete viva era manter uma porta por onde se grava
-- um pedido sem dizer nada sobre marketing — e o valor por omissão da coluna
-- taparia o buraco em silêncio, que é a pior maneira de o tapar.
--
-- O sentido do valor por omissão continua a ser o seguro (`false` = não), por
-- isso isto não é uma correcção de risco: é não deixar duas verdades sobre a
-- mesma escrita.
DROP FUNCTION IF EXISTS registar_pedido_de_demo(text, text, text, text, text, text, text);

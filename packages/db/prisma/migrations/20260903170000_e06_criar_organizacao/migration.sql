-- Criar uma organização, com quem a criou já lá dentro como dono.
--
-- ── Porque é que isto tem de ser uma porta e não um INSERT ──────────────────
--
-- A política do E03 em `organizations` é `id = app_organizacao_actual()` para
-- TODOS os comandos. Isso é o certo para tudo o resto e torna a criação
-- impossível: a organização que se vai criar ainda não é o contexto de ninguém.
--
-- Havia duas saídas más. Acrescentar uma política de `INSERT` aberta a qualquer
-- pessoa autenticada deixava criar uma organização e, no mesmo pedido, esquecer
-- a filiação — e uma organização sem dono é uma organização que ninguém pode
-- abrir e ninguém pode apagar. Dar a criação à credencial de migração punha um
-- fluxo de produto a correr com privilégios de DDL.
--
-- Esta função cria as **quatro** linhas ou nenhuma: organização, filiação, papel
-- de dono, e o progresso do arranque. O invariante que ela garante e que nenhum
-- `INSERT` garante é este: **não se cria uma organização a que não se pertence.**
--
-- ── E a idempotência mora aqui dentro, de propósito ─────────────────────────
--
-- O aceite 1 do E06: *"repetir criação após timeout não duplica"*. Um cliente
-- que expira não sabe distinguir "não chegou" de "chegou e a resposta perdeu-se",
-- e repetir é a coisa certa a fazer. Ler-a-chave-e-depois-criar em TypeScript
-- resolve o caso lento e não resolve o caso simultâneo: duas repetições ao mesmo
-- tempo lêem as duas "não existe" e criam as duas.
--
-- Aqui é a restrição única de `idempotency_keys` que decide a corrida, e o
-- identificador da organização é escolhido ANTES de ela existir, para poder ser
-- guardado na mesma linha que ganha.

CREATE OR REPLACE FUNCTION criar_organizacao_com_dono(
  p_chave text,
  p_slug  text,
  p_nome  text
)
RETURNS TABLE (organization_id uuid, criada boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := app_utilizador_actual();
  v_org   uuid;
  v_membership uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'sem identidade: criar organização exige sessão';
  END IF;
  IF p_chave IS NULL OR length(trim(p_chave)) = 0 THEN
    -- Sem chave não há idempotência, e sem idempotência a repetição duplica.
    -- Recusar é melhor do que aceitar e criar duas.
    RAISE EXCEPTION 'chave de idempotência em falta';
  END IF;

  INSERT INTO idempotency_keys (id, chave, actor_id, accao, resultado_tipo, resultado_id)
  VALUES (gen_random_uuid(), p_chave, v_actor, 'organizacao.criar', 'organization', gen_random_uuid())
  ON CONFLICT (chave, actor_id, accao) DO NOTHING
  RETURNING resultado_id INTO v_org;

  IF v_org IS NULL THEN
    -- A chave já lá estava: esta é a segunda tentativa. Devolve-se o MESMO
    -- resultado, que é o que "não duplicar" quer dizer.
    SELECT k.resultado_id INTO v_org
      FROM idempotency_keys k
     WHERE k.chave = p_chave AND k.actor_id = v_actor AND k.accao = 'organizacao.criar';
    RETURN QUERY SELECT v_org, false;
    RETURN;
  END IF;

  INSERT INTO organizations (id, slug, nome, updated_at) VALUES (v_org, p_slug, p_nome, now());
  UPDATE idempotency_keys SET organization_id = v_org
   WHERE chave = p_chave AND actor_id = v_actor AND accao = 'organizacao.criar';

  INSERT INTO memberships (id, organization_id, user_id, estado, updated_at)
  VALUES (gen_random_uuid(), v_org, v_actor, 'ACTIVO', now())
  RETURNING id INTO v_membership;

  INSERT INTO role_assignments (id, organization_id, membership_id, papel, updated_at)
  VALUES (gen_random_uuid(), v_org, v_membership, 'OWNER', now());

  INSERT INTO onboarding_progress (organization_id, passo, updated_at)
  VALUES (v_org, 1, now());

  RETURN QUERY SELECT v_org, true;
END;
$$;

REVOKE ALL     ON FUNCTION criar_organizacao_com_dono(text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION criar_organizacao_com_dono(text, text, text) TO   bossaos_app;

-- ── E19 · a identidade de uma mensagem é o ACONTECIMENTO ───────────────────
--
-- A chave era `(reserva, tipo)`. O contrato nomeia-a como uma das duas respostas
-- fáceis, e ambas erradas:
--
--   · `(reserva, tipo)` **engole envios legítimos**. «A sua mesa está pronta»
--     pode ter de sair duas vezes na mesma noite: a pessoa não veio à primeira, o
--     host volta a chamar meia hora depois. Com esta chave, a segunda chamada
--     desaparece em silêncio e a mesa fica vazia com gente à porta.
--   · `(reserva, tipo, momento)` **não deduplica nada**: duas tentativas com um
--     segundo de diferença são dois momentos, logo duas mensagens.
--
-- A chave é o ACONTECIMENTO. Cada facto que justifica avisar alguém nasce com
-- identidade própria no momento em que acontece, e a mensagem **herda-a**.
--
-- Daí sai tudo o resto sem mais regras: reentregar depois de o provedor falhar
-- usa o mesmo acontecimento, logo deduplica; o host chamar segunda vez é um
-- acontecimento novo, logo entrega; um tipo diferente vem de outro
-- acontecimento, logo entrega.

ALTER TABLE "reservation_messages"
  ADD COLUMN "evento_id" UUID;

-- As linhas que já existem ganham identidade própria, uma cada. Não há
-- acontecimento a que as ligar — nasceram antes de haver acontecimentos — e
-- dar-lhes todas a mesma identidade fundiria mensagens que nada tem a ver.
UPDATE "reservation_messages" SET "evento_id" = gen_random_uuid() WHERE "evento_id" IS NULL;

ALTER TABLE "reservation_messages" ALTER COLUMN "evento_id" SET NOT NULL;

-- A chave antiga sai: era ela que engolia a segunda chamada da mesma noite.
DROP INDEX IF EXISTS "uma_mensagem_por_reserva_e_tipo";

CREATE UNIQUE INDEX "reservation_messages_evento_id_key"
  ON "reservation_messages"("evento_id");

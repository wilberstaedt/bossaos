-- ── E19 · chegar e sentar são dois actos ───────────────────────────────────
--
-- «Chegar não é estar sentado. Libertar uma reserva atrasada é política e acção
-- do host, nunca uma limpeza automática silenciosa.»
--
-- Até aqui a reserva ia de CONFIRMADA a SENTADA num salto, e o produto não tinha
-- onde guardar o grupo que **está à porta com a mesa ainda por levantar** — que é
-- o estado em que uma sala cheia passa metade do serviço.
--
-- Colapsar os dois dá um dos dois sistemas errados:
--   · se o check-in sentar, a mesa fica marcada como ocupada enquanto os
--     anteriores ainda lá estão, e o mapa mente a quem serve;
--   · se não houver check-in, a única forma de registar que o grupo chegou é
--     sentá-lo, e a tolerância de atraso passa a contar contra quem já está lá.
--
-- É a mesma forma do «rodar não é revogar» do E17: dois actos, dois carimbos, e
-- um estado que os distingue.
ALTER TYPE "estado_de_reserva" ADD VALUE IF NOT EXISTS 'CHEGOU' BEFORE 'SENTADA';

ALTER TABLE "reservations"
  ADD COLUMN "chegou_em" TIMESTAMPTZ(6);

-- ── E o carimbo bate certo com o estado ───────────────────────────────────
--
-- Uma reserva SENTADA sem `sentada_em` é uma linha que diz que alguém se sentou
-- e não sabe quando — e o relatório do RES-B-019 sai destes carimbos.
--
-- `SENTADA` exige TAMBÉM `chegou_em`: ninguém se senta sem ter chegado, e uma
-- linha que o diga é uma linha que perdeu o momento em que o grupo apareceu à
-- porta — que é o número de que a tolerância de atraso vive.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reserva_carimbo_bate_com_estado" CHECK (
    ("estado" <> 'CHEGOU'         OR "chegou_em"   IS NOT NULL) AND
    ("estado" <> 'SENTADA'        OR ("sentada_em" IS NOT NULL AND "chegou_em" IS NOT NULL)) AND
    ("estado" <> 'CANCELADA'      OR "cancelada_em" IS NOT NULL) AND
    ("estado" <> 'NAO_COMPARECEU' OR "no_show_em"   IS NOT NULL)
  );

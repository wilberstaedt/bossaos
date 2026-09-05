-- ── E19 · a lista de espera ────────────────────────────────────────────────
--
-- «Uma lista de espera parece uma fila: chega-se, tira-se senha, espera-se a
-- vez. Escrito assim, o produto guarda uma coluna `posicao` e mostra-a — é o
-- 3.º. Num restaurante isto é falso no primeiro minuto.»
--
-- Um grupo de 6 não bloqueia um de 2 quando o que vaga é uma mesa de 2. O host
-- senta o de 2 e faz bem; o de 6 continua a ver «é o 3.º» enquanto vê entrar
-- duas pessoas que chegaram depois dele.
--
-- ── A garantia central desta migração é uma AUSÊNCIA ───────────────────────
--
-- Não há `posicao`, nem `numero_na_fila`, nem `senha`. Não é esquecimento: é a
-- mesma garantia por ausência que protege as sessões de visitante no E17.
-- **Ninguém pode mostrar um número errado se o número não existe em lado nenhum
-- para ser mostrado.** Escrever essa coluna exige uma migração, e uma migração é
-- revista.
--
-- A posição deriva-se, e deriva-se dentro do grupo que cabe nas MESMAS MESAS.

-- ── O estado que faltava: sentar ──────────────────────────────────────────
--
-- O contrato nomeia quatro estados: à espera, chamado, sentado, desistiu.
-- `ACEITE` era o nome de quem aceita uma oferta, e não chegou a ser usado por
-- caminho nenhum. Sentar é o que realmente acontece, e é o que o host vê.
--
-- `COM_OFERTA` fica como está: é o «chamado» do contrato mais a vaga concreta
-- que a chamada carrega, e essa vaga é o que consome capacidade enquanto dura.
ALTER TYPE "estado_da_espera" RENAME VALUE 'ACEITE' TO 'SENTADO';

ALTER TABLE "waitlist_entries"
  ADD COLUMN "chamado_em"        TIMESTAMPTZ(6),
  ADD COLUMN "sentado_em"        TIMESTAMPTZ(6),
  ADD COLUMN "desistiu_em"       TIMESTAMPTZ(6),
  ADD COLUMN "table_session_id"  UUID,
  ADD COLUMN "notas"             TEXT;

ALTER TABLE "waitlist_entries"
  ADD CONSTRAINT "waitlist_entries_organization_id_table_session_id_fkey"
  FOREIGN KEY ("organization_id", "table_session_id")
  REFERENCES "table_sessions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── As zonas que servem aquele grupo ──────────────────────────────────────
--
-- «Guarda-se: (…) e as zonas que servem aquele grupo.» É uma PREFERÊNCIA, e por
-- isso é uma tabela e não uma coluna: um grupo pode aceitar o terraço e o
-- salão, e uma coluna só deixaria escolher um.
--
-- Sem linhas, a espera aceita a unidade inteira. Ausência é ausência: «não
-- disse nada» não é «só quer o salão».
CREATE TABLE "waitlist_areas" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "waitlist_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,

    CONSTRAINT "waitlist_areas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_areas_organization_id_id_key" ON "waitlist_areas"("organization_id", "id");
CREATE UNIQUE INDEX "waitlist_areas_waitlist_id_area_id_key" ON "waitlist_areas"("waitlist_id", "area_id");
CREATE INDEX "waitlist_areas_waitlist_id_idx" ON "waitlist_areas"("waitlist_id");

ALTER TABLE "waitlist_areas" ADD CONSTRAINT "waitlist_areas_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waitlist_areas" ADD CONSTRAINT "waitlist_areas_organization_id_waitlist_id_fkey"
  FOREIGN KEY ("organization_id", "waitlist_id") REFERENCES "waitlist_entries"("organization_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waitlist_areas" ADD CONSTRAINT "waitlist_areas_organization_id_area_id_fkey"
  FOREIGN KEY ("organization_id", "area_id") REFERENCES "service_areas"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "waitlist_areas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "waitlist_areas"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

-- ── Um grupo tem de ter gente ─────────────────────────────────────────────
ALTER TABLE "waitlist_entries"
  ADD CONSTRAINT "espera_com_gente" CHECK ("pessoas" > 0);

-- ── E os carimbos batem certo com o estado ────────────────────────────────
--
-- Um `SENTADO` sem `sentado_em` é uma linha que diz que alguém se sentou e não
-- sabe quando — e o relatório de tempos de espera do E19 sai desses carimbos.
-- Sem isto, a coluna fica opcional na prática e o número nasce errado.
ALTER TABLE "waitlist_entries"
  ADD CONSTRAINT "espera_carimbo_bate_com_estado" CHECK (
    ("estado" <> 'SENTADO'  OR "sentado_em"  IS NOT NULL) AND
    ("estado" <> 'DESISTIU' OR "desistiu_em" IS NOT NULL) AND
    ("estado" <> 'COM_OFERTA' OR ("chamado_em" IS NOT NULL AND "oferta_expira_em" IS NOT NULL))
  );

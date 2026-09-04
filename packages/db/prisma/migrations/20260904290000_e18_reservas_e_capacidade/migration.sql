-- ── E18 · reservas e capacidade concorrente ────────────────────────────────
--
-- O que falha aqui não aparece num relatório. Aparece à porta: duas famílias,
-- uma mesa, sábado às 21h. E o restaurante não culpa a regra de negócio, culpa
-- o software, uma vez e para sempre.
--
-- Por isso as duas garantias centrais desta etapa estão na FORMA, e não em
-- código que alguém tem de se lembrar de chamar:
--
--   1. A EXCLUSÃO por mesa, com intervalo semiaberto. A base recusa a mesma mesa
--      em intervalos sobrepostos, e ninguém tem de escrever a comparação.
--   2. A unidade de alocação é a MESA. Uma combinação escreve uma linha por
--      componente, e por isso «3+4 e depois só a 3» não precisa de caso especial.
--
-- O que NÃO está na forma, e é preciso dizê-lo: o tecto de comensais por zona.
-- É uma CONTAGEM, e nenhuma restrição a exprime. É a regra que o lock por
-- unidade existe para guardar.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "estado_de_reserva" AS ENUM ('CONFIRMADA', 'CANCELADA', 'NAO_COMPARECEU', 'SENTADA');
CREATE TYPE "origem_de_reserva" AS ENUM ('HOST', 'PUBLICO', 'ESPERA');
CREATE TYPE "estado_da_mensagem" AS ENUM ('ENVIADA', 'FALHADA');
CREATE TYPE "estado_da_espera" AS ENUM ('A_ESPERA', 'COM_OFERTA', 'ACEITE', 'DESISTIU');

-- CreateTable
CREATE TABLE "reservation_settings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "duracao_padrao_min" INTEGER NOT NULL DEFAULT 90,
    "buffer_min" INTEGER NOT NULL DEFAULT 15,
    "antecedencia_min_min" INTEGER NOT NULL DEFAULT 60,
    "antecedencia_max_dias" INTEGER NOT NULL DEFAULT 90,
    "min_pessoas" INTEGER NOT NULL DEFAULT 1,
    "max_pessoas" INTEGER NOT NULL DEFAULT 12,
    "permite_combinacoes" BOOLEAN NOT NULL DEFAULT true,
    "cancelamento_ate_min" INTEGER NOT NULL DEFAULT 120,
    "retencao_min" INTEGER NOT NULL DEFAULT 15,
    "tolerancia_atraso_min" INTEGER NOT NULL DEFAULT 15,
    "deposito_ligado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reservation_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_windows" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "dia_da_semana" INTEGER NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fim" TEXT NOT NULL,
    "ultima_entrada_min" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "service_windows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capacity_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "area_id" UUID,
    "window_id" UUID,
    "max_comensais" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "capacity_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservation_blocks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "area_id" UUID,
    "table_id" UUID,
    "inicio" TIMESTAMPTZ(6) NOT NULL,
    "fim" TIMESTAMPTZ(6) NOT NULL,
    "motivo" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reservation_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "estado" "estado_de_reserva" NOT NULL DEFAULT 'CONFIRMADA',
    "origem" "origem_de_reserva" NOT NULL DEFAULT 'HOST',
    "pessoas" INTEGER NOT NULL,
    "inicio" TIMESTAMPTZ(6) NOT NULL,
    "fim" TIMESTAMPTZ(6) NOT NULL,
    "nome" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "notas" TEXT,
    "aceita_marketing" BOOLEAN NOT NULL DEFAULT false,
    "gestao_token_hash" TEXT,
    "gestao_expira_em" TIMESTAMPTZ(6),
    "chave_idempotente" TEXT NOT NULL,
    "cancelada_em" TIMESTAMPTZ(6),
    "cancelada_por" TEXT,
    "no_show_em" TIMESTAMPTZ(6),
    "sentada_em" TIMESTAMPTZ(6),
    "criada_por" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservation_allocations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ(6) NOT NULL,
    "fim" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservation_messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" "estado_da_mensagem" NOT NULL,
    "erro" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "estado" "estado_da_espera" NOT NULL DEFAULT 'A_ESPERA',
    "nome" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "pessoas" INTEGER NOT NULL,
    "oferta_table_id" UUID,
    "oferta_inicio" TIMESTAMPTZ(6),
    "oferta_fim" TIMESTAMPTZ(6),
    "oferta_expira_em" TIMESTAMPTZ(6),
    "reservation_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservation_settings_location_id_key" ON "reservation_settings"("location_id");
CREATE UNIQUE INDEX "reservation_settings_organization_id_id_key" ON "reservation_settings"("organization_id", "id");
CREATE UNIQUE INDEX "service_windows_organization_id_id_key" ON "service_windows"("organization_id", "id");
CREATE INDEX "service_windows_organization_id_location_id_dia_da_semana_idx" ON "service_windows"("organization_id", "location_id", "dia_da_semana");
CREATE UNIQUE INDEX "capacity_rules_organization_id_id_key" ON "capacity_rules"("organization_id", "id");
CREATE INDEX "capacity_rules_organization_id_location_id_idx" ON "capacity_rules"("organization_id", "location_id");
CREATE UNIQUE INDEX "reservation_blocks_organization_id_id_key" ON "reservation_blocks"("organization_id", "id");
CREATE INDEX "reservation_blocks_organization_id_location_id_inicio_idx" ON "reservation_blocks"("organization_id", "location_id", "inicio");
CREATE UNIQUE INDEX "reservations_gestao_token_hash_key" ON "reservations"("gestao_token_hash");
CREATE UNIQUE INDEX "reservations_organization_id_id_key" ON "reservations"("organization_id", "id");
CREATE UNIQUE INDEX "reservations_location_id_chave_idempotente_key" ON "reservations"("location_id", "chave_idempotente");
CREATE INDEX "reservations_organization_id_location_id_inicio_idx" ON "reservations"("organization_id", "location_id", "inicio");
CREATE INDEX "reservations_organization_id_location_id_estado_idx" ON "reservations"("organization_id", "location_id", "estado");
CREATE UNIQUE INDEX "reservation_allocations_organization_id_id_key" ON "reservation_allocations"("organization_id", "id");
CREATE INDEX "reservation_allocations_table_id_inicio_idx" ON "reservation_allocations"("table_id", "inicio");
CREATE UNIQUE INDEX "reservation_messages_organization_id_id_key" ON "reservation_messages"("organization_id", "id");
CREATE INDEX "reservation_messages_organization_id_reservation_id_idx" ON "reservation_messages"("organization_id", "reservation_id");
CREATE UNIQUE INDEX "waitlist_entries_organization_id_id_key" ON "waitlist_entries"("organization_id", "id");
CREATE INDEX "waitlist_entries_organization_id_location_id_estado_idx" ON "waitlist_entries"("organization_id", "location_id", "estado");
CREATE INDEX "waitlist_entries_oferta_table_id_oferta_expira_em_idx" ON "waitlist_entries"("oferta_table_id", "oferta_expira_em");

-- AddForeignKey
ALTER TABLE "reservation_settings" ADD CONSTRAINT "reservation_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_settings" ADD CONSTRAINT "reservation_settings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_windows" ADD CONSTRAINT "service_windows_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_windows" ADD CONSTRAINT "service_windows_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capacity_rules" ADD CONSTRAINT "capacity_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capacity_rules" ADD CONSTRAINT "capacity_rules_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capacity_rules" ADD CONSTRAINT "capacity_rules_organization_id_area_id_fkey" FOREIGN KEY ("organization_id", "area_id") REFERENCES "service_areas"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capacity_rules" ADD CONSTRAINT "capacity_rules_organization_id_window_id_fkey" FOREIGN KEY ("organization_id", "window_id") REFERENCES "service_windows"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_blocks" ADD CONSTRAINT "reservation_blocks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_blocks" ADD CONSTRAINT "reservation_blocks_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_blocks" ADD CONSTRAINT "reservation_blocks_organization_id_area_id_fkey" FOREIGN KEY ("organization_id", "area_id") REFERENCES "service_areas"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_blocks" ADD CONSTRAINT "reservation_blocks_organization_id_table_id_fkey" FOREIGN KEY ("organization_id", "table_id") REFERENCES "service_tables"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_allocations" ADD CONSTRAINT "reservation_allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_allocations" ADD CONSTRAINT "reservation_allocations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_allocations" ADD CONSTRAINT "reservation_allocations_organization_id_reservation_id_fkey" FOREIGN KEY ("organization_id", "reservation_id") REFERENCES "reservations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservation_allocations" ADD CONSTRAINT "reservation_allocations_organization_id_table_id_fkey" FOREIGN KEY ("organization_id", "table_id") REFERENCES "service_tables"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_messages" ADD CONSTRAINT "reservation_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_messages" ADD CONSTRAINT "reservation_messages_organization_id_reservation_id_fkey" FOREIGN KEY ("organization_id", "reservation_id") REFERENCES "reservations"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_organization_id_oferta_table_id_fkey" FOREIGN KEY ("organization_id", "oferta_table_id") REFERENCES "service_tables"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_organization_id_reservation_id_fkey" FOREIGN KEY ("organization_id", "reservation_id") REFERENCES "reservations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE "reservation_settings"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_windows"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "capacity_rules"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservation_blocks"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservations"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservation_allocations"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservation_messages"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waitlist_entries"         ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "reservation_settings"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "service_windows"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "capacity_rules"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "reservation_blocks"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "reservations"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "reservation_allocations"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "reservation_messages"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());
CREATE POLICY tenant_isolation ON "waitlist_entries"
  USING (organization_id = app_organizacao_actual()) WITH CHECK (organization_id = app_organizacao_actual());

-- ══════════════════════════════════════════════════════════════════════════
-- O que o Prisma não exprime
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. O intervalo é semiaberto, e a base é que o sabe ─────────────────────
--
-- «Uma reserva que acaba às 21h00 e outra que começa às 21h00 NÃO se sobrepõem.
-- Uma que acaba às 21h01 e outra que começa às 21h00 sobrepõem-se.»
--
-- É um caractere de diferença entre `<` e `<=`, e é a origem clássica da mesa
-- vendida duas vezes — ou, na direcção contrária, do turno das 21h recusado a
-- noite inteira sem ninguém perceber porquê.
--
-- O `'[)'` do `tstzrange` É essa regra. Escrita aqui, não pode ser escrita ao
-- contrário noutro sítio: não existe outro sítio.
ALTER TABLE "reservation_allocations"
  ADD CONSTRAINT "alocacao_fim_depois_do_inicio" CHECK ("fim" > "inicio");

ALTER TABLE "reservation_allocations"
  ADD CONSTRAINT "uma_mesa_um_intervalo"
  EXCLUDE USING gist (
    "table_id" WITH =,
    tstzrange("inicio", "fim", '[)') WITH &&
  );

ALTER TABLE "reservation_blocks"
  ADD CONSTRAINT "bloqueio_fim_depois_do_inicio" CHECK ("fim" > "inicio");
ALTER TABLE "reservations"
  ADD CONSTRAINT "reserva_fim_depois_do_inicio" CHECK ("fim" > "inicio");
ALTER TABLE "reservations"
  ADD CONSTRAINT "reserva_com_gente" CHECK ("pessoas" > 0);

-- ── 2. Um bloqueio é da unidade, de uma zona OU de uma mesa ────────────────
--
-- Nunca de duas coisas ao mesmo tempo: «zona bar E mesa 3» não tem leitura
-- única, e a leitura que cada um faz é a que lhe convém.
ALTER TABLE "reservation_blocks"
  ADD CONSTRAINT "bloqueio_de_um_alvo" CHECK (num_nonnulls("area_id", "table_id") <= 1);

-- ── 3. Números que não podem ser negativos ─────────────────────────────────
ALTER TABLE "reservation_settings"
  ADD CONSTRAINT "definicoes_com_numeros_sensatos" CHECK (
    "duracao_padrao_min" > 0 AND "buffer_min" >= 0 AND
    "antecedencia_min_min" >= 0 AND "antecedencia_max_dias" > 0 AND
    "min_pessoas" > 0 AND "max_pessoas" >= "min_pessoas" AND
    "retencao_min" > 0 AND "tolerancia_atraso_min" >= 0
  );
ALTER TABLE "capacity_rules"
  ADD CONSTRAINT "tecto_positivo" CHECK ("max_comensais" > 0);
ALTER TABLE "service_windows"
  ADD CONSTRAINT "turno_com_dia_valido" CHECK ("dia_da_semana" BETWEEN 0 AND 6);

-- ── 4. O depósito está desligado por DECISÃO ───────────────────────────────
--
-- «Não é uma funcionalidade em falta: é uma decisão.» A coluna existe para a
-- decisão ser legível, e a restrição garante que ninguém a liga por engano
-- enquanto não houver política comercial, pagamento e cancelamento. Ligar o
-- depósito exige uma migração — e uma migração é revista.
ALTER TABLE "reservation_settings"
  ADD CONSTRAINT "deposito_desligado_ate_haver_politica" CHECK ("deposito_ligado" = false);

-- ── 5. A hora local que não existe, e a que existe duas vezes ──────────────
--
-- «02h30 numa noite em que o relógio salta das 02h00 para as 03h00» e «02h30
-- que acontece duas vezes». O contrato pede que sejam RESOLVIDOS, não que não
-- rebentem — e resolver em silêncio é a metade errada: quem marca às 02h30 tem
-- de saber que a casa entendeu 03h30.
--
-- A base tem a tabela de fusos; nós não. Por isso a resposta vem daqui, e traz
-- o ESTADO com ela.
CREATE OR REPLACE FUNCTION instante_local(p_fuso TEXT, p_local TIMESTAMP)
RETURNS TABLE (instante TIMESTAMPTZ, estado TEXT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_i   TIMESTAMPTZ;
  v_ida TIMESTAMP;
BEGIN
  v_i   := p_local AT TIME ZONE p_fuso;
  v_ida := v_i AT TIME ZONE p_fuso;

  IF v_ida <> p_local THEN
    -- A hora não existe: o relógio saltou por cima dela. O Postgres devolve o
    -- instante seguinte, e nós dizemos que foi isso que aconteceu.
    RETURN QUERY SELECT v_i, 'INEXISTENTE'::TEXT;
  ELSIF ((v_i - INTERVAL '1 hour') AT TIME ZONE p_fuso) = p_local
     OR ((v_i + INTERVAL '1 hour') AT TIME ZONE p_fuso) = p_local THEN
    -- Duas horas UTC diferentes dão a mesma hora local: o relógio recuou.
    --
    -- ── E medi de que lado, em vez de o assumir ─────────────────────────────
    --
    -- Escrevi primeiro só o `+ 1 hour`, a supor que o Postgres escolhia a
    -- primeira ocorrência — a do horário de verão. Escolhe a SEGUNDA: 02h30 de
    -- 25/10/2026 em Madrid dá `02:30+01`, a hora padrão. Com só metade da
    -- verificação, a noite mais ambígua do ano respondia NORMAL.
    --
    -- Ficam os dois lados. O instante devolvido é o que a base escolhe, e o
    -- estado diz que houve escolha — para o ecrã poder perguntar em vez de
    -- decidir sozinho.
    RETURN QUERY SELECT v_i, 'AMBIGUA'::TEXT;
  ELSE
    RETURN QUERY SELECT v_i, 'NORMAL'::TEXT;
  END IF;
END;
$$;

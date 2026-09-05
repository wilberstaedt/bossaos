-- E28 · Equipa, escalas e ponto
-- Contrato: docs/architecture/ponto-e-escalas.md
--
-- Esta etapa mexe no salário de quem trabalha na casa, e quem é prejudicado por
-- um defeito aqui é a pessoa com menos poder para o contestar. Por isso a
-- marcação é imutável NA BASE, e não por convenção da aplicação.

CREATE TYPE "TipoDeMarcacao" AS ENUM ('ENTRADA', 'SAIDA');

CREATE TABLE "team_roles" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "nome"            TEXT NOT NULL,
  "cor"             TEXT,
  "arquivada_em"    TIMESTAMPTZ(6)
);
CREATE UNIQUE INDEX "uma_funcao_por_nome" ON "team_roles" ("location_id", "nome");

CREATE TABLE "shifts" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"     UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "membership_id"   UUID NOT NULL REFERENCES "memberships"("id") ON DELETE CASCADE,
  "role_id"         UUID REFERENCES "team_roles"("id") ON DELETE SET NULL,
  -- O DIA DE SERVIÇO, e não a data civil.
  "dia_de_servico"  DATE NOT NULL,
  -- Minutos desde a meia-noite do dia de serviço. As 00h30 do dia seguinte são
  -- 1470, e não 30: um turno que atravessa a meia-noite continua a ser um turno.
  "inicio_minutos"  INT NOT NULL,
  "fim_minutos"     INT NOT NULL,
  "nota"            TEXT,
  "criado_em"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "turno_comeca_antes_de_acabar" CHECK ("fim_minutos" > "inicio_minutos"),
  CONSTRAINT "turno_cabe_em_dois_dias" CHECK
    ("inicio_minutos" >= 0 AND "fim_minutos" <= 2880)
);
CREATE INDEX "shifts_por_dia" ON "shifts" ("location_id", "dia_de_servico");

CREATE TABLE "time_entries" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"     UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"         UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "membership_id"       UUID NOT NULL REFERENCES "memberships"("id") ON DELETE CASCADE,
  "tipo"                "TipoDeMarcacao" NOT NULL,
  "momento"             TIMESTAMPTZ(6) NOT NULL,
  "dia_de_servico"      DATE NOT NULL,
  "autor_membership_id" UUID NOT NULL REFERENCES "memberships"("id") ON DELETE RESTRICT,
  "corrige_id"          UUID UNIQUE REFERENCES "time_entries"("id") ON DELETE RESTRICT,
  "motivo"              TEXT,
  "origem"              TEXT,
  "criado_em"           TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  -- ── Uma correcção sem razão não se explica a ninguém ────────────────────
  --
  -- E é a quem foi corrigido que ela tem de ser explicada. Por isso o motivo é
  -- obrigatório na FORMA quando há correcção, e não numa validação que alguém
  -- se tem de lembrar de escrever.
  CONSTRAINT "correccao_exige_motivo" CHECK
    ("corrige_id" IS NULL OR length(btrim(COALESCE("motivo", ''))) > 0)
);
CREATE INDEX "time_entries_por_membro" ON "time_entries" ("membership_id", "dia_de_servico");
CREATE INDEX "time_entries_por_unidade" ON "time_entries" ("location_id", "dia_de_servico");

-- ── A MARCAÇÃO NÃO SE REESCREVE ───────────────────────────────────────────
--
-- A mesma `registo_imutavel()` que o E22 pôs nos movimentos de caixa e o E23
-- nos pagamentos. Um encarregado que tente reescrever a hora de entrada de
-- alguém recebe `REGISTO_IMUTAVEL` da BASE — não um aviso da aplicação, que se
-- contorna com um script.
--
-- Um registo que muda sem deixar marca não vale nada: nem para a casa, nem em
-- tribunal.
CREATE TRIGGER "marcacoes_sao_imutaveis"
  BEFORE UPDATE OR DELETE ON "time_entries"
  FOR EACH ROW EXECUTE FUNCTION registo_imutavel();

-- ── Uma correcção corrige o MESMO tipo, e da MESMA pessoa ─────────────────
--
-- Sem isto, uma «correcção» podia transformar a entrada de uma pessoa na saída
-- de outra — e o rasto ficava impecável a documentar uma coisa que nunca
-- aconteceu. A imutabilidade sozinha protege o passado; isto protege o sentido.
CREATE OR REPLACE FUNCTION correccao_e_da_mesma_marcacao()
RETURNS TRIGGER AS $$
DECLARE
  alvo RECORD;
BEGIN
  IF NEW."corrige_id" IS NULL THEN RETURN NEW; END IF;

  SELECT t."membership_id", t."tipo", t."location_id" INTO alvo
    FROM "time_entries" t WHERE t."id" = NEW."corrige_id";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CORRECCAO_SEM_ALVO: a marcação corrigida não existe'
      USING ERRCODE = 'check_violation';
  END IF;
  IF alvo."membership_id" <> NEW."membership_id"
     OR alvo."tipo" <> NEW."tipo"
     OR alvo."location_id" <> NEW."location_id" THEN
    RAISE EXCEPTION
      'CORRECCAO_TROCA_A_MARCACAO: uma correcção mantém a pessoa, o tipo e a unidade'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "correccao_mantem_o_sentido"
  BEFORE INSERT ON "time_entries"
  FOR EACH ROW EXECUTE FUNCTION correccao_e_da_mesma_marcacao();

ALTER TABLE "team_roles"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shifts"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_roles_por_org" ON "team_roles"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "shifts_por_org" ON "shifts"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());
CREATE POLICY "time_entries_por_org" ON "time_entries"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());

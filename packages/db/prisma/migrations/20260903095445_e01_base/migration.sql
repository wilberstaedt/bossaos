-- CreateTable
CREATE TABLE "app_meta" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_meta_pkey" PRIMARY KEY ("key")
);

-- Carimbo da versão do schema.
--
-- É esta linha que transforma a sonda de prontidão numa pergunta útil. Sem ela,
-- `SELECT 1` responde em qualquer Postgres de pé — incluindo um sem o nosso
-- schema, que é exactamente o estado que um deploy sem migração produz. Com
-- ela, /api/ready sabe distinguir "base em baixo" de "base viva, schema por
-- migrar" de "pronto".
--
-- Cada migração que mude o contrato lido pela aplicação actualiza este valor.
INSERT INTO "app_meta" ("key", "value", "updated_at")
VALUES ('schema_version', 'e01_base', NOW())
ON CONFLICT ("key") DO UPDATE
  SET "value" = EXCLUDED."value", "updated_at" = NOW();

-- ═══════════════════════════════════════════════════════════════════════════
-- E12 — o tema restaurado diz de que revisão veio.
--
-- A régua reprova «tema aplicado sem dizer de que revisão veio»: a publicação
-- tem revisões desde o E08, e a aparência não pode ser a única coisa sem rasto.
--
-- Restaurar cria revisão NOVA em vez de reactivar a antiga, e aponta à que
-- restaurou. Reactivar apagava o facto de ter havido uma descida pelo meio, e o
-- histórico passava a contar uma história que não aconteceu. É a mesma decisão
-- que o `restaura_de_id` do `menu_revisions` no E08.
--
-- A chave é COMPOSTA — `(organization_id, restaura_de_id)` → `(organization_id,
-- id)` — como todas as referências deste projecto desde o E03: a base recusa
-- apontar para a revisão de outra organização, e não é preciso confiar em quem
-- escreve a consulta.
-- AlterTable
ALTER TABLE "theme_revisions" ADD COLUMN     "restaura_de_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "theme_revisions_organization_id_id_key" ON "theme_revisions"("organization_id", "id");

-- AddForeignKey
ALTER TABLE "theme_revisions" ADD CONSTRAINT "theme_revisions_organization_id_restaura_de_id_fkey" FOREIGN KEY ("organization_id", "restaura_de_id") REFERENCES "theme_revisions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "demo_requests_chave_key" RENAME TO "demo_requests_chave_idempotencia_key";


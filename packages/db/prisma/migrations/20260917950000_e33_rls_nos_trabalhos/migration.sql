-- E33 · a `platform_jobs` tem `organization_id` e não tinha RLS
--
-- ── O defeito, e quem o apanhou ────────────────────────────────────────────
--
-- Tratei a tabela como sendo da plataforma e não lhe liguei RLS. Mas ela **tem**
-- `organization_id`: um trabalho é quase sempre de uma casa. Sem política, e com
-- o runtime a ter `SELECT`, um inquilino lia os trabalhos de outro — os tipos, os
-- alvos e os erros.
--
-- Apanhou-o a `validar-rls.sh`, a guarda que o sénior escreveu ontem à noite
-- para exactamente isto: **toda a tabela com `organization_id` tem RLS**. Ela
-- nasceu vermelha por uma tabela do E10 e apanhou a primeira tabela nova.
--
-- ── E a coluna é ANULÁVEL, o que faz a política ter duas metades ──────────
--
-- `organization_id IS NULL` é um trabalho da plataforma que não é de casa
-- nenhuma — uma migração global, uma limpeza. Esses não são de ninguém, e por
-- isso não são de todos: só a plataforma os vê.
--
-- Sem a primeira metade, a casa não veria os trabalhos dela. Sem a segunda, os
-- trabalhos globais ficavam invisíveis para quem os tem de operar.
ALTER TABLE "platform_jobs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trabalhos_da_casa" ON "platform_jobs"
  USING ("organization_id" = app_organizacao_actual())
  WITH CHECK ("organization_id" = app_organizacao_actual());

CREATE POLICY "plataforma_le_todos_os_trabalhos" ON "platform_jobs"
  FOR SELECT USING (plataforma_e_staff());

-- E a escrita continua a ser do runtime **para os da casa dele**: a política de
-- cima já o garante pelo `WITH CHECK`. Um trabalho global cria-se pela
-- credencial de migração, como tudo o que não é de inquilino nenhum.

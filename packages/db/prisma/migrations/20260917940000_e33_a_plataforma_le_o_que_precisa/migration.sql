-- E33 · a plataforma lê as sessões, as denúncias e a auditoria
--
-- ── O defeito, e quem o apanhou ────────────────────────────────────────────
--
-- A PLAT-008 devolvia 404 para uma sessão que existe. A `support_sessions` tem
-- RLS por organização — o que está certo, e é o que faz a casa vê-la — e o
-- caminho da plataforma corre por `comIdentidade`, que não define
-- `app.organization_id`. A política não devolvia linha nenhuma.
--
-- Apanhou-o a prova de NAVEGADOR. É a segunda vez nesta sessão que a RLS morde
-- um caminho de leitura que as provas de base não viam — a primeira foi a chave
-- de API no E32 —, e a razão é a mesma: nas provas de base o cliente é o dono
-- da tabela e passa por cima da política.
--
-- ── Uma POLÍTICA, e não uma porta estreita por consulta ──────────────────
--
-- O E05 fixou «cada função verifica por si», e narrow doors eram a escolha
-- consistente. Uma política é mais forte pelo mesmo critério: verifica por si
-- em **todas** as consultas àquela tabela, incluindo as que ninguém escreveu
-- ainda. Uma porta estreita protege as chamadas que existem; uma política
-- protege a tabela.
--
-- O `plataforma_e_staff()` já existe desde o E05, é `SECURITY DEFINER`, e sem
-- sessão devolve falso — `current_setting(..., true)` dá NULL, e NULL não está
-- em tabela nenhuma.
--
-- ── E é SÓ LEITURA ────────────────────────────────────────────────────────
--
-- `FOR SELECT`. A plataforma vê; escrever continua a ser pelo caminho
-- privilegiado, com auditoria na mesma instrução. Uma política de escrita aqui
-- desfazia a fronteira que a etapa inteira existe para manter.
CREATE POLICY "plataforma_le_sessoes_de_suporte" ON "support_sessions"
  FOR SELECT USING (plataforma_e_staff());

CREATE POLICY "plataforma_le_denuncias" ON "abuse_reports"
  FOR SELECT USING (plataforma_e_staff());

-- A auditoria global (PLAT-013). O inquilino já lê a dele pela política do E03;
-- isto acrescenta a leitura de quem opera a plataforma, e mais nada.
CREATE POLICY "plataforma_le_auditoria" ON "audit_events"
  FOR SELECT USING (plataforma_e_staff());

-- E as políticas de acesso e retenção, para a PLAT-009 poder diagnosticar sem
-- entrar na casa: saber que a política existe não é ver o conteúdo dela em uso.
CREATE POLICY "plataforma_le_politicas_de_acesso" ON "access_policies"
  FOR SELECT USING (plataforma_e_staff());

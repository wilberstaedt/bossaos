-- ── E14 · combos, e a regra de dinheiro que os acompanha ───────────────────
--
-- «Implemente combos/menus fechados com escolhas por curso, preço fixo e
-- componentes identificáveis. **Não some o preço do combo e de seus componentes
-- duas vezes**» (E14, entregar 7).
--
-- A frase em maiúsculas é a que custa dinheiro, e o defeito é fácil de escrever:
-- o combo entra como linha com o preço fixo, os componentes entram como linhas
-- para a cozinha saber o que fazer, e a soma apanha os dois. A conta vem a
-- dobrar e ninguém repara, porque cada linha isolada está certa.
--
-- ── A forma que impede isso ────────────────────────────────────────────────
--
-- Um componente é uma linha com `linha_pai_id` preenchido. Quem soma ignora as
-- linhas com pai — não por lembrança, mas porque a coluna existe para isso. E o
-- componente continua **identificável**: a cozinha lê a linha, o cliente lê o
-- combo, e a conta soma uma vez.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "combo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "order_lines" ADD COLUMN IF NOT EXISTS "linha_pai_id" UUID;

ALTER TABLE "order_lines"
  ADD CONSTRAINT "order_lines_organization_id_linha_pai_id_fkey"
  FOREIGN KEY ("organization_id", "linha_pai_id")
  REFERENCES "order_lines"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "order_lines_linha_pai_id_idx" ON "order_lines"("linha_pai_id");

-- ── E um componente não tem preço próprio ─────────────────────────────────
--
-- É a mesma regra escrita na base, para não depender de quem soma. Um componente
-- com preço é um convite a somá-lo: alguém escreve um relatório novo daqui a seis
-- meses, não conhece a regra do `linha_pai_id`, e a conta vem a dobrar outra vez.
ALTER TABLE "order_lines"
  ADD CONSTRAINT "componente_de_combo_nao_tem_preco"
  CHECK ("linha_pai_id" IS NULL OR "preco_menor" IS NULL);

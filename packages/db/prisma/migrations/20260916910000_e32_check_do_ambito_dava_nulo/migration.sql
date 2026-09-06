-- E32 · o CHECK do âmbito não protegia o caso que existia para proteger
--
-- ── A armadilha, e quem a apanhou ──────────────────────────────────────────
--
-- `CHECK (array_length(escopos, 1) >= 1)` parece dizer «uma chave tem de ter
-- pelo menos um âmbito». Não diz.
--
-- Em PostgreSQL, `array_length('{}', 1)` devolve **NULL**, e não zero. E um
-- `CHECK` cuja expressão dá NULL **passa** — a regra é «recusa quando é falso»,
-- e NULL não é falso. Ou seja: a restrição recusava um array com zero elementos
-- em todos os casos menos exactamente aquele, o array vazio.
--
-- Uma chave sem âmbito é uma chave de administrador com outro nome, e era a
-- única forma de a criar que a restrição deixava passar.
--
-- Apanhou-o a prova, à primeira corrida, no caso «a base RECUSA uma chave sem
-- âmbito». É a razão de o controlo existir: sem ele, esta restrição ficava
-- escrita, lida por quem viesse a seguir como uma garantia, e não garantia nada.
--
-- A lição, que é a do projecto inteiro noutra roupagem: **uma garantia que
-- nunca reprovou não é uma garantia.**
ALTER TABLE "api_keys" DROP CONSTRAINT "chave_tem_ambito";
ALTER TABLE "api_keys" ADD CONSTRAINT "chave_tem_ambito"
  CHECK (coalesce(array_length("escopos", 1), 0) >= 1);

-- E o mesmo defeito estava na irmã, escrita na mesma migração e com a mesma
-- forma. Não a apanhou nenhum teste — apanhou-a a leitura, depois de saber o
-- que procurar. Quando um defeito tem uma família, procura-se a família.
ALTER TABLE "webhook_endpoints" DROP CONSTRAINT "assina_pelo_menos_um_evento";
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "assina_pelo_menos_um_evento"
  CHECK (coalesce(array_length("eventos", 1), 0) >= 1);

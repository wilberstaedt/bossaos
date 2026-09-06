-- ── UM FECHO DE CAIXA DE CADA VEZ ────────────────────────────────────────────
--
-- O `fecharCaixa` lê o estado, faz cinco validações e só depois cria o evento de
-- fecho — sem transacção própria, sem tranca e sem nível de isolamento. O estado
-- deriva do ÚLTIMO acontecimento, e derivar é uma LEITURA, não uma trava.
--
-- Medido a 06/09, com as duas transacções demonstravelmente abertas ao mesmo
-- tempo (`pid` 54579 e 54580, a segunda a abrir antes de a primeira gravar):
-- **dois eventos FECHO na mesma caixa**, as duas chamadas bem sucedidas. Não
-- havia restrição nenhuma em `cash_register_events` além da chave primária.
--
-- ── Porque é que isto é dinheiro e não arrumação ─────────────────────────────
--
-- Dois fechos são duas contagens e, pior, **duas decisões de autorização de
-- divergência tomadas em separado**: cada fecho carrega o seu `autorizado_por`.
-- Ao fim de um serviço com dois operadores — ou um duplo toque no mesmo botão —
-- quem lê o rasto não consegue dizer qual das contagens foi a boa.
--
-- ── Porque é que é um GATILHO com tranca, e não um índice único ──────────────
--
-- Um índice único por caixa estaria errado: a caixa reabre com motivo, e um
-- segundo ciclo TEM de poder fechar. O que é único não é o fecho — é **o fecho
-- por ciclo**, e o ciclo não existe como coluna. Escrevê-lo seria inventar um
-- número que se deriva, e este projecto não escreve o que sabe derivar.
--
-- ── E a tranca é o que faz a diferença entre ler e travar ────────────────────
--
-- `FOR UPDATE` na linha da caixa: a segunda transacção **espera** pela primeira e
-- só depois lê. Sem ela, este gatilho tinha exactamente a corrida que veio
-- fechar — leria o último acontecimento antes de a primeira gravar, e as duas
-- passavam. É a distinção do E13, agora do lado da base: o `serializable` faz a
-- segunda abortar com `40001` (uma resposta sobre a base); a tranca faz a segunda
-- esperar e receber uma resposta de NEGÓCIO.
CREATE OR REPLACE FUNCTION um_fecho_de_caixa_de_cada_vez() RETURNS trigger AS $$
DECLARE
  ultimo "AcontecimentoDeCaixa";
BEGIN
  -- A tranca é sobre a CAIXA e é tomada antes de ler o histórico dela. Nada
  -- disto vale se a leitura vier primeiro.
  PERFORM 1 FROM "cash_registers" WHERE "id" = NEW."register_id" FOR UPDATE;

  SELECT e."tipo" INTO ultimo FROM "cash_register_events" e
   WHERE e."register_id" = NEW."register_id"
   ORDER BY e."criado_em" DESC, e."id" DESC LIMIT 1;

  IF ultimo = 'FECHO' THEN
    RAISE EXCEPTION 'CAIXA_FECHADA: a caixa % já está fechada; reabra-a com motivo', NEW."register_id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Só sobre o FECHO. A REABERTURA tem a sua própria regra (`reabrirCaixa` recusa
-- reabrir o que não está fechado) e a CONTAGEM pode repetir-se — contar duas
-- vezes é trabalho normal de fim de serviço.
CREATE TRIGGER "um_fecho_de_caixa_de_cada_vez"
  BEFORE INSERT ON "cash_register_events"
  FOR EACH ROW WHEN (NEW."tipo" = 'FECHO')
  EXECUTE FUNCTION um_fecho_de_caixa_de_cada_vez();

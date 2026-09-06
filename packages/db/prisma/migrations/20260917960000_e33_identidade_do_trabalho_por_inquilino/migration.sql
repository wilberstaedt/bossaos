-- E33 · a identidade de um trabalho atravessava inquilinos
--
-- ── O defeito, e de onde ele veio ──────────────────────────────────────────
--
-- A identidade era `tipo:alvo:tentativa`, e o índice único era **global**. Duas
-- casas que enfileirassem o mesmo tipo sobre o mesmo alvo na mesma tentativa
-- colidiam: a segunda levava `duplicate key` e **nunca enfileirava**.
--
-- Medido, e não presumido: com a casa A e a casa B a pedir
-- `prova-colisao:relatorio-mensal:1`, a segunda dá
-- `duplicate key value violates unique constraint "um_trabalho_por_identidade"`.
--
-- ── É OMISSÃO, e a proveniência explica-a ────────────────────────────────
--
-- Copiei a forma da `print_jobs` do E31, onde a identidade é
-- `tipo:documento_id:via`. Lá funciona **porque o `documento_id` é um UUID**:
-- é único no mundo por construção, e por isso a organização nunca fez falta na
-- chave — ela já lá estava, escondida dentro do identificador do documento.
--
-- Aqui o `alvo` é `TEXT`. É texto livre — «relatorio-mensal», «carta», o nome de
-- um ficheiro. A propriedade que fazia o padrão do E31 estar certo **não
-- transfere**, e eu copiei a forma sem voltar a verificar o raciocínio.
--
-- É a mesma família de erro que este projecto persegue nas guardas: reconhecer
-- a FORMA de uma coisa que funcionou e não medir se a razão pela qual ela
-- funcionava continua a valer.
--
-- ── E porque é que isto se conserta agora ─────────────────────────────────
--
-- Hoje não colide em serviço, porque o `enfileirarTrabalho` só é chamado pelo
-- `reprocessarTrabalho`, sobre um trabalho que já existe. É exactamente por
-- isso que a correcção é barata agora: não há dados a migrar nem chamadores a
-- rever. Daqui a duas etapas, com a fila em uso, era outra conversa.
--
-- ── O `coalesce` e o que ele significa ────────────────────────────────────
--
-- `organization_id` é ANULÁVEL — e isso é desenho, não descuido: um trabalho
-- global (uma migração, uma limpeza) não é de casa nenhuma. Sem `coalesce`, a
-- concatenação com NULL daria NULL e a identidade desaparecia.
--
-- O literal `plataforma` é o espaço de nomes desses trabalhos. Dois trabalhos
-- globais do mesmo tipo sobre o mesmo alvo **devem** deduplicar entre si — é a
-- razão de a fila existir. O que não devem é deduplicar contra os de uma casa.
CREATE OR REPLACE FUNCTION identidade_de_trabalho_deriva()
RETURNS TRIGGER AS $$
BEGIN
  NEW."identidade" :=
    coalesce(NEW."organization_id"::text, 'plataforma')
    || ':' || NEW."tipo" || ':' || NEW."alvo" || ':' || NEW."tentativa";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Reescrever as identidades que já existem ──────────────────────────────
--
-- São poucas e são do arnês, mas deixá-las na forma antiga faria a restrição
-- única passar a comparar maçãs com laranjas: uma identidade velha e uma nova
-- para o mesmo trabalho nunca colidiriam, e a deduplicação deixava de valer
-- para as linhas antigas em silêncio.
--
-- O `UPDATE` dispara o gatilho, que as reescreve todas.
UPDATE "platform_jobs" SET "tentativa" = "tentativa";

-- O índice não muda de forma — continua único sobre `identidade`. O que mudou
-- foi o que a identidade contém, e é aí que a correcção vive.
--
-- Deliberadamente NÃO se troca por um índice composto
-- `(organization_id, tipo, alvo, tentativa)`: com a coluna anulável, o
-- PostgreSQL trata cada NULL como distinto, e dois trabalhos globais iguais
-- deixavam de deduplicar — que é o oposto do que a fila existe para fazer.

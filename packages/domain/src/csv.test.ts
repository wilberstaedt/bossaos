import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectarSeparador, lerCsv, neutralizarCampo, paraCsv } from './csv.ts';

/**
 * O caso que o `dados-e-accoes-sensiveis.md` escreve à mão:
 *
 * > | Produto chamado `=1+1` exportado para CSV | neutralizado, não fórmula |
 *
 * e o controlo negativo que ele também escreve à mão:
 *
 * > **Controlo negativo do CSV**: gerar a exportação com a neutralização
 * > desligada e confirmar que o campo sai como fórmula. Um teste que só verifica
 * > que o ficheiro tem o nome certo não está a testar isto — está a testar que a
 * > exportação corre.
 */
describe('1. CSV é executável, e a exportação tem de o saber', () => {
  it('os quatro prefixos de fórmula saem neutralizados', () => {
    for (const perigoso of ['=1+1', '+1+1', '@SUM(A1)', '=HYPERLINK("http://mau","clica")']) {
      const saida = neutralizarCampo(perigoso);
      assert.equal(saida[0], "'", `${perigoso} saiu sem neutralizar`);
      assert.ok(saida.endsWith(perigoso), 'o valor original tem de continuar legível');
    }
  });

  it('a carga de DDE, que é a que executa mesmo', () => {
    // `=cmd|' /C calc'!A0` é o payload clássico: não calcula nada, lança um
    // processo. É o que transforma "abri o relatório" em "corri o que o dono do
    // restaurante escreveu no nome de um prato".
    assert.equal(neutralizarCampo("=cmd|' /C calc'!A0"), "'=cmd|' /C calc'!A0");
  });

  it('o tabulador e o retorno também iniciam fórmula', () => {
    // Ficam de fora de quase todas as listas, e passam.
    assert.equal(neutralizarCampo('\t=1+1'), "'\t=1+1");
    assert.equal(neutralizarCampo('\r=1+1'), "'\r=1+1");
  });

  it('UM NÚMERO NEGATIVO NÃO É UMA FÓRMULA — é o par que impede o exagero', () => {
    // Sem esta asserção, a regra ingénua "tudo o que comece por - " passava nos
    // casos de cima e estragava a coluna dos preços inteira. Quem recebe uma
    // exportação com os negativos em texto corrige-a à mão, e o caminho mais
    // curto a seguir é alguém desligar a neutralização.
    for (const numero of ['-5,50', '-5.50', '-1200', '+3', '-1.5e3']) {
      assert.equal(neutralizarCampo(numero), numero, `${numero} não devia ser tocado`);
    }
    // Mas o que começa por menos e NÃO é número continua a ser neutralizado.
    assert.equal(neutralizarCampo('-2+3'), "'-2+3");
    assert.equal(neutralizarCampo('-1+1+cmd|x'), "'-1+1+cmd|x");
  });

  it('texto normal não é tocado', () => {
    for (const inocente of ['Croquetas caseras', 'Café con leche', '', 'Tarta de almendra']) {
      assert.equal(neutralizarCampo(inocente), inocente);
    }
  });

  it('o par completo, à saída do escritor', () => {
    const linhas = [['nome', 'preco'], ['=1+1', '-5,50']];
    const comGuarda = paraCsv(linhas);
    assert.ok(comGuarda.includes("'=1+1"), 'a fórmula tinha de sair neutralizada');
    assert.ok(comGuarda.includes('-5,50'), 'o negativo tinha de sair intacto');

    // ── CONTROLO NEGATIVO, o que o E00 pede por escrito ─────────────────────
    const semGuarda = paraCsv(linhas, { neutralizar: false });
    assert.ok(!semGuarda.includes("'=1+1"), 'sem guarda não pode haver apóstrofo');
    assert.ok(semGuarda.includes('=1+1'), 'sem guarda, o campo sai COMO FÓRMULA');
    assert.notEqual(comGuarda, semGuarda, 'as duas saídas têm de ser diferentes');
  });

  it('as aspas NÃO protegem — por isso a neutralização não é aspas', () => {
    // Um campo com vírgula leva aspas, e continua a precisar de neutralização:
    // `"=1+1,2"` é avaliado pelo Excel na mesma. Aspas são sintaxe do CSV, não
    // do avaliador de fórmulas.
    const saida = paraCsv([['=1+1,2']]);
    assert.ok(saida.includes('"\'=1+1,2"'), `saiu ${JSON.stringify(saida)}`);
  });

  it('leva BOM: sem ele o Excel em Windows lê UTF-8 como Latin-1', () => {
    assert.equal(paraCsv([['Café']]).charCodeAt(0), 0xfeff);
  });
});

describe('2. Ler o que outra pessoa escreveu', () => {
  it('aspas, vírgulas e quebras de linha dentro de um campo', () => {
    const r = lerCsv('nome,descricao\r\n"Croquetas","de jamón, con ""bechamel""\nespesa"\r\n');
    assert.deepEqual(r.problemas, []);
    assert.deepEqual(r.cabecalho, ['nome', 'descricao']);
    assert.deepEqual(r.linhas, [['Croquetas', 'de jamón, con "bechamel"\nespesa']]);
  });

  it('o Excel espanhol escreve ponto e vírgula, e é preciso notar', () => {
    // Assumir a vírgula lê a carta inteira como uma coluna só, e o erro que
    // aparece é "faltam colunas" — que manda procurar no sítio errado.
    assert.equal(detectarSeparador('nome;preco;sku'), ';');
    assert.equal(detectarSeparador('nome,preco,sku'), ',');
    // A vírgula DENTRO de aspas não conta: é conteúdo, não estrutura.
    assert.equal(detectarSeparador('"a,b,c,d";preco'), ';');
    const r = lerCsv('nome;preco\r\nCroquetas;8,50\r\n');
    assert.deepEqual(r.linhas, [['Croquetas', '8,50']]);
  });

  it('erros POR LINHA, e a linha errada não entra', () => {
    // Quem exporta do sistema antigo traz quatrocentas linhas e três erradas.
    // Parar na primeira obriga a quatro voltas, e à segunda a pessoa desiste.
    const r = lerCsv([
      'nome,preco,sku',
      'Croquetas,8.50,CRO-1',
      'Tortilla,7.00',            // falta uma
      'Pan,2.00,PAN-1,a mais',    // uma a mais
      'Café,1.50,CAF-1',
    ].join('\n'));
    assert.equal(r.linhas.length, 2, 'só as duas boas entram');
    assert.deepEqual(r.linhas.map((l) => l[0]), ['Croquetas', 'Café']);

    // Os DOIS problemas, com o número de linha que a pessoa vê no Excel.
    assert.deepEqual(r.problemas.map((p) => [p.linha, p.erro]), [
      [3, 'colunas_a_menos'],
      [4, 'colunas_a_mais'],
    ]);
  });

  it('uma linha com colunas a menos é RECUSADA, não preenchida', () => {
    const r = lerCsv('nome,preco,sku\nTortilla,7.00\n');
    assert.deepEqual(r.linhas, [], 'campos deslocados são piores do que uma recusa');
    assert.equal(r.problemas.length, 1);
    assert.equal(r.problemas[0]?.erro, 'colunas_a_menos');
    // A linha que a pessoa vê no Excel, não o índice do vector.
    assert.equal(r.problemas[0]?.linha, 2);
  });

  it('aspas por fechar não passam em silêncio', () => {
    const r = lerCsv('nome\n"sem fim\n');
    assert.equal(r.problemas[0]?.erro, 'aspas_por_fechar');
  });

  it('ida e volta: o que se escreve é o que se lê', () => {
    const original = [['nome', 'descricao'], ['Café', 'com "aspas", vírgula\ne quebra']];
    const lido = lerCsv(paraCsv(original));
    assert.deepEqual([lido.cabecalho, ...lido.linhas], original);
    assert.deepEqual(lido.problemas, []);
  });
});

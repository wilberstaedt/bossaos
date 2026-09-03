import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { linhasParaGravar, preverImportacao, type Existente } from './importacao.ts';

const CABECALHO = ['nome', 'sku', 'preco', 'moeda'];
const COLUNAS = { nome: 'nome', sku: 'sku', preco: 'preco', moeda: 'moeda' };

const EXISTENTES: Existente[] = [
  { productId: 'p-cro', sku: 'CRO-1', nome: 'Croquetas', precoMenor: 850, moeda: 'EUR' },
  { productId: 'p-caf', sku: 'CAF-1', nome: 'Café', precoMenor: 150, moeda: 'EUR' },
  // Um produto SEM sku, que é o caso onde a fusão por nome faria estragos.
  { productId: 'p-sem', sku: null, nome: 'Tortilla', precoMenor: 700, moeda: 'EUR' },
];

const prever = (linhas: string[][], estrategia: 'criar_apenas' | 'actualizar_por_sku') =>
  preverImportacao(linhas, CABECALHO, COLUNAS, estrategia, EXISTENTES);

describe('1. Nome igual não é chave de identidade', () => {
  it('DOIS "Café" não são o mesmo produto', () => {
    // O erro que isto evita é irreversível na prática: fundir por nome apaga um
    // produto e com ele a ficha de alérgenos que alguém assinou. Quem descobre,
    // descobre com um cliente à mesa.
    const p = prever([['Café', 'CAF-2', '1,80', 'EUR']], 'actualizar_por_sku');
    assert.equal(p.linhas[0]?.accao, 'criar', 'o nome igual não pode fundir com CAF-1');
    assert.equal(p.resumo.criar, 1);
    assert.equal(p.resumo.actualizar, 0);
  });

  it('um SKU vazio NÃO autoriza fundir — é erro, não é "procura pelo nome"', () => {
    // Sem esta recusa, "Tortilla" sem SKU encontrava a "Tortilla" existente e
    // sobrescrevia-a. É exactamente aqui que a carta de alguém seria fundida
    // com a sua própria.
    const p = prever([['Tortilla', '', '7,50', 'EUR']], 'actualizar_por_sku');
    assert.equal(p.linhas[0]?.accao, 'erro');
    assert.equal(p.linhas[0]?.erro, 'sku_em_falta_para_actualizar');
  });

  it('com o SKU certo, actualiza — é o par que separa os dois', () => {
    // Sem isto, uma implementação que nunca actualizasse nada passava nos dois
    // casos de cima e a estratégia "actualizar" não existia.
    const p = prever([['Croquetas de jamón', 'CRO-1', '9,00', 'EUR']], 'actualizar_por_sku');
    assert.equal(p.linhas[0]?.accao, 'actualizar');
    assert.equal(p.linhas[0]?.productId, 'p-cro');
    assert.deepEqual(p.linhas[0]?.mudancas, [
      { campo: 'nome', antes: 'Croquetas', depois: 'Croquetas de jamón' },
      { campo: 'preco', antes: '850 EUR', depois: '900 EUR' },
    ]);
  });

  it('a mesma importação repetida NÃO duplica e NÃO conta como trabalho', () => {
    // É o aceite 2 do E08. E "nada a fazer" é uma acção própria: contá-la como
    // "actualizar" fazia a segunda importação do mesmo ficheiro parecer trabalho.
    const ficheiro = [['Croquetas', 'CRO-1', '8,50', 'EUR'], ['Café', 'CAF-1', '1,50', 'EUR']];
    const p = prever(ficheiro, 'actualizar_por_sku');
    assert.deepEqual(p.resumo, { criar: 0, actualizar: 0, ignorar: 2, erro: 0 });
    assert.deepEqual(linhasParaGravar(p), [], 'não há nada para escrever');
  });

  it('em criar_apenas, nada é tocado — o lado seguro', () => {
    // Uma importação que só cria nunca destrói nada, e o pior que faz é
    // duplicados visíveis, que se apagam.
    const p = prever([['Croquetas', 'CRO-1', '8,50', 'EUR']], 'criar_apenas');
    assert.equal(p.linhas[0]?.accao, 'criar');
    assert.equal(p.resumo.actualizar, 0);
  });

  it('dois SKUs iguais no MESMO ficheiro é erro, não "o último ganha"', () => {
    // Nós não sabemos qual das duas está certa. Quem corrige é quem fez o
    // ficheiro.
    const p = prever([
      ['Croquetas', 'CRO-9', '8,50', 'EUR'],
      ['Croquetas grandes', 'CRO-9', '9,50', 'EUR'],
    ], 'criar_apenas');
    assert.equal(p.linhas[0]?.accao, 'criar');
    assert.equal(p.linhas[1]?.accao, 'erro');
    assert.equal(p.linhas[1]?.erro, 'sku_repetido_no_ficheiro');
  });
});

describe('2. Erros por linha, e o preço sem vírgula flutuante', () => {
  it('o preço passa pelo parser do E07, não por parseFloat', () => {
    const p = prever([['Croquetas', 'X-1', '0,29', 'EUR']], 'criar_apenas');
    // `parseFloat('0.29') * 100` dá 28,999… e trunca para 28. Aqui é 29.
    assert.equal(p.linhas[0]?.precoMenor, 29);
  });

  it('separador de milhares é ambíguo e recusa-se', () => {
    // `1.234,56` e `1,234.56` são a mesma cadeia em convenções diferentes, e
    // adivinhar erra por um factor de mil.
    const p = prever([['Menu', 'X-2', '1.234,56', 'EUR']], 'criar_apenas');
    assert.equal(p.linhas[0]?.accao, 'erro');
    assert.equal(p.linhas[0]?.erro, 'preco_ilegivel');
  });

  it('preço sem moeda é erro — um número não é dinheiro', () => {
    const p = preverImportacao(
      [['Croquetas', 'X-3', '8,50', '']], CABECALHO, COLUNAS, 'criar_apenas', EXISTENTES,
    );
    assert.equal(p.linhas[0]?.erro, 'moeda_invalida');
  });

  it('sem nome não há produto', () => {
    const p = prever([['   ', 'X-4', '8,50', 'EUR']], 'criar_apenas');
    assert.equal(p.linhas[0]?.erro, 'sem_nome');
  });

  it('as linhas boas passam mesmo com linhas más à volta', () => {
    // Quem exporta do sistema antigo traz quatrocentas linhas e três erradas.
    const p = prever([
      ['Croquetas', 'N-1', '8,50', 'EUR'],
      ['', 'N-2', '1,00', 'EUR'],
      ['Pulpo', 'N-3', 'muito', 'EUR'],
      ['Gazpacho', 'N-4', '4,50', 'EUR'],
    ], 'criar_apenas');
    assert.deepEqual(p.resumo, { criar: 2, actualizar: 0, ignorar: 0, erro: 2 });
    // A linha que a pessoa vê no Excel, não o índice do vector.
    assert.deepEqual(p.linhas.filter((l) => l.accao === 'erro').map((l) => l.linha), [3, 4]);
  });

  it('as linhas com erro NÃO entram no que se grava', () => {
    const p = prever([['', 'N-9', '1,00', 'EUR'], ['Pulpo', 'N-8', '12,00', 'EUR']], 'criar_apenas');
    assert.deepEqual(linhasParaGravar(p).map((l) => l.nome), ['Pulpo']);
  });

  it('o resumo é a SOMA das linhas, não uma contagem à parte', () => {
    const p = prever([
      ['A', 'S-1', '1,00', 'EUR'], ['', 'S-2', '', ''], ['Croquetas', 'CRO-1', '8,50', 'EUR'],
    ], 'actualizar_por_sku');
    const soma = p.resumo.criar + p.resumo.actualizar + p.resumo.ignorar + p.resumo.erro;
    assert.equal(soma, p.linhas.length, 'duas contagens divergem; esta tem de ser a mesma');
  });
});

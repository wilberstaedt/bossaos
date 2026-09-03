import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deMenorParaTexto, deTextoParaMenor, escalaDaMoeda, moedaValida, somar,
} from './dinheiro.ts';

/**
 * Dinheiro sem vírgula flutuante.
 *
 * O contrato di-lo e a régua do E07 repete-o. O que este ficheiro acrescenta é a
 * **demonstração**: o primeiro grupo mostra o erro que a regra evita, com o
 * número exacto, em vez de o afirmar.
 */

describe('1. Porque é que não se usa `parseFloat` — medido, não afirmado', () => {
  /**
   * A primeira versão deste grupo dizia que `parseFloat('8.07') * 100` falhava.
   * **Não falha.** Escrevi um número plausível em vez de o medir, e o teste
   * ficou vermelho — o que é o teste a funcionar. Estes são os valores reais.
   */
  it('há 1145 preços em euros, de 0 a 200, que o float trunca mal', () => {
    // Contados, não estimados. Um único exemplo escolhido a dedo seria uma
    // curiosidade; mais de mil num intervalo que qualquer carta usa é a razão.
    const maus: string[] = [];
    for (let c = 0; c <= 20000; c++) {
      const texto = (c / 100).toFixed(2);
      if (Math.trunc(parseFloat(texto) * 100) !== c) maus.push(texto);
    }
    assert.equal(maus.length, 1145);
    assert.equal(maus[0], '0.29', 'o primeiro é vinte e nove cêntimos');
  });

  it('e o parser dos dígitos acerta em TODOS eles', () => {
    // O par: o mesmo conjunto que o float estraga, por aqui sai certo. Sem este
    // caso, o de cima seria uma queixa sobre o JavaScript; com ele, é a prova
    // de que este caminho não tem o problema.
    let errados = 0;
    for (let c = 0; c <= 20000; c++) {
      if (deTextoParaMenor((c / 100).toFixed(2).replace('.', ','), 'EUR') !== c) errados += 1;
    }
    assert.equal(errados, 0);
  });

  it('o caso concreto: 0,29 dá 29 e não 28', () => {
    assert.equal(Math.trunc(parseFloat('0.29') * 100), 28, 'é este o cêntimo que desaparece');
    assert.equal(deTextoParaMenor('0,29', 'EUR'), 29);
    assert.equal(deTextoParaMenor('0.29', 'EUR'), 29, 'ponto e vírgula são o mesmo separador');
  });
});

describe('2. A escala vem da moeda, não é assumida', () => {
  it('o iene não tem casas decimais', () => {
    assert.equal(escalaDaMoeda('JPY'), 0);
    assert.equal(deTextoParaMenor('1250', 'JPY'), 1250);
    // 12,50 ienes não existe. Aceitá-lo e arredondar decidia por quem escreveu.
    assert.equal(deTextoParaMenor('12,50', 'JPY'), null);
  });

  it('o dinar tem três', () => {
    assert.equal(escalaDaMoeda('TND'), 3);
    assert.equal(deTextoParaMenor('1,005', 'TND'), 1005);
    // E o float volta a falhar aqui — 1004.9999… — medido como em cima.
    assert.equal(Math.trunc(parseFloat('1.005') * 1000), 1004);
  });

  it('o que não conhecemos tem duas, e isso é uma escolha visível', () => {
    assert.equal(escalaDaMoeda('EUR'), 2);
    assert.equal(escalaDaMoeda('ZZZ'), 2);
  });
});

describe('3. O que se recusa, e devolve NULL em vez de zero', () => {
  it('vazio não é zero', () => {
    // Zero é um preço: grátis. Um campo em branco não é grátis, é por preencher.
    assert.equal(deTextoParaMenor('', 'EUR'), null);
    assert.equal(deTextoParaMenor('   ', 'EUR'), null);
  });

  it('mais casas do que a moeda tem é entrada errada, não arredondamento', () => {
    assert.equal(deTextoParaMenor('8,005', 'EUR'), null);
  });

  it('separador de milhares é recusado — é ambíguo entre convenções', () => {
    // `1.234,56` e `1,234.56` são o mesmo número em sítios diferentes.
    // Adivinhar qual é escolheria o preço errado por um factor de mil.
    assert.equal(deTextoParaMenor('1.234,56', 'EUR'), null);
    assert.equal(deTextoParaMenor('1,234.56', 'EUR'), null);
  });

  it('o que não é um número é recusado', () => {
    for (const t of ['oito', '8€', '8,', ',50', '8..0', '1e3']) {
      assert.equal(deTextoParaMenor(t, 'EUR'), null, `"${t}" foi aceite`);
    }
  });

  it('e o código de moeda tem forma', () => {
    assert.equal(moedaValida('EUR'), true);
    assert.equal(moedaValida('eur'), false, 'minúsculas passam despercebidas até se comparar');
    assert.equal(moedaValida('EURO'), false);
  });
});

describe('4. Ida e volta, e a soma', () => {
  it('texto → menor → texto devolve o mesmo', () => {
    for (const t of ['0,00', '8,07', '1250,99', '0,05']) {
      const menor = deTextoParaMenor(t, 'EUR');
      assert.ok(menor !== null);
      assert.equal(deMenorParaTexto(menor, 'EUR'), t);
    }
    assert.equal(deMenorParaTexto(1250, 'JPY'), '1250', 'sem casas, sem vírgula');
  });

  it('somar mantém a moeda e o inteiro', () => {
    const r = somar([
      { montanteMenor: 800, moeda: 'EUR' },
      { montanteMenor: 80, moeda: 'EUR' },
      { montanteMenor: 120, moeda: 'EUR' },
    ]);
    assert.deepEqual(r, { montanteMenor: 1000, moeda: 'EUR' });
  });

  it('somar RECUSA moedas diferentes em vez de converter', () => {
    // Converter exigiria uma taxa, e uma taxa exige data e fonte. Nada disso
    // existe aqui, e inventá-lo daria um total irreprodutível amanhã.
    const r = somar([{ montanteMenor: 800, moeda: 'EUR' }, { montanteMenor: 800, moeda: 'BRL' }]);
    assert.deepEqual(r, { erro: 'moedas_diferentes', moedas: ['EUR', 'BRL'] });
  });

  it('um montante fraccionário REBENTA em vez de arredondar', () => {
    // Chegar aqui com 8.5 cêntimos significa que alguém fez contas em euros
    // atrás. Arredondar em silêncio esconde a causa.
    assert.throws(
      () => somar([{ montanteMenor: 8.5, moeda: 'EUR' }]),
      /unidades mínimas/,
    );
  });
});

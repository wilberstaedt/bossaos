import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMIAR,
  cumpre,
  lerHex,
  luminanciaRelativa,
  melhorTextoSobre,
  razaoArredondada,

} from './contraste.ts';

const VERDE = '#102E35';
const CORAL = '#F5664D';
const AREIA = '#F7F4EC';
const CITRICO = '#DDEA91';
const CINZA = '#51666A';
const BRANCO = '#FFFFFF';
const CORAL_LOGO = '#FB4C39';

describe('contraste', () => {
  // A tabela da p. 16 do manual de marca não foi calculada por mim. Se a minha
  // implementação não a reproduzir ao centésimo, ou a minha matemática está
  // errada ou o manual está — e as duas hipóteses valem a pena descobrir antes
  // de haver 396 vistas assentes nela.
  it('reproduz a tabela publicada no manual (p. 16)', () => {
    const publicado: Array<[string, string, number, string]> = [
      [VERDE, AREIA, 13.05, 'verde / areia'],
      [BRANCO, VERDE, 14.34, 'branco / verde'],
      [VERDE, CORAL, 4.71, 'verde / coral'],
      [VERDE, CITRICO, 11.1, 'verde / cítrico'],
      [CINZA, AREIA, 5.52, 'cinza / areia'],
      [BRANCO, CORAL, 3.05, 'branco / coral'],
      [CORAL, AREIA, 2.77, 'coral / areia'],
    ];

    for (const [a, b, esperado, rotulo] of publicado) {
      assert.equal(razaoArredondada(a, b), esperado, `${rotulo} devia dar ${esperado}`);
    }
  });

  // O ADR 0001 mediu o coral da arte contra o coral do token para decidir qual
  // fica na interface. São três números independentes dos do manual.
  it('reproduz a tabela do ADR 0001 para o coral da logo', () => {
    assert.equal(razaoArredondada(CORAL_LOGO, BRANCO), 3.39);
    assert.equal(razaoArredondada(CORAL_LOGO, AREIA), 3.08);
    assert.equal(razaoArredondada(CORAL_LOGO, VERDE), 4.23);
  });

  it('a decisão do ADR sobre qual coral vai para a interface confere', () => {
    // O token do manual passa TEXTO sobre o verde; o coral da arte não.
    assert.ok(cumpre(VERDE, CORAL, 'normal'), 'verde sobre coral do token passa texto');
    assert.ok(!cumpre(VERDE, CORAL_LOGO, 'normal'), 'verde sobre coral da arte não passa');
    // Mas sobre a areia é o coral da arte que passa GRÁFICO, e o do token não.
    assert.ok(cumpre(CORAL_LOGO, AREIA, 'grande'), 'coral da arte passa gráfico na areia');
    assert.ok(!cumpre(CORAL, AREIA, 'grande'), 'coral do token não passa gráfico na areia');
  });

  it('a regra que o CT-13 escreve em voz alta: branco sobre coral não serve para texto', () => {
    assert.ok(!cumpre(BRANCO, CORAL, 'normal'));
    assert.ok(!cumpre(BRANCO, CORAL_LOGO, 'normal'));
  });

  it('é simétrico e os extremos são conhecidos', () => {
    assert.equal(razaoArredondada(VERDE, AREIA), razaoArredondada(AREIA, VERDE));
    assert.equal(razaoArredondada('#000000', '#FFFFFF'), 21);
    assert.equal(razaoArredondada('#123456', '#123456'), 1);
  });

  it('aceita 3 dígitos, sem cardinal e maiúsculas/minúsculas', () => {
    assert.deepEqual(lerHex('#fff'), [255, 255, 255]);
    assert.deepEqual(lerHex('FFFFFF'), [255, 255, 255]);
    assert.deepEqual(lerHex('#102e35'), lerHex('#102E35'));
  });

  it('recusa o que não é cor em vez de devolver preto em silêncio', () => {
    for (const lixo of ['', '#12', 'vermelho', '#GGGGGG', '#1234567']) {
      assert.throws(() => lerHex(lixo), /inválida/, `devia recusar: ${JSON.stringify(lixo)}`);
    }
  });

  it('a luminância respeita a ordem óbvia', () => {
    assert.ok(luminanciaRelativa('#000000') === 0);
    assert.ok(luminanciaRelativa('#FFFFFF') === 1);
    assert.ok(luminanciaRelativa(VERDE) < luminanciaRelativa(CINZA));
    assert.ok(luminanciaRelativa(CINZA) < luminanciaRelativa(AREIA));
  });

  it('escolhe a melhor cor de texto e admite quando nenhuma serve', () => {
    const sobreAreia = melhorTextoSobre(AREIA, [VERDE, CINZA, BRANCO]);
    assert.equal(sobreAreia.cor, VERDE);
    assert.ok(sobreAreia.cumpre);

    // Sobre o coral, nem branco nem cítrico servem para texto comum. A função
    // devolve a melhor com `cumpre: false` em vez de devolver nada — quem chama
    // tem de VER a reprovação, não cair num valor por omissão.
    const sobreCoral = melhorTextoSobre(CORAL, [BRANCO, CITRICO]);
    assert.ok(!sobreCoral.cumpre, 'nenhuma das duas cumpre sobre o coral');
    assert.ok(sobreCoral.razao < LIMIAR.normal);
  });

  it('CONTROLO NEGATIVO: a linearização sRGB não é decorativa', () => {
    // Se alguém trocar a curva sRGB por um `^2.2` ingénuo, os testes acima ainda
    // passariam por pouco em alguns pares. Este fixa o ponto onde as duas
    // fórmulas divergem de forma mensurável: um cinzento escuro, onde a parte
    // linear da curva (abaixo de 0,03928) é que decide.
    const ingenua = (v: string) => {
      const [r, g, b] = lerHex(v).map((c) => (c / 255) ** 2.2) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const escuro = '#050505';
    assert.notEqual(
      Math.round(luminanciaRelativa(escuro) * 1e6),
      Math.round(ingenua(escuro) * 1e6),
      'a curva correcta e a ingénua têm de divergir — se não divergem, não é a curva WCAG',
    );
  });
});

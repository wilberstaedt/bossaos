import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  IMPOSTOS_INCLUIDOS, MENSALIDADES_NUM_ANO, coresPublicasDoPlano, planosComAnualIncoerente,
  precoDoPlano,
} from './precificacao.ts';

/**
 * A armadilha do preço anual, escrita como teste.
 *
 * O Matheus mandou-a por escrito a 04/09: *«o ano custa DEZ mensalidades e o
 * equivalente mensal é só apresentação, portanto cobrar doze vezes o equivalente
 * arredondado dá o número errado — e como os dois são inteiros, a
 * validar-dinheiro não vê nada»*.
 *
 * Um comentário a dizer isto envelhece em silêncio. Este ficheiro **mede a
 * diferença** e falha se ela desaparecer.
 */
describe('preços: o ano custa dez mensalidades, não doze', () => {
  it('a fonte é coerente com a regra que ela própria escreve', () => {
    assert.deepEqual(planosComAnualIncoerente(), []);
    assert.equal(MENSALIDADES_NUM_ANO, 10);
  });

  it('doze vezes o equivalente arredondado NÃO é o preço do ano', () => {
    // É este o erro que nada no sistema de tipos apanha: os dois lados são
    // inteiros de cêntimos e ambos parecem um preço.
    for (const codigo of ['STARTER', 'RESTAURANT', 'PRO'] as const) {
      const p = precoDoPlano(codigo);
      assert.ok(p, `${codigo} não está na fonte`);
      assert.notEqual(
        p.equivalenteMensal * 12, p.anual,
        `${codigo}: doze vezes o equivalente deu exactamente o anual — ` +
        'ou a fonte mudou, ou o equivalente deixou de ser arredondado. ' +
        'Nos dois casos alguém vai cobrar o número errado.',
      );
      // E o desconto existe mesmo: doze mensalidades custam mais do que o ano.
      assert.ok(p.mensal * 12 > p.anual, `${codigo}: o ano não é mais barato do que doze meses`);
    }
  });

  it('um plano que a fonte não conhece é null, e não um preço por omissão', () => {
    // «Um campo sem valor não vira gratuito, ilimitado nem integração activa.»
    assert.equal(precoDoPlano('INVENTADO'), null);
    assert.equal(coresPublicasDoPlano('INVENTADO'), null);
  });

  it('o Starter tem cores fixas; Restaurant e Pro personalizáveis', () => {
    assert.equal(coresPublicasDoPlano('STARTER'), 'fixas_bossaos');
    assert.equal(coresPublicasDoPlano('RESTAURANT'), 'personalizaveis');
    assert.equal(coresPublicasDoPlano('PRO'), 'personalizaveis');
  });

  it('o IVA NÃO está incluído, e o ecrã tem de o dizer', () => {
    assert.equal(IMPOSTOS_INCLUIDOS, false);
  });

  it('implantação sozinha do Restaurant é null — por definir, não grátis', () => {
    const r = precoDoPlano('RESTAURANT');
    assert.ok(r);
    assert.equal(r.implantacaoSozinho, null);
    // E o Starter TEM zero, que é diferente de não ter valor. A distinção é a
    // regra: ausência não é política.
    assert.equal(precoDoPlano('STARTER')?.implantacaoSozinho, 0);
  });
});

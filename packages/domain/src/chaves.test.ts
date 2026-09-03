import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chaveDeCache, chaveDeTarefa, nomeDeEvento, prefixoDeMedia } from './chaves.ts';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const UNIDADE = 'aaaa1111-1111-4111-8111-222222222222';

describe('chaves com inquilino', () => {
  it('não se consegue construir uma chave sem organização', () => {
    // Uma chave sem inquilino é uma chave global, e uma cache global entre
    // restaurantes é uma fuga com prazo.
    assert.throws(() => chaveDeCache({ organizationId: '' }, 'catalogo'), /sem organização/);
    assert.throws(() => chaveDeCache({ organizationId: 'a' }, 'catalogo'), /sem organização/);
    assert.throws(() => prefixoDeMedia({ organizationId: 'nao-e-uuid' }), /sem organização/);
  });

  it('dois inquilinos nunca produzem a mesma chave', () => {
    assert.notEqual(
      chaveDeCache({ organizationId: A }, 'catalogo'),
      chaveDeCache({ organizationId: B }, 'catalogo'),
    );
    assert.notEqual(prefixoDeMedia({ organizationId: A }), prefixoDeMedia({ organizationId: B }));
  });

  it('uma parte com o separador NÃO consegue forjar o prefixo de outro', () => {
    // É o mesmo defeito que a travessia de caminho, noutro alfabeto: sem escape,
    // esta parte produziria uma chave que parece do inquilino B, e quem lesse
    // por prefixo trazia dados de B para um pedido de A.
    const hostil = chaveDeCache({ organizationId: A }, `x:org:${B}:catalogo`);
    const legitima = chaveDeCache({ organizationId: B }, 'catalogo');

    assert.notEqual(hostil, legitima);
    assert.ok(hostil.startsWith(`org:${A}:`), 'continua a começar no inquilino certo');
    assert.ok(!hostil.includes(`:org:${B}:`), `a parte hostil tem de sair escapada: ${hostil}`);
  });

  it('a unidade entra na chave quando existe', () => {
    const sem = chaveDeCache({ organizationId: A }, 'mesas');
    const com = chaveDeCache({ organizationId: A, locationId: UNIDADE }, 'mesas');
    assert.notEqual(sem, com);
    assert.ok(com.includes(`loc:${UNIDADE}`));
  });

  it('o prefixo de média é um caminho, e termina em barra', () => {
    assert.equal(prefixoDeMedia({ organizationId: A }), `org/${A}/`);
    assert.equal(
      prefixoDeMedia({ organizationId: A, locationId: UNIDADE }),
      `org/${A}/loc/${UNIDADE}/`,
    );
    // Sem `..` possível: o UUID é validado, logo não há travessia por aqui.
    assert.ok(!prefixoDeMedia({ organizationId: A }).includes('..'));
  });

  it('duas organizações a agendar a mesma tarefa não se anulam', () => {
    // Se as chaves colidissem, a segunda seria descartada como repetida e a
    // caixa de um dos restaurantes nunca fechava.
    assert.notEqual(
      chaveDeTarefa({ organizationId: A }, 'fechar-caixa', '2026-12-31'),
      chaveDeTarefa({ organizationId: B }, 'fechar-caixa', '2026-12-31'),
    );
  });

  it('eventos e tarefas herdam a mesma raiz', () => {
    assert.ok(nomeDeEvento({ organizationId: A }, 'pedido.criado').startsWith(`org:${A}:evt:`));
    assert.ok(chaveDeTarefa({ organizationId: A }, 'fechar').startsWith(`org:${A}:job:`));
  });

  it('recusa partes vazias em vez de as ignorar', () => {
    assert.throws(() => chaveDeCache({ organizationId: A }, ''), /vazia/);
    assert.throws(() => chaveDeCache({ organizationId: A }), /sem partes/);
  });
});

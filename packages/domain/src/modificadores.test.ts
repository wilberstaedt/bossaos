import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validarEscolhas, validarGrupo, type GrupoDeModificadores } from './modificadores.ts';

/**
 * Escolhas obrigatórias e limites — validados aqui, não no formulário.
 *
 * *"O ecrã esconde para não frustrar, o servidor recusa para proteger."* Um
 * formulário que não deixa escolher três quando o máximo são dois é cortesia;
 * quem enviar o pedido directamente escolhe cinco, e é a cozinha que descobre.
 */

const PONTO: GrupoDeModificadores = {
  id: 'ponto', nome: 'Punto de cocción', obrigatorio: true, minimo: 1, maximo: 1,
  opcoes: [{ id: 'pouco', nome: 'Poco hecho' }, { id: 'ponto', nome: 'Al punto' }, { id: 'feito', nome: 'Hecho' }],
};
const ACOMPANHAMENTO: GrupoDeModificadores = {
  id: 'acomp', nome: 'Acompañamiento', obrigatorio: false, minimo: 0, maximo: 2,
  opcoes: [{ id: 'salsa', nome: 'Extra salsa' }, { id: 'pan', nome: 'Extra pan' }, { id: 'papas', nome: 'Patatas' }],
};
const escolhas = (o: Record<string, string[]>) => new Map(Object.entries(o));

describe('1. O par: o que passa e o que não passa', () => {
  it('uma escolha válida não devolve problema nenhum', () => {
    // O lado positivo primeiro. Sem ele, um validador que recusasse tudo
    // passava em todos os casos negativos abaixo.
    assert.deepEqual(validarEscolhas([PONTO, ACOMPANHAMENTO], escolhas({
      ponto: ['ponto'], acomp: ['salsa', 'pan'],
    })), []);
  });

  it('grupo obrigatório sem escolha é recusado', () => {
    assert.deepEqual(validarEscolhas([PONTO], escolhas({})), [{ erro: 'obrigatorio', grupoId: 'ponto' }]);
  });

  it('acima do máximo é recusado, e diz quantas e quantas podia', () => {
    // O pedido que o formulário nunca deixaria sair.
    const p = validarEscolhas([ACOMPANHAMENTO], escolhas({ acomp: ['salsa', 'pan', 'papas'] }));
    assert.deepEqual(p, [{ erro: 'acima_do_maximo', grupoId: 'acomp', maximo: 2, escolhidas: 3 }]);
  });

  it('abaixo do mínimo com alguma coisa escolhida diz OUTRA coisa', () => {
    // "Escolhe dois molhos" com um escolhido não é "escolha obrigatória" — essa
    // mensagem diria a quem já escolheu que não escolheu.
    const dois: GrupoDeModificadores = { ...ACOMPANHAMENTO, obrigatorio: true, minimo: 2 };
    assert.deepEqual(validarEscolhas([dois], escolhas({ acomp: ['salsa'] })),
      [{ erro: 'abaixo_do_minimo', grupoId: 'acomp', minimo: 2, escolhidas: 1 }]);
    // E vazio, no mesmo grupo, diz obrigatório.
    assert.deepEqual(validarEscolhas([dois], escolhas({ acomp: [] })),
      [{ erro: 'obrigatorio', grupoId: 'acomp' }]);
  });

  it('grupo opcional vazio não é problema', () => {
    assert.deepEqual(validarEscolhas([ACOMPANHAMENTO], escolhas({ acomp: [] })), []);
  });
});

describe('2. O que vem de fora não se aceita em silêncio', () => {
  it('uma opção que não é do grupo é recusada', () => {
    assert.deepEqual(validarEscolhas([ACOMPANHAMENTO], escolhas({ acomp: ['caviar'] })),
      [{ erro: 'opcao_desconhecida', grupoId: 'acomp', opcaoId: 'caviar' }]);
  });

  it('um grupo que não é do produto é recusado', () => {
    // Aceitar em silêncio deixaria juntar extras de outro prato — e cobrar por
    // eles, ou não cobrar, conforme o sítio que os lesse.
    assert.deepEqual(validarEscolhas([ACOMPANHAMENTO], escolhas({ outro: ['x'] })),
      [{ erro: 'grupo_desconhecido', grupoId: 'outro' }]);
  });

  it('devolve TODOS os problemas, não o primeiro', () => {
    // Corrigir um de cada vez, com uma viagem ao servidor por cada, é o que faz
    // alguém desistir a meio.
    const p = validarEscolhas([PONTO, ACOMPANHAMENTO], escolhas({
      acomp: ['salsa', 'pan', 'caviar'],
    }));
    assert.equal(p.length, 3, `esperava três problemas, veio ${p.length}`);
    assert.ok(p.some((x) => x.erro === 'obrigatorio'));
    assert.ok(p.some((x) => x.erro === 'opcao_desconhecida'));
    assert.ok(p.some((x) => x.erro === 'acima_do_maximo'));
  });
});

describe('3. A forma do grupo recusa-se ao GRAVAR, não ao encomendar', () => {
  it('máximo menor que o mínimo não se pode satisfazer', () => {
    // Um produto com um grupo assim prende o cliente no ecrã sem perceber
    // porquê. Recusa-se quando se grava, que é quando alguém está a olhar.
    assert.deepEqual(validarGrupo({ ...ACOMPANHAMENTO, minimo: 3, maximo: 2 }),
      { erro: 'forma', grupoId: 'acomp', detalhe: 'maximo_menor_que_minimo' });
  });

  it('obrigatório com mínimo zero é opcional com outro nome', () => {
    assert.deepEqual(validarGrupo({ ...ACOMPANHAMENTO, obrigatorio: true, minimo: 0 }),
      { erro: 'forma', grupoId: 'acomp', detalhe: 'obrigatorio_com_minimo_zero' });
  });

  it('máximo maior que o número de opções é uma promessa impossível', () => {
    assert.deepEqual(validarGrupo({ ...ACOMPANHAMENTO, maximo: 9 }),
      { erro: 'forma', grupoId: 'acomp', detalhe: 'maximo_maior_que_opcoes' });
  });

  it('e os grupos bem formados passam — é o par', () => {
    assert.equal(validarGrupo(PONTO), null);
    assert.equal(validarGrupo(ACOMPANHAMENTO), null);
    assert.equal(validarGrupo({ ...ACOMPANHAMENTO, maximo: undefined as unknown as number }), null,
      'sem tecto é válido: nem todo o grupo tem máximo');
  });
});

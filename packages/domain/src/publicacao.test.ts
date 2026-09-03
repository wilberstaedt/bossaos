import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bloqueiosDePublicacao, compararRevisoes, proximaRevisao,
  type ItemParaPublicar, type Revisao,
} from './publicacao.ts';

const item = (extra: Partial<ItemParaPublicar> = {}): ItemParaPublicar => ({
  productId: 'p1',
  nome: 'Croquetas caseras',
  precoMenor: 850,
  moeda: 'EUR',
  categoryId: 'c1',
  alergenosPorDeclarar: 0,
  ...extra,
});

describe('1. O que impede publicar', () => {
  it('sem preço bloqueia — não publica a zero', () => {
    // Publicar a zero seria oferecer o prato. E o prompt do E08 é explícito:
    // "não invente conteúdo para passar no checklist".
    const b = bloqueiosDePublicacao([item({ precoMenor: null, moeda: null })]);
    assert.deepEqual(b.map((x) => x.motivo), ['sem_preco']);
  });

  it('o empate de preços do E07 continua a ser erro aqui', () => {
    const b = bloqueiosDePublicacao([item({ erroDePreco: 'conflito', precoMenor: null, moeda: null })]);
    // Um só bloqueio, e o específico: dizer "sem preço" a um conflito mandava a
    // pessoa criar mais uma regra, que é o oposto do que resolve.
    assert.deepEqual(b.map((x) => x.motivo), ['conflito_de_preco']);
  });

  it('moeda incompatível tem motivo próprio', () => {
    const b = bloqueiosDePublicacao([
      item({ erroDePreco: 'moeda_incompativel', precoMenor: null, moeda: null }),
    ]);
    assert.deepEqual(b.map((x) => x.motivo), ['moeda_incompativel']);
  });

  it('devolve TODOS os bloqueios, não o primeiro', () => {
    // Quem publica uma carta quer saber os doze produtos sem preço de uma vez,
    // não descobri-los um a um em doze tentativas.
    const b = bloqueiosDePublicacao([
      item({ productId: 'a', precoMenor: null, moeda: null }),
      item({ productId: 'b', categoryId: null }),
      item({ productId: 'c', precoMenor: null, moeda: null, categoryId: null }),
    ]);
    assert.equal(b.length, 4);
    assert.deepEqual(b.map((x) => `${x.productId}:${x.motivo}`), [
      'a:sem_preco', 'b:sem_categoria', 'c:sem_preco', 'c:sem_categoria',
    ]);
  });

  it('UMA CARTA VAZIA é um bloqueio, não uma página em branco', () => {
    // Acontece por engano: nenhum produto visível no canal que se publica. Sem
    // isto publicava-se em silêncio, e o ecrã dizia "nada mudou" sobre uma
    // página em branco na internet aberta.
    const b = bloqueiosDePublicacao([]);
    assert.deepEqual(b.map((x) => x.motivo), ['carta_vazia']);
  });

  it('uma carta inteira e válida não tem bloqueios — é o par', () => {
    // Sem isto, uma implementação que bloqueasse tudo passava em todos os casos
    // de cima e nada seria publicável.
    assert.deepEqual(bloqueiosDePublicacao([item(), item({ productId: 'p2' })]), []);
  });

  it('os alérgenos por declarar bloqueiam SÓ se a política o disser', () => {
    // A razão de não ser obrigatório por omissão está escrita no ficheiro: uma
    // carta com mil declarações em falta nunca publicaria, e o resultado real
    // seria alguém a marcar tudo como "não contém" para o portão abrir — que
    // troca "não sabemos" por uma afirmação falsa.
    const comFalta = [item({ alergenosPorDeclarar: 14 })];
    assert.deepEqual(bloqueiosDePublicacao(comFalta), []);
    const b = bloqueiosDePublicacao(comFalta, { exigirAlergenosCompletos: true });
    assert.deepEqual(b.map((x) => x.motivo), ['alergenos_por_declarar']);
    assert.equal(b[0]?.detalhe, '14', 'o ecrã tem de poder dizer quantas faltam');
  });
});

describe('2. O que muda entre a publicada e a proposta', () => {
  it('acrescentado, alterado e removido são TRÊS coisas', () => {
    const publicada = [
      item({ productId: 'fica', nome: 'Tortilla' }),
      item({ productId: 'muda', nome: 'Croquetas', precoMenor: 850 }),
      item({ productId: 'sai', nome: 'Gazpacho' }),
    ];
    const proposta = [
      item({ productId: 'fica', nome: 'Tortilla' }),
      item({ productId: 'muda', nome: 'Croquetas', precoMenor: 900 }),
      item({ productId: 'novo', nome: 'Pulpo' }),
    ];
    const m = compararRevisoes(publicada, proposta);
    assert.deepEqual(
      m.map((x) => `${x.productId}:${x.tipo}`).sort(),
      ['muda:alterado', 'novo:acrescentado', 'sai:removido'],
    );
    // "fica" não aparece: sem mudança não há linha na comparação.
    assert.ok(!m.some((x) => x.productId === 'fica'));
  });

  it('o removido é uma linha própria, não um "alterado"', () => {
    // Um produto que sai da carta é a mudança que mais custa a notar numa lista
    // de cinquenta, e é a que um cliente encontra primeiro.
    const m = compararRevisoes([item({ productId: 'sai' })], []);
    assert.equal(m[0]?.tipo, 'removido');
  });

  it('diz QUE campo mudou, com antes e depois', () => {
    const m = compararRevisoes(
      [item({ precoMenor: 850, nome: 'Croquetas' })],
      [item({ precoMenor: 900, nome: 'Croquetas de jamón' })],
    );
    assert.equal(m[0]?.tipo, 'alterado');
    assert.deepEqual(m[0]?.campos, [
      { campo: 'nome', antes: 'Croquetas', depois: 'Croquetas de jamón' },
      { campo: 'preco', antes: '850 EUR', depois: '900 EUR' },
    ]);
  });

  it('compara por IDENTIFICADOR, nunca por nome', () => {
    // Dois "Café" não são o mesmo produto. É a regra que o E00 escreve para a
    // importação, e não muda porque o ecrã é outro.
    const m = compararRevisoes(
      [item({ productId: 'a', nome: 'Café' })],
      [item({ productId: 'b', nome: 'Café' })],
    );
    assert.deepEqual(m.map((x) => x.tipo).sort(), ['acrescentado', 'removido']);
  });

  it('duas revisões iguais não produzem mudanças', () => {
    assert.deepEqual(compararRevisoes([item()], [item()]), []);
  });
});

describe('3. Restaurar cria uma revisão nova', () => {
  const revisoes: Revisao[] = [
    { id: 'r1', numero: 1, criadaEm: new Date('2026-09-01'), criadaPor: 'a@x.example' },
    { id: 'r2', numero: 2, criadaEm: new Date('2026-09-02'), criadaPor: 'a@x.example' },
  ];

  it('o número avança, não recua', () => {
    // Se restaurar apagasse ou reutilizasse números, "o que estava publicado no
    // dia 4" deixava de ter resposta — e é uma pergunta que se faz depois de uma
    // reclamação, não antes.
    const nova = proximaRevisao(revisoes, 'b@x.example', new Date('2026-09-04'), 'r1');
    assert.equal(nova.numero, 3);
    assert.equal(nova.restauraDe, 'r1');
    assert.equal(nova.criadaPor, 'b@x.example');
  });

  it('uma publicação normal não tem origem de restauro', () => {
    const nova = proximaRevisao(revisoes, 'b@x.example', new Date('2026-09-04'));
    assert.equal(nova.numero, 3);
    assert.ok(!('restauraDe' in nova), 'a chave nem sequer existe');
  });

  it('a primeira revisão é a número 1, não a zero', () => {
    assert.equal(proximaRevisao([], 'a@x.example', new Date()).numero, 1);
  });
});

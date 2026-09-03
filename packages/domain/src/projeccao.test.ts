import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPOS_DE_CARTA, CAMPOS_DE_CATEGORIA, CAMPOS_DE_PRODUTO,
  procurarNaCarta, produtoDaCarta, projectarCarta,
} from './projeccao.ts';

/**
 * O retrato como ele vem da revisão — **com campos internos lá dentro**.
 *
 * O `sku` e o `custoMenor` não estão hoje no que o E08 grava. Estão aqui de
 * propósito: uma revisão é um `Json`, e o E22 e o E24 vão acrescentar-lhe campos
 * sem ninguém se lembrar da projecção. Se o teste só usasse o retrato de hoje,
 * media a ausência de um campo que ninguém pôs — e ficava verde sobre nada.
 */
const RETRATO = [
  {
    productId: 'p-1', nome: 'Croquetas caseras', descricao: 'de jamón',
    precoMenor: 850, moeda: 'EUR',
    categoryId: 'c-1', categoriaNome: 'Para compartir',
    alergenos: [
      { codigo: 'gluten', estado: 'CONTEM' },
      { codigo: 'amendoins', estado: 'DESCONHECIDO' },
      { codigo: 'peixe', estado: 'NAO_CONTEM' },
    ],
    variantes: [{ id: 'v-1', nome: 'Ração', predefinida: true }],
    preferencias: ['vegetariano'],
    media: [{ chave: 'org/a/foto.png', textoAlternativo: 'Croquetas', principal: true }],
    // ── Os campos que NÃO podem sair ──────────────────────────────────────
    sku: 'CRO-INTERNO-1',
    custoMenor: 310,
    margemPercentagem: 63.5,
    fornecedor: 'Distribuidora Sur, contacto 600 000 000',
    alergenosPorDeclarar: 11,
    erroDePreco: undefined,
  },
  {
    productId: 'p-2', nome: 'Café con leche', descricao: null,
    precoMenor: 150, moeda: 'EUR',
    categoryId: 'c-2', categoriaNome: 'Bebidas',
    alergenos: [{ codigo: 'leite', estado: 'CONTEM' }],
    variantes: [], preferencias: [], media: [],
    sku: 'CAF-INTERNO-2', custoMenor: 40,
  },
];

const carta = (extra: Partial<Parameters<typeof projectarCarta>[0]> = {}) =>
  projectarCarta({
    conteudo: RETRATO, unidade: 'Marina Oropesa', marca: 'Marina Bistró',
    revisao: 7, idioma: 'es-ES', canal: 'CARTA', ...extra,
  });

/** Todas as chaves de todos os objectos, em profundidade. */
function chavesEmProfundidade(v: unknown, saida = new Set<string>()): Set<string> {
  if (Array.isArray(v)) { for (const x of v) chavesEmProfundidade(x, saida); return saida; }
  if (typeof v === 'object' && v !== null) {
    for (const [k, x] of Object.entries(v)) { saida.add(k); chavesEmProfundidade(x, saida); }
  }
  return saida;
}

describe('1. O campo que vem e não se mostra', () => {
  it('SKU, custo, margem e fornecedor NÃO estão no corpo', () => {
    // A régua olha para o corpo da resposta, não para o que o ecrã desenha.
    // Serializa-se, que é literalmente o que vai para o browser.
    const corpo = JSON.stringify(carta());
    for (const segredo of [
      'CRO-INTERNO-1', 'CAF-INTERNO-2', 'sku',
      'custoMenor', '310', 'margem', '63.5',
      'fornecedor', 'Distribuidora', '600 000 000',
    ]) {
      assert.ok(!corpo.includes(segredo), `o corpo contém "${segredo}"`);
    }
  });

  it('AS CHAVES SÃO EXACTAMENTE AS DA LISTA DE PERMISSÃO', () => {
    // Esta é a asserção que sobrevive ao futuro. A de cima protege contra os
    // campos que hoje se sabe que existem; esta protege contra o campo que o E22
    // acrescentar ao retrato daqui a três semanas.
    const permitidas = new Set<string>([
      ...CAMPOS_DE_CARTA, ...CAMPOS_DE_CATEGORIA, ...CAMPOS_DE_PRODUTO,
      // As folhas dos objectos que a projecção constrói.
      'montanteMenor', 'moeda',           // preço
      'predefinida',                      // variantes
      'codigo', 'estado',                 // alérgenos
      'chave', 'textoAlternativo',        // imagens
    ]);
    const usadas = chavesEmProfundidade(JSON.parse(JSON.stringify(carta())));
    const aMais = [...usadas].filter((k) => !permitidas.has(k));
    assert.deepEqual(aMais, [], `saíram chaves fora da lista: ${aMais.join(', ')}`);
  });

  it('e um campo INVENTADO no retrato também não sai — é o controlo vivo', () => {
    // Simula o E22 a acrescentar uma coluna. Nada na projecção o menciona, e por
    // isso ele não existe do outro lado. É o que uma lista de EXCLUSÃO não dava.
    const comCampoNovo = carta({
      conteudo: [{ ...RETRATO[0], campoQueOE22VaiAcrescentar: 'segredo-do-futuro' }],
    });
    assert.ok(!JSON.stringify(comCampoNovo).includes('segredo-do-futuro'));
    assert.ok(!JSON.stringify(comCampoNovo).includes('campoQueOE22'));
  });

  it('e o par: o que É público sai todo', () => {
    // Sem isto, uma projecção que devolvesse `{}` passava em tudo o que está
    // acima e a carta ficava em branco.
    const c = carta();
    assert.equal(c.categorias.length, 2);
    const croquetas = produtoDaCarta(c, 'p-1');
    assert.ok(croquetas);
    assert.equal(croquetas.nome, 'Croquetas caseras');
    assert.deepEqual(croquetas.preco, { montanteMenor: 850, moeda: 'EUR' });
    assert.deepEqual(croquetas.variantes, [{ nome: 'Ração', predefinida: true }]);
    assert.deepEqual(croquetas.imagens, [
      { chave: 'org/a/foto.png', textoAlternativo: 'Croquetas' },
    ]);
  });
});

describe('2. Alérgenos: o desconhecido vai à frente de quem vai comer', () => {
  it('os DESCONHECIDOS não são omitidos', () => {
    // Omitir um alérgeno da lista pública lê-se como "não contém" — é a mesma
    // inferência que o E07 existe para impedir, agora à frente do cliente.
    const p = produtoDaCarta(carta(), 'p-1');
    assert.deepEqual(p?.alergenos.map((a) => `${a.codigo}:${a.estado}`), [
      'gluten:CONTEM', 'amendoins:DESCONHECIDO', 'peixe:NAO_CONTEM',
    ]);
  });

  it('e o estado não é reescrito pelo caminho', () => {
    const p = produtoDaCarta(carta(), 'p-1');
    const desconhecido = p?.alergenos.find((a) => a.codigo === 'amendoins');
    assert.equal(desconhecido?.estado, 'DESCONHECIDO',
      'não pode ter virado NAO_CONTEM ao atravessar a projecção');
  });
});

describe('3. Preço, e o que não é preço', () => {
  it('sem moeda não há preço — e não há zero', () => {
    const c = carta({ conteudo: [{ ...RETRATO[0], precoMenor: 850, moeda: undefined }] });
    assert.equal(produtoDaCarta(c, 'p-1')?.preco, null);
  });

  it('sem montante também não', () => {
    const c = carta({ conteudo: [{ ...RETRATO[0], precoMenor: null }] });
    assert.equal(produtoDaCarta(c, 'p-1')?.preco, null);
  });
});

describe('4. Traduções entram já resolvidas', () => {
  it('o texto traduzido substitui o do retrato', () => {
    const c = carta({
      idioma: 'en',
      textos: new Map([['p-1', { nome: 'Homemade croquettes', descricao: 'with ham' }]]),
    });
    const p = produtoDaCarta(c, 'p-1');
    assert.equal(p?.nome, 'Homemade croquettes');
    assert.equal(p?.descricao, 'with ham');
  });

  it('sem tradução para aquele produto, fica o do retrato', () => {
    const c = carta({ idioma: 'en', textos: new Map() });
    assert.equal(produtoDaCarta(c, 'p-1')?.nome, 'Croquetas caseras');
  });
});

describe('5. Busca e detalhe, sobre a projecção', () => {
  it('encontra sem acentos e sem maiúsculas', () => {
    // Quem escreve "cafe" num telemóvel espera encontrar "café", e um
    // restaurante em Espanha tem metade da carta acentuada.
    assert.deepEqual(procurarNaCarta(carta(), 'cafe').map((p) => p.id), ['p-2']);
    assert.deepEqual(procurarNaCarta(carta(), 'CROQUETAS').map((p) => p.id), ['p-1']);
    assert.deepEqual(procurarNaCarta(carta(), 'jamon').map((p) => p.id), ['p-1']);
  });

  it('um termo vazio não devolve a carta inteira', () => {
    assert.deepEqual(procurarNaCarta(carta(), '   '), []);
  });

  it('a busca olha para NOME e DESCRIÇÃO, e não para o resto do produto', () => {
    // ── Este caso já esteve escrito de outra maneira, e não media nada ─────
    //
    // Escrevi-o primeiro como "a busca não encontra por SKU". O controlo
    // negativo mostrou que era vácuo: a busca corre sobre a projecção, onde o
    // SKU já não existe, portanto **não havia defeito capaz de a fazer falhar**.
    // Era a asserção do grupo 1 outra vez, vestida de outra coisa.
    //
    // Re-apontado ao que pode partir-se: alguém a alargar a busca para
    // `JSON.stringify(produto)` — que é a forma preguiçosa de "procurar em tudo"
    // e faria a chave da imagem e o identificador entrarem na correspondência.
    assert.deepEqual(procurarNaCarta(carta(), 'foto'), [],
      'a chave da imagem não é texto de busca');
    assert.deepEqual(procurarNaCarta(carta(), 'org/a'), [],
      'o caminho do ficheiro também não');
    assert.deepEqual(procurarNaCarta(carta(), 'p-1'), [],
      'nem o identificador');
    assert.deepEqual(procurarNaCarta(carta(), 'EUR'), [],
      'nem o código da moeda');
    // O par: o que É texto de busca continua a encontrar-se.
    assert.deepEqual(procurarNaCarta(carta(), 'jamón').map((p) => p.id), ['p-1']);
  });

  it('o detalhe procura na projecção, não na base', () => {
    // Se fosse à base, o detalhe teria de repetir os filtros de publicação, de
    // canal e de estado — e bastava esquecer um para mostrar o que a lista
    // esconde.
    assert.equal(produtoDaCarta(carta(), 'p-inexistente'), null);
  });
});

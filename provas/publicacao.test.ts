import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  buscarPorUrl, catalogoParaCsv, coberturaDeTraducoes, comEscopo, confirmarImportacao,
  guardarMedia, guardarPrevia, guardarTraducao, historicoDeRevisoes, ligarAoProduto,
  listarExportacoes, obterPrisma, pedirExportacao, podeDescarregar, preverPublicacao,
  publicacaoActual, publicar, substituirConteudo, textoDoProduto, traducoesDoProduto,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';
import type { PortaDeMedia } from '@bossaos/domain';

/**
 * A prova do E08.
 *
 * O alvo está em `docs/architecture/catalogo-e-publicacao.md` e
 * `dados-e-accoes-sensiveis.md`, os dois escritos no E00.
 *
 * ── O que a decide ──────────────────────────────────────────────────────────
 *
 * O aceite 1: **uma falha a meio da publicação deixa a revisão anterior
 * inteira**. Publicação pela metade é pior do que publicação falhada — a carta
 * fica com metade dos preços novos e metade dos antigos, e ninguém sabe qual é
 * qual. A prova injecta uma falha REAL depois de a revisão ser criada, e exige
 * que nem a revisão nem o ponteiro tenham ficado.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;
const marca = Date.now();
const PREFIXO = `e08-${marca}`;
const AUTOR = 'dona@exemplo.example';

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA, userId: IDS.utilizadorA }, fn);
const comB = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgB, userId: IDS.utilizadorB }, fn);

/** Porta de média em memória. O condutor de disco tem prova própria no E01. */
const guardados = new Map<string, Uint8Array>();
const PORTA: PortaDeMedia = {
  async guardar({ conteudo, tipoMime }) {
    const chave = `${PREFIXO}/${guardados.size}-${Math.random().toString(36).slice(2)}`;
    guardados.set(chave, conteudo);
    return { chave, bytes: conteudo.length, tipoMime };
  },
  async ler(chave) { return guardados.get(chave) ?? new Uint8Array(); },
  async apagar(chave) { guardados.delete(chave); },
  async endereco(chave) { return `memoria://${chave}`; },
};

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const SVG = new TextEncoder().encode('<svg onload="alert(1)"/>');

let menuId = '';
let categoriaId = '';
let produtoId = '';

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);

  await comA(async (db) => {
    const cat = await db.category.create({
      data: { organizationId: IDS.orgA, brandId: IDS.marcaA, nome: `${PREFIXO} entradas`, ordem: 1 },
      select: { id: true },
    });
    categoriaId = cat.id;
    const p = await db.product.create({
      data: {
        organizationId: IDS.orgA, brandId: IDS.marcaA, categoryId: cat.id,
        nome: `${PREFIXO} croquetas`, descricao: 'de jamón', estado: 'ACTIVO',
        sku: `${PREFIXO}-CRO`,
      },
      select: { id: true },
    });
    produtoId = p.id;
    await db.priceRule.create({
      data: { organizationId: IDS.orgA, productId: p.id, montanteMenor: 850, moeda: 'EUR' },
    });
    const m = await db.menu.create({
      data: { organizationId: IDS.orgA, brandId: IDS.marcaA, nome: `${PREFIXO} carta`, estado: 'ACTIVO' },
      select: { id: true },
    });
    menuId = m.id;
    await db.menuCategory.create({
      data: { organizationId: IDS.orgA, menuId: m.id, categoryId: cat.id, ordem: 1 },
    });
  });
});

after(async () => {
  await sql.query(`DELETE FROM menu_publications WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM menu_revisions   WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM menu_categories  WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM menus WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM import_rows WHERE job_id IN (SELECT id FROM import_jobs WHERE ficheiro_nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM import_jobs WHERE ficheiro_nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM export_jobs WHERE formato LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM product_media WHERE media_id IN (SELECT id FROM media_assets WHERE chave LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM media_assets WHERE chave LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM product_translations WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '%${PREFIXO}%')`);
  await sql.query(`DELETE FROM price_rules WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '%${PREFIXO}%')`);
  await sql.query(`DELETE FROM products   WHERE nome LIKE '%${PREFIXO}%'`);
  await sql.query(`DELETE FROM categories WHERE nome LIKE '${PREFIXO}%'`);
  await sql.end();
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('1. Uma falha a meio da publicação deixa a anterior INTEIRA', () => {
  it('publica uma primeira vez', async () => {
    const r = await comA((db) => publicar(db, IDS.orgA, {
      menuId, locationId: IDS.unidadeA, canal: 'CARTA', autor: AUTOR,
    }));
    assert.equal(r.ok, true, `bloqueado: ${JSON.stringify(!r.ok ? r.bloqueios : '')}`);
    assert.equal(r.ok && r.numero, 1);
  });

  it('A FALHA A MEIO não deixa revisão nem move o ponteiro', async () => {
    const antes = await comA(async (db) => ({
      revisoes: await historicoDeRevisoes(db, menuId),
      actual: await publicacaoActual(db, menuId, 'CARTA'),
    }));

    // Uma falha REAL depois de a revisão estar escrita e o ponteiro trocado, e
    // antes do COMMIT. É o instante exacto em que uma implementação sem
    // transacção teria deixado a carta com metade dos preços novos.
    await assert.rejects(
      () => comA(async (db) => {
        const r = await publicar(db, IDS.orgA, {
          menuId, locationId: IDS.unidadeA, canal: 'CARTA', autor: 'segunda@exemplo.example',
        });
        assert.equal(r.ok, true);
        throw new Error('falha injectada a meio da publicação');
      }),
      /falha injectada/,
    );

    const depois = await comA(async (db) => ({
      revisoes: await historicoDeRevisoes(db, menuId),
      actual: await publicacaoActual(db, menuId, 'CARTA'),
    }));

    assert.equal(depois.revisoes.length, antes.revisoes.length,
      'a revisão da tentativa falhada não pode ter ficado');
    assert.equal(depois.actual?.revisao.id, antes.actual?.revisao.id,
      'o ponteiro tem de continuar na revisão anterior');
    assert.equal(depois.actual?.publicadaPor, AUTOR,
      'e com o autor anterior, não o da tentativa falhada');
  });

  it('E O OUTRO LADO: a que corre até ao fim TROCA MESMO', async () => {
    // Sem este caso, passa um sistema que nunca publica: a asserção da falha a
    // meio ficaria verde num produto onde publicar não faz nada.
    const antes = await comA((db) => publicacaoActual(db, menuId, 'CARTA'));
    await comA((db) => db.product.updateMany({
      where: { id: produtoId }, data: { nome: `${PREFIXO} croquetas de jamón` },
    }));
    const r = await comA((db) => publicar(db, IDS.orgA, {
      menuId, locationId: IDS.unidadeA, canal: 'CARTA', autor: AUTOR,
    }));
    assert.equal(r.ok && r.numero, 2);
    assert.deepEqual(r.ok ? r.mudancas.map((m) => m.tipo) : [], ['alterado']);

    const depois = await comA((db) => publicacaoActual(db, menuId, 'CARTA'));
    assert.notEqual(depois?.revisao.id, antes?.revisao.id, 'o ponteiro tinha de ter trocado');
    assert.equal(depois?.revisao.id, r.ok ? r.revisionId : '', 'e para a revisão nova');
    // E o que está no ar é o texto novo — a carta servida mudou, não só a linha.
    const conteudo = depois?.revisao.conteudo as unknown as Array<{ nome: string }>;
    assert.ok(conteudo.some((i) => i.nome.includes('de jamón')), 'a carta no ar tem de ser a nova');
  });

  it('a revisão publicada é IMUTÁVEL — o runtime não a pode reescrever', async () => {
    // `REVOKE UPDATE, DELETE ON menu_revisions FROM bossaos_app`. Sem isto,
    // "o que estava publicado no dia 4" deixava de ter resposta.
    await assert.rejects(
      () => comA((db) => db.$executeRaw`UPDATE menu_revisions SET numero = 99 WHERE menu_id = ${menuId}::uuid`),
      /permission denied|permissão negada/i,
    );
  });

  it('publicar com um produto SEM PREÇO devolve bloqueio e não escreve nada', async () => {
    const antes = await comA((db) => historicoDeRevisoes(db, menuId));
    const semPreco = await comA(async (db) => {
      const p = await db.product.create({
        data: {
          organizationId: IDS.orgA, brandId: IDS.marcaA, categoryId: categoriaId,
          nome: `${PREFIXO} sem preço`, estado: 'ACTIVO',
        },
        select: { id: true },
      });
      return p.id;
    });
    const r = await comA((db) => publicar(db, IDS.orgA, {
      menuId, locationId: IDS.unidadeA, canal: 'CARTA', autor: AUTOR,
    }));
    assert.equal(r.ok, false);
    assert.deepEqual(!r.ok ? r.bloqueios.map((b) => b.motivo) : [], ['sem_preco']);

    const depois = await comA((db) => historicoDeRevisoes(db, menuId));
    assert.equal(depois.length, antes.length, 'uma publicação bloqueada não escreve');
    await comA((db) => db.product.deleteMany({ where: { id: semPreco } }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. Tradução obsoleta é sinalizada', () => {
  it('escrita e revista fica REVISADA', async () => {
    const r = await comA((db) => guardarTraducao(db, IDS.orgA, produtoId, 'en', {
      nome: 'Ham croquettes', descricao: 'with Iberian ham', revista: true, autor: AUTOR,
    }));
    assert.equal(r.ok && r.estado, 'revisada');
    const t = await comA((db) => traducoesDoProduto(db, produtoId));
    assert.equal(t?.linhas.find((l) => l.idioma === 'en')?.estado, 'revisada');
  });

  it('MUDAR O TEXTO DE ORIGEM torna-a obsoleta', async () => {
    await comA((db) => db.product.updateMany({
      where: { id: produtoId }, data: { descricao: 'de jamón serrano' },
    }));
    const t = await comA((db) => traducoesDoProduto(db, produtoId));
    assert.equal(t?.linhas.find((l) => l.idioma === 'en')?.estado, 'obsoleta');
  });

  it('e a carta publicada RECUA em vez de mostrar o antigo', async () => {
    const texto = await comA((db) => textoDoProduto(db, produtoId, 'en', 'es-ES'));
    assert.equal(texto?.proveniencia.origem, 'idioma_principal');
    assert.equal(
      texto?.proveniencia.origem === 'idioma_principal' ? texto.proveniencia.razao : '',
      'obsoleta',
    );
    assert.ok(texto?.nome.includes('croquetas'), 'mostra o original, não a tradução velha');
  });

  it('MUDAR SÓ O PREÇO não torna a tradução obsoleta — é o par', async () => {
    // É a correcção que substituiu `origemVersao`: a `version` do produto avança
    // com o preço, e marcar a tradução por isso é o falso positivo que ensina
    // toda a gente a ignorar o aviso.
    await comA((db) => guardarTraducao(db, IDS.orgA, produtoId, 'en', {
      nome: 'Ham croquettes', descricao: 'with Iberian ham', revista: true, autor: AUTOR,
    }));
    await comA((db) => db.priceRule.updateMany({
      where: { productId: produtoId }, data: { montanteMenor: 900 },
    }));
    const t = await comA((db) => traducoesDoProduto(db, produtoId));
    assert.equal(t?.linhas.find((l) => l.idioma === 'en')?.estado, 'revisada');
  });

  it('a cobertura conta as obsoletas à parte das que faltam', async () => {
    const c = await comA((db) => coberturaDeTraducoes(db, IDS.marcaA));
    const pt = c.find((x) => x.idioma === 'pt-BR');
    assert.ok(pt && pt.semTraducao > 0, 'o português não tem nenhuma');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. Importação: repetida não duplica, e o nome nunca funde', () => {
  const CABECALHO = ['nome', 'sku', 'preco', 'moeda'];
  const COLUNAS = { nome: 'nome', sku: 'sku', preco: 'preco', moeda: 'moeda' };

  it('a prévia não escreve produtos', async () => {
    const antes = await comA((db) => db.product.count({ where: { brandId: IDS.marcaA } }));
    const { previa } = await comA((db) => guardarPrevia(db, IDS.orgA, {
      brandId: IDS.marcaA, ficheiroNome: `${PREFIXO}.csv`, separador: ';',
      colunas: COLUNAS, estrategia: 'criar_apenas', autor: AUTOR,
      cabecalho: CABECALHO,
      linhas: [[`${PREFIXO} pulpo`, `${PREFIXO}-PUL`, '18,00', 'EUR']],
    }));
    assert.equal(previa.resumo.criar, 1);
    assert.equal(await comA((db) => db.product.count({ where: { brandId: IDS.marcaA } })), antes);
  });

  it('confirmar escreve — e o preço passou pelo parser, não por parseFloat', async () => {
    const { jobId } = await comA((db) => guardarPrevia(db, IDS.orgA, {
      brandId: IDS.marcaA, ficheiroNome: `${PREFIXO}-b.csv`, separador: ';',
      colunas: COLUNAS, estrategia: 'criar_apenas', autor: AUTOR,
      cabecalho: CABECALHO,
      linhas: [[`${PREFIXO} gazpacho`, `${PREFIXO}-GAZ`, '0,29', 'EUR']],
    }));
    const r = await comA((db) => confirmarImportacao(db, IDS.orgA, jobId, AUTOR));
    assert.equal(r.ok && r.criados, 1);
    const preco = await comA((db) => db.priceRule.findFirst({
      where: { product: { sku: `${PREFIXO}-GAZ` } }, select: { montanteMenor: true },
    }));
    // `parseFloat('0.29') * 100` truncado dá 28.
    assert.equal(preco?.montanteMenor, 29);
  });

  it('A MESMA IMPORTAÇÃO REPETIDA não duplica o SKU', async () => {
    const linhas = [[`${PREFIXO} gazpacho`, `${PREFIXO}-GAZ`, '0,29', 'EUR']];
    const { jobId, previa } = await comA((db) => guardarPrevia(db, IDS.orgA, {
      brandId: IDS.marcaA, ficheiroNome: `${PREFIXO}-c.csv`, separador: ';',
      colunas: COLUNAS, estrategia: 'actualizar_por_sku', autor: AUTOR,
      cabecalho: CABECALHO, linhas,
    }));
    assert.deepEqual(previa.resumo, { criar: 0, actualizar: 0, ignorar: 1, erro: 0 });
    const r = await comA((db) => confirmarImportacao(db, IDS.orgA, jobId, AUTOR));
    assert.equal(r.ok && r.criados, 0);
    const quantos = await comA((db) => db.product.count({ where: { sku: `${PREFIXO}-GAZ` } }));
    assert.equal(quantos, 1);
  });

  it('NOME IGUAL com SKU diferente cria outro produto', async () => {
    const { previa } = await comA((db) => guardarPrevia(db, IDS.orgA, {
      brandId: IDS.marcaA, ficheiroNome: `${PREFIXO}-d.csv`, separador: ';',
      colunas: COLUNAS, estrategia: 'actualizar_por_sku', autor: AUTOR,
      cabecalho: CABECALHO,
      linhas: [[`${PREFIXO} gazpacho`, `${PREFIXO}-GAZ2`, '5,00', 'EUR']],
    }));
    assert.equal(previa.resumo.criar, 1, 'dois "gazpacho" não são o mesmo produto');
  });

  it('confirmar duas vezes o MESMO trabalho não escreve outra vez', async () => {
    const { jobId } = await comA((db) => guardarPrevia(db, IDS.orgA, {
      brandId: IDS.marcaA, ficheiroNome: `${PREFIXO}-e.csv`, separador: ';',
      colunas: COLUNAS, estrategia: 'criar_apenas', autor: AUTOR,
      cabecalho: CABECALHO,
      linhas: [[`${PREFIXO} tortilla`, `${PREFIXO}-TOR`, '7,00', 'EUR']],
    }));
    assert.equal((await comA((db) => confirmarImportacao(db, IDS.orgA, jobId, AUTOR))).ok, true);
    const segunda = await comA((db) => confirmarImportacao(db, IDS.orgA, jobId, AUTOR));
    assert.equal(segunda.ok, false);
    assert.equal(await comA((db) => db.product.count({ where: { sku: `${PREFIXO}-TOR` } })), 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. Média: o SVG não entra, e o ficheiro tem dono', () => {
  it('um PNG entra', async () => {
    const r = await comA((db) => guardarMedia(db, IDS.orgA, PORTA, {
      brandId: IDS.marcaA, conteudo: PNG, tipoDeclarado: 'image/png',
      nomeOriginal: 'croquetas.png', textoAlternativo: 'Croquetas', autor: AUTOR,
    }));
    assert.equal(r.ok, true);
  });

  it('UM SVG RENOMEADO PARA .PNG NÃO ENTRA — e não fica no armazenamento', async () => {
    const antes = guardados.size;
    const r = await comA((db) => guardarMedia(db, IDS.orgA, PORTA, {
      brandId: IDS.marcaA, conteudo: SVG, tipoDeclarado: 'image/png',
      nomeOriginal: 'logo.png', autor: AUTOR,
    }));
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.detalhe, 'svg');
    // O que fica no disco acaba servido: a recusa tem de vir ANTES de escrever.
    assert.equal(guardados.size, antes, 'não pode ter sido guardado');
  });

  it('o mesmo ficheiro duas vezes não cria duas linhas', async () => {
    const r = await comA((db) => guardarMedia(db, IDS.orgA, PORTA, {
      brandId: IDS.marcaA, conteudo: PNG, tipoDeclarado: 'image/png', autor: AUTOR,
    }));
    assert.equal(r.ok && r.repetido, true);
  });

  it('o ficheiro de A não é visível a B', async () => {
    const deA = await comA((db) => db.mediaAsset.count({ where: { brandId: IDS.marcaA } }));
    assert.ok(deA > 0);
    const deB = await comB((db) => db.mediaAsset.count({ where: { brandId: IDS.marcaA } }));
    assert.equal(deB, 0, 'a política de linha tem de esconder o ficheiro de outro inquilino');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4b. Buscar por URL: os três endereços que a régua nomeia', () => {
  // O resolvedor é injectado para o caso do NOME público que resolve para
  // dentro poder ser medido — sem ele, essa porta ficava por provar.
  const resolve = async (nome: string): Promise<readonly string[]> =>
    nome === 'interno.exemplo.example' ? ['10.0.0.5'] : ['93.184.216.34'];

  it('127.0.0.1, 169.254.169.254 e um endereço privado — recusa nos três', async () => {
    // "Um destes três a passar é o mesmo que nenhum estar guardado."
    for (const url of [
      'http://127.0.0.1/logo.png',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.5/logo.png',
    ]) {
      const r = await buscarPorUrl(url, resolve);
      assert.equal(r.ok, false, `${url} passou`);
      assert.equal(!r.ok && r.erro, 'destino_interno', url);
    }
  });

  it('e as formas de os escrever sem os escrever', async () => {
    for (const url of ['http://2130706433/x.png', 'http://0177.0.0.1/x.png', 'http://[::1]/x.png']) {
      assert.equal((await buscarPorUrl(url, resolve)).ok, false, url);
    }
  });

  it('um NOME público que resolve para dentro também é recusado', async () => {
    // A porta que a forma do URL não consegue ver.
    const r = await buscarPorUrl('https://interno.exemplo.example/logo.png', resolve);
    assert.equal(!r.ok && r.erro, 'destino_interno');
  });


  it('UM 302 PARA UM ENDERECO INTERNO E RECUSADO', async () => {
    // ── A terceira camada, e a unica que derrota as outras duas ────────────
    //
    // `cdn.exemplo.example` passa a forma do URL (nome publico) e passa a
    // resolucao (93.184.216.34, publico). E depois responde **302 para
    // 169.254.169.254**. As duas primeiras camadas nao veem isto: a decisao ja
    // foi tomada quando o redireccionamento chega.
    //
    // Quem impede e `redirect: 'manual'` — uma palavra que, ate agora, nenhum
    // teste vigiava. O senior trocou-a por `follow` e tudo continuou verde.
    //
    // ── Porque e que o duplo do `fetch` honra o `redirect` ─────────────────
    //
    // Um duplo que devolvesse sempre o 302 passaria com `manual` E com `follow`,
    // e o controlo negativo nao discriminava — seria o mesmo verde vazio que
    // este caso existe para fechar. Por isso o duplo MODELA o comportamento
    // documentado da plataforma: com `follow` (ou por omissao) segue o
    // redireccionamento ele proprio e devolve a resposta final; com `manual`
    // devolve o 3xx tal como veio.
    //
    // A prova de que o modelo discrimina nao esta neste comentario: esta no
    // passo 9d do `provar-publicacao.sh`, que troca a palavra no codigo e exige
    // que esta assercao caia.
    const original = globalThis.fetch;
    const visitados: string[] = [];
    globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
      const alvo = String(entrada);
      visitados.push(alvo);
      const paraOndeRedirecciona = 'http://169.254.169.254/latest/meta-data/';

      if (alvo.startsWith('https://cdn.exemplo.example')) {
        const trezentos = new Response(null, {
          status: 302, headers: { location: paraOndeRedirecciona },
        });
        if (init?.redirect === 'manual') return trezentos;
        // `follow` e o comportamento por omissao: o `fetch` real vai la buscar
        // sozinho, e quem chamou nunca ve o 302.
        return globalThis.fetch(paraOndeRedirecciona, init);
      }
      // O destino interno responde uma imagem a serio. Se chegarmos aqui, o
      // proxy para a rede interna existe.
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        status: 200, headers: { 'content-type': 'image/png' },
      });
    }) as typeof globalThis.fetch;

    try {
      const r = await buscarPorUrl('https://cdn.exemplo.example/logo.png', resolve);
      assert.equal(r.ok, false, 'o redireccionamento para dentro tem de ser recusado');
      assert.equal(!r.ok && r.erro, 'destino_interno');
      assert.equal(!r.ok && r.detalhe, 'redireccionamento',
        'e com o motivo certo: nao foi a forma nem a resolucao que o apanhou');
      // O par: se o endereco interno tivesse sido visitado, ja tinhamos sido o
      // proxy — mesmo que a resposta acabasse por ser deitada fora.
      assert.deepEqual(visitados, ['https://cdn.exemplo.example/logo.png'],
        'o nosso servidor nao pode ter chegado a bater ao endereco interno');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('e um 302 para um endereco PUBLICO tambem nao e seguido — sem excepcoes', async () => {
    // Sem este, uma implementacao que recusasse so os 3xx cujo `location` fosse
    // interno passaria no caso de cima — e teria de resolver o `location` para
    // decidir, que e mais uma porta por onde entrar. Recusa-se o 3xx, ponto: um
    // destino que redirecciona diz-se com o endereco final.
    const original = globalThis.fetch;
    globalThis.fetch = (async (_entrada: RequestInfo | URL, init?: RequestInit) => {
      const trezentos = new Response(null, {
        status: 301, headers: { location: 'https://outro.exemplo.example/logo.png' },
      });
      if (init?.redirect === 'manual') return trezentos;
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        status: 200, headers: { 'content-type': 'image/png' },
      });
    }) as typeof globalThis.fetch;
    try {
      const r = await buscarPorUrl('https://cdn.exemplo.example/logo.png', resolve);
      assert.equal(!r.ok && r.detalhe, 'redireccionamento');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('e o PAR: sem redireccionamento, um destino publico entra', async () => {
    // Sem isto, uma implementacao que recusasse TUDO passava nos dois casos de
    // cima e a busca por URL nao servia para nada.
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]),
      { status: 200, headers: { 'content-type': 'image/png' } },
    )) as typeof globalThis.fetch;
    try {
      const r = await buscarPorUrl('https://cdn.exemplo.example/logo.png', resolve);
      assert.equal(r.ok, true, 'um destino publico sem redireccionamento tem de passar');
      assert.equal(r.ok && r.tipoDeclarado, 'image/png');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('e `file:` nem chega a resolver-se', async () => {
    const r = await buscarPorUrl('file:///etc/passwd', resolve);
    assert.equal(!r.ok && r.erro, 'esquema_nao_permitido');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4c. Substituir média não quebra a carta publicada', () => {
  it('a revisão no ar continua a apontar para a chave ANTIGA', async () => {
    const media = await comA((db) => guardarMedia(db, IDS.orgA, PORTA, {
      brandId: IDS.marcaA, conteudo: new Uint8Array([...PNG, 9, 9]),
      tipoDeclarado: 'image/png', textoAlternativo: 'Croquetas', autor: AUTOR,
    }));
    assert.equal(media.ok, true);
    const mediaId = media.ok ? media.mediaId : '';
    const chaveAntiga = media.ok ? media.chave : '';
    await comA((db) => ligarAoProduto(db, IDS.orgA, produtoId, mediaId, true));

    const pub = await comA((db) => publicar(db, IDS.orgA, {
      menuId, locationId: IDS.unidadeA, canal: 'CARTA', autor: AUTOR,
    }));
    assert.equal(pub.ok, true);

    // Trocar o conteúdo do ficheiro. A ligação produto↔média não se mexe.
    const nova = await comA((db) => substituirConteudo(
      db, PORTA, mediaId, new Uint8Array([...PNG, 7, 7, 7]), 'image/png',
    ));
    assert.equal(nova.ok, true);
    assert.notEqual(nova.ok ? nova.chave : '', chaveAntiga, 'a chave tinha de mudar');

    const noAr = await comA((db) => publicacaoActual(db, menuId, 'CARTA'));
    const itens = noAr?.revisao.conteudo as unknown as Array<{ media: Array<{ chave: string }> }>;
    const chaves = itens.flatMap((i) => i.media.map((m) => m.chave));
    // A carta de ontem continua a mostrar a foto de ontem: a revisão guardou a
    // CHAVE, não o identificador. É o retrato a fazer o seu trabalho.
    assert.ok(chaves.includes(chaveAntiga), 'a revisão publicada tem de manter a chave antiga');
    assert.ok(!chaves.includes(nova.ok ? nova.chave : 'x'), 'e não pode ter apanhado a nova');

    // E a ligação continua lá — substituir não desliga o ficheiro do produto.
    const ligacoes = await comA((db) => db.productMedia.count({ where: { productId: produtoId } }));
    assert.equal(ligacoes, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5. Exportação: CSV neutralizado e permissão verificada duas vezes', () => {
  it('UM PRODUTO CHAMADO =1+1 SAI NEUTRALIZADO', async () => {
    // ── O nome TEM DE COMEÇAR por `=` ──────────────────────────────────────
    //
    // A primeira versão deste caso chamava-lhe `${PREFIXO}=HYPERLINK(...)`, para
    // a limpeza o apanhar pelo prefixo. Com o prefixo à frente o campo começa por
    // `e`, não por `=`, e **não é perigoso** — a asserção ficava verde sobre um
    // valor inofensivo. Foi o controlo negativo do `provar-publicacao.sh` que o
    // disse: com a neutralização desligada, isto continuava verde.
    //
    // O prefixo passou para dentro do argumento, onde ainda serve à limpeza
    // (`LIKE '%e08-%'`) sem desarmar o caso.
    const perigoso = `=HYPERLINK("http://mau","${PREFIXO} clica")`;
    await comA((db) => db.product.create({
      data: {
        organizationId: IDS.orgA, brandId: IDS.marcaA, categoryId: categoriaId,
        nome: perigoso, estado: 'ACTIVO',
      },
    }));
    const csv = await comA((db) => catalogoParaCsv(db, IDS.marcaA));
    assert.ok(csv.includes(PREFIXO), 'o produto tem de estar lá');
    // Neutralizado: o campo é `'=HYPERLINK…`, e por levar vírgula vai entre
    // aspas — `"'=HYPERLINK…`. O que não pode existir é o `=` logo a seguir à
    // aspa de abertura, que é o que o Excel avalia.
    assert.ok(!csv.includes('"=HYPERLINK'), 'o campo saiu COMO FÓRMULA');
    assert.ok(csv.includes(`"'=HYPERLINK`), 'devia ter saído com o apóstrofo à frente');
  });

  it('e o CSV leva BOM, senão o Excel lê "Café" como "CafÃ©"', async () => {
    const csv = await comA((db) => catalogoParaCsv(db, IDS.marcaA));
    assert.equal(csv.charCodeAt(0), 0xfeff);
  });

  it('quem tem direito descarrega', async () => {
    const e = await comA((db) => pedirExportacao(db, IDS.orgA, {
      actorId: IDS.utilizadorA, accaoExigida: 'catalogo.editar',
      formato: `${PREFIXO}-csv`, chave: `${PREFIXO}/exportacao.csv`,
    }));
    const r = await comA((db) => podeDescarregar(
      db, IDS.orgA, e.id, IDS.utilizadorA, [{ papel: 'OWNER' }],
    ));
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.chave, `${PREFIXO}/exportacao.csv`);
  });

  it('QUEM PERDEU O DIREITO não descarrega a MESMA exportação', async () => {
    const e = await comA((db) => pedirExportacao(db, IDS.orgA, {
      actorId: IDS.utilizadorA, accaoExigida: 'catalogo.editar', formato: `${PREFIXO}-csv`,
    }));
    // Mesmo ficheiro, mesmo instante, mesma pessoa — só mudaram as concessões.
    const com = await comA((db) => podeDescarregar(db, IDS.orgA, e.id, IDS.utilizadorA, [{ papel: 'OWNER' }]));
    const sem = await comA((db) => podeDescarregar(db, IDS.orgA, e.id, IDS.utilizadorA, [{ papel: 'KITCHEN' }]));
    assert.equal(com.ok, true);
    assert.equal(sem.ok, false);
    assert.equal(!sem.ok && sem.erro, 'sem_permissao');
  });

  it('depois de expirar, nem com direito', async () => {
    const e = await comA((db) => pedirExportacao(db, IDS.orgA, {
      actorId: IDS.utilizadorA, accaoExigida: 'catalogo.editar', formato: `${PREFIXO}-csv`,
    }));
    const daquiADuasHoras = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const r = await comA((db) => podeDescarregar(
      db, IDS.orgA, e.id, IDS.utilizadorA, [{ papel: 'OWNER' }], daquiADuasHoras,
    ));
    assert.equal(!r.ok && r.erro, 'expirado');
  });

  it('a exportação de A não existe para B', async () => {
    const e = await comA((db) => pedirExportacao(db, IDS.orgA, {
      actorId: IDS.utilizadorA, accaoExigida: 'catalogo.editar', formato: `${PREFIXO}-csv`,
    }));
    const r = await comB((db) => podeDescarregar(db, IDS.orgB, e.id, IDS.utilizadorB, [{ papel: 'OWNER' }]));
    assert.equal(r.ok, false, 'a política de linha esconde-a, e sai como ausência');
    const listaB = await comB((db) => listarExportacoes(db));
    assert.equal(listaB.filter((x) => x.id === e.id).length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('6. Isolamento das tabelas novas', () => {
  it('as oito tabelas do E08 têm política de linha', async () => {
    const { rows } = await sql.query(
      `SELECT c.relname, c.relrowsecurity, count(p.polname) AS politicas
         FROM pg_class c
         LEFT JOIN pg_policy p ON p.polrelid = c.oid
        WHERE c.relname = ANY($1)
        GROUP BY c.relname, c.relrowsecurity`,
      [['media_assets', 'product_media', 'menu_revisions', 'menu_publications',
        'import_jobs', 'import_rows', 'export_jobs', 'outbox_tasks']],
    );
    assert.equal(rows.length, 8, 'faltam tabelas');
    for (const r of rows) {
      assert.equal(r.relrowsecurity, true, `${r.relname} sem RLS`);
      assert.ok(Number(r.politicas) >= 1, `${r.relname} sem política`);
    }
  });

  it('o menu de A não é visível a B, e o preview também não', async () => {
    assert.equal(await comB((db) => db.menuRevision.count({ where: { menuId } })), 0);
    const previa = await comB((db) => preverPublicacao(db, {
      menuId, locationId: IDS.unidadeA, canal: 'CARTA',
    }));
    assert.deepEqual(previa.mudancas, [], 'B não vê a carta de A nem por comparação');
  });
});

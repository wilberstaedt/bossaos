import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  abertoAgora, cartaPublica, comEscopo, horarioPublico, obterPrisma, publicar,
  registarConsulta,
} from '../packages/db/src/index.ts';
import { produtoDaCarta } from '../packages/domain/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * A prova do E09.
 *
 * ── O que a decide ──────────────────────────────────────────────────────────
 *
 * > *"Rotas públicas não revelam custos, SKUs internos nem catálogo oculto"* — e
 * > o sénior escreveu que ia olhar para o **corpo da resposta**, não para o que o
 * > ecrã desenha.
 *
 * Por isso o que se mede aqui é o JSON que sai da porta pública, com um catálogo
 * montado de propósito para ter as três coisas: um produto oculto, um SKU e um
 * campo de custo no retrato da revisão.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;
const marca = Date.now();
const PREFIXO = `e09-${marca}`;
const SLUG_A = `e09a-${marca}`;
const SLUG_B = `e09b-${marca}`;
const AUTOR = 'dona@exemplo.example';

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA, userId: IDS.utilizadorA }, fn);
const comB = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgB, userId: IDS.utilizadorB }, fn);

let visivelId = '';
let ocultoId = '';

/** Monta uma carta publicada numa organização. Devolve o id do menu. */
async function montar(
  correr: typeof comA,
  organizationId: string, brandId: string, locationId: string,
  nome: string, publicSlug: string,
): Promise<{ menuId: string; visivel: string; oculto: string }> {
  return correr(async (db) => {
    const cat = await db.category.create({
      data: { organizationId, brandId, nome: `${PREFIXO} ${nome}`, ordem: 1 },
      select: { id: true },
    });
    const visivel = await db.product.create({
      data: {
        organizationId, brandId, categoryId: cat.id,
        nome: `${PREFIXO} ${nome} visivel`, descricao: 'de jamón', estado: 'ACTIVO',
        // O SKU interno. Aparece em facturas de fornecedor; não pode sair.
        sku: `${PREFIXO}-${nome}-SKU-INTERNO`,
      },
      select: { id: true },
    });
    const oculto = await db.product.create({
      data: {
        organizationId, brandId, categoryId: cat.id,
        nome: `${PREFIXO} ${nome} OCULTO`, estado: 'ACTIVO',
        sku: `${PREFIXO}-${nome}-SKU-OCULTO`,
      },
      select: { id: true },
    });
    for (const p of [visivel, oculto]) {
      await db.priceRule.create({
        data: { organizationId, productId: p.id, montanteMenor: 850, moeda: 'EUR' },
      });
    }
    // Um visível na CARTA; o outro explicitamente escondido.
    await db.productChannel.create({
      data: { organizationId, productId: visivel.id, canal: 'CARTA', visivel: true },
    });
    await db.productChannel.create({
      data: { organizationId, productId: oculto.id, canal: 'CARTA', visivel: false },
    });

    const menu = await db.menu.create({
      data: { organizationId, brandId, nome: `${PREFIXO} ${nome} carta`, estado: 'ACTIVO' },
      select: { id: true },
    });
    await db.menuCategory.create({
      data: { organizationId, menuId: menu.id, categoryId: cat.id, ordem: 1 },
    });
    await db.location.updateMany({ where: { id: locationId }, data: { publicSlug } });

    const r = await publicar(db, organizationId, {
      menuId: menu.id, locationId, canal: 'CARTA', autor: AUTOR,
    });
    assert.equal(r.ok, true, `publicar ${nome}: ${JSON.stringify(!r.ok ? r.bloqueios : '')}`);
    return { menuId: menu.id, visivel: visivel.id, oculto: oculto.id };
  });
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);

  const a = await montar(comA, IDS.orgA, IDS.marcaA, IDS.unidadeA, 'a', SLUG_A);
  visivelId = a.visivel;
  ocultoId = a.oculto;
  await montar(comB, IDS.orgB, IDS.marcaB, IDS.unidadeB, 'b', SLUG_B);
});

after(async () => {
  await sql.query(`UPDATE locations SET public_slug = NULL WHERE public_slug IN ('${SLUG_A}','${SLUG_B}')`);
  await sql.query(`DELETE FROM menu_views WHERE revision_id IN (SELECT id FROM menu_revisions WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%'))`);
  await sql.query(`DELETE FROM menu_publications WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM menu_revisions   WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM menu_categories  WHERE menu_id IN (SELECT id FROM menus WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM menus WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM product_channels WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM price_rules WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM products WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM categories WHERE nome LIKE '${PREFIXO}%'`);
  await sql.end();
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('1. O CORPO da resposta pública', () => {
  it('NEM SKU NEM CUSTO saem — medido no JSON, não no ecrã', async () => {
    // ── Este caso já esteve escrito de forma vácua ────────────────────────
    //
    // A primeira versão lia a carta e verificava que o SKU não estava lá. Mas o
    // retrato que o E08 grava **nunca teve** SKU nem custo: `montarRevisao` não
    // os selecciona. A asserção media a ausência de um campo que ninguém pôs, e
    // o controlo negativo disse-o — espalhei `...item` na projecção e a prova
    // continuou verde.
    //
    // Agora os campos são **injectados no retrato**, que é um `Json` e é
    // exactamente por onde o E22 (custo) e o E24 (fiscal) vão entrar. Isto não é
    // artificial: é a única forma de medir hoje o caminho que amanhã existe.
    const antes = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    assert.ok(antes);

    await sql.query(
      `UPDATE menu_revisions
          SET conteudo = (
            SELECT jsonb_agg(item || jsonb_build_object(
              'sku', 'SKU-INTERNO-DO-FUTURO',
              'custoMenor', 310,
              'margemPercentagem', 63.5,
              'fornecedor', 'Distribuidora Sur, 600 000 000'))
            FROM jsonb_array_elements(conteudo) AS item)
        WHERE id = $1`,
      [antes.revisionId],
    );

    const servida = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    assert.ok(servida);
    const corpo = JSON.stringify(servida.carta);

    // Confirma primeiro que o retrato REALMENTE os tem — senão voltava a ser um
    // teste sobre um campo que ninguém pôs.
    const { rows } = await sql.query(
      'SELECT conteudo::text AS c FROM menu_revisions WHERE id = $1', [antes.revisionId],
    );
    assert.ok((rows[0] as { c: string }).c.includes('SKU-INTERNO-DO-FUTURO'),
      'o retrato tinha de levar o campo interno para o caso medir alguma coisa');

    for (const segredo of [
      'SKU-INTERNO-DO-FUTURO', 'SKU-INTERNO', 'SKU-OCULTO', 'sku',
      'custoMenor', '310', 'margem', 'fornecedor', 'Distribuidora', '600 000 000',
    ]) {
      assert.ok(!corpo.includes(segredo), `o corpo contém "${segredo}"`);
    }
  });

  it('O PRODUTO OCULTO NÃO ESTÁ LÁ, nem sequer pelo identificador', async () => {
    const servida = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    assert.ok(servida);
    assert.equal(produtoDaCarta(servida.carta, ocultoId), null);
    assert.ok(!JSON.stringify(servida.carta).includes(ocultoId));
    assert.ok(!JSON.stringify(servida.carta).includes('OCULTO'));
  });

  it('e o PAR: o produto publicado ESTÁ lá, com preço', async () => {
    // Sem isto, uma porta que devolvesse a carta vazia passava nos dois casos de
    // cima e o E09 não servia nada.
    const servida = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    const p = produtoDaCarta(servida!.carta, visivelId);
    assert.ok(p, 'o produto visível tinha de estar na carta');
    assert.deepEqual(p.preco, { montanteMenor: 850, moeda: 'EUR' });
    assert.ok(p.nome.includes('visivel'));
  });

  it('um endereço que não existe dá a MESMA resposta que um sem publicação', async () => {
    // Dizer "existe mas não publicou" a um estranho é contar que o restaurante
    // existe.
    assert.equal(await cartaPublica(prisma, 'nao-existe-de-todo', 'CARTA', 'es-ES'), null);
    assert.equal(await cartaPublica(prisma, SLUG_A, 'KIOSK', 'es-ES'), null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. Cache: dois inquilinos não se misturam', () => {
  it('A e B dão CONTEÚDOS diferentes e CHAVES diferentes', async () => {
    const a = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    const b = await cartaPublica(prisma, SLUG_B, 'CARTA', 'es-ES');
    assert.ok(a && b);
    assert.notEqual(a.organizationId, b.organizationId);
    assert.notEqual(a.chaveDeCache, b.chaveDeCache);
    assert.notEqual(JSON.stringify(a.carta), JSON.stringify(b.carta));
    // E a chave de um não contém o inquilino do outro.
    assert.ok(!a.chaveDeCache.includes(b.organizationId));
  });

  it('a MESMA carta em dois idiomas dá chaves diferentes', async () => {
    const es = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    const en = await cartaPublica(prisma, SLUG_A, 'CARTA', 'en');
    assert.notEqual(es!.chaveDeCache, en!.chaveDeCache);
  });

  it('A PUBLICAÇÃO ENTRA NA CHAVE — publicar outra vez muda-a', async () => {
    // Se a chave esquecesse a publicação, uma carta antiga sobrevivia a uma
    // publicação nova: o aceite 1 do E08 a falhar por outra porta.
    const antes = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    await comA((db) => db.product.updateMany({
      where: { id: visivelId }, data: { nome: `${PREFIXO} a visivel v2` },
    }));
    const menu = await comA((db) => db.menu.findFirst({
      where: { nome: { startsWith: `${PREFIXO} a carta` } }, select: { id: true },
    }));
    const r = await comA((db) => publicar(db, IDS.orgA, {
      menuId: menu!.id, locationId: IDS.unidadeA, canal: 'CARTA', autor: AUTOR,
    }));
    assert.equal(r.ok, true);

    const depois = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    assert.notEqual(depois!.chaveDeCache, antes!.chaveDeCache);
    assert.notEqual(depois!.revisionId, antes!.revisionId);
    assert.ok(JSON.stringify(depois!.carta).includes('v2'), 'a carta servida tem de ser a nova');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. Fora de horas, e o fuso da unidade', () => {
  it('a carta continua consultável com o restaurante fechado', async () => {
    await comA(async (db) => {
      const dia = await db.scheduleDay.findFirst({
        where: { locationId: IDS.unidadeA }, select: { id: true },
      });
      if (dia) await db.scheduleDay.updateMany({ where: { id: dia.id }, data: { fechado: true } });
    });
    const servida = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    assert.ok(servida, 'fechado não pode esconder a carta');
    assert.ok(servida.carta.categorias.length > 0);
  });

  it('o horário vem COM o fuso da unidade lá dentro', async () => {
    // O caso do E06: 19 asserções verdes sobre um motor que ignorava o fuso. Um
    // horário devolvido sem o fuso convida ao mesmo erro.
    const h = await horarioPublico(prisma, SLUG_A);
    assert.ok(h);
    assert.equal(h.horario.fuso, h.fuso);
    assert.ok(h.fuso.length > 0);
    // E o motor do E06 aceita-o sem mais nada.
    assert.ok(['aberto', 'fechado', 'desconhecido'].includes(abertoAgora(h).estado));
  });

  it('sem horário nenhum, a resposta é POR CONFIGURAR e não "fechado"', async () => {
    const h = await horarioPublico(prisma, SLUG_B);
    if (h && h.porConfigurar) {
      assert.equal(abertoAgora(h).estado, 'desconhecido',
        '"ninguém disse" não é "fechado" — vale igual à frente de um cliente');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. As consultas contam, e não seguem ninguém', () => {
  it('registar uma consulta ESCREVE — e devolve que contou', async () => {
    // O caminho que eu tinha escrito falhava sempre em silêncio: `set_config`
    // local à transacção com duas chamadas soltas. Aqui exige-se o contrário.
    const servida = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    const antes = await comA((db) => db.menuView.count({ where: { locationId: IDS.unidadeA } }));
    const r = await registarConsulta(prisma, {
      organizationId: servida!.organizationId, locationId: servida!.locationId,
      revisionId: servida!.revisionId, idioma: 'es-ES', canal: 'CARTA', origem: 'qr',
    });
    assert.equal(r.contou, true, `não contou: ${r.erro}`);
    const depois = await comA((db) => db.menuView.count({ where: { locationId: IDS.unidadeA } }));
    assert.equal(depois, antes + 1);
  });

  it('a tabela NÃO TEM onde guardar quem consultou', async () => {
    // A minimização é estrutural: o que não tem coluna não se guarda por
    // distracção. Uma alteração que acrescente `ip` ou `user_agent` faz isto
    // ficar vermelho, que é o momento certo para essa conversa acontecer.
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'menu_views'`,
    );
    const colunas = rows.map((r: { column_name: string }) => r.column_name);
    for (const proibida of ['ip', 'ip_address', 'user_agent', 'cookie', 'session_id', 'user_id', 'referer']) {
      assert.ok(!colunas.includes(proibida), `menu_views tem a coluna ${proibida}`);
    }
  });

  it('e o runtime NÃO pode apagar uma consulta', async () => {
    // Um facto que aconteceu. Apagá-lo é reescrever o que se mediu, e o
    // relatório passa a poder ser arranjado.
    await assert.rejects(
      () => comA((db) => db.$executeRaw`DELETE FROM menu_views WHERE location_id = ${IDS.unidadeA}::uuid`),
      /permission denied|permissão negada/i,
    );
  });

  it('as consultas de A não são visíveis a B', async () => {
    const deB = await comB((db) => db.menuView.count({ where: { locationId: IDS.unidadeA } }));
    assert.equal(deB, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5. O QR é um endereço, não uma credencial', () => {
  it('a porta pública não aceita nada além de ler', async () => {
    // A régua: "o QR geral não concede sessão de mesa nem permissão de
    // encomendar". Em E09 **não existe rota de pedido nenhuma** — nem para o
    // Starter nem para os outros —, e isso é mais forte do que uma recusa: não
    // há superfície. Mede-se pela ausência: nenhuma rota pública exporta POST.
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const raiz = join(process.cwd(), 'apps', 'web', 'app', 'r');
    const ficheiros: string[] = [];
    const visitar = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) visitar(caminho);
        else if (/\.tsx?$/.test(nome)) ficheiros.push(caminho);
      }
    };
    visitar(raiz);
    assert.ok(ficheiros.length > 0, 'não havia rotas públicas para medir');
    for (const f of ficheiros) {
      const conteudo = readFileSync(f, 'utf8');
      for (const verbo of ['export async function POST', 'export async function PUT',
        'export async function PATCH', 'export async function DELETE']) {
        assert.ok(!conteudo.includes(verbo), `${f} exporta ${verbo}`);
      }
    }
  });

  it('e a porta da base só devolve o que está publicado', async () => {
    // Um rascunho não tem linha em `menu_publications`, e por isso nunca chega à
    // função. Prova-se despublicando: o ponteiro sai e a carta desaparece.
    const menu = await comA((db) => db.menu.findFirst({
      where: { nome: { startsWith: `${PREFIXO} a carta` } }, select: { id: true },
    }));
    const antes = await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES');
    assert.ok(antes);

    await sql.query('DELETE FROM menu_publications WHERE menu_id = $1', [menu!.id]);
    assert.equal(await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES'), null,
      'sem publicação não há carta pública');
  });
});

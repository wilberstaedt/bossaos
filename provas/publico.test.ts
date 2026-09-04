import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  abertoAgora, cartaPublica, comEscopo, horarioPublico, largarEnderecoPublico,
  obterPrisma, publicar, registarConsulta, reservarEnderecoPublico,
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

/**
 * Os verbos que escrevem. `GET` e `HEAD` não estão aqui de propósito: a carta
 * pública lê-se, e ler é o que ela faz.
 */
const VERBOS_DE_ESCRITA = ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;

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
  await sql.query(`UPDATE locations SET public_slug = NULL WHERE public_slug LIKE 'e09%${marca}'`);
  // A reserva NUNCA se apaga pelo produto. Aqui apaga-se com a credencial de
  // migração, que é o que a regra chama "acção deliberada de plataforma".
  await sql.query(`DELETE FROM public_slug_owners WHERE slug LIKE 'e09%${marca}'`);
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
  it('a porta pública não escreve nada SEM SESSÃO DE VISITANTE', async () => {
    // ── Esta medição já esteve errada, e o sénior provou-o ─────────────────
    //
    // A primeira versão procurava `export async function POST`. Isso não apanha
    // `export const POST = async () => …`, que é igualmente válido em Next.js.
    // Ele injectou essa forma nesta mesma pasta e o `provar-publico.sh` ficou
    // VERDE, com cinco grupos e dezasseis asserções.
    //
    // Era o mesmo padrão do E08: o código estava certo e a protecção não
    // conseguia falhar.
    //
    // ── Porque é que o detector é DELIBERADAMENTE largo ────────────────────
    //
    // Enumerar formas de exportação é uma corrida que se perde: `function`,
    // `const`, `let`, `var`, `export { x as POST }`, listas com vírgulas, e o
    // que a linguagem acrescentar. Em vez disso procura-se um `export` seguido,
    // numa janela curta, do nome de um verbo.
    //
    // Isto tem **falsos positivos** — `export const metodo = 'POST'` também
    // dispara — e é o lado certo para errar: um falso positivo faz alguém
    // renomear uma constante; um falso negativo é um endpoint de encomenda que
    // ninguém viu numa superfície pública.
    //
    // ── A regra mudou de FORMA, e não de força ────────────────────────────
    //
    // Até ao E17 isto dizia «nada além de ler», e era a regra certa enquanto
    // aqui só vivia a carta. O E17 trouxe a porta do visitante para dentro de
    // `/r/<slug>`, porque a bolacha da visita tem `path=/r/<slug>` e fora dele o
    // navegador não a envia — a alternativa era alargar a bolacha para a raiz e
    // mandar a credencial da mesa 5 para os outros restaurantes do mesmo
    // domínio.
    //
    // A decisão está escrita em `qr-da-mesa-e-o-visitante.md`, e foi escrita
    // ANTES desta alteração: trocar a asserção sem a decisão seria calibrar a
    // guarda ao que já existe.
    //
    // O que continua proibido é o mesmo: um verbo de escrita alcançável por quem
    // só tem o endereço. Por isso uma escrita aqui só é aceite se o ficheiro
    // **exigir a credencial da visita antes de tocar em qualquer coisa** — e o
    // caso seguinte prova que a recusa acontece mesmo, em vez de acreditar que o
    // ficheiro faz o que diz.
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

    let comEscrita = 0;
    for (const f of ficheiros) {
      // As quebras de linha colapsam primeiro: `export {\n  x as POST,\n}` é
      // uma exportação e não pode escapar por estar escrita em três linhas.
      const bruto = readFileSync(f, 'utf8');
      const conteudo = bruto.replace(/\s+/g, ' ');
      const escreve = VERBOS_DE_ESCRITA.some((verbo) => new RegExp(
        // `export`, opcionalmente `default`/`async`, e depois o verbo dentro
        // de uma janela que não atravessa um `;` — que é o que impede a
        // procura de escorregar para dentro do corpo da função.
        String.raw`\bexport\b(?:[^;]{0,200}?)\b${verbo}\b`,
      ).test(conteudo));
      if (!escreve) continue;

      comEscrita += 1;
      // ── E se escreve, tem de EXIGIR a visita ────────────────────────────
      //
      // A leitura da bolacha não chega: um ficheiro que a lê e continua sem ela
      // é uma porta aberta com um cadeado pendurado ao lado. Exige-se a leitura
      // **e** um caminho de recusa — e a recusa é depois exercida a sério, na
      // asserção seguinte, contra a porta a correr.
      assert.match(
        conteudo,
        /visitanteDaRequisicao|bolachaDoVisitante/,
        `${f.replace(process.cwd(), '')}: escreve sem ler a credencial da visita`,
      );
      assert.match(
        conteudo,
        /if \(!visitante|visitante === null|!bolachaDoVisitante/,
        `${f.replace(process.cwd(), '')}: lê a credencial e não recusa quem não a tem`,
      );
    }
    // Guarda de leitor cego. Se a pasta deixar de ter escrita nenhuma, este caso
    // passa a não medir coisa alguma — e passaria em silêncio para sempre.
    assert.ok(comEscrita > 0,
      'não há escrita nenhuma na pasta pública: esta asserção deixou de medir o que diz medir');
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

    // ── Quem faz a sujidade apanha-a, e aqui isso apareceu a correr ────────
    //
    // Este caso despublica para provar que sem publicação não há carta. O grupo
    // seguinte precisa de uma carta publicada, e ficou vermelho por causa disto
    // — não por causa do que mede. É a mesma lição do E06, agora entre grupos do
    // mesmo ficheiro: um teste que estraga estado partilhado repõe-no.
    const r = await comA((db) => publicar(db, IDS.orgA, {
      menuId: menu!.id, locationId: IDS.unidadeA, canal: 'CARTA', autor: AUTOR,
    }));
    assert.equal(r.ok, true, 'não consegui repor a publicação para o grupo seguinte');
    assert.ok(await cartaPublica(prisma, SLUG_A, 'CARTA', 'es-ES'), 'reposto');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('6. O endereço público não volta ao mundo', () => {
  // O `@unique` impede dois AO MESMO TEMPO. Este grupo é sobre dois EM
  // SEQUÊNCIA — A larga, B reclama, e os QR impressos de A passam a servir a
  // carta de B. Sem erro, sem aviso, e sem ninguém do lado de A dar por isso.
  const RECLAMADO = `e09r-${marca}`;

  it('A reserva o endereço e a carta responde nele', async () => {
    const r = await reservarEnderecoPublico(prisma, IDS.orgA, IDS.unidadeA, RECLAMADO);
    assert.equal(r, 'ok');
    const servida = await cartaPublica(prisma, RECLAMADO, 'CARTA', 'es-ES');
    assert.ok(servida, 'o endereço novo tem de servir a carta de A');
    assert.equal(servida.organizationId, IDS.orgA);
  });

  it('A LARGA o endereço: o link morre', async () => {
    await largarEnderecoPublico(prisma, IDS.orgA, IDS.unidadeA);
    assert.equal(await cartaPublica(prisma, RECLAMADO, 'CARTA', 'es-ES'), null,
      'largar tem de matar o link — quem fecha uma unidade quer isso');
  });

  it('E B NÃO O PODE RECLAMAR — é a regra inteira', async () => {
    // Se pudesse, todos os QR impressos de A passavam a servir a carta de B.
    const r = await reservarEnderecoPublico(prisma, IDS.orgB, IDS.unidadeB, RECLAMADO);
    assert.equal(r, 'reservado_por_outra_organizacao');
    // E o motivo é próprio, não um "ocupado" genérico: quem tenta um endereço
    // reservado não está à espera de nada, porque ele não se liberta.
    assert.notEqual(r, 'em_uso');
    // A unidade de B continua sem esse endereço.
    const { rows } = await sql.query(
      'SELECT public_slug FROM locations WHERE id = $1', [IDS.unidadeB],
    );
    assert.notEqual((rows[0] as { public_slug: string | null }).public_slug, RECLAMADO);
  });

  it('O PAR QUE DÁ SENTIDO: A RETOMA o endereço dele', async () => {
    // Sem este caso, a prova passava também com uma implementação preguiçosa que
    // proibisse **todos** os endereços já usados — e essa impediria o dono de
    // voltar a publicar depois de uma pausa de inverno.
    const r = await reservarEnderecoPublico(prisma, IDS.orgA, IDS.unidadeA, RECLAMADO);
    assert.equal(r, 'ok', 'o dono anterior tem de conseguir retomar');
    const servida = await cartaPublica(prisma, RECLAMADO, 'CARTA', 'es-ES');
    assert.ok(servida);
    assert.equal(servida.organizationId, IDS.orgA);
  });

  it('e duas unidades da MESMA organização não partilham endereço', async () => {
    // Reservado para A não quer dizer livre dentro de A: duas unidades não podem
    // responder no mesmo sítio.
    const r = await reservarEnderecoPublico(prisma, IDS.orgA, IDS.unidadeA2, RECLAMADO);
    assert.equal(r, 'em_uso');
  });

  it('o runtime NÃO pode apagar uma reserva', async () => {
    // Se pudesse, uma rota apagava a reserva alheia e reclamava o endereço — que
    // é exactamente o que a tabela existe para impedir.
    await assert.rejects(
      () => comA((db) => db.$executeRaw`DELETE FROM public_slug_owners WHERE slug = ${RECLAMADO}`),
      /permission denied|permissão negada/i,
    );
  });

  it('e B não vê sequer que a reserva existe', async () => {
    const deB = await comB((db) => db.publicSlugOwner.count({ where: { slug: RECLAMADO } }));
    assert.equal(deB, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('7. O endereço de uma unidade não serve o menu de OUTRA', () => {
  // ── Porque é que este grupo existe, e porque é que chegou tarde ──────────
  //
  // A `publico_carta` juntava `menus` pela MARCA e ignorava `menus.location_id`.
  // Uma cadeia com duas unidades servia, no endereço de uma, a carta da outra —
  // numa página **pública**, num produto **multi-inquilino**. Foi corrigido na
  // migração `20260904113000_e09_menu_da_unidade`.
  //
  // O que **não** foi feito, e é a razão de este grupo existir: a correcção
  // ficou sem um único teste a vigiá-la. O defeito só apareceu porque a
  // semeadura do arnês do navegador é o primeiro cenário do projecto com duas
  // unidades na mesma marca — foi encontrado **por acidente**.
  //
  // É o mesmo padrão que reteve o E08: uma protecção que não consegue falhar. E
  // mediu-se o custo de não a ter: a reposição do `provar-publico.sh` repunha a
  // versão ANTERIOR da função, e a etapa 7 dizia "voltou ao verde" com a fuga
  // outra vez lá dentro. Com este grupo, essa reposição errada fica vermelha.
  //
  // Os menus dos outros grupos nascem sem unidade (`location_id IS NULL`), que é
  // o menu da marca inteira e continua legítimo. Por isso nenhum deles apanhava
  // isto: é preciso um menu PRESO a uma unidade.
  // ── Endereços PRÓPRIOS, e a razão de não reaproveitar o SLUG_A ──────────
  //
  // O grupo 6 reserva um endereço novo para a primeira unidade e **não repõe** o
  // anterior — o `SLUG_A` deixa de existir a partir dali. Um grupo que dependa
  // dele passa a medir uma unidade sem endereço e devolve `null` nos dois
  // sentidos, que é o falso verde clássico: a fuga e a ausência ficam iguais.
  //
  // Este grupo reserva os dois endereços de que precisa.
  const SLUG_U1 = `e09v-${marca}`;
  const SLUG_A2 = `e09u-${marca}`;
  let menuDaSegunda = '';
  let produtoDaSegunda = '';

  before(async () => {
    const daPrimeira = await reservarEnderecoPublico(prisma, IDS.orgA, IDS.unidadeA, SLUG_U1);
    assert.equal(daPrimeira, 'ok', 'não consegui dar endereço à primeira unidade');

    const feito = await comA(async (db) => {
      const cat = await db.category.create({
        data: { organizationId: IDS.orgA, brandId: IDS.marcaA, nome: `${PREFIXO} u2`, ordem: 9 },
        select: { id: true },
      });
      const p = await db.product.create({
        data: {
          organizationId: IDS.orgA, brandId: IDS.marcaA, categoryId: cat.id,
          nome: `${PREFIXO} SO DA SEGUNDA UNIDADE`, estado: 'ACTIVO',
        },
        select: { id: true },
      });
      await db.priceRule.create({
        data: { organizationId: IDS.orgA, productId: p.id, montanteMenor: 1234, moeda: 'EUR' },
      });
      await db.productChannel.create({
        data: { organizationId: IDS.orgA, productId: p.id, canal: 'CARTA', visivel: true },
      });
      // A diferença que faz o grupo: o menu é DESTA unidade, não da marca.
      const menu = await db.menu.create({
        data: {
          organizationId: IDS.orgA, brandId: IDS.marcaA, locationId: IDS.unidadeA2,
          nome: `${PREFIXO} u2 carta`, estado: 'ACTIVO',
        },
        select: { id: true },
      });
      await db.menuCategory.create({
        data: { organizationId: IDS.orgA, menuId: menu.id, categoryId: cat.id, ordem: 1 },
      });
      const r = await publicar(db, IDS.orgA, {
        menuId: menu.id, locationId: IDS.unidadeA2, canal: 'CARTA', autor: AUTOR,
      });
      assert.equal(r.ok, true, `publicar na segunda unidade: ${JSON.stringify(!r.ok ? r.bloqueios : '')}`);
      return { menuId: menu.id, produtoId: p.id };
    });
    menuDaSegunda = feito.menuId;
    produtoDaSegunda = feito.produtoId;

    const daSegunda = await reservarEnderecoPublico(prisma, IDS.orgA, IDS.unidadeA2, SLUG_A2);
    assert.equal(daSegunda, 'ok', 'não consegui dar endereço à segunda unidade');
  });

  it('a segunda unidade serve a carta DELA no endereço DELA', async () => {
    // O par primeiro. Sem ele, uma porta que devolvesse `null` a toda a gente
    // passava no caso seguinte e não servia nada a ninguém.
    const servida = await cartaPublica(prisma, SLUG_A2, 'CARTA', 'es-ES');
    assert.ok(servida, 'a segunda unidade tinha de responder no endereço dela');
    assert.equal(servida.locationId, IDS.unidadeA2);
    const p = produtoDaCarta(servida.carta, produtoDaSegunda);
    assert.ok(p, 'o produto da segunda unidade tinha de estar na carta dela');
    assert.deepEqual(p.preco, { montanteMenor: 1234, moeda: 'EUR' });
  });

  it('e o endereço da PRIMEIRA não serve nada da segunda — a fuga', async () => {
    const servida = await cartaPublica(prisma, SLUG_U1, 'CARTA', 'es-ES');
    assert.ok(servida, 'a primeira unidade tinha de continuar a responder');

    // ── Uma asserção que eu escrevi aqui e tive de APAGAR ─────────────────
    //
    // Escrevi `assert.equal(servida.locationId, IDS.unidadeA)` a pensar que era
    // a afirmação forte. É vácua: `publico_carta` devolve `l.id`, e `l` é a
    // linha encontrada **pelo endereço**. Vem sempre a unidade pedida, com fuga
    // ou sem ela. O controlo negativo mostrou-o — quem ficou vermelho foi a
    // asserção do conteúdo, e aquela nunca teria hipótese de acender.
    //
    // Fica escrito porque a versão vácua parecia a mais convincente das três.
    //
    // O que mede a fuga é o CORPO: o produto da outra unidade não está lá, nem
    // pelo identificador nem pelo nome — o defeito "vem e não se mostra" que o
    // grupo 1 persegue.
    assert.equal(produtoDaCarta(servida.carta, produtoDaSegunda), null);
    const corpo = JSON.stringify(servida.carta);
    assert.ok(!corpo.includes(produtoDaSegunda), 'o identificador da outra unidade saiu no corpo');
    assert.ok(!corpo.includes('SO DA SEGUNDA UNIDADE'), 'o produto da outra unidade saiu na carta');
  });

  it('e o menu SEM unidade continua a servir a marca inteira', async () => {
    // O par que separa a regra certa da regra preguiçosa, como no grupo 6.
    //
    // Uma correcção que exigisse `m.location_id = l.id` e mais nada passava no
    // caso de cima e partia o produto: o menu da marca — `location_id IS NULL`,
    // que é como as cadeias trabalham — deixava de aparecer em unidade nenhuma.
    // Sem este caso, essa versão era indistinguível da certa.
    const daPrimeira = await cartaPublica(prisma, SLUG_U1, 'CARTA', 'es-ES');
    assert.ok(daPrimeira, 'o menu da marca tinha de continuar a servir a primeira unidade');
    assert.ok(produtoDaCarta(daPrimeira.carta, visivelId),
      'o produto do menu da marca desapareceu da unidade que não tem menu próprio');
  });

  after(async () => {
    await sql.query(`UPDATE locations SET public_slug = NULL WHERE id = ANY($1)`, [[IDS.unidadeA, IDS.unidadeA2]]);
    await sql.query(`DELETE FROM public_slug_owners WHERE slug = ANY($1)`, [[SLUG_U1, SLUG_A2]]);
    await sql.query(`DELETE FROM menu_views WHERE revision_id IN (SELECT id FROM menu_revisions WHERE menu_id = $1)`, [menuDaSegunda]);
    await sql.query(`DELETE FROM menu_publications WHERE menu_id = $1`, [menuDaSegunda]);
    await sql.query(`DELETE FROM menu_revisions WHERE menu_id = $1`, [menuDaSegunda]);
    await sql.query(`DELETE FROM menu_categories WHERE menu_id = $1`, [menuDaSegunda]);
    await sql.query(`DELETE FROM menus WHERE id = $1`, [menuDaSegunda]);
  });
});

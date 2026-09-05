import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  comEscopo, consumirPelaLinha, criarFicha, criarInsumo, dividaDeStock,
  folhasDaFicha, insumosDaUnidade, juntarLinhaDaFicha, movimentarStock, obterPrisma,
  transitarTarefa,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E25 — stock e fichas técnicas.
 *
 * ── O que a régua diz que NÃO conta ───────────────────────────────────────
 *
 * «Um teste que soma movimentos que ele próprio escolheu para dar certo. O caso
 * que interessa é a sub-receita dentro da sub-receita, e o saldo que passa a
 * zero.»
 *
 * Por isso o grupo 2 monta três níveis, e o grupo 4 leva o saldo abaixo de zero
 * de propósito.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e25-';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let n = 0;
const proximo = () => `${PREFIXO}${(n += 1)}`;

const insumo = (nome = proximo()) => comA((db) => criarInsumo(db, {
  organizationId: IDS.orgA, locationId: IDS.unidadeA, nome, unidade: 'KG',
}));
const ficha = (nome = proximo(), rendeMili?: number) => comA((db) => criarFicha(db, {
  organizationId: IDS.orgA, locationId: IDS.unidadeA, nome,
  ...(rendeMili === undefined ? {} : { rendeMili }),
}));
const linha = (recipeId: string, q: number, alvo: { itemId?: string; subRecipeId?: string }) =>
  comA((db) => juntarLinhaDaFicha(db, {
    organizationId: IDS.orgA, recipeId, quantidadeMili: q, ...alvo,
  }));

async function limpar() {
  const insumos = `(SELECT id FROM stock_items WHERE nome LIKE '${PREFIXO}%')`;
  const fichas = `(SELECT id FROM recipes WHERE nome LIKE '${PREFIXO}%')`;
  // ── Os pedidos e produtos do grupo 4 também são lixo desta prova ────────
  //
  // Sem isto a suite passava à PRIMEIRA e colidia na segunda: o `proximo()`
  // recomeça em cada corrida, e o número do pedido repete-se. É o defeito que
  // só aparece quando se corre duas vezes — e um guião de controlos corre dez.
  const pedidos = `(SELECT id FROM orders WHERE aberto_por LIKE '${PREFIXO}%')`;
  await sql.query(`DELETE FROM stock_movements WHERE order_line_id IN (SELECT id FROM order_lines WHERE order_id IN ${pedidos})`);
  await sql.query(`DELETE FROM production_events WHERE order_id IN ${pedidos}`);
  await sql.query(`DELETE FROM production_tasks WHERE order_id IN ${pedidos}`);
  await sql.query(`DELETE FROM production_stations WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM order_lines WHERE order_id IN ${pedidos}`);
  await sql.query(`DELETE FROM orders WHERE aberto_por LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM recipes WHERE product_id IN (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM products WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM categories WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM stock_movements WHERE item_id IN ${insumos}`);
  await sql.query(`DELETE FROM recipe_lines WHERE recipe_id IN ${fichas} OR item_id IN ${insumos}`);
  await sql.query(`DELETE FROM recipes WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM stock_items WHERE nome LIKE '${PREFIXO}%'`);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
  await limpar();
});
beforeEach(limpar);
after(async () => { await limpar(); await sql.end(); await prisma.$disconnect(); });

// ═══════════════════════════════════════════════════════════════════════════
/** Um produto da carta com ficha ligada. Partilhado com o grupo 6. */
async function produtoComFicha(gramas: number) {
  const { rows: c } = await sql.query(
    `INSERT INTO categories (id, organization_id, brand_id, nome, ordem, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 1, now()) RETURNING id`,
    [IDS.orgA, IDS.marcaA, proximo()]);
  const { rows: p } = await sql.query(
    `INSERT INTO products (id, organization_id, brand_id, category_id, nome, estado, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'ACTIVO', now()) RETURNING id`,
    [IDS.orgA, IDS.marcaA, c[0].id, proximo()]);
  const item = await insumo();
  const f = await comA((db) => criarFicha(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA,
    nome: proximo(), productId: p[0].id,
  }));
  await linha(f.id, gramas * 1000, { itemId: item.id });
  return { productId: p[0].id as string, itemId: item.id, categoriaId: c[0].id as string };
}

describe('1 · o saldo DERIVA-SE, e não se escreve', () => {
  it('a soma dos movimentos é o saldo', async () => {
    const { id } = await insumo();
    await comA((db) => movimentarStock(db, {
      itemId: id, tipo: 'ENTRADA', quantidadeMili: 10_000_000, motivo: 'compra',
    }));
    const r = await comA((db) => movimentarStock(db, {
      itemId: id, tipo: 'CONSUMO', quantidadeMili: 2_500_000, motivo: 'serviço',
    }));
    assert.equal(r.saldoMili, 7_500_000);
  });

  it('escrever o saldo de fora é SUBSTITUÍDO pela base', async () => {
    const { id } = await insumo();
    await comA((db) => movimentarStock(db, {
      itemId: id, tipo: 'ENTRADA', quantidadeMili: 3_000_000, motivo: 'compra',
    }));
    // O `UPDATE` directo, que é o defeito que esta etapa existe para impedir.
    await sql.query(`UPDATE stock_items SET saldo_mili = 999999999 WHERE id = $1`, [id]);
    const { rows } = await sql.query(`SELECT saldo_mili FROM stock_items WHERE id = $1`, [id]);
    assert.equal(Number(rows[0].saldo_mili), 3_000_000,
      'o saldo escrito à mão ficou: a contagem passa a mentir sem ninguém saber');
  });

  it('apagar um movimento refaz o saldo', async () => {
    const { id } = await insumo();
    await comA((db) => movimentarStock(db, {
      itemId: id, tipo: 'ENTRADA', quantidadeMili: 5_000_000, motivo: 'compra',
    }));
    await sql.query(`DELETE FROM stock_movements WHERE item_id = $1`, [id]);
    const { rows } = await sql.query(`SELECT saldo_mili FROM stock_items WHERE id = $1`, [id]);
    assert.equal(Number(rows[0].saldo_mili), 0);
  });

  it('uma quantidade não inteira é recusada com nome', async () => {
    const { id } = await insumo();
    await assert.rejects(() => comA((db) => movimentarStock(db, {
      itemId: id, tipo: 'ENTRADA', quantidadeMili: 1.5, motivo: 'x',
    })), (e: Error) => e.message.includes('QUANTIDADE_INVALIDA'));
  });

  it('e uma quantidade negativa também — o sinal vem do TIPO', async () => {
    const { id } = await insumo();
    await assert.rejects(() => comA((db) => movimentarStock(db, {
      itemId: id, tipo: 'CONSUMO', quantidadeMili: -1000, motivo: 'x',
    })), (e: Error) => e.message.includes('QUANTIDADE_INVALIDA'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2 · a ficha é uma ÁRVORE, e o consumo desce até às folhas', () => {
  it('um prato de UM nível desconta o que era de esperar', async () => {
    const tomate = await insumo();
    const prato = await ficha();
    await linha(prato.id, 200_000, { itemId: tomate.id });
    const folhas = await comA((db) => folhasDaFicha(db, prato.id));
    assert.equal(folhas.size, 1);
    assert.equal(folhas.get(tomate.id), 200_000);
  });

  it('e o PAR: a sub-receita desconta as FOLHAS, não a sub-receita', async () => {
    // Três níveis: prato → molho → (tomate, azeite). O molho não está no
    // frigorífico; o que está é o tomate.
    const tomate = await insumo();
    const azeite = await insumo();
    const molho = await ficha(proximo(), 1_000_000);
    await linha(molho.id, 800_000, { itemId: tomate.id });
    await linha(molho.id, 200_000, { itemId: azeite.id });

    const prato = await ficha();
    await linha(prato.id, 500_000, { subRecipeId: molho.id });

    const folhas = await comA((db) => folhasDaFicha(db, prato.id));
    assert.equal(folhas.size, 2, 'a sub-receita entrou como se fosse um insumo');
    // Meio molho: metade de cada folha.
    assert.equal(folhas.get(tomate.id), 400_000);
    assert.equal(folhas.get(azeite.id), 100_000);
  });

  it('e três níveis também descem — o caso que a régua nomeia', async () => {
    const sal = await insumo();
    const base = await ficha(proximo(), 1_000_000);
    await linha(base.id, 1_000_000, { itemId: sal.id });
    const meio = await ficha(proximo(), 1_000_000);
    await linha(meio.id, 1_000_000, { subRecipeId: base.id });
    const topo = await ficha();
    await linha(topo.id, 1_000_000, { subRecipeId: meio.id });

    const folhas = await comA((db) => folhasDaFicha(db, topo.id));
    assert.equal(folhas.size, 1, 'a árvore parou antes das folhas');
    assert.equal(folhas.get(sal.id), 1_000_000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3 · o ciclo é recusado NA ESCRITA', () => {
  it('uma ficha que se refere a si própria é recusada', async () => {
    const a = await ficha();
    await assert.rejects(() => linha(a.id, 1000, { subRecipeId: a.id }),
      (e: Error) => e.message.includes('FICHA_CICLICA'));
  });

  it('e um ciclo INDIRECTO também — A→B→A', async () => {
    const a = await ficha();
    const b = await ficha();
    await linha(a.id, 1000, { subRecipeId: b.id });
    await assert.rejects(() => linha(b.id, 1000, { subRecipeId: a.id }),
      (e: Error) => e.message.includes('FICHA_CICLICA'));
  });

  it('e um de três saltos — A→B→C→A', async () => {
    const a = await ficha();
    const b = await ficha();
    const c = await ficha();
    await linha(a.id, 1000, { subRecipeId: b.id });
    await linha(b.id, 1000, { subRecipeId: c.id });
    await assert.rejects(() => linha(c.id, 1000, { subRecipeId: a.id }),
      (e: Error) => e.message.includes('FICHA_CICLICA'));
  });

  it('e o PAR: uma árvore legítima e profunda PASSA', async () => {
    // Sem este par, «recusa tudo» passava os três casos acima.
    const a = await ficha();
    const b = await ficha();
    const c = await ficha();
    await linha(a.id, 1000, { subRecipeId: b.id });
    await linha(b.id, 1000, { subRecipeId: c.id });
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM recipe_lines WHERE recipe_id IN ($1, $2)`, [a.id, b.id]);
    assert.equal(rows[0].n, 2, 'a guarda do ciclo recusou uma árvore legítima');
  });

  it('uma linha que não aponta a nada é recusada pela base', async () => {
    const a = await ficha();
    await assert.rejects(() => sql.query(
      `INSERT INTO recipe_lines (id, organization_id, recipe_id, quantidade_mili)
       VALUES (gen_random_uuid(), $1, $2, 1000)`, [IDS.orgA, a.id]));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4 · o consumo acontece quando a linha é SERVIDA', () => {
  /** Um pedido com uma linha do produto dado. */
  async function pedidoCom(productId: string) {
    const { rows: o } = await sql.query(
      `INSERT INTO orders (id, organization_id, location_id, canal, numero, estado, aberto_por, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'SALA', $3, 'ACEITE', $4, now()) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, proximo(), `${PREFIXO}actor@inspeccao.example`]);
    const { rows: l } = await sql.query(
      `INSERT INTO order_lines (id, organization_id, order_id, product_id, nome, quantidade,
         preco_menor, moeda, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'x', 1, 100, 'EUR', 'ACEITE', now())
       RETURNING id`, [IDS.orgA, o[0].id, productId]);
    return { orderId: o[0].id as string, lineId: l[0].id as string };
  }


  it('servir desconta as folhas pela quantidade da linha', async () => {
    const { productId, itemId } = await produtoComFicha(200);
    await comA((db) => movimentarStock(db, {
      itemId, tipo: 'ENTRADA', quantidadeMili: 1_000_000, motivo: 'compra',
    }));
    const { lineId } = await pedidoCom(productId);
    const r = await comA((db) => consumirPelaLinha(db, {
      orderLineId: lineId, productId, quantidade: 2,
    }));
    assert.equal(r.folhas, 1);
    const [item] = await comA((db) => insumosDaUnidade(db, IDS.unidadeA))
      .then((l) => l.filter((i) => i.id === itemId));
    assert.equal(Number(item!.saldoMili), 1_000_000 - 400_000, 'não descontou 2 × 200 g');
  });

  it('e servir DUAS vezes a mesma linha é UM só consumo', async () => {
    const { productId, itemId } = await produtoComFicha(100);
    await comA((db) => movimentarStock(db, {
      itemId, tipo: 'ENTRADA', quantidadeMili: 1_000_000, motivo: 'compra',
    }));
    const { lineId } = await pedidoCom(productId);
    await comA((db) => consumirPelaLinha(db, { orderLineId: lineId, productId, quantidade: 1 }));
    const segunda = await comA((db) => consumirPelaLinha(db, {
      orderLineId: lineId, productId, quantidade: 1,
    }));
    assert.equal(segunda.jaEstava, true, 'o reenvio descontou outra vez');
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM stock_movements
        WHERE order_line_id = $1 AND tipo = 'CONSUMO'`, [lineId]);
    assert.equal(rows[0].n, 1, 'descontou duas vezes o mesmo prato');
  });

  it('um produto SEM ficha não é erro: não há árvore para descer', async () => {
    const { rows: c } = await sql.query(
      `INSERT INTO categories (id, organization_id, brand_id, nome, ordem, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 1, now()) RETURNING id`,
      [IDS.orgA, IDS.marcaA, proximo()]);
    const { rows: p } = await sql.query(
      `INSERT INTO products (id, organization_id, brand_id, category_id, nome, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'ACTIVO', now()) RETURNING id`,
      [IDS.orgA, IDS.marcaA, c[0].id, proximo()]);
    const { lineId } = await pedidoCom(p[0].id);
    const r = await comA((db) => consumirPelaLinha(db, {
      orderLineId: lineId, productId: p[0].id, quantidade: 1,
    }));
    assert.equal(r.folhas, 0);
  });

  it('o consumo NÃO se desfaz: uma devolução é outra coisa', async () => {
    // «Um pedido produzido e devolvido consome — a comida foi feita.» Se foi
    // para o lixo, é uma QUEBRA, com a sua razão. Dois factos não se colapsam.
    const { productId, itemId } = await produtoComFicha(150);
    await comA((db) => movimentarStock(db, {
      itemId, tipo: 'ENTRADA', quantidadeMili: 1_000_000, motivo: 'compra',
    }));
    const { lineId } = await pedidoCom(productId);
    await comA((db) => consumirPelaLinha(db, { orderLineId: lineId, productId, quantidade: 1 }));
    const depois = await comA((db) => movimentarStock(db, {
      itemId, tipo: 'QUEBRA', quantidadeMili: 1000, motivo: 'prato devolvido, foi ao lixo',
    }));
    // O consumo continua lá, e a quebra é um movimento ao lado.
    const { rows } = await sql.query(
      `SELECT tipo FROM stock_movements WHERE item_id = $1 ORDER BY criado_em`, [itemId]);
    assert.deepEqual(rows.map((r: { tipo: string }) => r.tipo),
      ['ENTRADA', 'CONSUMO', 'QUEBRA']);
    assert.equal(depois.saldoMili, 1_000_000 - 150_000 - 1000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5 · o negativo é VISÍVEL, e nunca silencioso', () => {
  it('o saldo pode ir abaixo de zero — o serviço não trava', async () => {
    const { id } = await insumo();
    const r = await comA((db) => movimentarStock(db, {
      itemId: id, tipo: 'CONSUMO', quantidadeMili: 500_000, motivo: 'serviço com contagem errada',
    }));
    assert.equal(r.saldoMili, -500_000,
      'a base travou o serviço: com «impossível», a equipa inventa um ajuste para desbloquear');
  });

  it('e o PAR: ele APARECE na lista de dívida', async () => {
    // Sem este par, «deixa passar tudo» era indistinguível de «negativo
    // silencioso», que é a única saída que a régua reprova.
    const { id } = await insumo();
    await comA((db) => movimentarStock(db, {
      itemId: id, tipo: 'CONSUMO', quantidadeMili: 300_000, motivo: 'serviço',
    }));
    const divida = await comA((db) => dividaDeStock(db, IDS.unidadeA));
    assert.ok(divida.some((d) => d.id === id),
      'o saldo negativo não aparece em lado nenhum: é a contagem a mentir em silêncio');
  });

  it('e um saldo positivo NÃO aparece na dívida', async () => {
    const { id } = await insumo();
    await comA((db) => movimentarStock(db, {
      itemId: id, tipo: 'ENTRADA', quantidadeMili: 1000, motivo: 'compra',
    }));
    const divida = await comA((db) => dividaDeStock(db, IDS.unidadeA));
    assert.ok(!divida.some((d) => d.id === id), 'a lista de dívida mostra quem não deve');
  });
});

/**
 * 6 · O ALCANCE: servir pelo KDS mexe MESMO no stock.
 *
 * ── Porque é que este grupo existe ────────────────────────────────────────
 *
 * O grupo 4 prova que o `consumirPelaLinha` desconta bem. Não prova que alguém
 * o chama — e a varredura de alcance apanhou-o a 05/09 com **zero chamadores**:
 * o motor de stock estava escrito, provado, e desligado do produto. Servir um
 * prato não mexia no frigorífico.
 *
 * É a mesma dívida que o E23 deixou (`receberWebhook` sem porta) e que o E24
 * pagou. Aqui a diferença é que apareceu ANTES da assinatura, e não depois.
 *
 * Por isso estes casos não chamam o consumo: chamam o **KDS**.
 */
describe('6 · servir pelo KDS desconta o stock', () => {
  async function tarefaPronta(productId: string) {
    const { rows: o } = await sql.query(
      `INSERT INTO orders (id, organization_id, location_id, canal, numero, estado, aberto_por, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'SALA', $3, 'ACEITE', $4, now()) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, proximo(), `${PREFIXO}actor@inspeccao.example`]);
    const { rows: l } = await sql.query(
      `INSERT INTO order_lines (id, organization_id, order_id, product_id, nome, quantidade,
         preco_menor, moeda, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'x', 3, 100, 'EUR', 'ACEITE', now())
       RETURNING id`, [IDS.orgA, o[0].id, productId]);
    const { rows: e } = await sql.query(
      `INSERT INTO production_stations (id, organization_id, location_id, nome, tipo, ordem, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'PREPARACAO', 1, now()) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, proximo()]);
    const { rows: t } = await sql.query(
      `INSERT INTO production_tasks (id, organization_id, location_id, order_id, line_id,
         station_id, estado, versao, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'PRONTA', 1, now()) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, o[0].id, l[0].id, e[0].id]);
    return { taskId: t[0].id as string, lineId: l[0].id as string };
  }

  const actor = { email: `${PREFIXO}cozinha@inspeccao.example` };

  it('marcar ENTREGUE desconta as folhas — sem ninguém chamar o stock', async () => {
    const { productId, itemId } = await produtoComFicha(150);
    await comA((db) => movimentarStock(db, {
      itemId, tipo: 'ENTRADA', quantidadeMili: 2_000_000, motivo: 'compra',
    }));
    const { taskId } = await tarefaPronta(productId);

    const r = await comA((db) => transitarTarefa(db, IDS.orgA, {
      taskId, para: 'ENTREGUE', actor,
    }));
    assert.equal(r.ok, true, 'a transição não passou');

    const [item] = await comA((db) => insumosDaUnidade(db, IDS.unidadeA))
      .then((l) => l.filter((i) => i.id === itemId));
    // A linha tem quantidade 3, e a ficha pede 150 g: 450 g saem do frigorífico.
    assert.equal(Number(item!.saldoMili), 2_000_000 - 450_000,
      'servir pelo KDS não mexeu no stock: o motor está desligado do produto');
  });

  it('e o RECALL não desconta outra vez — a identidade é do acontecimento', async () => {
    const { productId, itemId } = await produtoComFicha(150);
    await comA((db) => movimentarStock(db, {
      itemId, tipo: 'ENTRADA', quantidadeMili: 2_000_000, motivo: 'compra',
    }));
    const { taskId, lineId } = await tarefaPronta(productId);

    for (const para of ['ENTREGUE', 'EM_PREPARO', 'PRONTA', 'ENTREGUE'] as const) {
      const r = await comA((db) => transitarTarefa(db, IDS.orgA, { taskId, para, actor }));
      assert.equal(r.ok, true, `a transição para ${para} não passou`);
    }

    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM stock_movements
        WHERE order_line_id = $1 AND tipo = 'CONSUMO'`, [lineId]);
    assert.equal(rows[0].n, 1, 'o recall descontou o prato uma segunda vez');
    const [item] = await comA((db) => insumosDaUnidade(db, IDS.unidadeA))
      .then((l) => l.filter((i) => i.id === itemId));
    assert.equal(Number(item!.saldoMili), 2_000_000 - 450_000);
  });

  it('e o PAR: uma linha SEM produto não estoira a entrega', async () => {
    // Uma linha escrita à mão pelo empregado não tem ficha. Se o consumo a
    // fizesse rebentar, o KDS deixava de conseguir entregar — e o defeito
    // aparecia como «não consigo marcar como servido», nunca como stock.
    const { rows: o } = await sql.query(
      `INSERT INTO orders (id, organization_id, location_id, canal, numero, estado, aberto_por, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'SALA', $3, 'ACEITE', $4, now()) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, proximo(), `${PREFIXO}actor@inspeccao.example`]);
    const { rows: l } = await sql.query(
      `INSERT INTO order_lines (id, organization_id, order_id, nome, quantidade,
         preco_menor, moeda, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'livre', 1, 100, 'EUR', 'ACEITE', now())
       RETURNING id`, [IDS.orgA, o[0].id]);
    const { rows: t } = await sql.query(
      `INSERT INTO production_tasks (id, organization_id, location_id, order_id, line_id,
         estado, versao, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'PRONTA', 1, now()) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, o[0].id, l[0].id]);

    const r = await comA((db) => transitarTarefa(db, IDS.orgA, {
      taskId: t[0].id, para: 'ENTREGUE', actor,
    }));
    assert.equal(r.ok, true, 'uma linha sem produto impediu a entrega');
  });
});

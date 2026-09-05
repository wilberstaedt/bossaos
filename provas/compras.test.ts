import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  artigosDoFornecedor, comEscopo, conferirEncomenda, converterParaUso, criarEncomenda,
  criarFornecedor, criarInsumo, custoDoInsumo, encomendasDaUnidade, fornecedoresDaUnidade,
  insumosDaUnidade, juntarLinhaDaEncomenda, ligarArtigo, obterPrisma, receber,
  registarFactura,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E26 — compras e fornecedores.
 *
 * ── O que a régua diz que NÃO conta ───────────────────────────────────────
 *
 * «Uma prova que só use o caminho onde tudo bate. Se não houver recepção
 * parcial, recepção a mais e factura divergente, não está provado — está
 * demonstrado.»
 *
 * Por isso o grupo 2 recebe a menos, recebe a mais, e factura o que não chegou.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e26-';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let n = 0;
const proximo = () => `${PREFIXO}${(n += 1)}`;

/** Um saco de 25 kg: a embalagem que a régua nomeia. */
const SACO_DE_25KG = 25_000_000n;

async function cenario(factorMili = SACO_DE_25KG) {
  const item = await comA((db) => criarInsumo(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, nome: proximo(), unidade: 'KG',
  }));
  const forn = await comA((db) => criarFornecedor(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, nome: proximo(),
  }));
  const artigo = await comA((db) => ligarArtigo(db, {
    organizationId: IDS.orgA, supplierId: forn.id, itemId: item.id,
    unidadeDeCompra: `${PREFIXO}saco 25 kg`, factorMili, precoMenor: 1800,
  }));
  const enc = await comA((db) => criarEncomenda(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, supplierId: forn.id,
    numero: proximo(),
  }));
  return { item, forn, artigo, enc };
}

async function limpar() {
  const forn = `(SELECT id FROM suppliers WHERE nome LIKE '${PREFIXO}%')`;
  const enc = `(SELECT id FROM purchase_orders WHERE numero LIKE '${PREFIXO}%')`;
  const art = `(SELECT id FROM supplier_items WHERE supplier_id IN ${forn})`;
  await sql.query(`DELETE FROM stock_movements WHERE receipt_line_id IN
    (SELECT rl.id FROM receipt_lines rl JOIN receipts r ON r.id = rl.receipt_id WHERE r.purchase_order_id IN ${enc})`);
  await sql.query(`DELETE FROM receipt_lines WHERE receipt_id IN (SELECT id FROM receipts WHERE purchase_order_id IN ${enc})`);
  await sql.query(`DELETE FROM receipts WHERE purchase_order_id IN ${enc}`);
  await sql.query(`DELETE FROM supplier_invoice_lines WHERE supplier_item_id IN ${art}`);
  await sql.query(`DELETE FROM supplier_invoices WHERE supplier_id IN ${forn}`);
  await sql.query(`DELETE FROM purchase_order_lines WHERE purchase_order_id IN ${enc}`);
  await sql.query(`DELETE FROM purchase_orders WHERE numero LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM supplier_items WHERE supplier_id IN ${forn}`);
  await sql.query(`DELETE FROM suppliers WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM stock_movements WHERE item_id IN (SELECT id FROM stock_items WHERE nome LIKE '${PREFIXO}%')`);
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

async function saldo(itemId: string) {
  const l = await comA((db) => insumosDaUnidade(db, IDS.unidadeA));
  return Number(l.find((i) => i.id === itemId)?.saldoMili ?? 0);
}

describe('1 · a unidade de compra NÃO é a unidade de uso', () => {
  it('um saco de 25 kg entra como 25 kg, e não como 1', async () => {
    const { item, artigo, enc } = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 1_000_000,
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 1_000_000, custoTotalMenor: 1800 }],
    }));
    // O defeito que a régua nomeia: stock de 1 onde há 25 000 g.
    assert.equal(await saldo(item.id), 25_000_000, 'o saco entrou como uma unidade');
  });

  it('e oito sacos dão 200 kg — tudo inteiro', () => {
    assert.equal(converterParaUso(8_000_000n, SACO_DE_25KG), 200_000_000n);
  });

  it('sem factor, RECUSA-SE com nome', async () => {
    const { forn, item } = await cenario();
    await assert.rejects(
      comA((db) => ligarArtigo(db, {
        organizationId: IDS.orgA, supplierId: forn.id, itemId: item.id,
        unidadeDeCompra: 'caixa', factorMili: 0,
      })),
      /SEM_FACTOR|QUANTIDADE_INVALIDA/,
    );
  });

  it('e a BASE recusa-o também, por baixo do código', async () => {
    const { forn, item } = await cenario();
    await assert.rejects(sql.query(
      `INSERT INTO supplier_items (organization_id, supplier_id, item_id, unidade_de_compra, factor_mili)
       VALUES ($1, $2, $3, 'caixa', 0)`, [IDS.orgA, forn.id, item.id]),
      /factor_de_compra_tem_de_ser_positivo/);
  });

  it('e uma caixa de 12 unidades não é 12 caixas', async () => {
    const { item, artigo, enc } = await cenario(12_000_000n);
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 2_000_000,
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 2_000_000, custoTotalMenor: 900 }],
    }));
    assert.equal(await saldo(item.id), 24_000_000, 'duas caixas de 12 não deram 24');
  });
});

describe('2 · encomendado, recebido e facturado são TRÊS números', () => {
  it('pediram-se 10, chegaram 8, a factura diz 10 — e vê-se', async () => {
    const { artigo, forn, enc } = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 10_000_000,
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 8_000_000, custoTotalMenor: 14400 }],
    }));
    await comA((db) => registarFactura(db, {
      organizationId: IDS.orgA, supplierId: forn.id, purchaseOrderId: enc.id,
      numero: proximo(),
      linhas: [{ supplierItemId: artigo.id, facturadoMili: 10_000_000, totalMenor: 18000 }],
    }));

    const [c] = await comA((db) => conferirEncomenda(db, enc.id));
    assert.equal(c!.encomendadoMili, 10_000_000n);
    assert.equal(c!.recebidoMili, 8_000_000n);
    assert.equal(c!.facturadoMili, 10_000_000n);
    assert.equal(c!.diferencaRecepcao, -2_000_000n, 'a falta não aparece como falta');
    assert.equal(c!.diferencaFactura, 2_000_000n,
      'a factura cobra o que não chegou e ninguém o vê');
  });

  it('e o PAR: quando bate, não há diferença NENHUMA', async () => {
    // Sem este par, «marca sempre divergência» passava o caso de cima.
    const { artigo, forn, enc } = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 4_000_000,
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 4_000_000, custoTotalMenor: 7200 }],
    }));
    await comA((db) => registarFactura(db, {
      organizationId: IDS.orgA, supplierId: forn.id, purchaseOrderId: enc.id,
      numero: proximo(),
      linhas: [{ supplierItemId: artigo.id, facturadoMili: 4_000_000, totalMenor: 7200 }],
    }));
    const [c] = await comA((db) => conferirEncomenda(db, enc.id));
    assert.equal(c!.diferencaRecepcao, 0n);
    assert.equal(c!.diferencaFactura, 0n);
  });

  it('duas recepções PARCIAIS somam-se — a entrega em duas voltas é o normal', async () => {
    const { artigo, enc, item } = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 10_000_000,
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 6_000_000, custoTotalMenor: 10800 }],
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 4_000_000, custoTotalMenor: 7200 }],
    }));
    const [c] = await comA((db) => conferirEncomenda(db, enc.id));
    assert.equal(c!.recebidoMili, 10_000_000n, 'as duas voltas não somaram');
    assert.equal(c!.diferencaRecepcao, 0n);
    assert.equal(await saldo(item.id), 250_000_000, '10 sacos de 25 kg são 250 kg');
  });

  it('receber A MAIS não é impedido — é MOSTRADO', async () => {
    // A régua manda mostrar diferenças, não resolvê-las em silêncio. Travar aqui
    // punha o empregado a mentir no número para conseguir fechar a recepção.
    const { artigo, enc } = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 3_000_000,
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 5_000_000, custoTotalMenor: 9000 }],
    }));
    const [c] = await comA((db) => conferirEncomenda(db, enc.id));
    assert.equal(c!.diferencaRecepcao, 2_000_000n, 'o excesso não aparece como excesso');
  });

  it('e uma factura SEM encomenda não entra na conferência de outra', async () => {
    const { artigo, forn, enc } = await cenario();
    await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 1_000_000,
    }));
    await comA((db) => registarFactura(db, {
      organizationId: IDS.orgA, supplierId: forn.id,
      numero: proximo(),
      linhas: [{ supplierItemId: artigo.id, facturadoMili: 9_000_000, totalMenor: 16200 }],
    }));
    const [c] = await comA((db) => conferirEncomenda(db, enc.id));
    assert.equal(c!.facturadoMili, 0n, 'uma factura solta contaminou a conferência');
  });
});

describe('3 · só a RECEPÇÃO mexe no stock', () => {
  it('criar a encomenda não mexe em NADA', async () => {
    const { item, artigo, enc } = await cenario();
    await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 10_000_000,
    }));
    assert.equal(await saldo(item.id), 0,
      'a encomenda moveu stock: a cozinha vê farinha que está num camião');
  });

  it('a FACTURA também não mexe — é papel', async () => {
    const { item, artigo, forn, enc } = await cenario();
    await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 10_000_000,
    }));
    await comA((db) => registarFactura(db, {
      organizationId: IDS.orgA, supplierId: forn.id, purchaseOrderId: enc.id,
      numero: proximo(),
      linhas: [{ supplierItemId: artigo.id, facturadoMili: 10_000_000, totalMenor: 18000 }],
    }));
    assert.equal(await saldo(item.id), 0, 'a factura moveu stock');
  });

  it('e o PAR: a recepção MEXE', async () => {
    const { item, artigo, enc } = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 2_000_000,
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 2_000_000, custoTotalMenor: 3600 }],
    }));
    assert.equal(await saldo(item.id), 50_000_000);
  });

  it('a mesma linha de recepção é UMA entrada, mesmo em dois carregares', async () => {
    const { item, artigo, enc } = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 2_000_000,
    }));
    const r = await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 2_000_000, custoTotalMenor: 3600 }],
    }));
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM stock_movements
        WHERE receipt_line_id IN (SELECT id FROM receipt_lines WHERE receipt_id = $1)`,
      [r.receiptId]);
    assert.equal(rows[0].n, 1);
    await assert.rejects(sql.query(
      `INSERT INTO stock_movements (organization_id, item_id, tipo, quantidade_mili, motivo, receipt_line_id)
       SELECT $1, $2, 'ENTRADA', 1000, 'reenvio', id FROM receipt_lines WHERE receipt_id = $3`,
      [IDS.orgA, item.id, r.receiptId]),
      /uma_entrada_por_linha_de_recepcao/);
  });

  it('e a base recusa uma entrada de COMPRA sem recepção por trás', async () => {
    const { item } = await cenario();
    await assert.rejects(sql.query(
      `INSERT INTO stock_movements (organization_id, item_id, tipo, quantidade_mili, motivo)
       VALUES ($1, $2, 'ENTRADA', 250000000, 'encomenda 42 confirmada')`,
      [IDS.orgA, item.id]),
      /ENTRADA_SEM_RECEPCAO/);
  });

  it('receber contra a linha de OUTRA encomenda é recusado', async () => {
    const a = await cenario();
    const b = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: a.enc.id, supplierItemId: a.artigo.id,
      encomendadoMili: 1_000_000,
    }));
    await assert.rejects(
      comA((db) => receber(db, {
        organizationId: IDS.orgA, purchaseOrderId: b.enc.id,
        linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 1_000_000, custoTotalMenor: 1800 }],
      })),
      /LINHA_DE_OUTRA_ENCOMENDA/);
  });
});

describe('4 · o custo sabe de que entrada veio', () => {
  it('duas entradas a preços diferentes dão a média PONDERADA', async () => {
    const { item, artigo, enc } = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 3_000_000,
    }));
    // 1 saco a 18,00 € e 2 sacos a 24,00 € cada: 25 kg + 50 kg por 66,00 €.
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 1_000_000, custoTotalMenor: 1800 }],
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 2_000_000, custoTotalMenor: 4800 }],
    }));
    const c = await comA((db) => custoDoInsumo(db, item.id));
    assert.equal(c.entradas, 2);
    assert.equal(c.quantidadeMili, 75_000_000n, '75 kg');
    assert.equal(c.custoTotalMenor, 6600n);
    // 6600 cêntimos por 75 kg = 88 cêntimos por kg.
    assert.equal(c.medioPorUnidadeMenor, 88n, 'a média não é ponderada pela quantidade');
  });

  it('e NÃO é a média simples dos preços — o par que os separa', async () => {
    // Média simples de 1800 e 2400 seria 2100; ponderada pela quantidade é 88/kg.
    // Sem este par, uma implementação que somasse preços e dividisse por dois
    // passava o caso de cima em metade dos números.
    const { item, artigo, enc } = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 3_000_000,
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 1_000_000, custoTotalMenor: 1800 }],
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 2_000_000, custoTotalMenor: 4800 }],
    }));
    const c = await comA((db) => custoDoInsumo(db, item.id));
    assert.notEqual(c.medioPorUnidadeMenor, 2100n);
  });

  it('um insumo sem entradas não tem custo inventado', async () => {
    const { item } = await cenario();
    const c = await comA((db) => custoDoInsumo(db, item.id));
    assert.equal(c.entradas, 0);
    assert.equal(c.medioPorUnidadeMenor, null, 'inventou um custo sobre zero entradas');
  });
});

describe('5 · as listas que as telas leem', () => {
  it('o fornecedor aparece na lista da unidade', async () => {
    const { forn } = await cenario();
    const l = await comA((db) => fornecedoresDaUnidade(db, IDS.unidadeA));
    assert.ok(l.some((f) => f.id === forn.id));
  });

  it('o artigo aparece com a embalagem e o factor', async () => {
    const { forn } = await cenario();
    const l = await comA((db) => artigosDoFornecedor(db, forn.id));
    assert.equal(l.length, 1);
    assert.equal(l[0]!.factorMili, SACO_DE_25KG);
    assert.ok(l[0]!.unidadeDeCompra.includes('saco'));
  });

  it('a encomenda aparece com o fornecedor e as recepções', async () => {
    const { artigo, enc } = await cenario();
    const linha = await comA((db) => juntarLinhaDaEncomenda(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id, supplierItemId: artigo.id,
      encomendadoMili: 1_000_000,
    }));
    await comA((db) => receber(db, {
      organizationId: IDS.orgA, purchaseOrderId: enc.id,
      linhas: [{ purchaseOrderLineId: linha.id, recebidoMili: 1_000_000, custoTotalMenor: 1800 }],
    }));
    const l = await comA((db) => encomendasDaUnidade(db, IDS.unidadeA));
    const minha = l.find((e) => e.id === enc.id);
    assert.ok(minha);
    assert.equal(minha!.recepcoes.length, 1);
    assert.equal(minha!.linhas.length, 1);
  });
});

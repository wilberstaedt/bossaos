import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  abrirConta, ajustar, anular, comContaTrancada, comEscopo, confirmarPagamento,
  contasAbertas, devolver, estadoDaConta, fecharConta, juntarLinhasDoPedido, obterPrisma,
  reconciliar, reverterAjuste, somasDaConta, tentarPagar, transferirLinha,
} from '../packages/db/src/index.ts';
import { dividirEmPartes, dividirPorPesos } from '../packages/domain/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E22 — dinheiro, e o que a régua diz que NÃO conta.
 *
 * *«Não conta: um teste que soma três valores que o próprio teste escolheu para
 * somarem certo. O caso que interessa é o que NÃO divide bem.»*
 *
 * Por isso o grupo 1 não afirma «cada parte é 3,33». Afirma que a **soma das
 * partes é exactamente o total**, e afirma-o sobre uma varredura de totais e de
 * partes onde a maioria dos casos tem resto — incluindo os que dão resto máximo.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e22-';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let n = 0;
const proximoNumero = () => `${PREFIXO}${(n += 1)}`;

/** Uma conta com uma linha de `quantidade × unitario`. */
async function contaCom(unitarioMenor: number, quantidade = 1, moeda = 'EUR') {
  const { id } = await comA((db) => abrirConta(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, numero: proximoNumero(), moeda,
  }));
  await sql.query(
    `INSERT INTO bill_lines (id, organization_id, bill_id, nome, quantidade, unitario_menor)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
    [IDS.orgA, id, `${PREFIXO}linha`, quantidade, unitarioMenor]);
  return id;
}

/**
 * ── A limpeza é MANUTENÇÃO, e por isso diz que o é ────────────────────────
 *
 * Os gatilhos de imutabilidade recusam apagar pagamentos, devoluções e ajustes —
 * e recusam bem: é essa a garantia da etapa. A saída **não** é enfraquecer o
 * gatilho para o arnês passar, que seria calibrar a guarda ao que me dá jeito.
 *
 * `session_replication_role = 'replica'` seria o caminho, mas exige
 * superutilizador e o papel de migração não o é — medido, não suposto. O que ele
 * é, esse sim, é **dono** destas tabelas, e o dono pode desligar os gatilhos das
 * suas. É por tabela e volta a ligar-se a seguir; o produto nunca lhe toca.
 */
const COM_GATILHO = ['bill_lines', 'bill_adjustments', 'payments', 'refunds'];
async function gatilhos(estado: 'DISABLE' | 'ENABLE') {
  for (const t of COM_GATILHO) await sql.query(`ALTER TABLE "${t}" ${estado} TRIGGER USER`);
}

async function limpar() {
  const contas = `(SELECT id FROM bills WHERE numero LIKE '${PREFIXO}%')`;
  await gatilhos('DISABLE');
  await sql.query(`DELETE FROM refunds WHERE payment_id IN (SELECT id FROM payments WHERE bill_id IN ${contas})`);
  await sql.query(`DELETE FROM payments WHERE bill_id IN ${contas}`);
  await sql.query(`DELETE FROM payment_attempts WHERE bill_id IN ${contas}`);
  await sql.query(`DELETE FROM bill_adjustments WHERE bill_id IN ${contas}`);
  await sql.query(`DELETE FROM bill_lines WHERE bill_id IN ${contas}`);
  await sql.query(`DELETE FROM bills WHERE numero LIKE '${PREFIXO}%'`);
  await gatilhos('ENABLE');
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
describe('1 · a divisão, que é o aceite do CT-11', () => {
  it('10,00 € por três dá 3,34 + 3,33 + 3,33, e não outra coisa', () => {
    const partes = dividirEmPartes({ montanteMenor: 1000, moeda: 'EUR' }, 3);
    assert.deepEqual(partes.map((p) => p.montanteMenor), [334, 333, 333]);
  });

  it('a soma das partes é o total — em 400 casos, e a maioria tem resto', () => {
    let comResto = 0;
    for (let total = 1; total <= 100; total += 1) {
      for (const partes of [2, 3, 7, 11]) {
        const saida = dividirEmPartes({ montanteMenor: total, moeda: 'EUR' }, partes);
        const soma = saida.reduce((a, b) => a + b.montanteMenor, 0);
        assert.equal(soma, total, `${total} por ${partes} somou ${soma}`);
        assert.equal(saida.length, partes);
        if (total % partes !== 0) comResto += 1;
      }
    }
    // Guarda de leitor cego: sem isto, uma varredura só de divisões exactas
    // passaria e não teria medido nada do que interessa.
    assert.ok(comResto > 250, `só ${comResto} casos tinham resto — a varredura é fraca`);
  });

  it('um cêntimo por três dá 1 + 0 + 0, e não três zeros', () => {
    const partes = dividirEmPartes({ montanteMenor: 1, moeda: 'EUR' }, 3);
    assert.deepEqual(partes.map((p) => p.montanteMenor), [1, 0, 0]);
    assert.equal(partes.reduce((a, b) => a + b.montanteMenor, 0), 1);
  });

  it('por pesos desiguais também soma ao cêntimo', () => {
    const partes = dividirPorPesos({ montanteMenor: 1000, moeda: 'EUR' }, [1, 1, 1]);
    assert.equal(partes.reduce((a, b) => a + b.montanteMenor, 0), 1000);
    const outras = dividirPorPesos({ montanteMenor: 999, moeda: 'EUR' }, [3, 5, 7, 11]);
    assert.equal(outras.reduce((a, b) => a + b.montanteMenor, 0), 999);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2 · o devido é derivado, e o gatilho é quem o garante', () => {
  it('escrever o devido de fora não pega: a base substitui pela soma', async () => {
    const conta = await contaCom(1250, 2);
    await sql.query(`UPDATE bills SET devido_menor = 1 WHERE id = $1`, [conta]);
    // O UPDATE directo não passa pelo gatilho das linhas; o que o gatilho
    // garante é que qualquer mexida nas LINHAS repõe a verdade.
    await sql.query(
      `INSERT INTO bill_lines (id, organization_id, bill_id, nome, quantidade, unitario_menor)
       VALUES (gen_random_uuid(), $1, $2, 'x', 1, 0)`, [IDS.orgA, conta]);
    const { rows } = await sql.query(`SELECT devido_menor FROM bills WHERE id = $1`, [conta]);
    assert.equal(rows[0].devido_menor, 2500, 'o devido não foi recalculado a partir das linhas');
  });

  it('apagar uma linha desce o devido', async () => {
    const conta = await contaCom(700, 3);
    await sql.query(`DELETE FROM bill_lines WHERE bill_id = $1`, [conta]);
    const { rows } = await sql.query(`SELECT devido_menor FROM bills WHERE id = $1`, [conta]);
    assert.equal(rows[0].devido_menor, 0);
  });

  it('o ajuste entra na conta e o devido desce', async () => {
    const conta = await contaCom(1000);
    const r = await comA((db) => ajustar(db, {
      billId: conta, tipo: 'DESCONTO', montanteMenor: 250,
      motivo: 'cliente habitual', autorizadoPor: IDS.utilizadorA,
    }));
    assert.equal(r.devidoMenor, 750);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3 · desconto não vira troco escondido', () => {
  it('um desconto maior que a conta é recusado com nome', async () => {
    const conta = await contaCom(1000);
    await assert.rejects(
      () => comA((db) => ajustar(db, {
        billId: conta, tipo: 'DESCONTO', montanteMenor: 1500,
        motivo: 'engano', autorizadoPor: IDS.utilizadorA,
      })),
      (e: Error) => e.message.includes('AJUSTE_EXCEDE_O_DEVIDO'));
  });

  it('e o devido nunca fica negativo', async () => {
    const conta = await contaCom(1000);
    await comA((db) => ajustar(db, {
      billId: conta, tipo: 'CORTESIA', montanteMenor: 1000,
      motivo: 'oferta da casa', autorizadoPor: IDS.utilizadorA,
    }));
    const { rows } = await sql.query(`SELECT devido_menor FROM bills WHERE id = $1`, [conta]);
    assert.equal(rows[0].devido_menor, 0);
  });

  it('um ajuste sem motivo não entra — a base recusa', async () => {
    const conta = await contaCom(1000);
    await assert.rejects(() => sql.query(
      `INSERT INTO bill_adjustments (id, organization_id, bill_id, tipo, base, montante_menor, motivo, autorizado_por)
       VALUES (gen_random_uuid(), $1, $2, 'DESCONTO', 'CONTA', 100, '   ', $3)`,
      [IDS.orgA, conta, IDS.utilizadorA]));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4 · a última parcela, com duas caixas a cobrá-la ao mesmo tempo', () => {
  it('duas cobranças concorrentes dão UMA cobrança e UMA recusa', async () => {
    const conta = await contaCom(500);
    const cobrar = (chave: string) => comContaTrancada(prisma, ESCOPO, conta, async (db) => {
      const t = await tentarPagar(db, {
        billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: chave,
      });
      return confirmarPagamento(db, t.id);
    });

    const saidas = await Promise.allSettled([
      cobrar(`${PREFIXO}a`), cobrar(`${PREFIXO}b`),
    ]);
    const boas = saidas.filter((s) => s.status === 'fulfilled');
    const mas = saidas.filter((s) => s.status === 'rejected');
    assert.equal(boas.length, 1, 'as duas passaram: a conta foi cobrada duas vezes');
    assert.equal(mas.length, 1, 'nenhuma recusou');

    // ── Contar rejeições não chega: é preciso saber PORQUÊ ────────────────
    //
    // Com `Serializable` a segunda também caía, mas com um `40001` — um erro
    // sobre a base, não sobre o negócio. O caso passava a verde sem nunca tocar
    // no limite do devido: apagar o limite não o fazia acender. Medido a 05/09.
    const razao = String((mas[0] as PromiseRejectedResult).reason);
    assert.ok(razao.includes('EXCEDE_O_DEVIDO'),
      `a recusa não foi de negócio, foi «${razao.slice(0, 80)}»`);

    const { pagoMenor, devidoMenor } = await comA((db) => somasDaConta(db, conta));
    assert.equal(pagoMenor, 500);
    assert.equal(devidoMenor, 500);
    assert.equal(await comA((db) => estadoDaConta(db, conta)), 'LIQUIDADA');
  });

  it('pagar mais do que se deve é recusado', async () => {
    const conta = await contaCom(500);
    await assert.rejects(
      () => comA((db) => tentarPagar(db, {
        billId: conta, meio: 'CARTAO', montanteMenor: 600, chaveIdempotente: `${PREFIXO}x`,
      })),
      (e: Error) => e.message.includes('EXCEDE_O_DEVIDO'));
  });

  it('a mesma chave duas vezes é a MESMA tentativa, não duas', async () => {
    const conta = await contaCom(500);
    const um = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 200, chaveIdempotente: `${PREFIXO}k`,
    }));
    const dois = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 200, chaveIdempotente: `${PREFIXO}k`,
    }));
    assert.equal(dois.id, um.id);
    assert.equal(dois.repetida, true);
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM payment_attempts WHERE bill_id = $1`, [conta]);
    assert.equal(rows[0].n, 1);
  });

  it('parcial deixa a conta PARCIALMENTE LIQUIDADA, e não liquidada', async () => {
    const conta = await contaCom(1000);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 400, chaveIdempotente: `${PREFIXO}p`,
    }));
    await comA((db) => confirmarPagamento(db, t.id));
    assert.equal(await comA((db) => estadoDaConta(db, conta)), 'PARCIALMENTE_LIQUIDADA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5 · indeterminado é um estado, e reconcilia-se ANTES', () => {
  it('com uma tentativa por reconciliar, a seguinte é recusada', async () => {
    const conta = await contaCom(1000);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}i1`,
    }));
    await sql.query(`UPDATE payment_attempts SET estado = 'INDETERMINADA' WHERE id = $1`, [t.id]);
    await assert.rejects(
      () => comA((db) => tentarPagar(db, {
        billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}i2`,
      })),
      (e: Error) => e.message.includes('TENTATIVA_POR_RECONCILIAR'));
  });

  it('e o PAR: reconciliada, a seguinte passa', async () => {
    const conta = await contaCom(1000);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}j1`,
    }));
    await sql.query(`UPDATE payment_attempts SET estado = 'INDETERMINADA' WHERE id = $1`, [t.id]);
    await comA((db) => reconciliar(db, t.id, 'FALHOU'));
    const segunda = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}j2`,
    }));
    assert.equal(segunda.repetida, false);
  });

  it('reconciliar como confirmada cria o pagamento', async () => {
    const conta = await contaCom(300);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 300, chaveIdempotente: `${PREFIXO}r`,
    }));
    const { pagamentoId } = await comA((db) => reconciliar(db, t.id, 'CONFIRMADA'));
    assert.ok(pagamentoId);
    assert.equal(await comA((db) => estadoDaConta(db, conta)), 'LIQUIDADA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('6 · anular não é devolver', () => {
  it('anular depois de capturar é recusado — o caminho é a devolução', async () => {
    const conta = await contaCom(400);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 400, chaveIdempotente: `${PREFIXO}v`,
    }));
    await comA((db) => confirmarPagamento(db, t.id));
    await assert.rejects(() => comA((db) => anular(db, t.id)),
      (e: Error) => e.message.includes('JA_CAPTURADA'));
  });

  it('anular antes de capturar não move dinheiro nenhum', async () => {
    const conta = await contaCom(400);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 400, chaveIdempotente: `${PREFIXO}v2`,
    }));
    await comA((db) => anular(db, t.id));
    const { pagoMenor } = await comA((db) => somasDaConta(db, conta));
    assert.equal(pagoMenor, 0);
    assert.equal(await comA((db) => estadoDaConta(db, conta)), 'ABERTA');
  });

  it('a devolução é limitada ao capturado ainda não devolvido', async () => {
    const conta = await contaCom(1000);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 1000, chaveIdempotente: `${PREFIXO}d`,
    }));
    const { id: pagamento } = await comA((db) => confirmarPagamento(db, t.id));
    const primeira = await comA((db) => devolver(db, {
      paymentId: pagamento, montanteMenor: 600, motivo: 'prato devolvido',
      autorizadoPor: IDS.utilizadorA, chaveIdempotente: `${PREFIXO}d1`,
    }));
    assert.equal(primeira.porDevolverMenor, 400);
    await assert.rejects(
      () => comA((db) => devolver(db, {
        paymentId: pagamento, montanteMenor: 500, motivo: 'outra vez',
        autorizadoPor: IDS.utilizadorA, chaveIdempotente: `${PREFIXO}d2`,
      })),
      (e: Error) => e.message.includes('EXCEDE_O_CAPTURADO'));
  });

  it('repetir a mesma devolução não devolve duas vezes', async () => {
    const conta = await contaCom(1000);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 1000, chaveIdempotente: `${PREFIXO}e`,
    }));
    const { id: pagamento } = await comA((db) => confirmarPagamento(db, t.id));
    const dados = {
      paymentId: pagamento, montanteMenor: 300, motivo: 'engano',
      autorizadoPor: IDS.utilizadorA, chaveIdempotente: `${PREFIXO}e1`,
    };
    const um = await comA((db) => devolver(db, dados));
    const dois = await comA((db) => devolver(db, dados));
    assert.equal(dois.id, um.id);
    assert.equal(dois.repetida, true);
    const { rows } = await sql.query(
      `SELECT COALESCE(SUM(montante_menor), 0)::int AS s FROM refunds WHERE payment_id = $1`,
      [pagamento]);
    assert.equal(rows[0].s, 300, 'devolveu duas vezes');
  });

  it('a devolução NÃO reabre saldo a cobrar: a conta continua liquidada', async () => {
    const conta = await contaCom(500);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}f`,
    }));
    const { id: pagamento } = await comA((db) => confirmarPagamento(db, t.id));
    await comA((db) => devolver(db, {
      paymentId: pagamento, montanteMenor: 500, motivo: 'tudo',
      autorizadoPor: IDS.utilizadorA, chaveIdempotente: `${PREFIXO}f1`,
    }));
    assert.equal(await comA((db) => estadoDaConta(db, conta)), 'LIQUIDADA');
    const { devolvidoMenor } = await comA((db) => somasDaConta(db, conta));
    assert.equal(devolvidoMenor, 500, 'o devolvido tem de se ver ao lado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('7 · o que está pago não se reescreve nem se move em silêncio', () => {
  it('editar um pagamento é recusado pela base', async () => {
    const conta = await contaCom(500);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}g`,
    }));
    const { id } = await comA((db) => confirmarPagamento(db, t.id));
    await assert.rejects(
      () => sql.query(`UPDATE payments SET montante_menor = 1 WHERE id = $1`, [id]),
      (e: Error) => e.message.includes('REGISTO_IMUTAVEL'));
  });

  it('apagar um pagamento é recusado pela base', async () => {
    const conta = await contaCom(500);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}h`,
    }));
    const { id } = await comA((db) => confirmarPagamento(db, t.id));
    await assert.rejects(() => sql.query(`DELETE FROM payments WHERE id = $1`, [id]),
      (e: Error) => e.message.includes('REGISTO_IMUTAVEL'));
  });

  it('mexer numa linha de conta já paga é recusado pela base', async () => {
    const conta = await contaCom(500);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}m`,
    }));
    await comA((db) => confirmarPagamento(db, t.id));
    await assert.rejects(
      () => sql.query(`DELETE FROM bill_lines WHERE bill_id = $1`, [conta]),
      (e: Error) => e.message.includes('CONTA_COM_PAGAMENTO'));
  });

  it('e o PAR: numa conta SEM pagamento, a linha mexe-se', async () => {
    const conta = await contaCom(500);
    await sql.query(`DELETE FROM bill_lines WHERE bill_id = $1`, [conta]);
    const { rows } = await sql.query(`SELECT devido_menor FROM bills WHERE id = $1`, [conta]);
    assert.equal(rows[0].devido_menor, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('8 · transferir um item é MOVER, e nunca copiar', () => {
  it('a linha muda de conta e os dois devidos acompanham', async () => {
    const origem = await contaCom(800);
    const destino = await contaCom(0);
    await sql.query(`DELETE FROM bill_lines WHERE bill_id = $1`, [destino]);
    const { rows: l } = await sql.query(
      `SELECT id FROM bill_lines WHERE bill_id = $1`, [origem]);
    await comA((db) => transferirLinha(db, l[0].id, destino));
    const { rows } = await sql.query(
      `SELECT id, devido_menor FROM bills WHERE id IN ($1, $2)`, [origem, destino]);
    const por = Object.fromEntries(rows.map((r: { id: string; devido_menor: number }) =>
      [r.id, r.devido_menor]));
    assert.equal(por[origem], 0, 'a origem não desceu');
    assert.equal(por[destino], 800, 'o destino não subiu');
  });

  it('transferir de uma conta já paga é recusado com nome', async () => {
    const origem = await contaCom(500);
    const destino = await contaCom(0);
    const t = await comA((db) => tentarPagar(db, {
      billId: origem, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}t`,
    }));
    await comA((db) => confirmarPagamento(db, t.id));
    const { rows: l } = await sql.query(`SELECT id FROM bill_lines WHERE bill_id = $1`, [origem]);
    await assert.rejects(() => comA((db) => transferirLinha(db, l[0].id, destino)),
      (e: Error) => e.message.includes('CONTA_COM_PAGAMENTO'));
  });

  it('a mesma linha de pedido não pode estar em duas contas', async () => {
    const a = await contaCom(0);
    const b = await contaCom(0);
    const { rows: o } = await sql.query(
      `INSERT INTO orders (id, organization_id, location_id, canal, numero, estado, aberto_por, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'SALA', $3, 'ACEITE', $4, now()) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, proximoNumero(), `${PREFIXO}actor@inspeccao.example`]);
    const { rows: linha } = await sql.query(
      `INSERT INTO order_lines (id, organization_id, order_id, nome, quantidade, preco_menor, moeda, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'x', 1, 100, 'EUR', 'ACEITE', now()) RETURNING id`,
      [IDS.orgA, o[0].id]);
    const meter = (conta: string) => sql.query(
      `INSERT INTO bill_lines (id, organization_id, bill_id, order_line_id, nome, quantidade, unitario_menor)
       VALUES (gen_random_uuid(), $1, $2, $3, 'x', 1, 100)`, [IDS.orgA, conta, linha[0].id]);
    await meter(a);
    await assert.rejects(() => meter(b), 'a mesma linha entrou em duas contas');
    await sql.query(`DELETE FROM bill_lines WHERE order_line_id = $1`, [linha[0].id]);
    await sql.query(`DELETE FROM order_lines WHERE id = $1`, [linha[0].id]);
    await sql.query(`DELETE FROM orders WHERE id = $1`, [o[0].id]);
  });

  it('juntar as linhas de um pedido copia o preço que vale agora', async () => {
    const conta = await contaCom(0);
    await sql.query(`DELETE FROM bill_lines WHERE bill_id = $1`, [conta]);
    const { rows: o } = await sql.query(
      `INSERT INTO orders (id, organization_id, location_id, canal, numero, estado, aberto_por, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'SALA', $3, 'ACEITE', $4, now()) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, proximoNumero(), `${PREFIXO}actor@inspeccao.example`]);
    await sql.query(
      `INSERT INTO order_lines (id, organization_id, order_id, nome, quantidade, preco_menor, moeda, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'arroz', 2, 950, 'EUR', 'ACEITE', now())`,
      [IDS.orgA, o[0].id]);
    const postas = await comA((db) => juntarLinhasDoPedido(db, conta, o[0].id));
    assert.equal(postas, 1);
    const { rows } = await sql.query(`SELECT devido_menor FROM bills WHERE id = $1`, [conta]);
    assert.equal(rows[0].devido_menor, 1900, 'quantidade × unitário não bateu');
    await sql.query(`DELETE FROM bill_lines WHERE bill_id = $1`, [conta]);
    await sql.query(`DELETE FROM order_lines WHERE order_id = $1`, [o[0].id]);
    await sql.query(`DELETE FROM orders WHERE id = $1`, [o[0].id]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('9 · troco é recebido menos devido, e não receita', () => {
  it('20,00 € para uma conta de 13,45 € dá 6,55 € de troco', async () => {
    const conta = await contaCom(1345);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'DINHEIRO', montanteMenor: 1345, chaveIdempotente: `${PREFIXO}tr`,
    }));
    const { trocoMenor } = await comA((db) => confirmarPagamento(db, t.id, 2000));
    assert.equal(trocoMenor, 655);
    // O troco NÃO entra no que a conta recebeu: o pagamento é 13,45, não 20,00.
    const { pagoMenor } = await comA((db) => somasDaConta(db, conta));
    assert.equal(pagoMenor, 1345, 'o troco entrou na receita');
  });

  it('receber menos do que se cobra é recusado', async () => {
    const conta = await contaCom(1345);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'DINHEIRO', montanteMenor: 1345, chaveIdempotente: `${PREFIXO}tr2`,
    }));
    await assert.rejects(() => comA((db) => confirmarPagamento(db, t.id, 1000)),
      (e: Error) => e.message.includes('TROCO_NEGATIVO'));
  });

  it('um pagamento com cartão não tem recebido — a base recusa', async () => {
    const conta = await contaCom(500);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}tr3`,
    }));
    await assert.rejects(() => sql.query(
      `INSERT INTO payments (id, organization_id, bill_id, attempt_id, meio, montante_menor, recebido_menor)
       VALUES (gen_random_uuid(), $1, $2, $3, 'CARTAO', 500, 900)`,
      [IDS.orgA, conta, t.id]));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('10 · fechar a conta exige saldo E nada por reconciliar', () => {
  it('não fecha com uma tentativa por reconciliar', async () => {
    const conta = await contaCom(500);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}fc`,
    }));
    await comA((db) => confirmarPagamento(db, t.id));
    await sql.query(`UPDATE payment_attempts SET estado = 'INDETERMINADA' WHERE id = $1`, [t.id]);
    await assert.rejects(() => comA((db) => fecharConta(db, conta, IDS.utilizadorA)),
      (e: Error) => e.message.includes('TENTATIVA_POR_RECONCILIAR'));
  });

  it('não fecha por liquidar', async () => {
    const conta = await contaCom(500);
    await assert.rejects(() => comA((db) => fecharConta(db, conta, IDS.utilizadorA)),
      (e: Error) => e.message.includes('CONTA_POR_LIQUIDAR'));
  });

  it('e o PAR: liquidada e reconciliada, fecha — e sai das abertas', async () => {
    const conta = await contaCom(500);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 500, chaveIdempotente: `${PREFIXO}fc2`,
    }));
    await comA((db) => confirmarPagamento(db, t.id));
    const antes = await comA((db) => contasAbertas(db, IDS.unidadeA));
    await comA((db) => fecharConta(db, conta, IDS.utilizadorA));
    const depois = await comA((db) => contasAbertas(db, IDS.unidadeA));
    assert.ok(antes.some((c) => c.id === conta), 'não estava nas abertas antes');
    assert.ok(!depois.some((c) => c.id === conta), 'continuou nas abertas depois');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('11 · corrigir um ajuste é um registo novo, e não um UPDATE', () => {
  it('a reversão devolve o abatido ao devido, e as duas linhas ficam', async () => {
    const conta = await contaCom(1000);
    const { id: ajuste } = await comA((db) => ajustar(db, {
      billId: conta, tipo: 'DESCONTO', montanteMenor: 300,
      motivo: 'engano de dedo', autorizadoPor: IDS.utilizadorA,
    }));
    const r = await comA((db) => reverterAjuste(db, {
      ajusteId: ajuste, motivo: 'desconto errado', autorizadoPor: IDS.utilizadorA,
    }));
    assert.equal(r.devidoMenor, 1000, 'o devido não voltou');
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM bill_adjustments WHERE bill_id = $1`, [conta]);
    assert.equal(rows[0].n, 2, 'a correcção apagou o original em vez de o anular');
  });

  it('o mesmo ajuste não se reverte duas vezes', async () => {
    const conta = await contaCom(1000);
    const { id: ajuste } = await comA((db) => ajustar(db, {
      billId: conta, tipo: 'DESCONTO', montanteMenor: 300,
      motivo: 'engano', autorizadoPor: IDS.utilizadorA,
    }));
    await comA((db) => reverterAjuste(db, {
      ajusteId: ajuste, motivo: 'primeira', autorizadoPor: IDS.utilizadorA,
    }));
    await assert.rejects(() => comA((db) => reverterAjuste(db, {
      ajusteId: ajuste, motivo: 'segunda', autorizadoPor: IDS.utilizadorA,
    })), 'reverteu duas vezes: o desconto voltou a dobrar');
    const { rows } = await sql.query(`SELECT devido_menor FROM bills WHERE id = $1`, [conta]);
    assert.equal(rows[0].devido_menor, 1000);
  });

  it('e o ajuste original continua imutável', async () => {
    const conta = await contaCom(1000);
    const { id: ajuste } = await comA((db) => ajustar(db, {
      billId: conta, tipo: 'DESCONTO', montanteMenor: 300,
      motivo: 'engano', autorizadoPor: IDS.utilizadorA,
    }));
    await assert.rejects(
      () => sql.query(`UPDATE bill_adjustments SET montante_menor = 1 WHERE id = $1`, [ajuste]),
      (e: Error) => e.message.includes('REGISTO_IMUTAVEL'));
  });
});

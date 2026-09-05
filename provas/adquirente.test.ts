import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Client } from 'pg';
import {
  abrirConta, acontecimentosDaConta, assinaturaConfere, comEscopo, conectorDePagamento,
  estadoAutorizado, guardarConectorDePagamento, obterPrisma, receberWebhook,
  reconciliarComProvedor, somasDaConta, tentarPagar,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E23 — a fronteira.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * «Uma prova que só use o caminho feliz do fornecedor. Se não houver simulação
 * de resposta lenta, repetida e fora de ordem, não está provado — está
 * demonstrado.»
 *
 * Por isso não há aqui nenhum caso que envie um webhook e confirme que chegou.
 * Todos enviam duas vezes, ou trocados, ou com a assinatura errada.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e23-';
const SEGREDO = 'segredo-de-prova-do-e23';
const PROVEDOR = 'sandbox';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let n = 0;
const proximo = () => `${PREFIXO}${(n += 1)}`;

/** Um corpo assinado como o adquirente o assinaria — texto cru, e só depois hash. */
function assinado(corpo: Record<string, unknown>, segredo = SEGREDO) {
  const corpoCru = JSON.stringify(corpo);
  return {
    corpoCru,
    assinatura: createHmac('sha256', segredo).update(corpoCru, 'utf8').digest('hex'),
  };
}

async function contaComTentativa(montanteMenor = 2000) {
  const { id: billId } = await comA((db) => abrirConta(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, numero: proximo(), moeda: 'EUR',
  }));
  await sql.query(
    `INSERT INTO bill_lines (id, organization_id, bill_id, nome, quantidade, unitario_menor)
     VALUES (gen_random_uuid(), $1, $2, 'x', 1, $3)`, [IDS.orgA, billId, montanteMenor]);
  const t = await comA((db) => tentarPagar(db, {
    billId, meio: 'CARTAO', montanteMenor, chaveIdempotente: proximo(),
  }));
  return { billId, attemptId: t.id, montanteMenor };
}

/** Manda um webhook bem assinado. */
async function webhook(corpo: Record<string, unknown>, segredo = SEGREDO) {
  const { corpoCru, assinatura } = assinado(corpo, segredo);
  return comA((db) => receberWebhook(db, {
    organizationId: IDS.orgA, provedor: PROVEDOR, corpoCru, assinatura, segredo: SEGREDO,
  }));
}

const COM_GATILHO = ['provider_events', 'payments', 'refunds', 'bill_lines',
                     'bill_adjustments', 'cash_movements', 'cash_register_events'];
async function gatilhos(estado: 'DISABLE' | 'ENABLE') {
  for (const t of COM_GATILHO) await sql.query(`ALTER TABLE "${t}" ${estado} TRIGGER USER`);
}

async function limpar() {
  await gatilhos('DISABLE');
  const contas = `(SELECT id FROM bills WHERE numero LIKE '${PREFIXO}%')`;
  await sql.query(`DELETE FROM provider_events WHERE bill_id IN ${contas} OR evento_id LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM refunds WHERE payment_id IN (SELECT id FROM payments WHERE bill_id IN ${contas})`);
  await sql.query(`DELETE FROM payments WHERE bill_id IN ${contas}`);
  await sql.query(`DELETE FROM payment_attempts WHERE bill_id IN ${contas}`);
  await sql.query(`DELETE FROM bill_lines WHERE bill_id IN ${contas}`);
  await sql.query(`DELETE FROM bills WHERE numero LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM payment_connectors WHERE location_id = $1`, [IDS.unidadeA]);
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
describe('1 · a assinatura verifica-se ANTES de qualquer efeito', () => {
  it('uma assinatura errada não produz efeito nenhum', async () => {
    const { attemptId } = await contaComTentativa();
    const corpo = {
      eventoId: `${PREFIXO}mau`, tipo: 'captura', estadoProvedor: 'CAPTURADO',
      ocorridoEm: new Date().toISOString(), attemptId, montanteMenor: 2000,
    };
    const { corpoCru } = assinado(corpo, 'outro-segredo-qualquer');
    await assert.rejects(
      () => comA((db) => receberWebhook(db, {
        organizationId: IDS.orgA, provedor: PROVEDOR, corpoCru,
        assinatura: createHmac('sha256', 'outro-segredo-qualquer').update(corpoCru).digest('hex'),
        segredo: SEGREDO,
      })),
      (e: Error) => e.message.includes('ASSINATURA_INVALIDA'));

    // E o efeito não aconteceu: nem sequer ficou o acontecimento guardado.
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM provider_events WHERE evento_id = $1`, [`${PREFIXO}mau`]);
    assert.equal(rows[0].n, 0, 'um estranho conseguiu escrever no nosso registo');
  });

  it('sem assinatura nenhuma, recusa', async () => {
    await assert.rejects(
      () => comA((db) => receberWebhook(db, {
        organizationId: IDS.orgA, provedor: PROVEDOR,
        corpoCru: '{"eventoId":"x","tipo":"y"}', assinatura: null, segredo: SEGREDO,
      })),
      (e: Error) => e.message.includes('ASSINATURA_INVALIDA'));
  });

  it('a recusa NÃO diz porquê a quem a enviou', async () => {
    try {
      await comA((db) => receberWebhook(db, {
        organizationId: IDS.orgA, provedor: PROVEDOR,
        corpoCru: '{}', assinatura: 'aa', segredo: SEGREDO,
      }));
      assert.fail('devia ter recusado');
    } catch (e) {
      const texto = String((e as Error).message);
      // Um erro que explica o que faltou à assinatura é um manual de como a
      // forjar. Só o nome da recusa, e mais nada.
      assert.equal(texto, 'ASSINATURA_INVALIDA');
      assert.ok(!texto.includes(SEGREDO), 'o segredo foi para a mensagem de erro');
    }
  });

  it('e o PAR: a assinatura certa passa', async () => {
    const { attemptId } = await contaComTentativa();
    const r = await webhook({
      eventoId: proximo(), tipo: 'captura', estadoProvedor: 'CAPTURADO',
      ocorridoEm: new Date().toISOString(), attemptId, montanteMenor: 2000,
    });
    assert.equal(r.repetido, false);
  });

  it('o resumo compara-se em tempo constante e o comprimento não atira', () => {
    assert.equal(assinaturaConfere('corpo', 'aa', SEGREDO), false);
    assert.equal(assinaturaConfere('corpo', null, SEGREDO), false);
    assert.equal(assinaturaConfere('corpo', 'zz-nao-e-hex', SEGREDO), false);
    const bom = createHmac('sha256', SEGREDO).update('corpo').digest('hex');
    assert.equal(assinaturaConfere('corpo', bom, SEGREDO), true);
    // O corpo é CRU: reordenar as chaves muda a assinatura, e tem de mudar.
    assert.equal(assinaturaConfere('outro corpo', bom, SEGREDO), false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2 · um webhook chega duas vezes, e isso não é avaria', () => {
  it('o MESMO acontecimento duas vezes tem UM efeito', async () => {
    const { attemptId, billId } = await contaComTentativa();
    const corpo = {
      eventoId: `${PREFIXO}cap-1`, tipo: 'captura', estadoProvedor: 'CAPTURADO',
      ocorridoEm: new Date().toISOString(), attemptId, billId, montanteMenor: 2000,
    };
    const um = await webhook(corpo);
    const dois = await webhook(corpo);
    assert.equal(um.repetido, false);
    assert.equal(dois.repetido, true, 'o reenvio normal do adquirente foi tratado como novo');

    await comA((db) => reconciliarComProvedor(db, {
      attemptId, autorizadoPor: IDS.utilizadorA, provedor: PROVEDOR,
    }));
    const { pagoMenor } = await comA((db) => somasDaConta(db, billId));
    assert.equal(pagoMenor, 2000, 'cobrou duas vezes');
  });

  it('e o PAR: DOIS acontecimentos diferentes têm DOIS efeitos', async () => {
    // Sem este par, «engole tudo o que se parece» passava o caso de cima.
    const { attemptId, billId } = await contaComTentativa();
    const agora = Date.now();
    await webhook({
      eventoId: `${PREFIXO}a`, tipo: 'autorizacao', estadoProvedor: 'AUTORIZADO',
      ocorridoEm: new Date(agora).toISOString(), attemptId, billId, montanteMenor: 2000,
    });
    await webhook({
      eventoId: `${PREFIXO}b`, tipo: 'captura', estadoProvedor: 'CAPTURADO',
      ocorridoEm: new Date(agora + 1000).toISOString(), attemptId, billId, montanteMenor: 2000,
    });
    const estado = await comA((db) => estadoAutorizado(db, attemptId));
    assert.equal(estado.acontecimentos, 2, 'os dois acontecimentos não entraram');
    assert.equal(estado.estado, 'CAPTURADO');
  });

  it('reconciliar duas vezes não cria dois pagamentos', async () => {
    const { attemptId, billId } = await contaComTentativa();
    await webhook({
      eventoId: proximo(), tipo: 'captura', estadoProvedor: 'CAPTURADO',
      ocorridoEm: new Date().toISOString(), attemptId, billId, montanteMenor: 2000,
    });
    const um = await comA((db) => reconciliarComProvedor(db, {
      attemptId, autorizadoPor: IDS.utilizadorA, provedor: PROVEDOR }));
    const dois = await comA((db) => reconciliarComProvedor(db, {
      attemptId, autorizadoPor: IDS.utilizadorA, provedor: PROVEDOR }));
    assert.equal(um.criouPagamento, true);
    assert.equal(dois.criouPagamento, false);
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM payments WHERE bill_id = $1`, [billId]);
    assert.equal(rows[0].n, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3 · a ORDEM não é garantida, e não pode decidir', () => {
  /** Corre a mesma história em duas ordens de CHEGADA e devolve os dois estados. */
  async function nasDuasOrdens(historia: Record<string, unknown>[]) {
    const enviados = { primeira: [] as string[], segunda: [] as string[] };
    const primeiro = await contaComTentativa();
    for (const e of historia) {
      enviados.primeira.push(String(e.tipo));
      await webhook({ ...e, attemptId: primeiro.attemptId, billId: primeiro.billId });
    }
    const a = await comA((db) => estadoAutorizado(db, primeiro.attemptId));

    const segundo = await contaComTentativa();
    for (const e of [...historia].reverse()) {
      enviados.segunda.push(String(e.tipo));
      await webhook({
        ...e, eventoId: `${String(e.eventoId)}-r`,
        attemptId: segundo.attemptId, billId: segundo.billId,
      });
    }
    const b = await comA((db) => estadoAutorizado(db, segundo.attemptId));

    // ── Guarda de leitor cego: as duas ordens são mesmo DUAS ──────────────
    //
    // Sem isto, o par «em ordem dá o mesmo» comparava duas execuções iguais e
    // era verdade por construção. Medido a 05/09 com o defeito plantado: pôr as
    // duas voltas a correr a mesma ordem deixava a suite VERDE.
    //
    // A ordem lê-se do que foi ENVIADO, e não da base: dois webhooks seguidos
    // podem cair no mesmo carimbo de `recebido_em`, e aí o desempate é o `id`,
    // que é aleatório — a guarda passava a acender por acaso. Aqui a pergunta é
    // «as duas voltas usaram ordens diferentes?», e quem sabe isso é o envio.
    assert.notDeepEqual(enviados.primeira, enviados.segunda,
      `as duas voltas enviaram na MESMA ordem (${enviados.primeira.join(',')}) — a varredura não mede nada`);

    return { emOrdem: a, aoContrario: b };
  }

  it('o estorno que chega ANTES da captura não se perde', async () => {
    const agora = Date.now();
    const { aoContrario } = await nasDuasOrdens([
      { eventoId: `${PREFIXO}o1`, tipo: 'captura', estadoProvedor: 'CAPTURADO',
        ocorridoEm: new Date(agora).toISOString(), montanteMenor: 2000 },
      { eventoId: `${PREFIXO}o2`, tipo: 'estorno', estadoProvedor: 'DEVOLVIDO',
        ocorridoEm: new Date(agora + 60_000).toISOString(), montanteMenor: 2000 },
    ]);
    // Chegando ao contrário, a devolução entrou primeiro — e não se perdeu.
    assert.equal(aoContrario.acontecimentos, 2, 'um dos acontecimentos foi engolido');
    assert.equal(aoContrario.devolvidoMenor, 2000);
    assert.equal(aoContrario.capturadoMenor, 2000);
  });

  it('e o PAR: em ordem, o resultado é o MESMO', async () => {
    const agora = Date.now();
    const { emOrdem, aoContrario } = await nasDuasOrdens([
      { eventoId: `${PREFIXO}p1`, tipo: 'captura', estadoProvedor: 'CAPTURADO',
        ocorridoEm: new Date(agora).toISOString(), montanteMenor: 2000 },
      { eventoId: `${PREFIXO}p2`, tipo: 'estorno', estadoProvedor: 'DEVOLVIDO',
        ocorridoEm: new Date(agora + 60_000).toISOString(), montanteMenor: 2000 },
    ]);
    // «Se os dois derem resultados diferentes, a ordem está a decidir.»
    assert.equal(aoContrario.estado, emOrdem.estado,
      `a ordem decidiu: em ordem deu ${emOrdem.estado}, ao contrário deu ${aoContrario.estado}`);
    assert.equal(aoContrario.capturadoMenor, emOrdem.capturadoMenor);
    assert.equal(aoContrario.devolvidoMenor, emOrdem.devolvidoMenor);
    assert.equal(emOrdem.estado, 'DEVOLVIDO');
  });

  it('a ordenação é pelo instante do PROVEDOR, não pelo da chegada', async () => {
    const { attemptId, billId } = await contaComTentativa();
    const agora = Date.now();
    // Chega primeiro o que aconteceu DEPOIS.
    await webhook({
      eventoId: `${PREFIXO}t2`, tipo: 'falha', estadoProvedor: 'FALHOU',
      ocorridoEm: new Date(agora + 60_000).toISOString(), attemptId, billId,
    });
    await webhook({
      eventoId: `${PREFIXO}t1`, tipo: 'autorizacao', estadoProvedor: 'AUTORIZADO',
      ocorridoEm: new Date(agora).toISOString(), attemptId, billId, montanteMenor: 2000,
    });
    const estado = await comA((db) => estadoAutorizado(db, attemptId));
    // Se a ordenação fosse pela chegada, o último seria a autorização.
    assert.equal(estado.estado, 'FALHOU',
      'a ordenação está a usar a chegada, e a chegada é o que não é de confiança');
  });

  it('a devolução que chega antes da captura aplica-se quando a captura aparece', async () => {
    const { attemptId, billId } = await contaComTentativa();
    const agora = Date.now();
    await webhook({
      eventoId: `${PREFIXO}d1`, tipo: 'estorno', estadoProvedor: 'DEVOLVIDO',
      ocorridoEm: new Date(agora + 60_000).toISOString(), attemptId, billId, montanteMenor: 2000,
    });
    // Reconciliar agora: não há captura, por isso não há devolução a criar — e
    // sobretudo NÃO se inventa um pagamento para poder devolver.
    const antes = await comA((db) => reconciliarComProvedor(db, {
      attemptId, autorizadoPor: IDS.utilizadorA, provedor: PROVEDOR }));
    assert.equal(antes.criouPagamento, false);
    assert.equal(antes.criouDevolucao, false);

    await webhook({
      eventoId: `${PREFIXO}d2`, tipo: 'captura', estadoProvedor: 'CAPTURADO',
      ocorridoEm: new Date(agora).toISOString(), attemptId, billId, montanteMenor: 2000,
    });
    const depois = await comA((db) => reconciliarComProvedor(db, {
      attemptId, autorizadoPor: IDS.utilizadorA, provedor: PROVEDOR }));
    assert.equal(depois.criouPagamento, true);
    assert.equal(depois.criouDevolucao, true, 'a devolução que chegou cedo perdeu-se');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4 · o reembolso não é uma venda negativa', () => {
  it('não se devolve mais do que se capturou', async () => {
    const { attemptId, billId } = await contaComTentativa(2000);
    await webhook({
      eventoId: proximo(), tipo: 'captura', estadoProvedor: 'CAPTURADO',
      ocorridoEm: new Date().toISOString(), attemptId, billId, montanteMenor: 2000,
    });
    await comA((db) => reconciliarComProvedor(db, {
      attemptId, autorizadoPor: IDS.utilizadorA, provedor: PROVEDOR }));
    const { rows } = await sql.query(
      `SELECT id FROM payments WHERE bill_id = $1`, [billId]);
    const { devolver } = await import('../packages/db/src/index.ts');
    await assert.rejects(
      () => comA((db) => devolver(db, {
        paymentId: rows[0].id, montanteMenor: 2500, motivo: 'a mais',
        autorizadoPor: IDS.utilizadorA, chaveIdempotente: proximo(),
      })),
      (e: Error) => e.message.includes('EXCEDE_O_CAPTURADO'));
  });

  it('e o PAR: uma devolução parcial legítima passa, e a segunda respeita o resto', async () => {
    const { attemptId, billId } = await contaComTentativa(2000);
    await webhook({
      eventoId: proximo(), tipo: 'captura', estadoProvedor: 'CAPTURADO',
      ocorridoEm: new Date().toISOString(), attemptId, billId, montanteMenor: 2000,
    });
    await comA((db) => reconciliarComProvedor(db, {
      attemptId, autorizadoPor: IDS.utilizadorA, provedor: PROVEDOR }));
    const { rows } = await sql.query(`SELECT id FROM payments WHERE bill_id = $1`, [billId]);
    const { devolver } = await import('../packages/db/src/index.ts');
    const parcial = await comA((db) => devolver(db, {
      paymentId: rows[0].id, montanteMenor: 800, motivo: 'prato devolvido',
      autorizadoPor: IDS.utilizadorA, chaveIdempotente: `${PREFIXO}r1`,
    }));
    assert.equal(parcial.porDevolverMenor, 1200);
    await assert.rejects(
      () => comA((db) => devolver(db, {
        paymentId: rows[0].id, montanteMenor: 1500, motivo: 'de novo',
        autorizadoPor: IDS.utilizadorA, chaveIdempotente: `${PREFIXO}r2`,
      })),
      (e: Error) => e.message.includes('EXCEDE_O_CAPTURADO'));
  });

  it('o acontecimento do adquirente não se apaga nem se edita', async () => {
    const { attemptId, billId } = await contaComTentativa();
    const eventoId = proximo();
    await webhook({
      eventoId, tipo: 'captura', estadoProvedor: 'CAPTURADO',
      ocorridoEm: new Date().toISOString(), attemptId, billId, montanteMenor: 2000,
    });
    await assert.rejects(
      () => sql.query(`DELETE FROM provider_events WHERE evento_id = $1`, [eventoId]),
      (e: Error) => e.message.includes('REGISTO_IMUTAVEL'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5 · o adquirente em baixo, e o restaurante não fecha', () => {
  it('sem acontecimento nenhum, a conta fica INTACTA e diz que não sabe', async () => {
    const { attemptId, billId, montanteMenor } = await contaComTentativa();
    // O adquirente não respondeu: zero webhooks.
    const estado = await comA((db) => estadoAutorizado(db, attemptId));
    assert.equal(estado.estado, 'DESCONHECIDO',
      'sem resposta do adquirente, o sistema decidiu por ele');
    const somas = await comA((db) => somasDaConta(db, billId));
    assert.equal(somas.devidoMenor, montanteMenor, 'o pedido não ficou intacto');
    assert.equal(somas.pagoMenor, 0, 'deu por pago o que não se sabe');
  });

  it('reconciliar sem notícias não inventa pagamento nenhum', async () => {
    const { attemptId } = await contaComTentativa();
    const r = await comA((db) => reconciliarComProvedor(db, {
      attemptId, autorizadoPor: IDS.utilizadorA, provedor: PROVEDOR }));
    assert.equal(r.estado, 'DESCONHECIDO');
    assert.equal(r.criouPagamento, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('6 · a titularidade, e o que não se declara pronto', () => {
  it('um conector não liga sem provedor E merchant — a base recusa', async () => {
    await assert.rejects(() => sql.query(
      `INSERT INTO payment_connectors (id, organization_id, location_id, activo)
       VALUES (gen_random_uuid(), $1, $2, true)`, [IDS.orgA, IDS.unidadeA]),
      'ligou um conector sem titularidade: isso é declarar pagamento real pronto');
  });

  it('e o PAR: com provedor e merchant, liga', async () => {
    await comA((db) => guardarConectorDePagamento(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA,
      provedor: 'sandbox', merchantId: 'acct_prova', activo: true,
    }));
    const c = await comA((db) => conectorDePagamento(db, IDS.unidadeA));
    assert.equal(c?.activo, true);
    assert.equal(c?.merchantId, 'acct_prova');
  });

  it('não há coluna nenhuma para uma chave secreta', async () => {
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'payment_connectors'
          AND (column_name LIKE '%secret%' OR column_name LIKE '%segredo%'
               OR column_name LIKE '%chave%' OR column_name LIKE '%token%')`);
    assert.equal(rows.length, 0,
      'há onde guardar um segredo de adquirente na base: ele vive no ambiente');
  });

  it('a assinatura NÃO fica no corpo guardado', async () => {
    const { attemptId, billId } = await contaComTentativa();
    const eventoId = proximo();
    await webhook({
      eventoId, tipo: 'captura', estadoProvedor: 'CAPTURADO',
      ocorridoEm: new Date().toISOString(), attemptId, billId, montanteMenor: 2000,
    });
    const { rows } = await sql.query(
      `SELECT corpo::text AS c FROM provider_events WHERE evento_id = $1`, [eventoId]);
    assert.ok(!String(rows[0].c).includes(SEGREDO), 'o segredo foi parar ao registo');
    const trilho = await comA((db) => acontecimentosDaConta(db, billId));
    assert.equal(trilho.length, 1);
  });
});

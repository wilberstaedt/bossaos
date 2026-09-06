import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  abrirCaixa, abrirConta, comEscopo, confirmarPagamento, contar, corrigirMovimento,
  entrarPagamentoEmDinheiro, esperadoNaGaveta, estadoDaCaixa, fecharCaixa,
  historicoDeCaixas, movimentar, obterPrisma, rastoDaCaixa, reabrirCaixa,
  RecusaDaCaixa,
  resumoDaCaixa, tentarPagar,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E22 fatia 2 — a caixa é dinheiro real de gente real.
 *
 * ── O caso que interessa ──────────────────────────────────────────────────
 *
 * Não é a caixa que bate. É a que passa a não bater **depois** de assinada:
 * contar, e depois meter dinheiro na gaveta. O movimento é legítimo em tudo o
 * resto, e é por isso que o erro é silencioso.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e22c-';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let n = 0;
const proximo = () => `${PREFIXO}${(n += 1)}`;

async function caixaCom(fundoMenor = 10000) {
  const { id } = await comA((db) => abrirCaixa(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, nome: proximo(),
    moeda: 'EUR', fundoMenor, actor: IDS.utilizadorA,
  }));
  return id;
}

/** Uma conta liquidada em dinheiro, para o pagamento entrar na gaveta. */
async function pagamentoEmDinheiro(montanteMenor: number) {
  const { id: conta } = await comA((db) => abrirConta(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, numero: proximo(), moeda: 'EUR',
  }));
  await sql.query(
    `INSERT INTO bill_lines (id, organization_id, bill_id, nome, quantidade, unitario_menor)
     VALUES (gen_random_uuid(), $1, $2, 'x', 1, $3)`, [IDS.orgA, conta, montanteMenor]);
  const t = await comA((db) => tentarPagar(db, {
    billId: conta, meio: 'DINHEIRO', montanteMenor, chaveIdempotente: proximo(),
  }));
  const { id } = await comA((db) => confirmarPagamento(db, t.id, montanteMenor + 500));
  return id;
}

const COM_GATILHO = ['cash_movements', 'cash_register_events', 'bill_lines',
                     'bill_adjustments', 'payments', 'refunds'];
async function gatilhos(estado: 'DISABLE' | 'ENABLE') {
  for (const t of COM_GATILHO) await sql.query(`ALTER TABLE "${t}" ${estado} TRIGGER USER`);
}

async function limpar() {
  await gatilhos('DISABLE');
  const caixas = `(SELECT id FROM cash_registers WHERE nome LIKE '${PREFIXO}%')`;
  const contas = `(SELECT id FROM bills WHERE numero LIKE '${PREFIXO}%')`;
  await sql.query(`DELETE FROM cash_movements WHERE register_id IN ${caixas}`);
  await sql.query(`DELETE FROM cash_register_events WHERE register_id IN ${caixas}`);
  await sql.query(`DELETE FROM cash_registers WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM payments WHERE bill_id IN ${contas}`);
  await sql.query(`DELETE FROM payment_attempts WHERE bill_id IN ${contas}`);
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
describe('1 · esperado = fundo + entradas − saídas', () => {
  it('a conta bate com os movimentos, e não com um número guardado', async () => {
    const caixa = await caixaCom(10000);
    await comA((db) => movimentar(db, {
      registerId: caixa, tipo: 'ENTRADA', montanteMenor: 2500,
      motivo: 'venda ao balcão', actor: IDS.utilizadorA,
    }));
    await comA((db) => movimentar(db, {
      registerId: caixa, tipo: 'SAIDA', montanteMenor: 700,
      motivo: 'compra de gelo', actor: IDS.utilizadorA,
    }));
    const r = await comA((db) => esperadoNaGaveta(db, caixa));
    assert.equal(r.esperadoMenor, 10000 + 2500 - 700);
  });

  it('a correcção substitui o movimento, e não se soma por cima', async () => {
    const caixa = await caixaCom(0);
    const { id } = await comA((db) => movimentar(db, {
      registerId: caixa, tipo: 'ENTRADA', montanteMenor: 5000,
      motivo: 'engano de dedo', actor: IDS.utilizadorA,
    }));
    await comA((db) => corrigirMovimento(db, {
      movimentoId: id, montanteMenor: 500, motivo: 'eram 5,00 e não 50,00',
      actor: IDS.utilizadorA,
    }));
    const r = await comA((db) => esperadoNaGaveta(db, caixa));
    assert.equal(r.esperadoMenor, 500, 'somou o errado e a correcção');
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM cash_movements WHERE register_id = $1`, [caixa]);
    assert.equal(rows[0].n, 2, 'a correcção apagou o original');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2 · só dinheiro físico entra na gaveta', () => {
  it('um pagamento em dinheiro entra, e entra o COBRADO e não o recebido', async () => {
    const caixa = await caixaCom(0);
    const pagamento = await pagamentoEmDinheiro(1345);
    await comA((db) => entrarPagamentoEmDinheiro(db, {
      registerId: caixa, paymentId: pagamento, actor: IDS.utilizadorA,
    }));
    const r = await comA((db) => esperadoNaGaveta(db, caixa));
    // Recebeu 18,45 e cobrou 13,45: o troco saiu pela mesma gaveta.
    assert.equal(r.esperadoMenor, 1345, 'o troco ficou na gaveta como se fosse venda');
  });

  it('um pagamento com cartão é recusado com nome', async () => {
    const caixa = await caixaCom(0);
    const { id: conta } = await comA((db) => abrirConta(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, numero: proximo(), moeda: 'EUR',
    }));
    await sql.query(
      `INSERT INTO bill_lines (id, organization_id, bill_id, nome, quantidade, unitario_menor)
       VALUES (gen_random_uuid(), $1, $2, 'x', 1, 900)`, [IDS.orgA, conta]);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 900, chaveIdempotente: proximo(),
    }));
    const { id: pagamento } = await comA((db) => confirmarPagamento(db, t.id));
    await assert.rejects(
      () => comA((db) => entrarPagamentoEmDinheiro(db, {
        registerId: caixa, paymentId: pagamento, actor: IDS.utilizadorA,
      })),
      (e: Error) => e.message.includes('PAGAMENTO_NAO_E_DINHEIRO'));
  });

  it('o mesmo pagamento não entra duas vezes na gaveta', async () => {
    const caixa = await caixaCom(0);
    const pagamento = await pagamentoEmDinheiro(1000);
    await comA((db) => entrarPagamentoEmDinheiro(db, {
      registerId: caixa, paymentId: pagamento, actor: IDS.utilizadorA,
    }));
    await assert.rejects(() => comA((db) => entrarPagamentoEmDinheiro(db, {
      registerId: caixa, paymentId: pagamento, actor: IDS.utilizadorA,
    })), 'o mesmo pagamento entrou duas vezes');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3 · a contagem, e a diferença que se deriva', () => {
  it('contar não escreve a diferença: subtrai-se dos movimentos', async () => {
    const caixa = await caixaCom(10000);
    await comA((db) => movimentar(db, {
      registerId: caixa, tipo: 'ENTRADA', montanteMenor: 2000,
      motivo: 'vendas', actor: IDS.utilizadorA,
    }));
    const r = await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 11950, actor: IDS.utilizadorA,
    }));
    assert.equal(r.esperadoMenor, 12000);
    assert.equal(r.diferencaMenor, -50, 'faltam 50 cêntimos e a conta não o diz');
    // E não há coluna nenhuma com a diferença: procura-se e não se encontra.
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name IN ('cash_registers', 'cash_register_events')
          AND column_name LIKE '%diferenc%'`);
    assert.equal(rows.length, 0, 'existe uma coluna de diferença — é editável até dar zero');
  });

  it('o resumo reproduz a ledger, e não um número assinado', async () => {
    const caixa = await caixaCom(5000);
    await comA((db) => movimentar(db, {
      registerId: caixa, tipo: 'SAIDA', montanteMenor: 1500,
      motivo: 'troco para o bar', actor: IDS.utilizadorA,
    }));
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 3500, actor: IDS.utilizadorA,
    }));
    const r = await comA((db) => resumoDaCaixa(db, caixa));
    assert.equal(r.esperadoMenor, 3500);
    assert.equal(r.diferencaMenor, 0);
    assert.equal(r.estado, 'CONTADA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4 · a caixa não fecha em silêncio', () => {
  it('não fecha sem contagem', async () => {
    const caixa = await caixaCom(1000);
    await assert.rejects(
      () => comA((db) => fecharCaixa(db, { registerId: caixa, actor: IDS.utilizadorA })),
      (e: Error) => e.message.includes('SEM_CONTAGEM'));
  });

  it('não fecha com um movimento DEPOIS da contagem — o erro silencioso', async () => {
    const caixa = await caixaCom(1000);
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 1000, actor: IDS.utilizadorA,
    }));
    await comA((db) => movimentar(db, {
      registerId: caixa, tipo: 'ENTRADA', montanteMenor: 300,
      motivo: 'uma venda que entrou depois', actor: IDS.utilizadorA,
    }));
    // ── A autorização vai POSTA, e é o que isola esta guarda ─────────────
    //
    // Sem ela, quem recusa é a guarda da divergência: o contado deixou de bater
    // com o esperado por causa da própria venda. O caso passava a verde a medir
    // outra coisa, e apagar a guarda da contagem velha não o fazia acender —
    // medido a 05/09, com o defeito plantado.
    //
    // Com a divergência autorizada, a única coisa que pode recusar é a contagem
    // já não ser a última palavra.
    await assert.rejects(
      () => comA((db) => fecharCaixa(db, {
        registerId: caixa, actor: IDS.utilizadorA,
        autorizadoPor: IDS.utilizadorAmbas, motivo: 'diferença autorizada',
      })),
      (e: Error) => e.message.includes('CONTAGEM_DESACTUALIZADA'));
  });

  it('não fecha com diferença sem autorização', async () => {
    const caixa = await caixaCom(1000);
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 950, actor: IDS.utilizadorA,
    }));
    await assert.rejects(
      () => comA((db) => fecharCaixa(db, { registerId: caixa, actor: IDS.utilizadorA })),
      (e: Error) => e.message.includes('DIVERGENCIA_SEM_AUTORIZACAO'));
  });

  it('e o PAR: com autorização, fecha — e fica quem autorizou', async () => {
    const caixa = await caixaCom(1000);
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 950, actor: IDS.utilizadorA,
    }));
    const r = await comA((db) => fecharCaixa(db, {
      registerId: caixa, actor: IDS.utilizadorA,
      autorizadoPor: IDS.utilizadorAmbas, motivo: 'nota de 50 cêntimos em falta',
    }));
    assert.equal(r.diferencaMenor, -50);
    const rasto = await comA((db) => rastoDaCaixa(db, caixa));
    const fecho = rasto.find((e) => e.tipo === 'FECHO');
    assert.equal(fecho?.autorizadoPor, IDS.utilizadorAmbas, 'o fecho não diz quem autorizou');
  });

  it('não fecha com uma tentativa de pagamento por reconciliar na unidade', async () => {
    const caixa = await caixaCom(1000);
    const { id: conta } = await comA((db) => abrirConta(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, numero: proximo(), moeda: 'EUR',
    }));
    await sql.query(
      `INSERT INTO bill_lines (id, organization_id, bill_id, nome, quantidade, unitario_menor)
       VALUES (gen_random_uuid(), $1, $2, 'x', 1, 900)`, [IDS.orgA, conta]);
    const t = await comA((db) => tentarPagar(db, {
      billId: conta, meio: 'CARTAO', montanteMenor: 900, chaveIdempotente: proximo(),
    }));
    await sql.query(`UPDATE payment_attempts SET estado = 'INDETERMINADA' WHERE id = $1`, [t.id]);
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 1000, actor: IDS.utilizadorA,
    }));
    await assert.rejects(
      () => comA((db) => fecharCaixa(db, { registerId: caixa, actor: IDS.utilizadorA })),
      (e: Error) => e.message.includes('OPERACOES_PENDENTES'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5 · o rasto não se apaga', () => {
  it('uma caixa fechada não recebe dinheiro — a base recusa', async () => {
    const caixa = await caixaCom(1000);
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 1000, actor: IDS.utilizadorA,
    }));
    await comA((db) => fecharCaixa(db, { registerId: caixa, actor: IDS.utilizadorA }));
    await assert.rejects(
      () => comA((db) => movimentar(db, {
        registerId: caixa, tipo: 'ENTRADA', montanteMenor: 100,
        motivo: 'depois de fechada', actor: IDS.utilizadorA,
      })),
      (e: Error) => e.message.includes('CAIXA_FECHADA'));
  });

  it('um movimento não se edita nem se apaga', async () => {
    const caixa = await caixaCom(0);
    const { id } = await comA((db) => movimentar(db, {
      registerId: caixa, tipo: 'ENTRADA', montanteMenor: 100,
      motivo: 'venda', actor: IDS.utilizadorA,
    }));
    await assert.rejects(
      () => sql.query(`UPDATE cash_movements SET montante_menor = 1 WHERE id = $1`, [id]),
      (e: Error) => e.message.includes('REGISTO_IMUTAVEL'));
    await assert.rejects(
      () => sql.query(`DELETE FROM cash_movements WHERE id = $1`, [id]),
      (e: Error) => e.message.includes('REGISTO_IMUTAVEL'));
  });

  it('um acontecimento de caixa não se apaga: o fecho fica', async () => {
    const caixa = await caixaCom(1000);
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 1000, actor: IDS.utilizadorA,
    }));
    await comA((db) => fecharCaixa(db, { registerId: caixa, actor: IDS.utilizadorA }));
    await assert.rejects(
      () => sql.query(
        `DELETE FROM cash_register_events WHERE register_id = $1 AND tipo = 'FECHO'`, [caixa]),
      (e: Error) => e.message.includes('REGISTO_IMUTAVEL'));
  });

  it('reabrir exige motivo, e fica no rasto', async () => {
    const caixa = await caixaCom(1000);
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 1000, actor: IDS.utilizadorA,
    }));
    await comA((db) => fecharCaixa(db, { registerId: caixa, actor: IDS.utilizadorA }));
    await comA((db) => reabrirCaixa(db, {
      registerId: caixa, actor: IDS.utilizadorA, motivo: 'faltou lançar a saída do gelo',
    }));
    assert.equal(await comA((db) => estadoDaCaixa(db, caixa)), 'ABERTA');
    const rasto = await comA((db) => rastoDaCaixa(db, caixa));
    assert.deepEqual(rasto.map((e) => e.tipo),
      ['ABERTURA', 'CONTAGEM', 'FECHO', 'REABERTURA']);
  });

  it('reabrir sem motivo é recusado pela base', async () => {
    const caixa = await caixaCom(1000);
    await assert.rejects(() => sql.query(
      `INSERT INTO cash_register_events (id, organization_id, register_id, tipo, actor, motivo)
       VALUES (gen_random_uuid(), $1, $2, 'REABERTURA', $3, '  ')`,
      [IDS.orgA, caixa, IDS.utilizadorA]));
  });

  it('e depois de reabrir, o dinheiro volta a entrar', async () => {
    const caixa = await caixaCom(1000);
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 1000, actor: IDS.utilizadorA,
    }));
    await comA((db) => fecharCaixa(db, { registerId: caixa, actor: IDS.utilizadorA }));
    await comA((db) => reabrirCaixa(db, {
      registerId: caixa, actor: IDS.utilizadorA, motivo: 'faltou uma saída',
    }));
    const r = await comA((db) => movimentar(db, {
      registerId: caixa, tipo: 'SAIDA', montanteMenor: 200,
      motivo: 'gelo', actor: IDS.utilizadorA,
    }));
    assert.equal(r.esperadoMenor, 800);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('6 · o histórico mostra o que aconteceu', () => {
  it('lista as caixas da unidade com o que cada uma deu', async () => {
    const a = await caixaCom(1000);
    await comA((db) => contar(db, { registerId: a, contadoMenor: 1000, actor: IDS.utilizadorA }));
    await comA((db) => fecharCaixa(db, { registerId: a, actor: IDS.utilizadorA }));
    const b = await caixaCom(2000);
    const lista = await comA((db) => historicoDeCaixas(db, IDS.unidadeA));
    const daProva = lista.filter((c) => c.nome.startsWith(PREFIXO));
    assert.equal(daProva.length, 2);
    assert.equal(daProva.find((c) => c.id === a)?.estado, 'FECHADA');
    assert.equal(daProva.find((c) => c.id === b)?.estado, 'ABERTA');
    assert.equal(daProva.find((c) => c.id === b)?.contadoMenor, null,
      'uma caixa por contar não pode mostrar um contado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('7 · dois fechos ao MESMO TEMPO — e a base não os impede', () => {
  /**
   * ── Porque é que isto é dinheiro e não arrumação ────────────────────────
   *
   * Dois fechos são **duas contagens** e, pior, **duas decisões de autorização
   * de divergência tomadas em separado**. Ao fim de um serviço com dois
   * operadores — ou um duplo toque no mesmo botão — a caixa fecha duas vezes e
   * cada fecho carrega o seu `autorizadoPor`. Quem depois lê o rasto não
   * consegue dizer qual das duas contagens foi a boa.
   *
   * ── E prova-se com Promise.all, nunca com dois `await` seguidos ─────────
   *
   * Dois `await` medem SEQUÊNCIA: o segundo pedido vê o primeiro já gravado, e
   * passa numa implementação que só faz `SELECT` antes do `INSERT` — que é
   * exactamente a que temos. Uma corrida com a janela estreita passa a maior
   * parte das vezes, e um defeito que falha em 1 de 50 é mais caro do que um
   * que falha sempre.
   */
  async function caixaProntaAFechar() {
    const caixa = await caixaCom(1000);
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 1000, actor: IDS.utilizadorA,
    }));
    return caixa;
  }

  const fechosNaBase = async (caixa: string) => (await sql.query(
    `SELECT count(*)::int AS n FROM cash_register_events
      WHERE register_id = $1 AND tipo = 'FECHO'`, [caixa])).rows[0].n as number;

  /**
   * ── E o `Promise.all` sozinho NÃO chega ─────────────────────────────────
   *
   * A primeira versão desta prova era `Promise.allSettled([fechar(), fechar()])`
   * e **passou** — com o defeito lá. Medi porquê com uma sonda à parte: as duas
   * transacções abriram em `pid`s diferentes e sobrepostas, e gravaram **dois**
   * FECHOS. No teste, a primeira acabava antes de a segunda abrir a transacção,
   * porque abrir uma transacção interactiva é ela própria uma ida à base.
   *
   * Ou seja: `Promise.all` mede intenção de concorrência, e o que sai é
   * sequência quando calha. Um verde por temporização é pior do que nenhum
   * teste — diz que está protegido.
   *
   * O encontro torna a corrida DETERMINISTA: as duas transacções estão abertas
   * antes de qualquer uma ler o estado, que é o que «ao mesmo tempo» quer dizer
   * quando dois operadores carregam no botão.
   */
  function encontro(quantos: number) {
    let chegaram = 0;
    let abrir!: () => void;
    const porta = new Promise<void>((r) => { abrir = r; });
    return async () => {
      chegaram += 1;
      if (chegaram === quantos) abrir();
      await porta;
    };
  }

  it('dois fechos concorrentes da mesma caixa dão UM evento de FECHO', async () => {
    const caixa = await caixaProntaAFechar();
    const juntos = encontro(2);
    const fechar = () => comEscopo(prisma, ESCOPO, async (db) => {
      // Força a transacção a existir de facto antes do encontro: sem isto, a
      // espera acontecia antes de haver ligação e as duas continuavam a
      // serializar-se na aquisição.
      await db.$queryRaw`SELECT 1`;
      await juntos();
      return fecharCaixa(db, { registerId: caixa, actor: IDS.utilizadorA });
    });

    const saidas = await Promise.allSettled([fechar(), fechar()]);
    const boas = saidas.filter((s) => s.status === 'fulfilled');
    const mas = saidas.filter((s) => s.status === 'rejected');

    // ── A asserção que manda é a da BASE, e não a contagem de rejeições ───
    //
    // O que estraga o dinheiro são dois eventos de FECHO gravados. Contar
    // promessas mede o que o motor devolveu; contar linhas mede o que ficou.
    assert.equal(await fechosNaBase(caixa), 1,
      'a caixa fechou duas vezes: duas contagens e duas autorizações no rasto');
    assert.equal(boas.length, 1, 'as duas passaram');
    assert.equal(mas.length, 1, 'nenhuma recusou');

    // ── E contar rejeições não chega: é preciso saber PORQUÊ ──────────────
    //
    // A lição do E24: com `Serializable` a segunda também cai, mas com um
    // `40001` — um erro sobre a base e não sobre o negócio. O caso ficava verde
    // sem nunca tocar na regra da caixa.
    //
    // Aqui é a mesma família e MEDIDA: sem a tranca no `fecharCaixa`, o gatilho
    // sozinho segura o dinheiro na mesma (um único FECHO), mas quem perde a
    // corrida recebe `PrismaClientKnownRequestError` com `23514` e a mensagem
    // embrulhada. A caixa fica certa e **o ecrã fica errado**: o operador que
    // carregou ao mesmo tempo vê um erro de sistema em vez de «a caixa já está
    // fechada». Por isso a asserção é sobre a CLASSE e não sobre o texto.
    const razao = (mas[0] as PromiseRejectedResult).reason;
    assert.ok(razao instanceof RecusaDaCaixa,
      `a recusa não foi de negócio, foi ${(razao as Error)?.constructor?.name}: `
      + `«${String((razao as Error)?.message).replace(/\s+/g, ' ').slice(0, 90)}»`);
    assert.equal((razao as RecusaDaCaixa).motivo, 'CAIXA_FECHADA');
  });

  it('E A SONDA QUE TEM DE PASSAR: um fecho sozinho continua a fechar', async () => {
    // Sem este par, uma cura que recusasse SEMPRE passava o caso de cima.
    const caixa = await caixaProntaAFechar();
    const r = await comA((db) => fecharCaixa(db, {
      registerId: caixa, actor: IDS.utilizadorA,
    }));
    assert.equal(r.diferencaMenor, 0);
    assert.equal(await fechosNaBase(caixa), 1);
    assert.equal(await comA((db) => estadoDaCaixa(db, caixa)), 'FECHADA');
  });

  it('e a divergência autorizada continua a passar, uma única vez', async () => {
    // O caminho que carrega a decisão humana é o que não pode partir-se com a
    // cura: é aqui que vive o `autorizadoPor`.
    const caixa = await caixaCom(1000);
    await comA((db) => contar(db, {
      registerId: caixa, contadoMenor: 900, actor: IDS.utilizadorA,
    }));
    const r = await comA((db) => fecharCaixa(db, {
      registerId: caixa, actor: IDS.utilizadorA,
      autorizadoPor: IDS.utilizadorA, motivo: 'falta de troco',
    }));
    assert.equal(r.diferencaMenor, -100);
    assert.equal(await fechosNaBase(caixa), 1);
  });
});

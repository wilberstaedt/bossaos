import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  cancelarLinha, comEscopo, criarTarefasDasLinhas, cursorActual, enviarPedido,
  estacoesParaProduto, estadoDerivado, eventosDesde, guardarEstacao, guardarRegra,
  obterPrisma, priorizarTarefa, tarefasDaEstacao, transitarTarefa,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E16 — produção, estações e KDS, medido na base.
 *
 * ── O que o contrato diz que uma prova destas TEM de fazer ────────────────
 *
 * *«Uma prova em que todas as linhas têm exactamente uma tarefa não distingue
 * este modelo do ingénuo.»* Os quatro casos abaixo são os que ele numera, e o
 * primeiro é o que parte o modelo «uma linha, uma estação» — o que se escreve
 * primeiro e passa em quase todos os testes.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e16-';
const ACTOR = { email: 'prova-e16@bossaos.example' };
const CATEGORIA = 'e16a1111-0000-4000-8000-0000000000c1';
/** Precisa de DUAS estações: grelha e fritadeira. É o caso que decide o modelo. */
const HAMBURGUER = 'e16a1111-0000-4000-8000-00000000f1a1';
/** Uma estação só — a maioria dos pratos é assim, e é por isso que engana. */
const SOPA = 'e16a1111-0000-4000-8000-00000000f1a2';
/** Sem regra nenhuma: tem de aparecer como NÃO ENCAMINHADO. */
const ORFAO = 'e16a1111-0000-4000-8000-00000000f1a3';
const PRECO = 1000;

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA }, fn);

let grelha = '';
let fritadeira = '';

async function semear() {
  await sql.query(
    `INSERT INTO categories (id, organization_id, brand_id, nome, ordem, updated_at)
     VALUES ($1, $2, $3, $4, 1, now()) ON CONFLICT (id) DO NOTHING`,
    [CATEGORIA, IDS.orgA, IDS.marcaA, `${PREFIXO}Principais`]);
  for (const [id, nome] of [
    [HAMBURGUER, 'Hamburguer com batata'], [SOPA, 'Sopa do dia'], [ORFAO, 'Prato sem estacao'],
  ] as const) {
    await sql.query(
      `INSERT INTO products (id, organization_id, brand_id, category_id, nome, estado, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVO', now())
       ON CONFLICT (id) DO UPDATE SET estado = 'ACTIVO', updated_at = now()`,
      [id, IDS.orgA, IDS.marcaA, CATEGORIA, `${PREFIXO}${nome}`]);
    await sql.query(
      `INSERT INTO price_rules (id, organization_id, product_id, montante_menor, moeda, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'EUR', now())`,
      [IDS.orgA, id, PRECO]);
  }

  const estacoes = await comA(async (db) => {
    const g = await guardarEstacao(db, IDS.orgA, {
      locationId: IDS.unidadeA, nome: `${PREFIXO}Grelha`, ordem: 1, limiteVisivel: 3,
    });
    const f = await guardarEstacao(db, IDS.orgA, {
      locationId: IDS.unidadeA, nome: `${PREFIXO}Fritadeira`, ordem: 2,
    });
    if (!g.ok || !f.ok) throw new Error('nao criei as estacoes');

    // O hambúrguer alcança as DUAS: uma regra de produto por cada. É a única
    // forma de o modelo ingénuo — uma linha, uma estação — ficar vermelho.
    await guardarRegra(db, IDS.orgA,
      { locationId: IDS.unidadeA, stationId: g.id, productId: HAMBURGUER });
    await guardarRegra(db, IDS.orgA,
      { locationId: IDS.unidadeA, stationId: f.id, productId: HAMBURGUER });
    // A sopa vai só à grelha (a cozinha quente).
    await guardarRegra(db, IDS.orgA,
      { locationId: IDS.unidadeA, stationId: g.id, productId: SOPA });
    return { g: g.id, f: f.id };
  });
  grelha = estacoes.g;
  fritadeira = estacoes.f;
}

async function limpar() {
  await sql.query(`DELETE FROM production_events WHERE actor_email LIKE '%@bossaos.example'`);
  await sql.query(
    `DELETE FROM production_tasks WHERE order_id IN
       (SELECT id FROM orders WHERE aberto_por LIKE '%@bossaos.example')`);
  await sql.query(`DELETE FROM production_events WHERE order_id IN
       (SELECT id FROM orders WHERE aberto_por LIKE '%@bossaos.example')`);
  await sql.query(`DELETE FROM order_events WHERE order_id IN
       (SELECT id FROM orders WHERE aberto_por LIKE '%@bossaos.example')`);
  await sql.query(`DELETE FROM order_lines WHERE order_id IN
       (SELECT id FROM orders WHERE aberto_por LIKE '%@bossaos.example')`);
  await sql.query(`DELETE FROM order_submissions WHERE order_id IN
       (SELECT id FROM orders WHERE aberto_por LIKE '%@bossaos.example')`);
  await sql.query(`DELETE FROM orders WHERE aberto_por LIKE '%@bossaos.example'`);
  await sql.query(`DELETE FROM outbox_tasks WHERE tipo = 'pedido.entregar'`);
  await sql.query(`DELETE FROM routing_rules WHERE station_id IN
       (SELECT id FROM production_stations WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM production_stations WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM price_rules WHERE product_id IN ($1, $2, $3)`,
    [HAMBURGUER, SOPA, ORFAO]);
  await sql.query(`DELETE FROM products WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM categories WHERE nome LIKE '${PREFIXO}%'`);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});
after(async () => {
  await limpar();
  await sql.end();
  await prisma.$disconnect();
});
beforeEach(async () => {
  await limpar();
  await semear();
});

/** Envia um pedido e devolve o `orderId`. */
async function enviar(linhas: { productId: string; quantidade: number }[], chave: string) {
  const r = await enviarPedido(prisma, IDS.orgA, {
    commandId: `${PREFIXO}${chave}`, locationId: IDS.unidadeA, canal: 'SALA',
    linhas, actor: ACTOR,
  });
  assert.ok(r.ok, `o envio falhou: ${JSON.stringify(r)}`);
  return r.orderId;
}

// ═══════════════════════════════════════════════════════════════════════════
describe('1. uma linha com tarefas em DUAS estações', () => {
  it('o cenário não está vazio: há duas estações e três regras', async () => {
    // «Verde sobre fila vazia» é o primeiro item do que a régua reprova. Antes
    // de afirmar seja o que for, declara-se a população.
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM routing_rules WHERE station_id IN
         (SELECT id FROM production_stations WHERE nome LIKE '${PREFIXO}%')`);
    assert.equal(rows[0].n, 3, 'sem regras não há roteamento para medir');
    assert.notEqual(grelha, fritadeira);
  });

  it('o hambúrguer gera DUAS tarefas, e as duas estações vêem-no', async () => {
    // É o caso que parte o modelo ingénuo. Com «uma linha, uma estação», a
    // fritadeira nunca via a batata — e o defeito não dá erro: dá comida em
    // falta, descoberta pelo cliente.
    const orderId = await enviar([{ productId: HAMBURGUER, quantidade: 1 }], 'duas');

    const { naGrelha, naFritadeira } = await comA(async (db) => ({
      naGrelha: await tarefasDaEstacao(db, IDS.unidadeA, grelha),
      naFritadeira: await tarefasDaEstacao(db, IDS.unidadeA, fritadeira),
    }));

    assert.equal(naGrelha.length, 1, 'a grelha não viu o hambúrguer');
    assert.equal(naFritadeira.length, 1, 'a fritadeira não viu o hambúrguer');
    // E é a MESMA linha do mesmo pedido, vista de dois sítios — não duas linhas.
    assert.equal(naGrelha[0]!.lineId, naFritadeira[0]!.lineId);
    assert.equal(naGrelha[0]!.orderId, orderId);
  });

  it('e a resolução de estações devolve as duas, sem repetidas', async () => {
    const estacoes = await comA((db) =>
      estacoesParaProduto(db, IDS.unidadeA, { id: HAMBURGUER, categoryId: CATEGORIA }));
    assert.equal(estacoes.length, 2);
    assert.equal(new Set(estacoes).size, 2, 'a mesma estação apareceu duas vezes');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. uma estação NÃO vê o que não é dela', () => {
  it('a sopa vai só à grelha — e é a CONSULTA que o diz, não o ecrã', async () => {
    // *«Não é filtragem no ecrã: é o que a consulta devolve. Se a linha chega ao
    // ecrã e é escondida por CSS, chegou.»*
    await enviar([{ productId: SOPA, quantidade: 1 }], 'sopa');

    const { naGrelha, naFritadeira } = await comA(async (db) => ({
      naGrelha: await tarefasDaEstacao(db, IDS.unidadeA, grelha),
      naFritadeira: await tarefasDaEstacao(db, IDS.unidadeA, fritadeira),
    }));
    assert.equal(naGrelha.length, 1);
    assert.equal(naFritadeira.length, 0, 'a fritadeira recebeu uma sopa');
  });

  it('O PAR: com a mesma consulta, a grelha VÊ o que é dela', async () => {
    // Sem isto, o caso acima passava com uma consulta que não devolve nada — e
    // uma consulta que não devolve nada também «não mostra o que não é dela».
    await enviar([{ productId: SOPA, quantidade: 1 }], 'sopa-par');
    const naGrelha = await comA((db) => tarefasDaEstacao(db, IDS.unidadeA, grelha));
    assert.equal(naGrelha.length, 1);
    assert.match(naGrelha[0]!.linha.nome, /Sopa/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. PRONTO só quando a última estação acaba', () => {
  it('com a penúltima pronta, o pedido AINDA NÃO está', async () => {
    // «Uma mesa com três pratos em que dois estão prontos é uma mesa que ainda
    // não sai — e mostrar "pronto" ali faz sair comida fria.»
    const orderId = await enviar([{ productId: HAMBURGUER, quantidade: 1 }], 'parcial');
    const tarefas = await comA((db) =>
      db.productionTask.findMany({ where: { orderId }, select: { id: true, estado: true } }));
    assert.equal(tarefas.length, 2, 'o cenário precisa de duas tarefas para medir isto');

    await comA(async (db) => {
      await transitarTarefa(db, IDS.orgA, { taskId: tarefas[0]!.id, para: 'EM_PREPARO', actor: ACTOR });
      await transitarTarefa(db, IDS.orgA, { taskId: tarefas[0]!.id, para: 'PRONTA', actor: ACTOR });
    });

    const meio = await comA((db) =>
      db.productionTask.findMany({ where: { orderId }, select: { estado: true } }));
    const derivadoParcial = estadoDerivado(meio);
    assert.equal(derivadoParcial?.estado, 'EM_PREPARO', 'o pedido ficou PRONTO com metade feita');
    assert.equal(derivadoParcial?.prontas, 1);
    assert.equal(derivadoParcial?.total, 2);

    // ── E o PAR: com a última também pronta, aí sim ─────────────────────
    await comA(async (db) => {
      await transitarTarefa(db, IDS.orgA, { taskId: tarefas[1]!.id, para: 'EM_PREPARO', actor: ACTOR });
      await transitarTarefa(db, IDS.orgA, { taskId: tarefas[1]!.id, para: 'PRONTA', actor: ACTOR });
    });
    const fim = await comA((db) =>
      db.productionTask.findMany({ where: { orderId }, select: { estado: true } }));
    assert.equal(estadoDerivado(fim)?.estado, 'PRONTO');
  });

  it('e o estado de produção NÃO se escreve no pedido — a base recusa', async () => {
    // Invariante 2 do contrato, garantido pela forma e não pelo cuidado de quem
    // escreve. Sem isto, alguém punha `PRONTO` à mão e criava a segunda verdade.
    const orderId = await enviar([{ productId: SOPA, quantidade: 1 }], 'escrita');
    await assert.rejects(
      () => sql.query(`UPDATE orders SET estado = 'PRONTO' WHERE id = $1`, [orderId]),
      /estado_de_producao_e_derivado/,
      'a base deixou escrever um estado de produção no pedido');

    // O PAR: um estado COMERCIAL continua a passar. Sem ele, isto passava com um
    // gatilho que recusasse tudo.
    await sql.query(`UPDATE orders SET estado = 'ENTREGUE' WHERE id = $1`, [orderId]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. item sem regra aparece como NÃO ENCAMINHADO', () => {
  it('gera uma tarefa SEM estação, e não zero tarefas', async () => {
    // «Ausência de regra não é *cozinha por omissão*.» Zero tarefas fazia o
    // trabalho desaparecer em silêncio; uma tarefa sem estação diz o que é —
    // há trabalho, e ninguém foi avisado.
    const orderId = await enviar([{ productId: ORFAO, quantidade: 1 }], 'orfao');
    const tarefas = await comA((db) =>
      db.productionTask.findMany({ where: { orderId }, select: { stationId: true } }));

    assert.equal(tarefas.length, 1, 'o item sem regra não gerou tarefa nenhuma');
    assert.equal(tarefas[0]!.stationId, null, 'foi para uma estação qualquer');
  });

  it('e NÃO aparece em estação nenhuma', async () => {
    await enviar([{ productId: ORFAO, quantidade: 1 }], 'orfao2');
    const { naGrelha, naFritadeira, semEstacao } = await comA(async (db) => ({
      naGrelha: await tarefasDaEstacao(db, IDS.unidadeA, grelha),
      naFritadeira: await tarefasDaEstacao(db, IDS.unidadeA, fritadeira),
      semEstacao: await tarefasDaEstacao(db, IDS.unidadeA, null),
    }));
    assert.equal(naGrelha.length, 0);
    assert.equal(naFritadeira.length, 0);
    // Visível a quem configura, que é o ponto inteiro.
    assert.equal(semEstacao.length, 1);
  });

  it('e não se pode começar o que ninguém foi mandado fazer', async () => {
    const orderId = await enviar([{ productId: ORFAO, quantidade: 1 }], 'orfao3');
    const tarefa = await comA((db) =>
      db.productionTask.findFirst({ where: { orderId }, select: { id: true } }));
    const r = await comA((db) =>
      transitarTarefa(db, IDS.orgA, { taskId: tarefa!.id, para: 'EM_PREPARO', actor: ACTOR }));
    assert.equal(r.ok, false);
    assert.equal(r.ok === false ? r.motivo : '', 'nao_encaminhada');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('cancelar uma linha cancela as tarefas em TODAS as estações', () => {
  it('as duas tarefas do hambúrguer ficam canceladas', async () => {
    // «Uma tarefa órfã numa estação é comida a ser feita para um pedido que já
    // não existe» — e a cozinha não tem como saber, porque do lado dela nada
    // mudou.
    const orderId = await enviar([{ productId: HAMBURGUER, quantidade: 1 }], 'cancelar');
    const linha = await comA((db) =>
      db.orderLine.findFirst({ where: { orderId }, select: { id: true } }));

    const r = await comA((db) => cancelarLinha(db, IDS.orgA, linha!.id, ACTOR));
    assert.ok(r.ok);
    assert.equal(r.ok ? r.tarefasCanceladas : 0, 2, 'ficou uma tarefa órfã numa estação');

    const vivas = await comA((db) => tarefasDaEstacao(db, IDS.unidadeA, grelha));
    assert.equal(vivas.length, 0);
  });

  it('cancelar o que já está EM PREPARAÇÃO exige motivo', async () => {
    // «O produto já foi consumido em tempo e em ingredientes, e isso tem de ficar
    // registado.»
    const orderId = await enviar([{ productId: SOPA, quantidade: 1 }], 'motivo');
    const tarefa = await comA((db) =>
      db.productionTask.findFirst({ where: { orderId }, select: { id: true } }));
    await comA((db) =>
      transitarTarefa(db, IDS.orgA, { taskId: tarefa!.id, para: 'EM_PREPARO', actor: ACTOR }));
    const linha = await comA((db) =>
      db.orderLine.findFirst({ where: { orderId }, select: { id: true } }));

    const semMotivo = await comA((db) => cancelarLinha(db, IDS.orgA, linha!.id, ACTOR));
    assert.equal(semMotivo.ok, false);
    assert.equal(semMotivo.ok === false ? semMotivo.motivo : '', 'sem_motivo');

    // O PAR: com motivo, passa — e o motivo fica registado.
    const comMotivo = await comA((db) =>
      cancelarLinha(db, IDS.orgA, linha!.id, ACTOR, 'o cliente mudou de ideias'));
    assert.ok(comMotivo.ok);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('o cursor e a versão, do lado do servidor', () => {
  it('cada transição escreve UM evento, com a versão que ficou', async () => {
    const orderId = await enviar([{ productId: SOPA, quantidade: 1 }], 'cursor');
    const antes = await comA((db) => cursorActual(db, IDS.unidadeA));
    const tarefa = await comA((db) =>
      db.productionTask.findFirst({ where: { orderId }, select: { id: true, versao: true } }));

    await comA((db) =>
      transitarTarefa(db, IDS.orgA, { taskId: tarefa!.id, para: 'EM_PREPARO', actor: ACTOR }));
    await comA((db) =>
      transitarTarefa(db, IDS.orgA, { taskId: tarefa!.id, para: 'PRONTA', actor: ACTOR }));

    const eventos = await comA((db) => eventosDesde(db, IDS.unidadeA, antes));
    assert.equal(eventos.length, 2, 'as transições não deixaram dois eventos');
    // O cursor é monótono: é uma sequência da base, não um relógio.
    assert.ok(eventos[1]!.cursor > eventos[0]!.cursor);
    // E a versão sobe com ele.
    assert.equal(eventos[0]!.versao, tarefa!.versao + 1);
    assert.equal(eventos[1]!.versao, tarefa!.versao + 2);
  });

  it('a base recusa uma versão que RETROCEDA', async () => {
    // A metade da garantia que vive na base, e vale mesmo quando quem escreve se
    // engana. A outra metade — o cliente a descartar o evento atrasado — está
    // provada em `packages/domain/src/kds.test.ts`, e falha por outro motivo.
    const orderId = await enviar([{ productId: SOPA, quantidade: 1 }], 'versao');
    const tarefa = await comA((db) =>
      db.productionTask.findFirst({ where: { orderId }, select: { id: true, versao: true } }));
    await comA((db) =>
      transitarTarefa(db, IDS.orgA, { taskId: tarefa!.id, para: 'EM_PREPARO', actor: ACTOR }));

    await assert.rejects(
      () => sql.query(`UPDATE production_tasks SET versao = 1 WHERE id = $1`, [tarefa!.id]),
      /versao_regrediu/,
      'a base deixou a versão de uma tarefa andar para trás');
  });

  it('priorizar EXIGE motivo', async () => {
    // Uma prioridade sem razão é uma decisão que ninguém consegue rever depois
    // do turno — e a fila do KDS é onde as decisões de quem grita mais alto se
    // disfarçam de decisões do sistema.
    const orderId = await enviar([{ productId: SOPA, quantidade: 1 }], 'prio');
    const tarefa = await comA((db) =>
      db.productionTask.findFirst({ where: { orderId }, select: { id: true } }));

    const sem = await comA((db) =>
      priorizarTarefa(db, IDS.orgA, { taskId: tarefa!.id, prioridade: 5, motivo: '  ', actor: ACTOR }));
    assert.equal(sem.ok, false);

    const com = await comA((db) => priorizarTarefa(db, IDS.orgA,
      { taskId: tarefa!.id, prioridade: 5, motivo: 'alergia na mesa 4', actor: ACTOR }));
    assert.ok(com.ok);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('o backlog não perde nada por falta de espaço', () => {
  it('mais bilhetes do que o limite visível: a CONSULTA devolve todos', async () => {
    // O erro concreto que isto previne: o KDS mostra doze, chegam vinte, e os
    // oito de baixo desaparecem em vez de ficarem alcançáveis. A estação de
    // prova tem limite 3, e mandam-se 5.
    const QUANTOS = 5;
    for (let i = 0; i < QUANTOS; i += 1) {
      await enviar([{ productId: SOPA, quantidade: 1 }], `backlog-${i}`);
    }
    const naBase = await comA((db) =>
      db.productionTask.count({ where: { locationId: IDS.unidadeA, stationId: grelha } }));
    const naConsulta = await comA((db) => tarefasDaEstacao(db, IDS.unidadeA, grelha));

    // Os DOIS números, ditos em voz alta — é o que a régua exige.
    assert.equal(naBase, QUANTOS, `a base tem ${naBase} e mandaram-se ${QUANTOS}`);
    assert.equal(naConsulta.length, QUANTOS,
      `a consulta devolveu ${naConsulta.length} de ${QUANTOS}: o limite visível entrou na fila`);

    // E o limite da estação existe mesmo — senão isto media uma estação sem
    // limite nenhum e não provava nada.
    const estacao = await comA((db) =>
      db.productionStation.findFirst({ where: { id: grelha }, select: { limiteVisivel: true } }));
    assert.equal(estacao!.limiteVisivel, 3);
    assert.ok(QUANTOS > estacao!.limiteVisivel, 'o cenário não excede o limite: não mede nada');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('reenviar o mesmo comando não duplica trabalho na cozinha', () => {
  it('a segunda passagem não cria tarefas novas', async () => {
    const orderId = await enviar([{ productId: HAMBURGUER, quantidade: 1 }], 'idem');
    const antes = await comA((db) => db.productionTask.count({ where: { orderId } }));
    assert.equal(antes, 2);

    await comA((db) => criarTarefasDasLinhas(db, IDS.orgA, {
      locationId: IDS.unidadeA, orderId, actor: ACTOR,
    }));
    const depois = await comA((db) => db.productionTask.count({ where: { orderId } }));
    assert.equal(depois, 2, 'a cozinha ficou com trabalho a dobrar');
  });
});

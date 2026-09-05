import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  agendadosEmRisco, agendadosPorEntrar, agendarPedido, areaQueServe, comEscopo,
  conectorDeEntrega, guardarArea, guardarConectorDeEntrega, guardarMapaExterno,
  marcarParaEntrega, obterPrisma, preparoDoPedido, receberPedidoExterno,
  tarefasDaEstacao,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E20 — um pedido para as 20h não é trabalho para agora.
 *
 * ── A armadilha que a régua nomeia, e onde ela está aqui ──────────────────
 *
 * *«A prova do momento de produção medida só em minutos relativos. "Entra 25
 * minutos antes" é verdade em qualquer fuso e não prova nada. Exijo a hora
 * ABSOLUTA verificada contra o relógio da base.»*
 *
 * Por isso o grupo 1 não subtrai minutos a nada: pergunta à base qual é o
 * instante das 20h30 em Madrid, e afirma que o momento de produção é esse
 * instante menos 25 minutos — em UTC, comparado com o que ficou gravado. E o par
 * fecha-o: a mesma hora de entrega em dois fusos tem de dar momentos
 * **diferentes**.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e20-';
const ACTOR = 'e20@inspeccao.example';
const ESCOPO = { organizationId: IDS.orgA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let produtoId = '';
let produtoRapidoId = '';
let estacaoId = '';

const DIA = '2027-04-15';
const HORA = '20:30';
const PREPARO = 25;

async function semear(fuso = 'Europe/Madrid') {
  await sql.query(`UPDATE locations SET fuso = $1 WHERE id = $2`, [fuso, IDS.unidadeA]);
  const { rows: c } = await sql.query(
    `INSERT INTO categories (id, organization_id, brand_id, nome, ordem, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 1, now()) RETURNING id`,
    [IDS.orgA, IDS.marcaA, `${PREFIXO}Cat`]);
  const { rows: p } = await sql.query(
    `INSERT INTO products (id, organization_id, brand_id, category_id, nome, estado, preparo_min, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'ACTIVO', $5, now()),
            (gen_random_uuid(), $1, $2, $3, $6, 'ACTIVO', 5, now())
     RETURNING id, nome`,
    [IDS.orgA, IDS.marcaA, c[0].id, `${PREFIXO}Bife`, PREPARO, `${PREFIXO}Sopa`]);
  produtoId = p.find((r: { nome: string }) => r.nome.endsWith('Bife')).id;
  produtoRapidoId = p.find((r: { nome: string }) => r.nome.endsWith('Sopa')).id;

  const { rows: e } = await sql.query(
    `INSERT INTO production_stations (id, organization_id, location_id, nome, tipo, ordem, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'PREPARACAO', 1, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, `${PREFIXO}Cozinha`]);
  estacaoId = e[0].id;
}

let n = 0;
/** Um pedido aceite, com uma linha do produto dado. */
async function pedidoCom(productId: string, comTarefa = true) {
  const { rows: o } = await sql.query(
    `INSERT INTO orders (id, organization_id, location_id, canal, numero, estado, aberto_por, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'TAKEAWAY', $3, 'ACEITE', $4, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, `${PREFIXO}${(n += 1)}`, ACTOR]);
  const { rows: l } = await sql.query(
    `INSERT INTO order_lines (id, organization_id, order_id, product_id, nome, quantidade,
       preco_menor, moeda, estado, aceite_em, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 1, 1000, 'EUR', 'ACEITE', now(), now())
     RETURNING id`,
    [IDS.orgA, o[0].id, productId, `${PREFIXO}linha`]);
  if (comTarefa) {
    await sql.query(
      `INSERT INTO production_tasks (id, organization_id, location_id, order_id, line_id,
         station_id, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'POR_INICIAR', now())`,
      [IDS.orgA, IDS.unidadeA, o[0].id, l[0].id, estacaoId]);
  }
  return o[0].id as string;
}

async function limpar() {
  const pedidos = `(SELECT id FROM orders WHERE aberto_por = '${ACTOR}')`;
  await sql.query(`DELETE FROM production_tasks WHERE order_id IN ${pedidos}`);
  await sql.query(`DELETE FROM order_deliveries WHERE order_id IN ${pedidos}`);
  await sql.query(`DELETE FROM order_lines WHERE order_id IN ${pedidos}`);
  await sql.query(`DELETE FROM orders WHERE aberto_por = '${ACTOR}'`);
  await sql.query(`DELETE FROM production_stations WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM external_catalog_mappings WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM delivery_connectors WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM delivery_areas WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM product_availability WHERE product_id IN
     (SELECT id FROM products WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM products WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM categories WHERE nome LIKE '${PREFIXO}%'`);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});
after(async () => { await limpar(); await sql.end(); await prisma.$disconnect(); });
beforeEach(async () => { await limpar(); await semear(); });

/** O instante que a BASE diz ser aquela hora local naquele fuso. */
async function instanteDaBase(fuso: string, local: string): Promise<Date> {
  const { rows } = await sql.query(
    `SELECT instante FROM instante_local($1, $2::timestamp)`, [fuso, local]);
  return new Date(rows[0].instante);
}

// ═══════════════════════════════════════════════════════════════════════════
describe('1. O momento de produção, em hora ABSOLUTA', () => {
  it('o preparo do pedido é o MAIOR das linhas, e não a soma', async () => {
    // ── Tem de haver DUAS linhas, senão máximo e soma são o mesmo ───────
    //
    // Escrevi isto primeiro com uma linha só: 25 é o máximo e é a soma, e a
    // asserção não distinguia nada. O controlo negativo só acendia porque eu
    // tinha somado dez ao plante — ou seja, media «o número mudou», e não «é o
    // máximo».
    //
    // Com 25 e 5: o máximo é 25, a soma é 30, e a asserção separa-os.
    const id = await pedidoCom(produtoId, false);
    await sql.query(
      `INSERT INTO order_lines (id, organization_id, order_id, product_id, nome, quantidade,
         preco_menor, moeda, estado, aceite_em, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 1, 500, 'EUR', 'ACEITE', now(), now())`,
      [IDS.orgA, id, produtoRapidoId, `${PREFIXO}sopa`]);
    assert.equal(await comA((db) => preparoDoPedido(db, id)), PREPARO,
      'o preparo não é o maior das linhas');
  });

  it('as 20:30 de Madrid produzem-se às 20:05 de Madrid — verificado contra a base', async () => {
    // ── Não há minutos relativos nesta asserção ─────────────────────────
    //
    // «Entra 25 minutos antes» é verdade em qualquer fuso e não prova nada. O
    // que se compara é o INSTANTE: o que a base diz serem as 20:05 de Madrid,
    // contra o que ficou gravado em `producao_em`.
    const id = await pedidoCom(produtoId, false);
    const r = await comA((db) => agendarPedido(db, IDS.unidadeA, id, DIA, HORA));
    assert.ok(r.ok, 'não agendou');

    const esperado = await instanteDaBase('Europe/Madrid', `${DIA} 20:05:00`);
    const { rows } = await sql.query(
      `SELECT entregar_as, producao_em FROM orders WHERE id = $1`, [id]);

    assert.equal(new Date(rows[0].producao_em).toISOString(), esperado.toISOString(),
      'o momento de produção não é as 20:05 locais da unidade');
    assert.equal(new Date(rows[0].entregar_as).toISOString(),
      (await instanteDaBase('Europe/Madrid', `${DIA} ${HORA}:00`)).toISOString());
  });

  it('e NÃO é a hora de parede lida como UTC — o defeito do E19, aqui no fogão', async () => {
    // Com hora de parede, `producao_em` seria 20:05Z. Em Madrid no Verão isso é
    // 22:05 locais: comida feita duas horas depois de a pessoa a vir buscar.
    const id = await pedidoCom(produtoId, false);
    await comA((db) => agendarPedido(db, IDS.unidadeA, id, DIA, HORA));
    const { rows } = await sql.query(`SELECT producao_em FROM orders WHERE id = $1`, [id]);
    assert.notEqual(new Date(rows[0].producao_em).toISOString(), `${DIA}T20:05:00.000Z`,
      'o momento de produção é a hora de parede lida como UTC');
  });

  it('E O PAR: a MESMA hora de entrega em dois fusos dá momentos DIFERENTES', async () => {
    // Sem este par, uma unidade em UTC faria os casos acima passar com o defeito
    // lá dentro — porque em UTC a hora de parede e o instante coincidem.
    const emMadrid = await pedidoCom(produtoId, false);
    await comA((db) => agendarPedido(db, IDS.unidadeA, emMadrid, DIA, HORA));
    const { rows: a } = await sql.query(`SELECT producao_em FROM orders WHERE id = $1`, [emMadrid]);

    await limpar();
    await semear('UTC');
    const emUtc = await pedidoCom(produtoId, false);
    await comA((db) => agendarPedido(db, IDS.unidadeA, emUtc, DIA, HORA));
    const { rows: b } = await sql.query(`SELECT producao_em FROM orders WHERE id = $1`, [emUtc]);

    assert.notEqual(new Date(a[0].producao_em).toISOString(),
      new Date(b[0].producao_em).toISOString(),
      'a mesma hora de entrega em dois fusos deu o mesmo momento: o fuso não conta');
  });

  it('sem fuso não se adivinha: recusa-se', async () => {
    await sql.query(`UPDATE locations SET fuso = NULL WHERE id = $1`, [IDS.unidadeA]);
    const id = await pedidoCom(produtoId, false);
    const r = await comA((db) => agendarPedido(db, IDS.unidadeA, id, DIA, HORA));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'SEM_FUSO');
  });

  it('a base DERIVA o momento: um valor escrito de fora é substituído', async () => {
    const id = await pedidoCom(produtoId, false);
    await comA((db) => agendarPedido(db, IDS.unidadeA, id, DIA, HORA));
    // Alguém escreve directamente uma data absurda.
    await sql.query(
      `UPDATE orders SET producao_em = '1999-01-01T00:00:00Z' WHERE id = $1`, [id]);
    const { rows } = await sql.query(`SELECT producao_em FROM orders WHERE id = $1`, [id]);
    const esperado = await instanteDaBase('Europe/Madrid', `${DIA} 20:05:00`);
    assert.equal(new Date(rows[0].producao_em).toISOString(), esperado.toISOString(),
      'o momento de produção pôde ser escrito de fora');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. A cozinha só vê o que é para agora', () => {
  it('um pedido para daqui a três horas NÃO aparece na fila', async () => {
    const id = await pedidoCom(produtoId);
    const daqui = new Date(Date.now() + 3 * 3600_000);
    await sql.query(
      `UPDATE orders SET entregar_as = $2, preparo_min = 25 WHERE id = $1`, [id, daqui]);

    const fila = await comA((db) => tarefasDaEstacao(db, IDS.unidadeA, estacaoId));
    assert.equal(fila.length, 0, 'trabalho para o jantar apareceu ao almoço');
  });

  it('E O PAR: o MESMO pedido aparece quando o momento chega — sem ninguém abrir nada', async () => {
    // ── Sem este par, «esconde tudo» passa o caso acima ──────────────────
    //
    // E a passagem é por RELÓGIO: nada é chamado entre as duas leituras. O que
    // muda é o instante, e a segunda consulta vê o que a primeira não via.
    const id = await pedidoCom(produtoId);
    const daqui = new Date(Date.now() + 3 * 3600_000);
    await sql.query(
      `UPDATE orders SET entregar_as = $2, preparo_min = 25 WHERE id = $1`, [id, daqui]);
    assert.equal((await comA((db) => tarefasDaEstacao(db, IDS.unidadeA, estacaoId))).length, 0);

    // O relógio avança: a entrega passa a ser daqui a dez minutos, e o preparo é
    // de 25 — logo o momento de produção já passou.
    const perto = new Date(Date.now() + 10 * 60_000);
    await sql.query(`UPDATE orders SET entregar_as = $2 WHERE id = $1`, [id, perto]);

    const fila = await comA((db) => tarefasDaEstacao(db, IDS.unidadeA, estacaoId));
    assert.equal(fila.length, 1, 'chegou a hora e o pedido não entrou na cozinha');
  });

  it('atravessar o momento DUAS VEZES não cria duas entradas', async () => {
    const id = await pedidoCom(produtoId);
    const perto = new Date(Date.now() + 10 * 60_000);
    await sql.query(
      `UPDATE orders SET entregar_as = $2, preparo_min = 25 WHERE id = $1`, [id, perto]);

    const uma = await comA((db) => tarefasDaEstacao(db, IDS.unidadeA, estacaoId));
    const outra = await comA((db) => tarefasDaEstacao(db, IDS.unidadeA, estacaoId));
    assert.equal(uma.length, 1);
    assert.equal(outra.length, 1, 'consultar duas vezes duplicou a fila');
    assert.equal(uma[0]!.id, outra[0]!.id, 'a segunda consulta criou uma tarefa nova');
  });

  it('um pedido SEM hora é para agora, e entra sempre', async () => {
    // Sem este caso, «esconde tudo o que tem tarefa» passava os anteriores.
    await pedidoCom(produtoId);
    const fila = await comA((db) => tarefasDaEstacao(db, IDS.unidadeA, estacaoId));
    assert.equal(fila.length, 1, 'um pedido para agora deixou de entrar na cozinha');
  });

  it('a fila do agendado mostra o que ainda não entrou', async () => {
    const id = await pedidoCom(produtoId);
    await sql.query(
      `UPDATE orders SET entregar_as = $2, preparo_min = 25 WHERE id = $1`,
      [id, new Date(Date.now() + 3 * 3600_000)]);
    const lista = await comA((db) => agendadosPorEntrar(db, IDS.unidadeA));
    assert.equal(lista.length, 1);
    assert.equal(lista[0]!.id, id);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. A área servida e a taxa que não se inventa', () => {
  it('um código postal sem área é FORA DA ÁREA', async () => {
    const r = await comA((db) => areaQueServe(db, IDS.unidadeA, '99999'));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'FORA_DA_AREA');
  });

  it('E O PAR: um código postal DENTRO da área é aceite, com a taxa configurada', async () => {
    // «Sem ele, "recusa sempre" passa — e é o defeito mais provável, porque
    // recusar é o caminho seguro para quem implementa.»
    await comA((db) => guardarArea(db, IDS.orgA, IDS.unidadeA, {
      nome: `${PREFIXO}Centro`, codigoPostal: '12594', taxaMenor: 250, moeda: 'EUR' }));
    const r = await comA((db) => areaQueServe(db, IDS.unidadeA, '12594'));
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.taxaMenor, 250);
  });

  it('a taxa NÃO é inventada: não há caminho que devolva zero por omissão', async () => {
    const r = await comA((db) => areaQueServe(db, IDS.unidadeA, '00000'));
    assert.equal(r.ok, false, 'devolveu uma área para um código postal sem área');
  });

  it('a entrega COPIA a taxa, e não a lê da área mais tarde', async () => {
    await comA((db) => guardarArea(db, IDS.orgA, IDS.unidadeA, {
      nome: `${PREFIXO}Centro`, codigoPostal: '12594', taxaMenor: 250, moeda: 'EUR' }));
    const id = await pedidoCom(produtoId, false);
    const r = await comA((db) => marcarParaEntrega(db, IDS.orgA, IDS.unidadeA, id, {
      morada: 'Rua x 1', codigoPostal: '12594', contacto: '+34 600' }));
    assert.ok(r.ok);

    // A casa muda a tabela de preços.
    await comA((db) => guardarArea(db, IDS.orgA, IDS.unidadeA, {
      nome: `${PREFIXO}Centro`, codigoPostal: '12594', taxaMenor: 900, moeda: 'EUR' }));
    const { rows } = await sql.query(
      `SELECT taxa_menor FROM order_deliveries WHERE order_id = $1`, [id]);
    assert.equal(rows[0].taxa_menor, 250,
      'o preço do pedido mudou quando alguém editou a tabela');
  });

  it('uma morada fora da área não cria entrega nenhuma', async () => {
    const id = await pedidoCom(produtoId, false);
    const r = await comA((db) => marcarParaEntrega(db, IDS.orgA, IDS.unidadeA, id, {
      morada: 'Rua y 2', codigoPostal: '99999', contacto: '+34 600' }));
    assert.equal(r.ok, false);
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM order_deliveries WHERE order_id = $1`, [id]);
    assert.equal(rows[0].n, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. O conector externo desligado é DESLIGADO', () => {
  it('nasce desligado e sem provedor', async () => {
    assert.deepEqual(await comA((db) => conectorDeEntrega(db, IDS.unidadeA)),
      { provedor: null, activo: false });
  });

  it('um pedido externo com o conector desligado é RECUSADO', async () => {
    const r = await comA((db) => receberPedidoExterno(db, IDS.orgA, IDS.unidadeA, {
      canalExterno: 'parceiro', idExterno: 'A1', abertoPor: ACTOR,
      itens: [{ idExterno: 'burger-4', quantidade: 1 }] }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'DESLIGADO');
  });

  it('activo SEM provedor não passa — nem aqui nem na base', async () => {
    const r = await comA((db) => guardarConectorDeEntrega(db, IDS.orgA, IDS.unidadeA, {
      provedor: null, activo: true }));
    assert.equal(r.ok, false);
    await assert.rejects(
      () => sql.query(
        `INSERT INTO delivery_connectors (id, organization_id, location_id, provedor, activo, updated_at)
         VALUES (gen_random_uuid(), $1, $2, NULL, true, now())`, [IDS.orgA, IDS.unidadeA]),
      /conector_de_entrega_activo_exige_provedor/);
  });

  it('E O PAR: com provedor e mapa, o pedido externo ENTRA', async () => {
    await comA((db) => guardarConectorDeEntrega(db, IDS.orgA, IDS.unidadeA, {
      provedor: 'parceiro', activo: true }));
    await comA((db) => guardarMapaExterno(db, IDS.orgA, IDS.unidadeA, {
      canalExterno: 'parceiro', idExterno: 'burger-4', productId: produtoId }));
    const r = await comA((db) => receberPedidoExterno(db, IDS.orgA, IDS.unidadeA, {
      canalExterno: 'parceiro', idExterno: 'A1', abertoPor: ACTOR,
      itens: [{ idExterno: 'burger-4', quantidade: 1 }] }));
    assert.equal(r.ok, true, 'ninguém consegue mandar um pedido: a porta recusa toda a gente');
  });

  it('sem MAPA não se adivinha o produto', async () => {
    await comA((db) => guardarConectorDeEntrega(db, IDS.orgA, IDS.unidadeA, {
      provedor: 'parceiro', activo: true }));
    const r = await comA((db) => receberPedidoExterno(db, IDS.orgA, IDS.unidadeA, {
      canalExterno: 'parceiro', idExterno: 'A2', abertoPor: ACTOR,
      itens: [{ idExterno: 'desconhecido', quantidade: 1 }] }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'SEM_MAPA');
  });

  it('o MESMO evento duas vezes preserva UM pedido', async () => {
    await comA((db) => guardarConectorDeEntrega(db, IDS.orgA, IDS.unidadeA, {
      provedor: 'parceiro', activo: true }));
    await comA((db) => guardarMapaExterno(db, IDS.orgA, IDS.unidadeA, {
      canalExterno: 'parceiro', idExterno: 'burger-4', productId: produtoId }));
    const um = await comA((db) => receberPedidoExterno(db, IDS.orgA, IDS.unidadeA, {
      canalExterno: 'parceiro', idExterno: 'A3', abertoPor: ACTOR,
      itens: [{ idExterno: 'burger-4', quantidade: 1 }] }));
    const dois = await comA((db) => receberPedidoExterno(db, IDS.orgA, IDS.unidadeA, {
      canalExterno: 'parceiro', idExterno: 'A3', abertoPor: ACTOR,
      itens: [{ idExterno: 'burger-4', quantidade: 1 }] }));
    assert.ok(um.ok && dois.ok);
    assert.equal(dois.orderId, um.orderId, 'o reenvio do parceiro criou um segundo pedido');
    assert.equal(dois.repetido, true);
  });

  it('um id externo DIFERENTE é um pedido novo', async () => {
    // Sem este par, «devolve sempre o primeiro» passava o caso acima.
    await comA((db) => guardarConectorDeEntrega(db, IDS.orgA, IDS.unidadeA, {
      provedor: 'parceiro', activo: true }));
    await comA((db) => guardarMapaExterno(db, IDS.orgA, IDS.unidadeA, {
      canalExterno: 'parceiro', idExterno: 'burger-4', productId: produtoId }));
    const um = await comA((db) => receberPedidoExterno(db, IDS.orgA, IDS.unidadeA, {
      canalExterno: 'parceiro', idExterno: 'B1', abertoPor: ACTOR,
      itens: [{ idExterno: 'burger-4', quantidade: 1 }] }));
    const dois = await comA((db) => receberPedidoExterno(db, IDS.orgA, IDS.unidadeA, {
      canalExterno: 'parceiro', idExterno: 'B2', abertoPor: ACTOR,
      itens: [{ idExterno: 'burger-4', quantidade: 1 }] }));
    assert.ok(um.ok && dois.ok);
    assert.notEqual(dois.orderId, um.orderId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5. O item que esgota ANTES da hora', () => {
  it('o pedido das 20h fica marcado às 18h, e não às 19h58', async () => {
    // «Isso é uma oportunidade, não uma falha: há duas horas para avisar quem
    // pediu. O defeito é descobri-lo às 19h58.»
    const id = await pedidoCom(produtoId, false);
    await sql.query(
      `UPDATE orders SET entregar_as = $2, preparo_min = 25 WHERE id = $1`,
      [id, new Date(Date.now() + 3 * 3600_000)]);

    const antes = await comA((db) => agendadosEmRisco(db, IDS.unidadeA));
    assert.equal(antes.length, 0, 'já havia risco: o cenário não mede nada');

    await sql.query(
      `INSERT INTO product_availability (id, organization_id, product_id, bloqueado, motivo, updated_at)
       VALUES (gen_random_uuid(), $1, $2, true, 'esgotou', now())`, [IDS.orgA, produtoId]);

    const depois = await comA((db) => agendadosEmRisco(db, IDS.unidadeA));
    assert.equal(depois.length, 1, 'o esgotado não foi descoberto antes da hora');
    assert.deepEqual(depois[0]!.itensEsgotados, [`${PREFIXO}linha`]);
  });

  it('um bloqueio JÁ EXPIRADO não põe ninguém em risco', async () => {
    const id = await pedidoCom(produtoId, false);
    await sql.query(
      `UPDATE orders SET entregar_as = $2, preparo_min = 25 WHERE id = $1`,
      [id, new Date(Date.now() + 3 * 3600_000)]);
    await sql.query(
      `INSERT INTO product_availability (id, organization_id, product_id, bloqueado, ate, motivo, updated_at)
       VALUES (gen_random_uuid(), $1, $2, true, now() - interval '1 hour', 'esgotou', now())`,
      [IDS.orgA, produtoId]);
    assert.equal((await comA((db) => agendadosEmRisco(db, IDS.unidadeA))).length, 0,
      'avisou de um problema que já passou');
  });

  it('e um pedido para AGORA não entra nesta lista', async () => {
    await pedidoCom(produtoId, false);
    await sql.query(
      `INSERT INTO product_availability (id, organization_id, product_id, bloqueado, motivo, updated_at)
       VALUES (gen_random_uuid(), $1, $2, true, 'esgotou', now())`, [IDS.orgA, produtoId]);
    assert.equal((await comA((db) => agendadosEmRisco(db, IDS.unidadeA))).length, 0,
      'um pedido sem hora apareceu na lista dos agendados');
  });
});

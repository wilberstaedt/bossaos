import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  chamarDaEspera, comEscopo, entrarNaEspera, esperarDaRua, guardarConector,
  guardarDefinicoes, guardarTemplate, historicoDeMensagens, obterPrisma,
  reservarDaRua, unidadePublica,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E19 — o que o PRODUTO faz, e não o que as funções sabem fazer.
 *
 * ── Porque é que este ficheiro existe ─────────────────────────────────────
 *
 * Duas máquinas foram construídas, provadas com controlo negativo, e ficaram sem
 * ninguém que as chamasse: o resolvedor de fuso e a fila de mensagens. A prova
 * alcançava-as **directamente**; o produto não.
 *
 * Nenhum caso aqui chama `resolverHoraLocal` nem `enfileirar`. Todos entram pela
 * porta que o ecrã usa, e afirmam o que ficou na base. Se alguém apagar a
 * chamada no produto, isto acende — e é a única coisa que isso significa.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e19pr-';
const SLUG = 'e19pr-marina';
const ESCOPO = { organizationId: IDS.orgA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let zonaId = '';
let mesaId = '';

const DIA = '2027-07-10';
const HORA = '20:00';

async function semear(fuso = 'Europe/Madrid') {
  await sql.query(`UPDATE locations SET public_slug = $1, fuso = $2 WHERE id = $3`,
    [SLUG, fuso, IDS.unidadeA]);
  const { rows: z } = await sql.query(
    `INSERT INTO service_areas (id, organization_id, location_id, nome, tipo, ordem, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'SALA', 1, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, `${PREFIXO}Sala`]);
  zonaId = z[0].id;
  const { rows: m } = await sql.query(
    `INSERT INTO service_tables (id, organization_id, location_id, area_id, codigo, capacidade, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 4, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, zonaId, `${PREFIXO}01`]);
  mesaId = m[0].id;
  await comA((db) => guardarDefinicoes(db, IDS.orgA, IDS.unidadeA, {
    activo: true, duracaoPadraoMin: 90, bufferMin: 0,
    antecedenciaMinMin: 0, antecedenciaMaxDias: 3650, maxPessoas: 12 }));
  await comA((db) => guardarTemplate(db, IDS.orgA, IDS.unidadeA, {
    tipo: 'confirmacao', idioma: 'es-ES',
    assunto: `${PREFIXO}Mesa reservada`, corpo: 'Te esperamos.' }));
  await comA((db) => guardarTemplate(db, IDS.orgA, IDS.unidadeA, {
    tipo: 'mesa-pronta', idioma: 'es-ES',
    assunto: `${PREFIXO}Tu mesa`, corpo: 'Ya puedes entrar.' }));
}

async function limpar() {
  await sql.query(`DELETE FROM reservation_message_attempts WHERE message_id IN
     (SELECT id FROM reservation_messages WHERE location_id = $1)`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM reservation_messages WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM messaging_connectors WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM message_templates WHERE assunto LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM waitlist_areas WHERE waitlist_id IN
     (SELECT id FROM waitlist_entries WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM waitlist_entries WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM reservation_allocations WHERE table_id IN
     (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM reservations WHERE criada_por = 'publico' AND location_id = $1`,
    [IDS.unidadeA]);
  await sql.query(`DELETE FROM reservation_settings WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM service_tables WHERE codigo LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM service_areas WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`UPDATE locations SET public_slug = NULL WHERE public_slug = '${SLUG}'`);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});
after(async () => { await limpar(); await sql.end(); await prisma.$disconnect(); });
beforeEach(async () => { await limpar(); await semear(); });

let n = 0;
/** Entra pela porta que o formulário do RES-C-005 usa. */
const reservarPelaPorta = (dia = DIA, hora = HORA) => reservarDaRua(prisma, SLUG, {
  pessoas: 2, dia, hora, nome: `${PREFIXO}cliente`,
  contacto: 'rua@inspeccao.example', chaveIdempotente: `${PREFIXO}${Date.now()}-${(n += 1)}` });

// ═══════════════════════════════════════════════════════════════════════════
describe('1. O PRODUTO grava o instante do fuso da unidade', () => {
  it('o cenário existe: a unidade tem fuso e aceita reservas', async () => {
    const u = await unidadePublica(prisma, SLUG);
    assert.equal(u?.fuso, 'Europe/Madrid');
    assert.equal(u?.reservasActivas, true);
  });

  it('a reserva feita pela PORTA fica com o instante do fuso, e não com hora de parede', async () => {
    // ── Nenhuma chamada a `resolverHoraLocal` neste caso ────────────────
    //
    // A comparação é contra a base — `instante_local` —, e o valor medido é o
    // que a PORTA gravou. Se alguém apagar a resolução na porta, isto acende.
    const r = await reservarPelaPorta();
    assert.ok(r.ok, 'a porta recusou a reserva do cenário');

    const { rows } = await sql.query(`SELECT inicio FROM reservations WHERE id = $1`, [r.reservaId]);
    const { rows: esperado } = await sql.query(
      `SELECT instante FROM instante_local('Europe/Madrid', $1::timestamp)`, [`${DIA} ${HORA}:00`]);

    assert.equal(new Date(rows[0].inicio).toISOString(),
      new Date(esperado[0].instante).toISOString(),
      'a porta gravou hora de parede como UTC: o fuso da unidade foi ignorado');
    assert.notEqual(new Date(rows[0].inicio).toISOString(), `${DIA}T${HORA}:00.000Z`,
      'o instante é exactamente a hora escrita lida como UTC — não passou pelo fuso');
  });

  it('E O PAR: a MESMA 20:00 em dois fusos dá instantes DIFERENTES', async () => {
    // Sem este par, uma unidade em UTC faria o caso acima passar com o defeito
    // lá dentro — porque em UTC a hora de parede e o instante coincidem.
    const emMadrid = await reservarPelaPorta();
    assert.ok(emMadrid.ok);
    const { rows: a } = await sql.query(`SELECT inicio FROM reservations WHERE id = $1`,
      [emMadrid.reservaId]);

    await limpar();
    await semear('UTC');
    const emUtc = await reservarPelaPorta();
    assert.ok(emUtc.ok);
    const { rows: b } = await sql.query(`SELECT inicio FROM reservations WHERE id = $1`,
      [emUtc.reservaId]);

    assert.notEqual(new Date(a[0].inicio).toISOString(), new Date(b[0].inicio).toISOString(),
      'a mesma hora local em dois fusos deu o mesmo instante: o fuso não conta');
  });

  it('a hora AMBÍGUA volta com o estado, para o ecrã o poder dizer', async () => {
    // 25/10/2026 às 02h30 em Madrid acontece duas vezes. Quem marcou tem de
    // saber que a casa escolheu uma delas.
    const r = await reservarDaRua(prisma, SLUG, {
      pessoas: 2, dia: '2026-10-25', hora: '02:30', nome: `${PREFIXO}c`,
      contacto: 'rua@inspeccao.example', chaveIdempotente: `${PREFIXO}amb-${Date.now()}` });
    assert.ok(r.ok, 'a porta recusou a hora ambígua');
    assert.equal(r.horaEntendida.estado, 'AMBIGUA',
      'a porta não disse que a hora acontece duas vezes');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. O PRODUTO enfileira uma mensagem, sem a prova lhe tocar', () => {
  it('reservar pela porta enche o histórico', async () => {
    // ── Nenhuma chamada a `enfileirar` neste ficheiro ───────────────────
    //
    // A fila estava provada e ninguém a chamava. Este caso entra pela porta da
    // rua e afirma o histórico — que era o sítio onde o vazio se via e ninguém
    // reparava.
    const antes = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(antes.length, 0, 'o cenário já tinha mensagens: não mede nada');

    const r = await reservarPelaPorta();
    assert.ok(r.ok);

    const depois = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(depois.length, 1, 'confirmar uma reserva não enfileirou mensagem nenhuma');
    assert.equal(depois[0]!.tipo, 'confirmacao');
    assert.equal(depois[0]!.reserva.id, r.reservaId);
  });

  it('sem provedor fica PENDENTE — o produto não finge que enviou', async () => {
    await reservarPelaPorta();
    const h = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(h[0]!.estado, 'PENDENTE');
    assert.equal(h[0]!.tentativas[0]!.resultado, 'SEM_PROVEDOR');
  });

  it('com provedor, o produto ENTREGA', async () => {
    // O par do caso acima: sem ele, «nunca entrega» satisfazia os dois.
    await comA((db) => guardarConector(db, IDS.orgA, IDS.unidadeA, {
      provedor: 'provedor-de-prova', activo: true }));
    // O transporte real não existe; o que se afirma é que a tentativa foi feita
    // contra o provedor configurado, e não engolida por falta dele.
    await reservarPelaPorta();
    const h = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(h[0]!.tentativas[0]!.provedor, 'provedor-de-prova',
      'o produto não chegou a falar com o provedor configurado');
    assert.notEqual(h[0]!.tentativas[0]!.resultado, 'SEM_PROVEDOR');
  });

  it('uma REPETIÇÃO não avisa outra vez — não houve facto novo', async () => {
    const k = `${PREFIXO}mesma-chave`;
    const um = await reservarDaRua(prisma, SLUG, {
      pessoas: 2, dia: DIA, hora: HORA, nome: `${PREFIXO}c`,
      contacto: 'rua@inspeccao.example', chaveIdempotente: k });
    const dois = await reservarDaRua(prisma, SLUG, {
      pessoas: 2, dia: DIA, hora: HORA, nome: `${PREFIXO}c`,
      contacto: 'rua@inspeccao.example', chaveIdempotente: k });
    assert.ok(um.ok && dois.ok && dois.repetida);
    const h = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(h.length, 1, 'o duplo toque no botão avisou o cliente duas vezes');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. Chamar DUAS VEZES avisa duas vezes — a chave é o acontecimento', () => {
  it('a segunda chamada da mesma noite é um acontecimento novo', async () => {
    // ── O caso que o contrato usa para explicar a chave ─────────────────
    //
    // «A sua mesa está pronta» pode ter de sair duas vezes na mesma noite: a
    // pessoa não veio à primeira, e o host volta a chamar meia hora depois. Com
    // a chave `(reserva, tipo)` a segunda desaparecia em silêncio, e a mesa
    // ficava vazia com gente à porta.
    const r = await reservarPelaPorta();
    assert.ok(r.ok);

    const esperaId = await comA((db) => entrarNaEspera(db, IDS.orgA, IDS.unidadeA, {
      nome: `${PREFIXO}espera`, contacto: 'e@inspeccao.example', pessoas: 2 }));
    await sql.query(`UPDATE waitlist_entries SET reservation_id = $2 WHERE id = $1`,
      [esperaId, r.reservaId]);

    const inicio = new Date();
    const fim = new Date(inicio.getTime() + 90 * 60_000);
    await comA((db) => chamarDaEspera(db, IDS.unidadeA, esperaId, mesaId, inicio, fim));
    await comA((db) => chamarDaEspera(db, IDS.unidadeA, esperaId, mesaId, inicio, fim));

    const h = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    const prontas = h.filter((x) => x.tipo === 'mesa-pronta');
    assert.equal(prontas.length, 2,
      'a segunda chamada desapareceu: a chave voltou a ser (reserva, tipo)');
  });

  it('e a confirmação continua a ser UMA — tipos diferentes não se fundem', async () => {
    const r = await reservarPelaPorta();
    assert.ok(r.ok);
    const h = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(h.filter((x) => x.tipo === 'confirmacao').length, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. A espera vinda da rua também passa pelo produto', () => {
  it('entrar na espera pela porta cria a linha', async () => {
    const e = await esperarDaRua(prisma, SLUG, {
      nome: `${PREFIXO}rua`, contacto: 'r@inspeccao.example', pessoas: 2 });
    assert.ok(e.ok);
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM waitlist_entries WHERE nome LIKE '${PREFIXO}%'`);
    assert.equal(rows[0].n, 1);
  });
});

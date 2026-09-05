import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  abrirWalkIn, agendaDoDia, atrasadas, chegadasPorHora, comEscopo, confirmarReserva,
  guardarDefinicoes, marcarChegada, obterPrisma, reservaPorId, reservasAChegar,
  sentarReserva,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E19 — o que o host vê, e o que o host faz.
 *
 * ── O par que decide esta fatia ───────────────────────────────────────────
 *
 * «Chegar não é estar sentado.» O grupo 2 é o mesmo cenário com a pergunta
 * trocada: marcar a chegada **não** ocupa a mesa, e sentar ocupa. Um teste que só
 * medisse o segundo passava com o check-in a sentar lá dentro — e o mapa da sala
 * passaria a mentir a quem serve.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e19h-';
const ACTOR = 'host@inspeccao.example';
const ESCOPO = { organizationId: IDS.orgA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let zonaId = '';
let mesa2Id = '';
let mesa4Id = '';

const DIA = new Date(Date.UTC(2027, 6, 10));
const as = (h: number, m = 0) => new Date(Date.UTC(2027, 6, 10, h, m, 0));

async function semear() {
  const { rows: z } = await sql.query(
    `INSERT INTO service_areas (id, organization_id, location_id, nome, tipo, ordem, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'SALA', 1, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, `${PREFIXO}Sala`]);
  zonaId = z[0].id;
  const { rows: m } = await sql.query(
    `INSERT INTO service_tables (id, organization_id, location_id, area_id, codigo, capacidade, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 2, now()),
            (gen_random_uuid(), $1, $2, $3, $5, 4, now()) RETURNING id, codigo`,
    [IDS.orgA, IDS.unidadeA, zonaId, `${PREFIXO}01`, `${PREFIXO}02`]);
  mesa2Id = m.find((r: { codigo: string }) => r.codigo === `${PREFIXO}01`).id;
  mesa4Id = m.find((r: { codigo: string }) => r.codigo === `${PREFIXO}02`).id;
  await comA((db) => guardarDefinicoes(db, IDS.orgA, IDS.unidadeA, {
    activo: true, duracaoPadraoMin: 90, bufferMin: 0,
    antecedenciaMinMin: 0, antecedenciaMaxDias: 3650, toleranciaAtrasoMin: 15 }));
}

async function limpar() {
  const mesas = `(SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`;
  await sql.query(`DELETE FROM reservation_allocations WHERE table_id IN ${mesas}`);
  await sql.query(`DELETE FROM reservations WHERE criada_por = '${ACTOR}'`);
  await sql.query(`DELETE FROM table_sessions WHERE table_id IN ${mesas}`);
  await sql.query(`DELETE FROM reservation_settings WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM service_tables WHERE codigo LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM service_areas WHERE nome LIKE '${PREFIXO}%'`);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});
after(async () => { await limpar(); await sql.end(); await prisma.$disconnect(); });
beforeEach(async () => { await limpar(); await semear(); });

let n = 0;
async function reservar(pessoas: number, inicio: Date) {
  const r = await confirmarReserva(prisma, ESCOPO, {
    locationId: IDS.unidadeA, pessoas, inicio, nome: `${PREFIXO}grupo`,
    contacto: 'x@inspeccao.example', chaveIdempotente: `${PREFIXO}${Date.now()}-${n += 1}`,
    criadaPor: ACTOR });
  assert.ok(r.ok, 'a reserva do cenário não entrou');
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
describe('1. A agenda do dia, e os números que ela conta', () => {
  it('a agenda traz as reservas do dia por hora de início', async () => {
    await reservar(2, as(21));
    await reservar(4, as(20));
    const agenda = await comA((db) => agendaDoDia(db, IDS.unidadeA, DIA));
    assert.equal(agenda.length, 2, 'o cenário está vazio');
    assert.equal(agenda[0]!.inicio.getUTCHours(), 20, 'a agenda não está por hora');
    assert.ok(agenda[0]!.mesas.length > 0, 'a agenda não diz em que mesa');
  });

  it('as chegadas por hora contam a hora de INÍCIO, e não as três que a reserva toca', async () => {
    // Uma reserva das 20h que dura 90 minutos toca as 20h e as 21h. Contá-la nas
    // duas dava uma ocupação com mais gente do que existe.
    await reservar(4, as(20));
    const horas = await comA((db) => chegadasPorHora(db, IDS.unidadeA, DIA));
    assert.deepEqual(horas, [{ hora: 20, pessoas: 4, reservas: 1 }]);
  });

  it('uma reserva cancelada sai das contas', async () => {
    const r = await reservar(4, as(20));
    await sql.query(
      `UPDATE reservations SET estado = 'CANCELADA', cancelada_em = now() WHERE id = $1`,
      [r.reservaId]);
    const horas = await comA((db) => chegadasPorHora(db, IDS.unidadeA, DIA));
    assert.equal(horas.length, 0, 'a cancelada continua a contar como gente prometida');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. Chegar NÃO é estar sentado', () => {
  it('marcar a chegada carimba e muda o estado', async () => {
    const r = await reservar(2, as(20));
    await comA((db) => marcarChegada(db, r.reservaId));
    const depois = await comA((db) => reservaPorId(db, IDS.unidadeA, r.reservaId));
    assert.equal(depois?.estado, 'CHEGOU');
    assert.ok(depois?.chegouEm, 'chegou sem carimbar a hora');
  });

  it('E O PAR: a chegada NÃO abre sessão de mesa nenhuma', async () => {
    // ── É este caso que separa os dois actos ────────────────────────────
    //
    // Se o check-in sentasse, a mesa ficava marcada como ocupada enquanto os
    // anteriores ainda lá estão — e o mapa mentia a quem serve.
    const r = await reservar(2, as(20));
    await comA((db) => marcarChegada(db, r.reservaId));
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM table_sessions WHERE table_id IN
         (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`);
    assert.equal(rows[0].n, 0, 'o check-in sentou o grupo: os dois actos colapsaram');
  });

  it('sentar abre a sessão, e é aí que a mesa fica ocupada', async () => {
    const r = await reservar(2, as(20));
    await comA((db) => marcarChegada(db, r.reservaId));
    const s = await comA((db) => sentarReserva(
      db, IDS.orgA, IDS.unidadeA, r.reservaId, mesa2Id, ACTOR));
    assert.ok(s.ok, 'não sentou');
    const depois = await comA((db) => reservaPorId(db, IDS.unidadeA, r.reservaId));
    assert.equal(depois?.estado, 'SENTADA');
    assert.ok(depois?.sentadaEm);
  });

  it('sentar quem NÃO chegou é recusado', async () => {
    const r = await reservar(2, as(20));
    const s = await comA((db) => sentarReserva(
      db, IDS.orgA, IDS.unidadeA, r.reservaId, mesa2Id, ACTOR));
    assert.equal(s.ok, false);
    if (!s.ok) assert.equal(s.motivo, 'NAO_CHEGOU');
  });

  it('a base RECUSA uma SENTADA sem o carimbo da chegada', async () => {
    const r = await reservar(2, as(20));
    await assert.rejects(
      () => sql.query(
        `UPDATE reservations SET estado = 'SENTADA', sentada_em = now() WHERE id = $1`,
        [r.reservaId]),
      /reserva_carimbo_bate_com_estado/);
  });

  it('sentar numa mesa já ocupada é recusado', async () => {
    const r = await reservar(2, as(20));
    await comA((db) => marcarChegada(db, r.reservaId));
    await comA((db) => abrirWalkIn(db, IDS.orgA, IDS.unidadeA, mesa2Id, 2, ACTOR));
    const s = await comA((db) => sentarReserva(
      db, IDS.orgA, IDS.unidadeA, r.reservaId, mesa2Id, ACTOR));
    assert.equal(s.ok, false);
    if (!s.ok) assert.equal(s.motivo, 'MESA_OCUPADA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. A reserva aparece na SALA antes da hora', () => {
  it('uma mesa livre com reserva a chegar é anunciada', async () => {
    // ── É por aqui que a reserva se perde entre o motor e a sala ────────
    //
    // A mesa está mesmo livre — não há sessão aberta — e é essa a armadilha: o
    // mapa dizia a verdade sobre o presente e escondia o que aí vinha.
    const agora = await comA((db) => db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`);
    const daqui = new Date(agora[0]!.agora.getTime() + 30 * 60_000);
    const r = await reservar(2, daqui);

    const aChegar = await comA((db) => reservasAChegar(db, IDS.unidadeA, 120));
    const naMesa = aChegar.get(r.mesas[0]!);
    assert.ok(naMesa, 'a mesa livre não anuncia a reserva que aí vem');
    assert.equal(naMesa.reservaId, r.reservaId);
  });

  it('E O PAR: uma reserva de amanhã NÃO aparece na sala de hoje', async () => {
    // Sem este par, «anuncia tudo» passava o caso acima — e o mapa ficava cheio
    // de avisos de reservas que não são deste turno.
    const agora = await comA((db) => db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`);
    const amanha = new Date(agora[0]!.agora.getTime() + 26 * 3600_000);
    await reservar(2, amanha);
    const aChegar = await comA((db) => reservasAChegar(db, IDS.unidadeA, 120));
    assert.equal(aChegar.size, 0, 'a sala anuncia reservas que não são deste turno');
  });

  it('uma reserva já sentada deixa de ser anunciada', async () => {
    const agora = await comA((db) => db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`);
    const daqui = new Date(agora[0]!.agora.getTime() + 30 * 60_000);
    const r = await reservar(2, daqui);
    await comA((db) => marcarChegada(db, r.reservaId));
    await comA((db) => sentarReserva(db, IDS.orgA, IDS.unidadeA, r.reservaId, r.mesas[0]!, ACTOR));
    const aChegar = await comA((db) => reservasAChegar(db, IDS.unidadeA, 120));
    assert.equal(aChegar.size, 0, 'continua a anunciar quem já está sentado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. As atrasadas são DITAS, e não libertadas', () => {
  /**
   * ── Uma reserva não pode NASCER atrasada ────────────────────────────────
   *
   * A antecedência mínima recusa uma hora que já passou, e faz bem. O atraso não
   * é uma reserva estranha: é uma reserva normal a quem o tempo passou por cima.
   * Por isso ela nasce no futuro e o relógio anda — que é o que acontece.
   */
  async function reservaComAtraso(minutos: number) {
    const agora = await comA((db) => db.$queryRaw<{ agora: Date }[]>`SELECT now() AS agora`);
    const daqui = new Date(agora[0]!.agora.getTime() + 60 * 60_000);
    const r = await reservar(2, daqui);
    const atrasada = new Date(agora[0]!.agora.getTime() - minutos * 60_000);
    await sql.query(`UPDATE reservations SET inicio = $2 WHERE id = $1`, [r.reservaId, atrasada]);
    return r;
  }

  it('quem passou a tolerância aparece na lista', async () => {
    const r = await reservaComAtraso(60);
    const lista = await comA((db) => atrasadas(db, IDS.unidadeA));
    assert.ok(lista.some((x) => x.id === r.reservaId), 'a atrasada não é dita a ninguém');
  });

  it('E NADA foi libertado: a mesa continua alocada', async () => {
    // ── A diferença entre dizer e varrer ────────────────────────────────
    //
    // «Libertar uma reserva atrasada é política e acção do host, nunca uma
    // limpeza automática silenciosa.» Um varredor daria a mesa de quem está a
    // estacionar o carro a outra pessoa, sem ninguém decidir nada.
    const r = await reservaComAtraso(60);
    await comA((db) => atrasadas(db, IDS.unidadeA));
    const depois = await comA((db) => reservaPorId(db, IDS.unidadeA, r.reservaId));
    assert.equal(depois?.estado, 'CONFIRMADA', 'a leitura mudou o estado da reserva');
    assert.ok(depois!.mesas.length > 0, 'a leitura libertou a mesa');
  });

  it('quem chegou a horas NÃO está atrasado', async () => {
    await reservar(2, as(23));
    const lista = await comA((db) => atrasadas(db, IDS.unidadeA));
    assert.equal(lista.length, 0, 'toda a gente aparece como atrasada');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5. O walk-in usa as mesmas alocações', () => {
  it('abrir um walk-in ocupa a mesa para a disponibilidade', async () => {
    const w = await comA((db) => abrirWalkIn(db, IDS.orgA, IDS.unidadeA, mesa4Id, 3, ACTOR));
    assert.ok(w.ok);
    const { rows } = await sql.query(
      `SELECT estado, comensais FROM table_sessions WHERE id = $1`, [w.sessaoId]);
    assert.equal(rows[0].estado, 'ABERTA');
    assert.equal(rows[0].comensais, 3);
  });

  it('um walk-in numa mesa ocupada é recusado', async () => {
    await comA((db) => abrirWalkIn(db, IDS.orgA, IDS.unidadeA, mesa4Id, 3, ACTOR));
    const w = await comA((db) => abrirWalkIn(db, IDS.orgA, IDS.unidadeA, mesa4Id, 2, ACTOR));
    assert.equal(w.ok, false);
  });
});

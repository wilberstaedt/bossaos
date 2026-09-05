import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  comEscopo, esperarDaRua, estadoDaEsperaPublica, guardarDefinicoes,
  horariosPublicos, obterPrisma, reservarDaRua, unidadePublica,
  MAXIMO_PUBLICO_POR_JANELA,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E19 — a reserva vinda da rua.
 *
 * ── O que esta superfície tem de diferente ────────────────────────────────
 *
 * Quem reserva não tem sessão nenhuma. O inquilino sai de uma porta estreita, e
 * o que protege a escrita não é uma credencial — é o limite da janela, a chave
 * idempotente, e não confirmar existência a quem pergunta.
 *
 * ── E o caso que decide ───────────────────────────────────────────────────
 *
 * *«O ecrã oferece um horário que entretanto ficou ocupado, e o servidor recusa
 * com uma mensagem que serve à pessoa.»* Uma prova que só teste o caminho onde o
 * ecrã está actualizado não mede isto — e é este o caso que acontece num sábado
 * às 21h.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e19p-';
const SLUG = 'e19p-marina';
const ESCOPO = { organizationId: IDS.orgA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let zonaId = '';
// ── A porta recebe hora LOCAL, e não um instante ─────────────────────────
//
// Era `new Date(Date.UTC(...))`, que é o defeito pelo qual a etapa foi retida:
// hora de parede lida como UTC. A prova acompanha o produto — o dia e a hora são
// os que a pessoa escreve, e quem os resolve é o fuso da unidade.
const DIA = '2027-06-12';
const HORA = '20:00';

async function semear(ligadas = true) {
  await sql.query(`UPDATE locations SET public_slug = $1, fuso = COALESCE(fuso, 'Europe/Madrid')
                    WHERE id = $2`, [SLUG, IDS.unidadeA]);
  const { rows: z } = await sql.query(
    `INSERT INTO service_areas (id, organization_id, location_id, nome, tipo, ordem, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'SALA', 1, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, `${PREFIXO}Sala`]);
  zonaId = z[0].id;
  await sql.query(
    `INSERT INTO service_tables (id, organization_id, location_id, area_id, codigo, capacidade, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 2, now())`,
    [IDS.orgA, IDS.unidadeA, zonaId, `${PREFIXO}01`]);
  await comA((db) => guardarDefinicoes(db, IDS.orgA, IDS.unidadeA, {
    activo: ligadas, duracaoPadraoMin: 90, bufferMin: 0,
    antecedenciaMinMin: 0, antecedenciaMaxDias: 3650, maxPessoas: 12 }));
}

async function limpar() {
  const mesas = `(SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`;
  // A porta enfileira uma mensagem por reserva confirmada: sai com elas.
  await sql.query(`DELETE FROM reservation_message_attempts WHERE message_id IN
     (SELECT id FROM reservation_messages WHERE location_id = $1)`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM reservation_messages WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM waitlist_areas WHERE waitlist_id IN
     (SELECT id FROM waitlist_entries WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM waitlist_entries WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM reservation_allocations WHERE table_id IN ${mesas}`);
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
const chave = () => `${PREFIXO}${Date.now()}-${(n += 1)}`;

const reservar = (pessoas: number, hora = HORA) => reservarDaRua(prisma, SLUG, {
  pessoas, dia: DIA, hora, nome: `${PREFIXO}cliente`, contacto: 'rua@inspeccao.example',
  chaveIdempotente: chave() });

// ═══════════════════════════════════════════════════════════════════════════
describe('1. A porta só conhece unidades PUBLICADAS', () => {
  it('a unidade publicada existe para a porta', async () => {
    const u = await unidadePublica(prisma, SLUG);
    assert.ok(u, 'a porta não encontrou uma unidade publicada');
    assert.equal(u.locationId, IDS.unidadeA);
  });

  it('E O PAR: sem endereço público, a porta não a conhece', async () => {
    // Sem este par, «devolve sempre» passava o caso acima.
    await sql.query(`UPDATE locations SET public_slug = NULL WHERE id = $1`, [IDS.unidadeA]);
    assert.equal(await unidadePublica(prisma, SLUG), null);
  });

  it('um endereço inventado não confirma existência de nada', async () => {
    const r = await reservarDaRua(prisma, 'nao-existe-de-certeza', {
      pessoas: 2, dia: DIA, hora: HORA, nome: 'x', contacto: 'x@inspeccao.example',
      chaveIdempotente: chave() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'DESCONHECIDA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. O interruptor da casa manda', () => {
  it('com as reservas desligadas, a rua é recusada', async () => {
    await comA((db) => guardarDefinicoes(db, IDS.orgA, IDS.unidadeA, { activo: false }));
    const r = await reservar(2);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'DESLIGADO');
  });

  it('E O PAR: com as reservas ligadas, a mesma reserva passa', async () => {
    const r = await reservar(2);
    assert.equal(r.ok, true, 'ninguém consegue reservar: a porta recusa toda a gente');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. O limite da janela, e o par que o contrato exige', () => {
  it('acima do limite, a porta recusa', async () => {
    // Enche a janela com reservas de origem PÚBLICO. Não precisam de caber em
    // mesa nenhuma: o limite é sobre pedidos, e conta-se antes da capacidade.
    for (let i = 0; i < MAXIMO_PUBLICO_POR_JANELA; i += 1) {
      await sql.query(
        `INSERT INTO reservations (id, organization_id, location_id, estado, origem, pessoas,
           inicio, fim, nome, contacto, chave_idempotente, criada_por, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'CONFIRMADA', 'PUBLICO', 2,
           $3::timestamptz, $3::timestamptz + interval '1 hour',
           'enche', 'x@inspeccao.example', $4, 'publico', now())`,
        [IDS.orgA, IDS.unidadeA, `${DIA}T${HORA}:00Z`, chave()]);
    }
    const r = await reservar(2);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'MUITOS_PEDIDOS');
  });

  it('E O PAR: uma reserva legítima abaixo do limite PASSA', async () => {
    // ── É esta metade que o contrato numera ─────────────────────────────
    //
    // «Sem a segunda metade, uma porta que recusa toda a gente satisfaz o teste
    // e ninguém consegue reservar.» É o mesmo par do E17, na mesma família de
    // defeito.
    const r = await reservar(2);
    assert.equal(r.ok, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. O caso feio: o ecrã ofereceu, e entretanto foi tomada', () => {
  it('a consulta oferece a hora — é informativa e di-lo', async () => {
    const u = (await unidadePublica(prisma, SLUG))!;
    const horas = await horariosPublicos(prisma, u, new Date(`${DIA}T00:00:00Z`), 2);
    assert.ok(horas.length > 0, 'a consulta não ofereceu hora nenhuma');
    assert.ok(horas.some((h) => h.cabe), 'nenhuma hora cabe: o cenário está vazio');
  });

  it('depois de a última mesa ir, a MESMA hora é recusada com alternativas', async () => {
    const u = (await unidadePublica(prisma, SLUG))!;
    const antes = await horariosPublicos(prisma, u, new Date(`${DIA}T00:00:00Z`), 2);
    // A hora oferecida é a LOCAL: em Madrid, as 20h locais são 18h UTC.
    const oferecida = antes.find((h) => h.cabe
      && h.quando.toISOString().slice(11, 16) === '18:00');
    assert.ok(oferecida, 'o ecrã não ofereceu as 20h locais: não há o que disputar');

    // Alguém ficou com ela entre a oferta e o toque no botão.
    const primeiro = await reservar(2);
    assert.equal(primeiro.ok, true);

    const segundo = await reservar(2);
    assert.equal(segundo.ok, false, 'a confirmação aceitou uma hora já tomada');
    if (!segundo.ok && segundo.motivo === 'SEM_MESA') {
      assert.ok(segundo.alternativas.length > 0,
        'recusou sem dar alternativas: quem reserva tem de recomeçar, e é aí que desiste');
    } else {
      assert.fail(`recusou por ${(segundo as { motivo: string }).motivo}, e não por falta de mesa`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5. Dois toques no botão dão UMA reserva', () => {
  it('a mesma chave devolve a mesma reserva', async () => {
    const k = chave();
    const um = await reservarDaRua(prisma, SLUG, {
      pessoas: 2, dia: DIA, hora: HORA, nome: `${PREFIXO}c`,
      contacto: 'rua@inspeccao.example', chaveIdempotente: k });
    const dois = await reservarDaRua(prisma, SLUG, {
      pessoas: 2, dia: DIA, hora: HORA, nome: `${PREFIXO}c`,
      contacto: 'rua@inspeccao.example', chaveIdempotente: k });
    assert.ok(um.ok && dois.ok);
    assert.equal(dois.reservaId, um.reservaId, 'o duplo toque criou duas reservas');
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM reservations WHERE criada_por = 'publico' AND location_id = $1`,
      [IDS.unidadeA]);
    assert.equal(rows[0].n, 1);
  });

  it('o segredo de gestão sai UMA vez, e não é o identificador', async () => {
    const r = await reservar(2);
    assert.ok(r.ok && r.segredoDeGestao, 'não houve segredo de gestão');
    assert.notEqual(r.segredoDeGestao, r.reservaId, 'o segredo é o id: é enumerável');
    const { rows } = await sql.query(
      `SELECT gestao_token_hash FROM reservations WHERE id = $1`, [r.reservaId]);
    assert.notEqual(rows[0].gestao_token_hash, r.segredoDeGestao,
      'a base guardou o segredo em claro');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('6. A espera vista da rua', () => {
  it('entra na espera e recebe posição e estimativa MARCADA', async () => {
    const e = await esperarDaRua(prisma, SLUG, {
      nome: `${PREFIXO}espera`, contacto: 'rua@inspeccao.example', pessoas: 2 });
    assert.ok(e.ok, 'não entrou na espera');
    const estado = await estadoDaEsperaPublica(prisma, SLUG, e.esperaId);
    assert.ok(estado, 'não há estado para mostrar');
    assert.deepEqual(estado.posicao, { posicao: 1, de: 1 });
    assert.equal(estado.estimativa?.estimativa, true,
      'o número saiu sem dizer que é uma estimativa');
  });

  it('a espera também respeita o interruptor da casa', async () => {
    await comA((db) => guardarDefinicoes(db, IDS.orgA, IDS.unidadeA, { activo: false }));
    const e = await esperarDaRua(prisma, SLUG, {
      nome: `${PREFIXO}espera`, contacto: 'rua@inspeccao.example', pessoas: 2 });
    assert.equal(e.ok, false);
  });
});

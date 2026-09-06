import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  cancelar, comEscopo, confirmarReserva, disponibilidade, entrarNaEspera,
  acontecimento, enfileirar, guardarConector, guardarDefinicoes, historicoDeMensagens,
  lerDefinicoes, listarReservas, obterPrisma, ocupacaoNoIntervalo, chamarDaEspera, reagendar,
  registarNaoCompareceu, resolverHoraLocal, varrerRetencoesExpiradas,
} from '../packages/db/src/index.ts';
import { sobrepoe, intervaloEfectivo, opcoesDeAlocacao } from '../packages/domain/src/reservas.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E18 — reservas e capacidade concorrente.
 *
 * ── O padrão de teste desta área é o oposto do habitual ────────────────────
 *
 * «O caso que interessa é o que deve ser RECUSADO.» Um teste que só confirma que
 * uma reserva se cria não vê nenhum dos defeitos desta etapa: todos eles são
 * coisas que passam quando deviam ser travadas.
 *
 * ── E o par do limite semiaberto é DOIS testes, não um ─────────────────────
 *
 * «21h00 a encostar a 21h00» tem de ser ACEITE e «21h01 a cruzar 21h00» tem de
 * ser RECUSADO. Com só o segundo, trocar `<` por `<=` deixa a etapa verde e a
 * casa recusa o turno das 21h a noite inteira sem ninguém perceber porquê.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e18-';
const ACTOR = 'prova-e18@bossaos.example';
const ESCOPO = { organizationId: IDS.orgA };

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let zonaId = '';
let zonaBarId = '';
let mesa2Id = '';
let mesa3Id = '';
let mesa4Id = '';
let mesaBarId = '';
let combinacao34Id = '';

/** Uma noite bem longe de hoje, para a antecedência nunca ser o motivo. */
const NOITE = new Date(Date.UTC(2027, 4, 15, 19, 0, 0));
const as = (h: number, m = 0) => new Date(Date.UTC(2027, 4, 15, h, m, 0));

async function semear() {
  const { rows: z } = await sql.query(
    `INSERT INTO service_areas (id, organization_id, location_id, nome, tipo, ordem, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'SALA', 1, now()),
            (gen_random_uuid(), $1, $2, $4, 'BARRA', 2, now()) RETURNING id, nome`,
    [IDS.orgA, IDS.unidadeA, `${PREFIXO}Sala`, `${PREFIXO}Bar`]);
  zonaId = z.find((r: { nome: string }) => r.nome.endsWith('Sala')).id;
  zonaBarId = z.find((r: { nome: string }) => r.nome.endsWith('Bar')).id;

  const { rows: m } = await sql.query(
    `INSERT INTO service_tables (id, organization_id, location_id, area_id, codigo, capacidade, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 2, now()),
            (gen_random_uuid(), $1, $2, $3, $5, 4, now()),
            (gen_random_uuid(), $1, $2, $3, $6, 4, now()),
            (gen_random_uuid(), $1, $2, $7, $8, 4, now())
     RETURNING id, codigo`,
    [IDS.orgA, IDS.unidadeA, zonaId, `${PREFIXO}02`, `${PREFIXO}03`, `${PREFIXO}04`,
     zonaBarId, `${PREFIXO}B1`]);
  const acha = (c: string) => m.find((r: { codigo: string }) => r.codigo === `${PREFIXO}${c}`).id;
  mesa2Id = acha('02'); mesa3Id = acha('03'); mesa4Id = acha('04'); mesaBarId = acha('B1');

  const { rows: c } = await sql.query(
    `INSERT INTO table_combinations (id, organization_id, location_id, nome, capacidade, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 8, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, `${PREFIXO}3+4`]);
  combinacao34Id = c[0].id;
  await sql.query(
    `INSERT INTO table_combination_members (id, organization_id, combination_id, table_id)
     VALUES (gen_random_uuid(), $1, $2, $3), (gen_random_uuid(), $1, $2, $4)`,
    [IDS.orgA, combinacao34Id, mesa3Id, mesa4Id]);

  await comA((db) => guardarDefinicoes(db, IDS.orgA, IDS.unidadeA, {
    activo: true, duracaoPadraoMin: 90, bufferMin: 0,
    antecedenciaMinMin: 0, antecedenciaMaxDias: 3650,
    minPessoas: 1, maxPessoas: 12, permiteCombinacoes: true,
  }));
}

async function limpar() {
  await sql.query(`DELETE FROM reservation_message_attempts WHERE message_id IN
     (SELECT id FROM reservation_messages WHERE location_id = $1)`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM reservation_messages WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM messaging_connectors WHERE location_id = $1`, [IDS.unidadeA]);
  const mesasDoArnes = `(SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`;
  await sql.query(`DELETE FROM waitlist_entries WHERE oferta_table_id IN ${mesasDoArnes}`);
  await sql.query(`DELETE FROM waitlist_entries WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM reservation_messages WHERE reservation_id IN
     (SELECT id FROM reservations WHERE criada_por = '${ACTOR}')`);
  await sql.query(`DELETE FROM reservation_allocations WHERE reservation_id IN
     (SELECT id FROM reservations WHERE criada_por = '${ACTOR}')`);
  await sql.query(`DELETE FROM reservations WHERE criada_por = '${ACTOR}'`);
  await sql.query(`DELETE FROM reservation_blocks WHERE motivo LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM capacity_rules WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM service_windows WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM reservation_settings WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM table_sessions WHERE table_id IN ${mesasDoArnes}`);
  await sql.query(`DELETE FROM table_combination_members WHERE table_id IN ${mesasDoArnes}`);
  await sql.query(`DELETE FROM table_combinations WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM service_tables WHERE codigo LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM service_areas WHERE nome LIKE '${PREFIXO}%'`);
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
beforeEach(async () => { await limpar(); await semear(); });

let contador = 0;
const chave = () => `${PREFIXO}${Date.now()}-${(contador += 1)}`;

function pedir(inicio: Date, pessoas: number, extra: Record<string, unknown> = {}) {
  return confirmarReserva(prisma, ESCOPO, {
    locationId: IDS.unidadeA, pessoas, inicio,
    nome: `${PREFIXO}cliente`, contacto: 'x@inspeccao.example',
    chaveIdempotente: chave(), criadaPor: ACTOR,
    ...extra,
  } as Parameters<typeof confirmarReserva>[2]);
}

// ═══════════════════════════════════════════════════════════════════════════
describe('1. O limite semiaberto, e os DOIS lados dele', () => {
  it('a conta pura: [19,20) e [20,21) não se sobrepõem', () => {
    assert.equal(sobrepoe(
      { inicio: as(19), fim: as(20) }, { inicio: as(20), fim: as(21) }), false);
  });

  it('a conta pura: [19,20:01) e [20,21) sobrepõem-se', () => {
    assert.equal(sobrepoe(
      { inicio: as(19), fim: as(20, 1) }, { inicio: as(20), fim: as(21) }), true);
  });

  it('no produto: uma reserva que ACABA às 20h30 deixa passar a das 20h30', async () => {
    const primeira = await pedir(as(19), 2, { duracaoMin: 90 });
    assert.ok(primeira.ok, 'a primeira nem sequer entrou');
    // A mesa 2 é a única de duas pessoas; a segunda tem de calhar na MESMA mesa
    // para o teste ser sobre o limite e não sobre haver outra mesa livre.
    const segunda = await pedir(as(20, 30), 2, { duracaoMin: 90 });
    assert.ok(segunda.ok, 'encostar não é sobrepor, e foi recusado');
    assert.deepEqual(segunda.mesas, primeira.mesas,
      'foi para outra mesa: o teste deixou de ser sobre o limite');
  });

  it('a BASE recusa duas alocações sobrepostas na mesma mesa, escritas à mão', async () => {
    // ── Uma guarda que nada alcança é uma guarda em que ninguém pode confiar ─
    //
    // Com o lock ligado, `confirmarReserva` serializa tudo e nunca chega a
    // tentar escrever uma sobreposição: a exclusão da base é defesa em
    // profundidade e o motor de hoje não lhe toca. Foi o controlo negativo que
    // mo disse — larguei a restrição e não caiu teste nenhum.
    //
    // Mas quem escreve na base não é só o motor: é uma importação, uma correcção
    // à mão, uma etapa futura. Por isso o caso escreve DIRECTAMENTE, como esses
    // fariam, e exige que a base recuse.
    const escrever = (inicio: string, fim: string) => sql.query(
      `INSERT INTO reservation_allocations
         (id, organization_id, location_id, reservation_id, table_id, inicio, fim)
       SELECT gen_random_uuid(), $1, $2, r.id, $3, $4::timestamptz, $5::timestamptz
         FROM reservations r WHERE r.criada_por = $6 LIMIT 1`,
      [IDS.orgA, IDS.unidadeA, mesaBarId, inicio, fim, ACTOR]);

    const base = await pedir(NOITE, 2);
    assert.ok(base.ok, 'sem uma reserva não há onde pendurar a alocação');

    await escrever('2027-05-15T19:00:00Z', '2027-05-15T20:00:00Z');
    await assert.rejects(
      () => escrever('2027-05-15T19:30:00Z', '2027-05-15T20:30:00Z'),
      /uma_mesa_um_intervalo|exclusion/,
      'a base aceitou a mesma mesa em dois intervalos que se cruzam');
  });

  it('a BASE aceita duas alocações que ENCOSTAM — o outro lado do limite', async () => {
    // Sem este caso, «recusa tudo» passaria o teste acima.
    const escrever = (inicio: string, fim: string) => sql.query(
      `INSERT INTO reservation_allocations
         (id, organization_id, location_id, reservation_id, table_id, inicio, fim)
       SELECT gen_random_uuid(), $1, $2, r.id, $3, $4::timestamptz, $5::timestamptz
         FROM reservations r WHERE r.criada_por = $6 LIMIT 1`,
      [IDS.orgA, IDS.unidadeA, mesaBarId, inicio, fim, ACTOR]);

    const base = await pedir(NOITE, 2);
    assert.ok(base.ok);
    await escrever('2027-05-15T19:00:00Z', '2027-05-15T20:00:00Z');
    await escrever('2027-05-15T20:00:00Z', '2027-05-15T21:00:00Z');
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM reservation_allocations WHERE table_id = $1`, [mesaBarId]);
    assert.equal(rows[0].n, 2, 'o intervalo semiaberto foi lido como fechado pela base');
  });

  it('no produto: uma reserva que acaba às 20h31 RECUSA a das 20h30', async () => {
    const primeira = await pedir(as(19), 2, { duracaoMin: 91 });
    assert.ok(primeira.ok);
    const segunda = await pedir(as(20, 30), 2, { duracaoMin: 90 });
    // Só há uma mesa de 2; a de 4 serve duas pessoas e é onde ela cabe. O que se
    // afirma é que NÃO foi para a mesma mesa.
    if (segunda.ok) {
      assert.notDeepEqual(segunda.mesas, primeira.mesas,
        'um minuto a sobrepor e a mesma mesa foi vendida duas vezes');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. O buffer entra ANTES da conta', () => {
  it('a conta pura: 90 min com 15 de buffer ocupam 105', () => {
    const i = intervaloEfectivo(as(19), 90, 15);
    assert.equal((i.fim.getTime() - i.inicio.getTime()) / 60_000, 105);
  });

  it('sem buffer, 20h30 encosta e passa', async () => {
    const p = await pedir(as(19), 2, { duracaoMin: 90 });
    assert.ok(p.ok);
    const q = await pedir(as(20, 30), 2, { duracaoMin: 90 });
    assert.ok(q.ok && q.mesas[0] === p.mesas[0], 'sem buffer devia encostar na mesma mesa');
  });

  it('com 15 de buffer, a MESMA marcação deixa de caber na mesma mesa', async () => {
    await comA((db) => guardarDefinicoes(db, IDS.orgA, IDS.unidadeA, { bufferMin: 15 }));
    const p = await pedir(as(19), 2, { duracaoMin: 90 });
    assert.ok(p.ok);
    const q = await pedir(as(20, 30), 2, { duracaoMin: 90 });
    if (q.ok) {
      assert.notEqual(q.mesas[0], p.mesas[0],
        'o buffer não foi aplicado: a mesa aceitou quem encosta dentro dele');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. A combinação ocupa as COMPONENTES', () => {
  it('a conta pura: uma combinação devolve as componentes, nunca ela própria', () => {
    const opcoes = opcoesDeAlocacao(
      8,
      [{ id: 'a', codigo: '03', areaId: 'z', capacidade: 4 },
       { id: 'b', codigo: '04', areaId: 'z', capacidade: 4 }],
      [{ id: 'c34', nome: '3+4', capacidade: 8, membros: ['a', 'b'] }],
      true);
    assert.deepEqual(opcoes, [['a', 'b']], 'a combinação apareceu como recurso próprio');
  });

  it('reservar 3+4 escreve DUAS alocações', async () => {
    const r = await pedir(NOITE, 8);
    assert.ok(r.ok, 'o grupo de oito não coube');
    assert.equal(r.mesas.length, 2, 'a combinação ocupou um recurso só');
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM reservation_allocations WHERE reservation_id = $1`,
      [r.reservaId]);
    assert.equal(rows[0].n, 2);
  });

  it('depois de 3+4, reservar SÓ a 3 é recusado', async () => {
    const oito = await pedir(NOITE, 8, { areaId: zonaId });
    assert.ok(oito.ok && oito.mesas.length === 2, 'sem a combinação não há o que medir');

    // ── O cenário tem de estar FECHADO na zona ────────────────────────────
    //
    // Escrevi isto primeiro sem `areaId` e ficou vermelho com razão: a mesa do
    // BAR também tem quatro lugares, e o grupo foi para lá. A recusa que eu
    // queria medir nunca chegou a acontecer, e o vermelho estava a dizer «há
    // outra mesa», não «a combinação não protege as componentes».
    //
    // Uma população que inclui uma saída que o teste não previu não mede a
    // propriedade — mede a saída.
    const quatro = await pedir(NOITE, 4, { areaId: zonaId });
    assert.equal(quatro.ok, false, 'a mesma capacidade foi vendida duas vezes');
    if (!quatro.ok) assert.equal(quatro.motivo, 'SEM_MESA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. Dois hosts ao mesmo tempo', () => {
  it('a MESMA mesa: uma aceite, uma recusada — nunca duas', async () => {
    const [a, b] = await Promise.all([pedir(NOITE, 2), pedir(NOITE, 2)]);
    const aceites = [a, b].filter((r) => r.ok);
    // Há duas mesas de 4 e uma de 2 na sala: duas de duas pessoas cabem. O que
    // NÃO pode acontecer é as duas caírem na MESMA mesa.
    if (aceites.length === 2) {
      const [x, y] = aceites as [{ ok: true; mesas: string[] }, { ok: true; mesas: string[] }];
      assert.notDeepEqual(x.mesas, y.mesas, 'a mesma mesa foi dada a dois clientes');
    }
  });

  it('a última capacidade da ZONA: exactamente uma passa', async () => {
    // ── O desvio de escrita, e o cenário que ele EXIGE ────────────────────
    //
    // Tecto de 4 comensais na sala. Dois pedidos ao mesmo tempo, de tamanhos
    // DIFERENTES — 2 e 4 — para caírem em mesas diferentes: a de dois lugares e
    // a de quatro. Cada um cabe sozinho; juntos são 6 num tecto de 4.
    //
    // A primeira versão pedia 4 e 4. Os dois escolhiam a MESMA mesa (a mais
    // pequena que serve), a exclusão da base separava-os, e o teste ficava verde
    // com a serialização desligada. Media a exclusão e chamava-lhe contagem.
    //
    // Em mesas diferentes, nenhuma restrição os pode separar: os dois lêem a
    // mesma soma antiga e os dois escrevem. Só a serialização os apanha.
    await sql.query(
      `INSERT INTO capacity_rules (id, organization_id, location_id, area_id, max_comensais, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 4, now())`,
      [IDS.orgA, IDS.unidadeA, zonaId]);

    const [a, b] = await Promise.all([
      pedir(NOITE, 2, { areaId: zonaId }), pedir(NOITE, 4, { areaId: zonaId })]);
    const aceites = [a, b].filter((r) => r.ok);
    if (aceites.length === 2) {
      const mesas = aceites.flatMap((r) => (r as { mesas: string[] }).mesas);
      assert.equal(new Set(mesas).size, 1,
        'as duas foram para mesas diferentes: o tecto da zona foi ultrapassado');
    }
    assert.equal(aceites.length, 1, `passaram ${aceites.length} reservas num tecto de 4`);
  });

  it('o grupo de uma COMBINAÇÃO conta uma vez, não uma por mesa', async () => {
    // ── O que a soma por alocação estraga ────────────────────────────────
    //
    // Tecto de 12 na sala. Um grupo de 8 numa combinação escreve duas alocações;
    // contadas por alocação são 16, e a mesa seguinte é recusada numa sala que
    // tem quatro lugares livres. Ninguém vê erro nenhum — só reservas que não
    // entram.
    await sql.query(
      `INSERT INTO capacity_rules (id, organization_id, location_id, area_id, max_comensais, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 12, now())`,
      [IDS.orgA, IDS.unidadeA, zonaId]);

    const oito = await pedir(NOITE, 8, { areaId: zonaId });
    assert.ok(oito.ok && oito.mesas.length === 2, 'sem a combinação não há o que medir');

    const dois = await pedir(NOITE, 2, { areaId: zonaId });
    assert.equal(dois.ok, true,
      'o grupo da combinação foi contado duas vezes e fechou a sala a metade');
  });

  it('a soma na base bate com o tecto', async () => {
    await sql.query(
      `INSERT INTO capacity_rules (id, organization_id, location_id, area_id, max_comensais, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 4, now())`,
      [IDS.orgA, IDS.unidadeA, zonaId]);
    await Promise.all([
      pedir(NOITE, 2, { areaId: zonaId }), pedir(NOITE, 4, { areaId: zonaId })]);
    const { rows } = await sql.query(
      `SELECT COALESCE(SUM(r.pessoas),0)::int AS total
         FROM reservations r WHERE r.criada_por = $1 AND r.estado <> 'CANCELADA'`, [ACTOR]);
    assert.ok(rows[0].total <= 4, `a sala ficou com ${rows[0].total} pessoas num tecto de 4`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5. Reagendar disputado: a ANTERIOR sobrevive', () => {
  it('quando a hora nova não cabe, a reserva antiga fica intacta e com mesa', async () => {
    const minha = await pedir(as(19), 8);
    assert.ok(minha.ok, 'sem a reserva de oito não há o que reagendar');

    // Enche as 21h com duas reservas de 4 — as duas mesas de 4 ficam tomadas, e
    // a combinação 3+4 deixa de ser possível.
    const a = await pedir(as(21), 4);
    const b = await pedir(as(21), 4);
    assert.ok(a.ok && b.ok, 'o cenário de disputa não se montou');

    const r = await reagendar(prisma, ESCOPO, IDS.unidadeA, minha.reservaId, as(21));
    assert.equal(r.ok, false, 'reagendou para uma hora sem capacidade');

    const { rows } = await sql.query(
      `SELECT r.inicio, r.estado, count(a.id)::int AS mesas
         FROM reservations r LEFT JOIN reservation_allocations a ON a.reservation_id = r.id
        WHERE r.id = $1 GROUP BY r.inicio, r.estado`, [minha.reservaId]);
    assert.equal(rows[0].estado, 'CONFIRMADA', 'a reserva anterior morreu na tentativa');
    assert.equal(new Date(rows[0].inicio).getTime(), as(19).getTime(), 'a hora mudou na mesma');
    assert.equal(rows[0].mesas, 2, 'a reserva anterior ficou sem mesa nenhuma');
  });

  it('quando cabe, muda mesmo — senão o teste acima passava com «nunca reagenda»', async () => {
    const minha = await pedir(as(19), 2);
    assert.ok(minha.ok);
    const r = await reagendar(prisma, ESCOPO, IDS.unidadeA, minha.reservaId, as(22));
    assert.equal(r.ok, true, 'não reagendou para uma hora vazia');
    const { rows } = await sql.query(`SELECT inicio FROM reservations WHERE id = $1`, [minha.reservaId]);
    assert.equal(new Date(rows[0].inicio).getTime(), as(22).getTime());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('6. A retenção expira por RELÓGIO, não por evento', () => {
  it('uma oferta viva OCUPA a mesa', async () => {
    const esperaId = await comA((db) => entrarNaEspera(db, IDS.orgA, IDS.unidadeA, {
      nome: `${PREFIXO}espera`, contacto: 'y@inspeccao.example', pessoas: 2 }));
    await comA((db) => chamarDaEspera(db, IDS.unidadeA, esperaId, mesa2Id, as(19), as(20, 30)));

    const ocupada = await comA((db) => lerDefinicoes(db, IDS.unidadeA).then((d) =>
      ocupacaoNoIntervalo(db, IDS.unidadeA, as(19), as(20), d)));
    assert.ok(ocupada.some((o) => o.tableId === mesa2Id && o.fonte === 'RETENCAO'),
      'a retenção não consome capacidade: então não é uma retenção');
  });

  it('passada a hora, a mesa está livre SEM ninguém abrir ecrã nenhum', async () => {
    const esperaId = await comA((db) => entrarNaEspera(db, IDS.orgA, IDS.unidadeA, {
      nome: `${PREFIXO}espera`, contacto: 'y@inspeccao.example', pessoas: 2 }));
    await comA((db) => chamarDaEspera(db, IDS.unidadeA, esperaId, mesa2Id, as(19), as(20, 30)));

    // O relógio anda. Ninguém chama nada — é esse o ponto.
    await sql.query(`UPDATE waitlist_entries SET oferta_expira_em = now() - interval '1 minute'
                      WHERE id = $1`, [esperaId]);

    const depois = await comA((db) => lerDefinicoes(db, IDS.unidadeA).then((d) =>
      ocupacaoNoIntervalo(db, IDS.unidadeA, as(19), as(20), d)));
    assert.equal(depois.filter((o) => o.fonte === 'RETENCAO').length, 0,
      'a retenção expirada continua a bloquear a mesa a noite inteira');
  });

  it('o varredor é HIGIENE: limpa a lista, e a capacidade já estava livre', async () => {
    const esperaId = await comA((db) => entrarNaEspera(db, IDS.orgA, IDS.unidadeA, {
      nome: `${PREFIXO}espera`, contacto: 'y@inspeccao.example', pessoas: 2 }));
    await comA((db) => chamarDaEspera(db, IDS.unidadeA, esperaId, mesa2Id, as(19), as(20, 30)));
    await sql.query(`UPDATE waitlist_entries SET oferta_expira_em = now() - interval '1 minute'
                      WHERE id = $1`, [esperaId]);
    const varridas = await comA((db) => varrerRetencoesExpiradas(db, IDS.unidadeA));
    assert.equal(varridas, 1);
    const { rows } = await sql.query(`SELECT estado FROM waitlist_entries WHERE id = $1`, [esperaId]);
    assert.equal(rows[0].estado, 'A_ESPERA');
  });

  it('e o WORKER encontra a unidade onde há ofertas mortas', async () => {
    // ── A função existia e ninguém a chamava ─────────────────────────────
    //
    // O `varrerRetencoesExpiradas` estava escrito, exportado e com este teste ao
    // lado — e com ZERO chamadas no produto. Faltava a linha, não faltava o
    // worker: o ciclo já corria o `varrerDescidas`.
    //
    // O que o worker precisa de saber é ONDE há trabalho, sem estar dentro de
    // casa nenhuma. É o que esta função responde, e é o par positivo do
    // controlo a seguir.
    const esperaId = await comA((db) => entrarNaEspera(db, IDS.orgA, IDS.unidadeA, {
      nome: `${PREFIXO}espera-do-worker`, contacto: 'w@inspeccao.example', pessoas: 2 }));
    await comA((db) => chamarDaEspera(db, IDS.unidadeA, esperaId, mesa2Id, as(19), as(20, 30)));
    await sql.query(`UPDATE waitlist_entries SET oferta_expira_em = now() - interval '1 minute'
                      WHERE id = $1`, [esperaId]);

    const { rows } = await sql.query(
      'SELECT organization_id, location_id FROM unidades_com_retencoes_expiradas()');
    assert.ok(rows.some((r: { location_id: string }) => r.location_id === IDS.unidadeA),
      'o worker não encontraria a unidade com ofertas por expirar');

    await comA((db) => varrerRetencoesExpiradas(db, IDS.unidadeA));
    const depois = await sql.query(
      'SELECT organization_id, location_id FROM unidades_com_retencoes_expiradas()');
    assert.ok(!depois.rows.some((r: { location_id: string }) => r.location_id === IDS.unidadeA),
      'depois de varrer, a unidade continua na lista — o ciclo seguinte varria a mesma coisa');
  });

  it('CONTROLO: o varrimento RECUSA-SE a responder de dentro de um inquilino', async () => {
    // ── Sem isto, o enumerador era uma porta para o lado ─────────────────
    //
    // É a mesma regra do `descidas_devidas()`: um restaurante não pergunta quem
    // MAIS tem ofertas por expirar. A recusa é da base, não da rota — e por isso
    // vale para as consultas que ninguém escreveu ainda.
    await assert.rejects(
      () => comA((db) => db.$queryRaw`SELECT * FROM unidades_com_retencoes_expiradas()`),
      (e: Error) => /não se faz de dentro de um inquilino/.test(String(e)),
      'de dentro de um inquilino, o enumerador respondeu');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('7. A sala e o bloqueio ocupam os mesmos recursos', () => {
  it('uma sessão de mesa ABERTA tira a mesa da disponibilidade', async () => {
    const d = await lerDefinicoesDaUnidade();
    const antes = await comA((db) => disponibilidade(db, IDS.unidadeA, new Date(), 90, d));
    const cabiam = antes.livres.length;

    await sql.query(
      `INSERT INTO table_sessions (id, organization_id, location_id, table_id, estado, comensais, aberta_por, aberta_em, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'ABERTA', 2, $4, now(), now())`,
      [IDS.orgA, IDS.unidadeA, mesa2Id, ACTOR]);

    const depois = await comA((db) => disponibilidade(db, IDS.unidadeA, new Date(), 90, d));
    assert.equal(depois.livres.length, cabiam - 1, 'o walk-in não ocupou nada');
    assert.ok(!depois.livres.some((m) => m.id === mesa2Id));
  });

  it('um bloqueio de ZONA fecha as mesas dela e não toca no bar', async () => {
    await sql.query(
      `INSERT INTO reservation_blocks (id, organization_id, location_id, area_id, inicio, fim, motivo, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, now())`,
      [IDS.orgA, IDS.unidadeA, zonaId, as(18), as(23), `${PREFIXO}obras`]);

    const d = await lerDefinicoesDaUnidade();
    const livre = await comA((db) => disponibilidade(db, IDS.unidadeA, as(19), 90, d));
    assert.deepEqual(livre.livres.map((m) => m.id), [mesaBarId],
      'o bloqueio da sala não fechou a sala, ou fechou o bar também');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('8. As horas que não existem e as que existem duas vezes', () => {
  it('02h30 na noite do adianto é INEXISTENTE, e resolve para 03h30', async () => {
    const r = await comA((db) => resolverHoraLocal(db, 'Europe/Madrid', '2026-03-29 02:30'));
    assert.equal(r.estado, 'INEXISTENTE');
    assert.equal(r.instante.toISOString(), '2026-03-29T01:30:00.000Z');
  });

  it('02h30 na noite do atraso é AMBIGUA', async () => {
    const r = await comA((db) => resolverHoraLocal(db, 'Europe/Madrid', '2026-10-25 02:30'));
    assert.equal(r.estado, 'AMBIGUA');
  });

  it('uma hora banal é NORMAL — senão «tudo ambíguo» passava os dois acima', async () => {
    const v = await comA((db) => resolverHoraLocal(db, 'Europe/Madrid', '2026-06-15 21:00'));
    assert.equal(v.estado, 'NORMAL');
    const i = await comA((db) => resolverHoraLocal(db, 'Europe/Madrid', '2026-12-15 21:00'));
    assert.equal(i.estado, 'NORMAL');
  });

  it('o serviço que atravessa a meia-noite continua a ser do dia em que começou', async () => {
    const r = await pedir(new Date(Date.UTC(2027, 4, 15, 23, 30)), 2, { duracaoMin: 90 });
    assert.ok(r.ok);
    const doDia = await comA((db) => listarReservas(
      db, IDS.unidadeA, new Date(Date.UTC(2027, 4, 15, 0, 0)), new Date(Date.UTC(2027, 4, 16, 0, 0))));
    assert.equal(doDia.length, 1, 'o fim do serviço caiu fora do relatório do dia');
    assert.ok(doDia[0]!.fim.getTime() > Date.UTC(2027, 4, 16, 0, 0),
      'o teste não atravessa a meia-noite: não mede nada');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('9. A mensagem é um resultado SEPARADO', () => {
  it('o email falha e a reserva continua CONFIRMADA', async () => {
    const r = await pedir(NOITE, 2);
    assert.ok(r.ok);
    // ── Pela porta ÚNICA, que é a mesma que o produto usa ──────────────
    //
    // Havia duas funções a escrever uma mensagem, e esta prova usava a que não
    // sabia de acontecimentos. Ficou uma — e a prova passa a exercitar o que o
    // produto exercita, que é a lição inteira desta retenção.
    await comA(async (db) => {
      await guardarConector(db, IDS.orgA, IDS.unidadeA, {
        provedor: 'provedor-de-prova', activo: true });
      return enfileirar(db, IDS.orgA, IDS.unidadeA, r.reservaId, acontecimento(),
        'confirmacao', 'es-ES', async () => ({ ok: false, erro: 'sem ligação' }));
    });

    const { rows } = await sql.query(`SELECT estado FROM reservations WHERE id = $1`, [r.reservaId]);
    assert.equal(rows[0].estado, 'CONFIRMADA', 'a falha de envio desfez a reserva');
    const msgs = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(msgs[0]!.estado, 'FALHADA', 'a falha não ficou registada em lado nenhum');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('10. A chave idempotente, sem a qual o retry é a segunda reserva', () => {
  it('a mesma chave duas vezes devolve a MESMA reserva', async () => {
    const k = chave();
    const um = await confirmarReserva(prisma, ESCOPO, {
      locationId: IDS.unidadeA, pessoas: 2, inicio: NOITE, nome: `${PREFIXO}c`,
      contacto: 'x@inspeccao.example', chaveIdempotente: k, criadaPor: ACTOR });
    const dois = await confirmarReserva(prisma, ESCOPO, {
      locationId: IDS.unidadeA, pessoas: 2, inicio: NOITE, nome: `${PREFIXO}c`,
      contacto: 'x@inspeccao.example', chaveIdempotente: k, criadaPor: ACTOR });
    assert.ok(um.ok && dois.ok);
    assert.equal(dois.reservaId, um.reservaId, 'a repetição criou uma reserva nova');
    assert.equal(dois.repetida, true);

    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM reservations WHERE criada_por = $1`, [ACTOR]);
    assert.equal(rows[0].n, 1, 'ficaram duas reservas na base para o mesmo pedido');
  });

  it('chaves diferentes fazem reservas diferentes — senão «devolve sempre a primeira» passava', async () => {
    const a = await pedir(as(19), 2);
    const b = await pedir(as(21), 2);
    assert.ok(a.ok && b.ok);
    assert.notEqual(a.reservaId, b.reservaId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('11. Cancelar e não comparecer libertam a mesa', () => {
  it('a mesa volta a estar livre depois do cancelamento', async () => {
    const r = await pedir(NOITE, 8, { areaId: zonaId });
    assert.ok(r.ok);
    const antes = await pedir(NOITE, 4, { areaId: zonaId });
    assert.equal(antes.ok, false, 'o cenário não tem a sala cheia');

    await comA((db) => cancelar(db, r.reservaId, ACTOR));
    const depois = await pedir(NOITE, 4, { areaId: zonaId });
    assert.equal(depois.ok, true, 'a mesa continuou presa a uma reserva cancelada');
  });

  it('o não-comparecimento também liberta, e é ACÇÃO de alguém', async () => {
    const r = await pedir(NOITE, 8, { areaId: zonaId });
    assert.ok(r.ok);
    const cheia = await pedir(NOITE, 4, { areaId: zonaId });
    assert.equal(cheia.ok, false, 'o cenário não tem a sala cheia');
    await comA((db) => registarNaoCompareceu(db, r.reservaId));
    const { rows } = await sql.query(`SELECT estado FROM reservations WHERE id = $1`, [r.reservaId]);
    assert.equal(rows[0].estado, 'NAO_COMPARECEU');
    const depois = await pedir(NOITE, 4, { areaId: zonaId });
    assert.equal(depois.ok, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('12. O que a casa não ligou não aceita reservas', () => {
  it('com as reservas desligadas, tudo é recusado', async () => {
    await comA((db) => guardarDefinicoes(db, IDS.orgA, IDS.unidadeA, { activo: false }));
    const r = await pedir(NOITE, 2);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'DESLIGADO');
  });

  it('o depósito NÃO se liga por um caminho normal', async () => {
    await comA((db) => guardarDefinicoes(
      db, IDS.orgA, IDS.unidadeA, { depositoLigado: true } as never));
    const d = await comA((db) => lerDefinicoes(db, IDS.unidadeA));
    assert.equal(d.depositoLigado, false, 'o depósito ligou-se sem política comercial nenhuma');
  });

  it('um grupo maior do que o máximo é recusado', async () => {
    const r = await pedir(NOITE, 40);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'GRUPO_GRANDE');
  });
});

async function lerDefinicoesDaUnidade() {
  return comA((db) => lerDefinicoes(db, IDS.unidadeA));
}

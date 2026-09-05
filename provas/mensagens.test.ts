import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  acontecimento, comEscopo, conectorDaUnidade, enfileirar, guardarConector,
  guardarTemplate, historicoDeMensagens, obterPrisma,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E19 — a fila de mensagens.
 *
 * ── Os três que a régua exige, e o terceiro é o que se esquece ────────────
 *
 *  1. reenviar a mesma mensagem **não a entrega duas vezes**;
 *  2. o resultado do provedor é guardado, e uma falha dele não apaga a reserva;
 *  3. **o par:** uma mensagem DIFERENTE para a mesma reserva **é enviada**.
 *
 * «Sem isto, "engole tudo o que se parece" passa os dois primeiros.»
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e19m-';
const ACTOR = 'msg@inspeccao.example';
const ESCOPO = { organizationId: IDS.orgA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let reservaId = '';

async function semear() {
  const { rows } = await sql.query(
    `INSERT INTO reservations (id, organization_id, location_id, estado, origem, pessoas,
       inicio, fim, nome, contacto, chave_idempotente, criada_por, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'CONFIRMADA', 'PUBLICO', 2,
       now() + interval '1 day', now() + interval '1 day 90 minutes',
       $3, 'x@inspeccao.example', $4, $5, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, `${PREFIXO}cliente`, `${PREFIXO}${Date.now()}`, ACTOR]);
  reservaId = rows[0].id;
  await comA((db) => guardarTemplate(db, IDS.orgA, IDS.unidadeA, {
    tipo: 'confirmacao', idioma: 'es-ES',
    assunto: `${PREFIXO}Mesa reservada`, corpo: 'Te esperamos.' }));
  await comA((db) => guardarTemplate(db, IDS.orgA, IDS.unidadeA, {
    tipo: 'lembrete', idioma: 'es-ES',
    assunto: `${PREFIXO}Hasta luego`, corpo: 'Es hoy.' }));
}

async function limpar() {
  await sql.query(`DELETE FROM reservation_message_attempts WHERE message_id IN
     (SELECT id FROM reservation_messages WHERE location_id = $1)`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM reservation_messages WHERE location_id = $1`, [IDS.unidadeA]);
  await sql.query(`DELETE FROM reservations WHERE criada_por = '${ACTOR}'`);
  await sql.query(`DELETE FROM message_templates WHERE assunto LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM messaging_connectors WHERE location_id = $1`, [IDS.unidadeA]);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});
after(async () => { await limpar(); await sql.end(); await prisma.$disconnect(); });
beforeEach(async () => { await limpar(); await semear(); });

/** Um provedor de mentira que entrega sempre. Conta quantas vezes foi chamado. */
function transporteQueEntrega() {
  const chamadas: string[] = [];
  return {
    chamadas,
    entregar: async (assunto: string) => { chamadas.push(assunto); return { ok: true }; },
  };
}

const ligar = () => comA((db) => guardarConector(
  db, IDS.orgA, IDS.unidadeA, { provedor: 'provedor-de-prova', activo: true }));

/**
 * ── O acontecimento é um ARGUMENTO, e é isso que mudou ────────────────────
 *
 * A chave deixou de ser `(reserva, tipo)`. Quem avisa cunha a identidade do
 * facto e passa-a; reentregar usa a MESMA, e um facto novo cunha outra.
 */
const enviar = (
  tipo: string, evento: string,
  t?: { entregar: (a: string, c: string) => Promise<{ ok: boolean; erro?: string }> },
) => comA((db) => enfileirar(
  db, IDS.orgA, IDS.unidadeA, reservaId, evento, tipo, 'es-ES', t?.entregar));

// ═══════════════════════════════════════════════════════════════════════════
describe('1. O conector nasce DESLIGADO e é visível como desligado', () => {
  it('sem linha nenhuma, está desligado e sem provedor', async () => {
    const c = await comA((db) => conectorDaUnidade(db, IDS.unidadeA));
    assert.deepEqual(c, { provedor: null, activo: false });
  });

  it('ligar SEM provedor é recusado — e a base também o recusa', async () => {
    const r = await comA((db) => guardarConector(
      db, IDS.orgA, IDS.unidadeA, { provedor: null, activo: true }));
    assert.equal(r.ok, false);
    await assert.rejects(
      () => sql.query(
        `INSERT INTO messaging_connectors (id, organization_id, location_id, provedor, activo, updated_at)
         VALUES (gen_random_uuid(), $1, $2, NULL, true, now())`, [IDS.orgA, IDS.unidadeA]),
      /conector_activo_exige_provedor/);
  });

  it('E O PAR: com provedor, liga', async () => {
    const r = await ligar();
    assert.equal(r.ok, true, 'ninguém consegue ligar o conector');
    const c = await comA((db) => conectorDaUnidade(db, IDS.unidadeA));
    assert.equal(c.activo, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. Sem provedor, a mensagem fica PENDENTE — e nunca ENVIADA', () => {
  it('não finge que enviou', async () => {
    const t = transporteQueEntrega();
    const r = await enviar('confirmacao', acontecimento(), t);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'SEM_PROVEDOR');
    assert.equal(t.chamadas.length, 0, 'chamou o transporte sem provedor configurado');

    const { rows } = await sql.query(
      `SELECT estado, entregue_em FROM reservation_messages WHERE id = $1`, [r.mensagemId]);
    assert.equal(rows[0].estado, 'PENDENTE', 'marcou como enviada sem provedor');
    assert.equal(rows[0].entregue_em, null);
  });

  it('PENDENTE não é FALHADA — e a distinção fica no histórico', async () => {
    // Falhar é ter tentado e não ter conseguido. Chamar-lhe falha manda alguém
    // procurar um erro que não existe.
    await enviar('confirmacao', acontecimento());
    const h = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(h[0]!.estado, 'PENDENTE');
    assert.equal(h[0]!.tentativas[0]!.resultado, 'SEM_PROVEDOR');
    assert.equal(h[0]!.tentativas[0]!.provedor, null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. Reenviar não entrega duas vezes', () => {
  it('a primeira entrega chega ao transporte', async () => {
    await ligar();
    const t = transporteQueEntrega();
    const r = await enviar('confirmacao', acontecimento(), t);
    assert.ok(r.ok);
    assert.equal(t.chamadas.length, 1, 'não entregou');
  });

  it('a REENTREGA do mesmo acontecimento não chega ao transporte', async () => {
    // Reentregar é a MESMA tentativa, não uma nova: usa o mesmo acontecimento.
    await ligar();
    const t = transporteQueEntrega();
    const evento = acontecimento();
    await enviar('confirmacao', evento, t);
    const r = await enviar('confirmacao', evento, t);

    assert.equal(t.chamadas.length, 1, 'o cliente recebeu duas vezes');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'JA_ENTREGUE');

    const h = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(h.length, 1, 'o reenvio criou uma mensagem nova em vez de uma tentativa');
    assert.equal(h[0]!.tentativas.length, 2, 'a tentativa repetida não ficou registada');
    assert.equal(h[0]!.tentativas[1]!.resultado, 'JA_ENTREGUE');
  });

  it('o MESMO tipo, num acontecimento NOVO, É enviado outra vez', async () => {
    // ── O caso que a chave antiga engolia ────────────────────────────────
    //
    // «A sua mesa está pronta» pode ter de sair duas vezes na mesma noite: a
    // pessoa não veio à primeira, e o host volta a chamar. Com `(reserva, tipo)`
    // a segunda desaparecia em silêncio, e a mesa ficava vazia com gente à porta.
    await ligar();
    const t = transporteQueEntrega();
    await enviar('confirmacao', acontecimento(), t);
    const r = await enviar('confirmacao', acontecimento(), t);
    assert.equal(r.ok, true, 'o segundo aviso foi engolido pelo primeiro');
    assert.equal(t.chamadas.length, 2);
  });

  it('E O PAR: uma mensagem DIFERENTE para a mesma reserva É enviada', async () => {
    // ── Sem isto, «engole tudo o que se parece» passa os dois acima ──────
    await ligar();
    const t = transporteQueEntrega();
    await enviar('confirmacao', acontecimento(), t);
    const r = await enviar('lembrete', acontecimento(), t);

    assert.equal(r.ok, true, 'a segunda mensagem foi engolida pela deduplicação');
    assert.equal(t.chamadas.length, 2);
    const h = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(h.length, 2, 'as duas mensagens deviam existir em separado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. O resultado do provedor é guardado, e a reserva sobrevive', () => {
  it('a falha do provedor fica registada com o erro', async () => {
    await ligar();
    const r = await enviar('confirmacao', acontecimento(), {
      entregar: async () => ({ ok: false, erro: 'ligação recusada' }) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'FALHOU');
    const h = await comA((db) => historicoDeMensagens(db, IDS.unidadeA));
    assert.equal(h[0]!.estado, 'FALHADA');
    assert.equal(h[0]!.tentativas[0]!.erro, 'ligação recusada');
    assert.equal(h[0]!.tentativas[0]!.provedor, 'provedor-de-prova');
  });

  it('e a RESERVA continua confirmada', async () => {
    await ligar();
    await enviar('confirmacao', acontecimento(), { entregar: async () => ({ ok: false, erro: 'x' }) });
    const { rows } = await sql.query(`SELECT estado FROM reservations WHERE id = $1`, [reservaId]);
    assert.equal(rows[0].estado, 'CONFIRMADA', 'a falha de envio desfez a reserva');
  });

  it('depois de falhar, o reenvio TENTA outra vez — não foi entregue', async () => {
    // A deduplicação é sobre a ENTREGA, e não sobre a tentativa. Quem falhou
    // ainda não recebeu, e recusar o reenvio deixava o cliente sem mensagem
    // nenhuma para sempre.
    await ligar();
    const evento = acontecimento();
    await enviar('confirmacao', evento, { entregar: async () => ({ ok: false, erro: 'x' }) });
    const t = transporteQueEntrega();
    const r = await enviar('confirmacao', evento, t);
    assert.equal(r.ok, true, 'o reenvio de uma mensagem FALHADA foi recusado');
    assert.equal(t.chamadas.length, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5. A base exige o carimbo de uma ENVIADA', () => {
  it('marcar entregue sem hora é recusado', async () => {
    const r = await enviar('confirmacao', acontecimento());
    await assert.rejects(
      () => sql.query(
        `UPDATE reservation_messages SET estado = 'ENVIADA' WHERE id = $1`, [r.mensagemId]),
      /mensagem_entregue_tem_carimbo/);
  });
});

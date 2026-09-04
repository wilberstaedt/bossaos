import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  abrirVisitante, comEscopo, estadoDoVisitante, fecharSessao, obterPrisma,
  revogarAcessoDaMesa, rodarQrDaMesa, sessoesVivasDaMesa, visitanteActivo,
  visitantesDaUnidade,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E17 — o QR da mesa e o visitante.
 *
 * ── O par que decide a etapa ──────────────────────────────────────────────
 *
 * *«Colapsar as duas num "invalidar" dá um sistema que ou nunca roda, ou expulsa
 * gente da mesa a meio do prato.»* Por isso os dois primeiros grupos são o mesmo
 * cenário com o acto trocado, e têm de dar respostas **opostas**. Um teste que
 * só medisse um deles passava com o colapso lá dentro.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e17-';
const ACTOR = { email: 'prova-e17@bossaos.example' };
const SLUG_PUBLICO = 'e17-marina';
const ZONA = 'e17a1111-0000-4000-8000-0000000000z1'.replace('z', 'a');
const MESA = 'e17a1111-0000-4000-8000-00000000mesa'.replace(/[^0-9a-f-]/g, '1');

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA }, fn);

let mesaId = '';
let sessaoDeMesaId = '';

async function semear() {
  // A unidade precisa de endereço público: o QR aponta para lá, e sem ele a
  // porta `mesa_do_qr` não tem por onde entrar.
  await sql.query(
    `UPDATE locations SET public_slug = $1 WHERE id = $2`, [SLUG_PUBLICO, IDS.unidadeA]);

  const { rows: zonas } = await sql.query(
    `INSERT INTO service_areas (id, organization_id, location_id, nome, tipo, ordem, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'SALA', 1, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, `${PREFIXO}Sala`]);
  const { rows: mesas } = await sql.query(
    `INSERT INTO service_tables (id, organization_id, location_id, area_id, codigo, capacidade, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 4, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, zonas[0].id, `${PREFIXO}07`]);
  mesaId = mesas[0].id;

  const { rows: sessoes } = await sql.query(
    `INSERT INTO table_sessions (id, organization_id, location_id, table_id, estado, comensais, aberta_por, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'ABERTA', 2, $4, now()) RETURNING id`,
    [IDS.orgA, IDS.unidadeA, mesaId, ACTOR.email]);
  sessaoDeMesaId = sessoes[0].id;
}

async function limpar() {
  await sql.query(`DELETE FROM guest_sessions WHERE table_id IN
     (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM table_session_events WHERE session_id IN
     (SELECT id FROM table_sessions WHERE table_id IN
       (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%'))`);
  await sql.query(`DELETE FROM table_sessions WHERE table_id IN
     (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM service_tables WHERE codigo LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM service_areas WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`UPDATE locations SET public_slug = NULL WHERE public_slug = '${SLUG_PUBLICO}'`);
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

/** Roda o QR e devolve o segredo em claro. */
async function rodar() {
  const r = await comA((db) => rodarQrDaMesa(db, { tableId: mesaId, actor: ACTOR }));
  assert.ok(r.ok, 'a rotação falhou');
  return r;
}

/** Abre uma sessão de visitante com um segredo. `null` se não abrir. */
const entrar = (segredo: string) =>
  abrirVisitante(prisma, { publicSlug: SLUG_PUBLICO, segredo });

// ═══════════════════════════════════════════════════════════════════════════
describe('1. RODAR com uma sessão viva: ela continua a pedir', () => {
  it('o cenário não está vazio: há mesa aberta e um visitante dentro', async () => {
    // «Verde sobre nada» é o falso verde de sempre. Antes de afirmar, declara-se.
    const primeiro = await rodar();
    const visitante = await entrar(primeiro.segredo);
    assert.ok(visitante, 'o visitante não conseguiu entrar: não há o que medir');
    assert.ok(await visitanteActivo(prisma, visitante.token), 'a sessão nasceu morta');
  });

  it('depois de RODAR, a sessão que já lá estava CONTINUA activa', async () => {
    // É o caso que o contrato põe primeiro, e o que separa a regra certa da
    // preguiçosa: se ela cair, a rotação está a revogar e o par colapsou.
    const primeiro = await rodar();
    const visitante = await entrar(primeiro.segredo);
    assert.ok(visitante);

    const segundo = await rodar();
    assert.notEqual(segundo.segredo, primeiro.segredo, 'a rotação não trocou o segredo');
    assert.equal(segundo.geracao, primeiro.geracao + 1);

    const aindaVale = await visitanteActivo(prisma, visitante.token);
    assert.ok(aindaVale, 'RODAR expulsou alguém da mesa a meio do prato');
    assert.equal(aindaVale.tableSessionId, sessaoDeMesaId);

    // E a rotação diz quantas continuaram: é a pergunta que quem roda tem na
    // cabeça — «vou estragar o jantar de alguém?».
    assert.equal(segundo.sessoesQueContinuam, 1);
  });

  it('mas o QR ANTIGO já não abre sessão nova', async () => {
    // Ponto 4 do contrato: as duas coisas ao mesmo tempo são a prova de que são
    // dois actos. Sem isto, «rodar não fecha nada» seria satisfeito por uma
    // rotação que não roda nada.
    const primeiro = await rodar();
    await rodar();
    assert.equal(await entrar(primeiro.segredo), null, 'o QR antigo ainda abre sessões');
  });

  it('O PAR: o QR NOVO abre', async () => {
    // Sem isto, tudo acima passava com um sistema que nunca abre sessão nenhuma.
    const primeiro = await rodar();
    const segundo = await rodar();
    void primeiro;
    assert.ok(await entrar(segundo.segredo), 'o QR novo também não abre');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. REVOGAR com uma sessão viva: ela deixa de pedir', () => {
  it('a sessão cai, e o número é sabido ANTES de confirmar', async () => {
    const { segredo } = await rodar();
    const visitante = await entrar(segredo);
    assert.ok(visitante);

    // O número ANTES. «Descartar é aceitável quando quem decide sabe o que está
    // a descartar; descobrir depois não é.»
    const vivas = await comA((db) => sessoesVivasDaMesa(db, mesaId));
    assert.equal(vivas.length, 1, 'o ecrã de revogar não teria número para mostrar');

    const r = await comA((db) => revogarAcessoDaMesa(db, {
      tableId: mesaId, motivo: 'uma fotografia do QR apareceu num grupo', actor: ACTOR,
    }));
    assert.ok(r.ok);
    assert.equal(r.revogadas, 1);

    assert.equal(await visitanteActivo(prisma, visitante.token), null,
      'a sessão revogada continuou a poder pedir');
  });

  it('revogar EXIGE motivo', async () => {
    const r = await comA((db) => revogarAcessoDaMesa(db, {
      tableId: mesaId, motivo: '   ', actor: ACTOR,
    }));
    assert.equal(r.ok, false);
    assert.equal(r.ok === false ? r.motivo : '', 'sem_motivo');
  });

  it('e revogar NÃO roda o segredo: são dois actos', async () => {
    // Juntá-los aqui por conveniência era refazer o colapso pelo outro lado.
    const { segredo } = await rodar();
    await entrar(segredo);
    await comA((db) => revogarAcessoDaMesa(db, {
      tableId: mesaId, motivo: 'pedidos que o cliente não fez', actor: ACTOR,
    }));
    // O mesmo segredo continua a abrir sessões novas — porque revogar fecha as
    // vivas e mais nada. Quem quer as duas coisas faz as duas.
    assert.ok(await entrar(segredo), 'revogar trocou o segredo pelas costas');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. mesa FECHADA com QR válido: não abre sessão nenhuma', () => {
  it('é o caso que tira valor à fotografia', async () => {
    const { segredo } = await rodar();
    // O segredo é o ACTUAL — não há nada de errado com o QR. O que muda é a mesa.
    assert.ok(await entrar(segredo), 'o cenário não abre nem com a mesa aberta');

    await comA((db) => fecharSessao(db, IDS.orgA, sessaoDeMesaId, ACTOR));

    assert.equal(await entrar(segredo), null,
      'a fotografia do QR abriu sessão com a mesa fechada');
  });

  it('e a sessão que já existia morre COM a mesa, sem ninguém a escrever', async () => {
    // «A conta fecha, a credencial morre com ela.» É derivado, e por isso não há
    // uma escrita que se possa esquecer.
    const { segredo } = await rodar();
    const visitante = await entrar(segredo);
    assert.ok(visitante);
    assert.ok(await visitanteActivo(prisma, visitante.token));

    await comA((db) => fecharSessao(db, IDS.orgA, sessaoDeMesaId, ACTOR));

    assert.equal(await visitanteActivo(prisma, visitante.token), null,
      'a credencial sobreviveu ao fecho da conta');

    // E o estado que o ecrã mostra distingue as três situações — a linha não foi
    // marcada como revogada, porque ninguém a revogou.
    const todos = await comA((db) => visitantesDaUnidade(db, IDS.unidadeA));
    const meu = todos.find((v: { id: string }) => v.id === visitante.guestId);
    assert.ok(meu);
    assert.equal(meu.estado, 'ACTIVA', 'o fecho da mesa escreveu na sessão do visitante');
    assert.equal(estadoDoVisitante(meu), 'MESA_FECHADA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. um segredo que não existe não abre nada', () => {
  it('e o cenário está montado, senão isto passava por vácuo', async () => {
    const { segredo } = await rodar();
    assert.ok(await entrar(segredo), 'nem o segredo certo abre: a prova é vazia');
    assert.equal(await entrar('nao-e-um-segredo-desta-mesa'), null);
  });

  it('uma mesa sem QR emitido não abre com segredo nenhum', async () => {
    // `qr_segredo_hash` a `null` é uma mesa sem QR, e é um estado real. A porta
    // exige `IS NOT NULL` — sem isso, um `null = null` em SQL dá `null`, que não
    // é verdadeiro, mas depender disso era depender de uma subtileza.
    assert.equal(await entrar(''), null);
    assert.equal(await entrar('qualquer-coisa'), null);
  });
});

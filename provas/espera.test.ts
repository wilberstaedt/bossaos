import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  chamarDaEspera, comEscopo, desistir, entrarNaEspera, esperaDaUnidade,
  esperaEstimada, guardarDefinicoes, obterPrisma, posicaoNaEspera,
  sentarQuemEsperava, sugestoesParaMesa,
} from '../packages/db/src/index.ts';
import { posicaoDerivada, mesasQueServem } from '../packages/domain/src/espera.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E19 — a lista de espera.
 *
 * ── O par que decide a etapa ──────────────────────────────────────────────
 *
 * «A ordem de chegada não é a ordem de sentar.» Um grupo de 6 não bloqueia um de
 * 2 quando o que vaga é uma mesa de 2 — e o de 6 **não muda de posição** quando
 * isso acontece.
 *
 * Por isso o grupo 2 é o mesmo cenário duas vezes, com a pergunta trocada: a
 * posição do pequeno muda, a do grande não. Um teste que só medisse a primeira
 * passava com uma fila lá dentro.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e19-';
const ESCOPO = { organizationId: IDS.orgA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let zonaSalaId = '';
let zonaTerracoId = '';
let mesa2Id = '';
let mesa6Id = '';
let mesaTerraco2Id = '';

async function semear() {
  const { rows: z } = await sql.query(
    `INSERT INTO service_areas (id, organization_id, location_id, nome, tipo, ordem, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'SALA', 1, now()),
            (gen_random_uuid(), $1, $2, $4, 'TERRACO', 2, now()) RETURNING id, nome`,
    [IDS.orgA, IDS.unidadeA, `${PREFIXO}Sala`, `${PREFIXO}Terraco`]);
  zonaSalaId = z.find((r: { nome: string }) => r.nome.endsWith('Sala')).id;
  zonaTerracoId = z.find((r: { nome: string }) => r.nome.endsWith('Terraco')).id;

  const { rows: m } = await sql.query(
    `INSERT INTO service_tables (id, organization_id, location_id, area_id, codigo, capacidade, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 2, now()),
            (gen_random_uuid(), $1, $2, $3, $5, 4, now()),
            (gen_random_uuid(), $1, $2, $3, $6, 6, now()),
            (gen_random_uuid(), $1, $2, $7, $8, 2, now())
     RETURNING id, codigo`,
    [IDS.orgA, IDS.unidadeA, zonaSalaId, `${PREFIXO}S2`, `${PREFIXO}S4`, `${PREFIXO}S6`,
     zonaTerracoId, `${PREFIXO}T2`]);
  const acha = (c: string) => m.find((r: { codigo: string }) => r.codigo === `${PREFIXO}${c}`).id;
  // A mesa de 4 existe e não tem nome aqui de propósito: nenhum caso lhe toca
  // directamente, mas é ela que faz o grupo de 2 caber em TRÊS mesas e o de 5
  // ou 6 caber em UMA. Sem ela os conjuntos colapsavam e o agrupamento por
  // mesas deixava de ter o que separar.
  mesa2Id = acha('S2'); mesa6Id = acha('S6'); mesaTerraco2Id = acha('T2');

  await comA((db) => guardarDefinicoes(db, IDS.orgA, IDS.unidadeA, {
    activo: true, duracaoPadraoMin: 90, retencaoMin: 15 }));
}

async function limpar() {
  const esperas = `(SELECT id FROM waitlist_entries WHERE nome LIKE '${PREFIXO}%')`;
  await sql.query(`DELETE FROM waitlist_areas WHERE waitlist_id IN ${esperas}`);
  await sql.query(`DELETE FROM waitlist_entries WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM table_sessions WHERE table_id IN
     (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`);
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

/** Entra alguém, com um instante de chegada controlado. */
async function chega(nome: string, pessoas: number, minutosAtras: number, zonas: string[] = []) {
  const id = await comA((db) => entrarNaEspera(db, IDS.orgA, IDS.unidadeA, {
    nome: `${PREFIXO}${nome}`, contacto: `${nome}@inspeccao.example`, pessoas, zonas }));
  await sql.query(
    `UPDATE waitlist_entries SET created_at = now() - make_interval(mins => $2) WHERE id = $1`,
    [id, minutosAtras]);
  return id;
}

// ═══════════════════════════════════════════════════════════════════════════
describe('1. A base NÃO TEM onde guardar uma posição', () => {
  it('não existe coluna posicao, numero_na_fila nem senha', async () => {
    // ── A garantia é uma ausência, e uma ausência prova-se assim ──────────
    //
    // «Ninguém pode mostrar um número errado se o número não existe em lado
    // nenhum para ser mostrado.» Uma alteração que acrescente a coluna faz isto
    // ficar vermelho — que é o momento certo para essa conversa acontecer.
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'waitlist_entries'`);
    const colunas = rows.map((r: { column_name: string }) => r.column_name);
    assert.ok(colunas.length > 0, 'não li colunas nenhumas: a asserção seria vazia');
    for (const proibida of ['posicao', 'numero_na_fila', 'senha', 'ordem', 'lugar']) {
      assert.ok(!colunas.includes(proibida), `waitlist_entries tem a coluna ${proibida}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. A ordem de chegada NÃO é a ordem de sentar', () => {
  it('o cenário existe: três grupos, e o de 6 chegou primeiro', async () => {
    const seis = await chega('seis', 6, 30);
    await chega('doisA', 2, 20);
    await chega('doisB', 2, 10);
    const lista = await comA((db) => esperaDaUnidade(db, IDS.unidadeA));
    assert.equal(lista.length, 3, 'sem os três não há o que medir');
    assert.equal(lista[0]!.id, seis, 'a ordem de chegada não é a que o host vê');
  });

  it('o grupo de 6 é o 1.º DOS GRUPOS DE 5 OU 6, e não o 1.º de três', async () => {
    const seis = await chega('seis', 6, 30);
    await chega('doisA', 2, 20);
    await chega('doisB', 2, 10);
    const p = await comA((db) => posicaoNaEspera(db, IDS.unidadeA, seis));
    // Só a mesa de 6 o serve; os grupos de 2 cabem em três mesas. São listas
    // diferentes, e por isso o denominador é 1.
    assert.deepEqual(p, { posicao: 1, de: 1 });
  });

  it('o segundo grupo de 2 é o 2.º DOS DE 2', async () => {
    await chega('seis', 6, 30);
    await chega('doisA', 2, 20);
    const doisB = await chega('doisB', 2, 10);
    const p = await comA((db) => posicaoNaEspera(db, IDS.unidadeA, doisB));
    assert.deepEqual(p, { posicao: 2, de: 2 }, 'o de 6 entrou na conta dos de 2');
  });

  it('SENTAR o de 2 muda a posição do outro de 2', async () => {
    await chega('seis', 6, 30);
    const doisA = await chega('doisA', 2, 20);
    const doisB = await chega('doisB', 2, 10);

    const antes = await comA((db) => posicaoNaEspera(db, IDS.unidadeA, doisB));
    assert.deepEqual(antes, { posicao: 2, de: 2 });

    const { rows } = await sql.query(
      `INSERT INTO table_sessions (id, organization_id, location_id, table_id, estado, comensais, aberta_por, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'ABERTA', 2, $4, now()) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, mesa2Id, `${PREFIXO}host`]);
    await comA((db) => sentarQuemEsperava(db, doisA, rows[0].id));

    const depois = await comA((db) => posicaoNaEspera(db, IDS.unidadeA, doisB));
    assert.deepEqual(depois, { posicao: 1, de: 1 }, 'a posição não seguiu a composição da espera');
  });

  it('E O PAR: a posição do de 6 NÃO muda com isso', async () => {
    // ── É este o caso que separa uma lista de espera de uma fila ─────────
    //
    // Numa fila, sentar alguém à frente sobe toda a gente. Aqui não: o de 6
    // continua a ser o 1.º dos grupos de 5 ou 6, porque a mesa de 2 nunca foi
    // dele. Sem este par, «tudo sobe» passava o teste anterior.
    const seis = await chega('seis', 6, 30);
    const doisA = await chega('doisA', 2, 20);
    await chega('doisB', 2, 10);

    const antes = await comA((db) => posicaoNaEspera(db, IDS.unidadeA, seis));
    const { rows } = await sql.query(
      `INSERT INTO table_sessions (id, organization_id, location_id, table_id, estado, comensais, aberta_por, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'ABERTA', 2, $4, now()) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, mesa2Id, `${PREFIXO}host`]);
    await comA((db) => sentarQuemEsperava(db, doisA, rows[0].id));
    const depois = await comA((db) => posicaoNaEspera(db, IDS.unidadeA, seis));

    assert.deepEqual(depois, antes,
      'o grupo de 6 mudou de posição porque um grupo de 2 se sentou: isto é uma fila');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. A posição agrupa pelas MESAS, e as zonas contam', () => {
  it('a conta pura: 5 e 6 caem no mesmo grupo, 2 não', () => {
    const mesas = [
      { id: 'm2', areaId: 'z', capacidade: 2 },
      { id: 'm6', areaId: 'z', capacidade: 6 },
    ];
    const cinco = { id: 'a', pessoas: 5, zonas: [], chegouEm: new Date(1) };
    const seis = { id: 'b', pessoas: 6, zonas: [], chegouEm: new Date(2) };
    const dois = { id: 'c', pessoas: 2, zonas: [], chegouEm: new Date(3) };
    assert.deepEqual(mesasQueServem(cinco, mesas), mesasQueServem(seis, mesas));
    assert.notDeepEqual(mesasQueServem(dois, mesas), mesasQueServem(seis, mesas));
    assert.deepEqual(posicaoDerivada(seis, [cinco, seis, dois], mesas), { posicao: 2, de: 2 });
  });

  it('quem só aceita o terraço não entra na conta de quem aceita tudo', async () => {
    await chega('salaOuTerraco', 2, 30);
    const soTerraco = await chega('soTerraco', 2, 20, [zonaTerracoId]);
    const p = await comA((db) => posicaoNaEspera(db, IDS.unidadeA, soTerraco));
    // O terraço só tem uma mesa; quem aceita tudo cabe em três. Listas
    // diferentes, e por isso quem espera pelo terraço é o 1.º do que espera.
    assert.deepEqual(p, { posicao: 1, de: 1 });
  });

  it('quem não cabe em mesa nenhuma NÃO tem posição — e não é o último', async () => {
    // Dizer «é o 7.º» a quem esta sala nunca vai poder sentar é a promessa mais
    // falsa de todas. `null` é a resposta honesta, e o ecrã tem de a saber dizer.
    const enorme = await chega('vinte', 20, 5);
    const p = await comA((db) => posicaoNaEspera(db, IDS.unidadeA, enorme));
    assert.equal(p, null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('4. O host vê a ordem de chegada, e a sugestão diz PORQUÊ', () => {
  it('a sugestão para a mesa de 2 traz os grupos de 2, por ordem de chegada', async () => {
    await chega('seis', 6, 30);
    const doisA = await chega('doisA', 2, 20);
    const doisB = await chega('doisB', 2, 10);

    const s = await comA((db) => sugestoesParaMesa(db, IDS.unidadeA, mesa2Id));
    assert.deepEqual(s.map((x) => x.espera.id), [doisA, doisB],
      'a sugestão não seguiu a ordem de chegada, ou deixou entrar quem não cabe');
    assert.equal(s[0]!.porque.codigo, `${PREFIXO}S2`, 'a sugestão não diz em que mesa cabe');
  });

  it('a sugestão devolve TODOS os que cabem — escolher é do host', async () => {
    await chega('quatro', 4, 30);
    await chega('dois', 2, 20);
    const s = await comA((db) => sugestoesParaMesa(db, IDS.unidadeA, mesa6Id));
    assert.equal(s.length, 2, 'o produto escolheu por ele em vez de sugerir');
  });

  it('quem prefere o terraço não é sugerido para uma mesa da sala', async () => {
    await chega('soTerraco', 2, 20, [zonaTerracoId]);
    const s = await comA((db) => sugestoesParaMesa(db, IDS.unidadeA, mesa2Id));
    assert.equal(s.length, 0);
    const t = await comA((db) => sugestoesParaMesa(db, IDS.unidadeA, mesaTerraco2Id));
    assert.equal(t.length, 1, 'a preferência de zona virou uma exclusão de tudo');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('5. A estimativa nunca viaja sozinha', () => {
  it('o número sai sempre com a marca de estimativa', async () => {
    const dois = await chega('dois', 2, 10);
    const e = await comA((db) => esperaEstimada(db, IDS.unidadeA, dois));
    assert.ok(e, 'não houve estimativa nenhuma');
    assert.equal(e.estimativa, true, 'o número saiu sem dizer que é uma estimativa');
    assert.equal(e.minutos, 90, 'a conta não é posição × duração da casa');
  });

  it('quem não cabe em mesa nenhuma não recebe estimativa', async () => {
    const enorme = await chega('vinte', 20, 5);
    assert.equal(await comA((db) => esperaEstimada(db, IDS.unidadeA, enorme)), null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('6. Chamar, sentar e desistir', () => {
  it('chamar carimba a hora — a base não deixa passar sem ela', async () => {
    const dois = await chega('dois', 2, 10);
    const expira = await comA((db) => chamarDaEspera(
      db, IDS.unidadeA, dois, mesa2Id, new Date(), new Date(Date.now() + 3600_000)));
    assert.ok(expira instanceof Date);
    const { rows } = await sql.query(
      `SELECT estado, chamado_em, oferta_expira_em FROM waitlist_entries WHERE id = $1`, [dois]);
    assert.equal(rows[0].estado, 'COM_OFERTA');
    assert.ok(rows[0].chamado_em, 'chamou sem carimbar a hora');
  });

  it('a base RECUSA um SENTADO sem carimbo', async () => {
    // O `CHECK` é a garantia: o relatório de tempos de espera sai destes
    // carimbos, e uma linha sem eles fazia o número nascer errado.
    const dois = await chega('dois', 2, 10);
    await assert.rejects(
      () => sql.query(`UPDATE waitlist_entries SET estado = 'SENTADO' WHERE id = $1`, [dois]),
      /espera_carimbo_bate_com_estado/);
  });

  it('desistir larga a vaga — senão a mesa fica presa a quem foi embora', async () => {
    const dois = await chega('dois', 2, 10);
    await comA((db) => chamarDaEspera(
      db, IDS.unidadeA, dois, mesa2Id, new Date(), new Date(Date.now() + 3600_000)));
    await comA((db) => desistir(db, dois));
    const { rows } = await sql.query(
      `SELECT estado, oferta_table_id, desistiu_em FROM waitlist_entries WHERE id = $1`, [dois]);
    assert.equal(rows[0].estado, 'DESISTIU');
    assert.equal(rows[0].oferta_table_id, null, 'a vaga ficou presa a uma espera morta');
    assert.ok(rows[0].desistiu_em);
  });

  it('quem desistiu sai da espera e das contas', async () => {
    await chega('doisA', 2, 20);
    const doisB = await chega('doisB', 2, 10);
    await comA((db) => desistir(db, doisB));
    const lista = await comA((db) => esperaDaUnidade(db, IDS.unidadeA));
    assert.equal(lista.length, 1);
    assert.equal(await comA((db) => posicaoNaEspera(db, IDS.unidadeA, doisB)), null);
  });
});

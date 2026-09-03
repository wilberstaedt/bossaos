import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  comEscopo, comIdentidade, concessoesDaPlataforma, ePlataforma, flagsDaPlataforma,
  obterPrisma, organizacaoDaPlataforma, organizacoesDaPlataforma,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * A superfície interna de plataforma (PLAT-002, 003, 004, 006, 010, 011).
 *
 * ── O que a decide ──────────────────────────────────────────────────────────
 *
 * **O par**, como em todas as etapas anteriores. A leitura que atravessa
 * inquilinos é exactamente a que o E03 existe para recusar, e por isso não
 * chega provar que ela funciona para quem é da plataforma nem que rebenta para
 * quem não é:
 *
 *   1. com o Diogo (staff) → devolve as duas organizações;
 *   2. com a Ana (cliente) → **rebenta**, e a mensagem não diz o que existe.
 *
 * Só (2) passaria num sistema que rebentasse para toda a gente e não mostrasse
 * nada a ninguém, que é uma superfície de plataforma que não serve para nada.
 *
 * E a Ana **é dona de uma organização** — não é uma estranha. É essa a diferença
 * que interessa: ser dona da sua não a torna dona da plataforma.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const comoStaff = <T>(fn: Parameters<typeof comIdentidade<T>>[2]) =>
  comIdentidade(prisma, IDS.utilizadorPlataforma, fn);
const comoCliente = <T>(fn: Parameters<typeof comIdentidade<T>>[2]) =>
  comIdentidade(prisma, IDS.utilizadorA, fn);

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});

after(async () => {
  await sql.end();
  await prisma.$disconnect();
});

describe('1. O par: quem é da plataforma vê, quem é cliente não', () => {
  it('o staff vê as organizações TODAS, e são mais do que uma', async () => {
    const orgs = await comoStaff((db) => organizacoesDaPlataforma(db));
    // Mais do que uma: é isso que prova que a leitura atravessa inquilinos. Com
    // uma só, o resultado seria indistinguível de uma leitura com escopo.
    assert.ok(orgs.length >= 2, `só ${orgs.length} organização(ões) — a leitura não atravessa inquilinos`);
    const ids = orgs.map((o) => o.id);
    assert.ok(ids.includes(IDS.orgA) && ids.includes(IDS.orgB));
  });

  it('a dona de uma organização NÃO vê a superfície', async () => {
    await assert.rejects(
      () => comoCliente((db) => organizacoesDaPlataforma(db)),
      /sem acesso à plataforma/,
      'uma cliente conseguiu listar todos os inquilinos',
    );
  });

  it('`ePlataforma` distingue os dois, e é o que o ecrã usa', async () => {
    assert.equal(await comoStaff((db) => ePlataforma(db)), true);
    assert.equal(await comoCliente((db) => ePlataforma(db)), false);
  });

  it('sem identidade nenhuma, também não', async () => {
    // Sem `app.user_id` definido, `app_utilizador_actual()` devolve NULL e NULL
    // não está em tabela nenhuma. É o caso 3 do isolamento aplicado aqui: sem
    // contexto, a mesma consulta positiva tem de recusar.
    await assert.rejects(
      () => prisma.$queryRaw`SELECT * FROM plataforma_organizacoes()`,
      /sem acesso à plataforma/,
    );
  });
});

describe('2. Os números vêm da base, não do ecrã', () => {
  it('o detalhe conta unidades e pessoas, e bate com a contagem directa', async () => {
    const detalhe = await comoStaff((db) => organizacaoDaPlataforma(db, IDS.orgA));
    assert.ok(detalhe, 'a organização A não apareceu no detalhe');

    const { rows: u } = await sql.query(
      'SELECT count(*)::int AS n FROM locations WHERE organization_id = $1 AND archived_at IS NULL', [IDS.orgA]);
    const { rows: p } = await sql.query(
      "SELECT count(*)::int AS n FROM memberships WHERE organization_id = $1 AND estado = 'ACTIVO'", [IDS.orgA]);
    assert.equal(detalhe.unidades, u[0].n);
    assert.equal(detalhe.utilizadores, p[0].n);
    assert.ok(detalhe.unidades > 0, 'zero unidades: o detalhe passaria por vácuo');
  });

  it('as concessões da organização A são as dela, e não as da B', async () => {
    await sql.query(
      `INSERT INTO entitlement_grants (id, organization_id, capacidade, quota, origem, motivo, updated_at)
       VALUES (gen_random_uuid(), $1, 'kds', NULL, 'ADICIONAL', 'prova da plataforma', now())
       ON CONFLICT (organization_id, capacidade, location_id) DO UPDATE SET motivo = 'prova da plataforma'`,
      [IDS.orgB]);
    try {
      const deA = await comoStaff((db) => concessoesDaPlataforma(db, IDS.orgA));
      const deB = await comoStaff((db) => concessoesDaPlataforma(db, IDS.orgB));
      assert.ok(deB.some((c) => c.capacidade === 'kds'), 'a concessão que acabei de dar a B não aparece');
      assert.ok(!deA.some((c) => c.capacidade === 'kds'), 'a concessão de B apareceu em A');
    } finally {
      await sql.query("DELETE FROM entitlement_grants WHERE organization_id = $1 AND capacidade = 'kds'", [IDS.orgB]);
    }
  });

  it('as flags saem com o alcance certo: global e por organização', async () => {
    await sql.query(
      `INSERT INTO feature_flags (id, nome, organization_id, ligada, updated_at)
       VALUES (gen_random_uuid(), 'prova.plataforma', NULL, false, now()),
              (gen_random_uuid(), 'prova.plataforma', $1, true, now())
       ON CONFLICT (nome, organization_id) DO UPDATE SET ligada = EXCLUDED.ligada`, [IDS.orgA]);
    try {
      const flags = await comoStaff((db) => flagsDaPlataforma(db));
      const minhas = flags.filter((f) => f.nome === 'prova.plataforma');
      assert.equal(minhas.length, 2, 'as duas linhas da mesma flag têm de aparecer separadas');
      const global = minhas.find((f) => f.organizationId === null);
      const daOrg = minhas.find((f) => f.organizationId === IDS.orgA);
      assert.equal(global?.ligada, false);
      assert.equal(daOrg?.ligada, true);
      // O nome da organização vem no resultado: um ecrã que só tivesse o id
      // obrigaria quem opera a decorar UUIDs.
      assert.ok(daOrg?.organizacao, 'a flag da organização veio sem nome');
    } finally {
      await sql.query("DELETE FROM feature_flags WHERE nome = 'prova.plataforma'");
    }
  });
});

describe('3. A tabela de staff não é alcançável pelo runtime', () => {
  it('o runtime não lê `platform_staff` directamente', async () => {
    // Se lesse, a próxima pessoa a escrever uma consulta "só para saber" abria
    // caminho para a escrita. A porta é a função, e mais nada.
    await assert.rejects(
      () => comoStaff((db) => db.$queryRaw`SELECT count(*) FROM platform_staff`),
      /permission denied/i,
    );
  });

  it('nem de dentro de um inquilino', async () => {
    await assert.rejects(
      () => comEscopo(prisma, { organizationId: IDS.orgA }, (db) =>
        db.$queryRaw`SELECT count(*) FROM platform_staff`),
      /permission denied/i,
    );
  });

  it('e o runtime não se pode acrescentar a ela', async () => {
    await assert.rejects(
      () => comoCliente((db) => db.$executeRaw`
        INSERT INTO platform_staff (user_id, motivo) VALUES (${IDS.utilizadorA}::uuid, 'eu próprio')`),
      /permission denied/i,
      'um cliente conseguiu dar-se acesso de plataforma',
    );
  });
});

import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  comEscopo, contarUnidades, estadoComercial, guardarTema, obterPrisma,
  podeCapacidade, previaDeDescida, reverterAoPadrao, temaActivo,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * A prova do E05.
 *
 * O alvo está em `docs/architecture/planos-e-limites.md`, escrito no E00 antes
 * desta etapa. Corre com o **papel real de runtime**, contra a base.
 *
 * ── O que a decide ──────────────────────────────────────────────────────────
 *
 * O par, outra vez, noutra dimensão:
 *
 *   1. com a quota ausente, criar a segunda unidade é **recusado**
 *   2. com a quota concedida a 3, é **aceite**
 *
 * Se os dois passam, a verificação não está lá.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

/** Põe a organização num plano. Só a credencial de migração pode. */
async function assinar(organizationId: string, codigo: string) {
  await sql.query(
    `INSERT INTO subscriptions (id, organization_id, plan_id, estado, updated_at)
     SELECT gen_random_uuid(), $1, p.id, 'ACTIVA', now() FROM plan_definitions p WHERE p.codigo = $2
     ON CONFLICT (organization_id) DO UPDATE
       SET plan_id = (SELECT id FROM plan_definitions WHERE codigo = $2),
           estado = 'ACTIVA', valido_ate = NULL, updated_at = now()`,
    [organizationId, codigo],
  );
}

async function conceder(
  organizationId: string,
  capacidade: string,
  quota: number | null,
  validoAte: Date | null = null,
) {
  await sql.query(
    `INSERT INTO entitlement_grants (id, organization_id, capacidade, quota, valido_ate, origem, motivo, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'ADICIONAL', 'prova do E05', now())
     ON CONFLICT (organization_id, capacidade, location_id)
       DO UPDATE SET quota = $3, valido_ate = $4, updated_at = now()`,
    [organizationId, capacidade, quota, validoAte],
  );
}

async function limparConcessoes(organizationId: string) {
  await sql.query("DELETE FROM entitlement_grants WHERE organization_id = $1 AND origem = 'ADICIONAL'", [organizationId]);
}

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA }, fn);
const comB = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgB }, fn);

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
  await assinar(IDS.orgA, 'STARTER');
  await assinar(IDS.orgB, 'PRO');
});

beforeEach(async () => {
  await limparConcessoes(IDS.orgA);
  await limparConcessoes(IDS.orgB);
});

after(async () => {
  await limparConcessoes(IDS.orgA);
  await limparConcessoes(IDS.orgB);
  await sql.query("DELETE FROM theme_revisions WHERE organization_id IN ($1, $2)", [IDS.orgA, IDS.orgB]);
  await sql.query("DELETE FROM feature_flags WHERE nome LIKE 'prova.%'");
  await sql.end();
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('quota: o par que decide', () => {
  it('1. o piloto tem UMA unidade, e criar a segunda é recusado', async () => {
    const r = await comA(async (db) => {
      const estado = await estadoComercial(db, IDS.orgA);
      const uso = await contarUnidades(db);
      return { estado, uso, decisao: podeCapacidade(estado, { capacidade: 'unidades', intencao: 'criar', usoActual: uso }) };
    });
    assert.ok(r.uso >= 1, 'a organização A tem unidades a sério');
    assert.ok(!r.decisao.permitido, 'expansão não contratada tem de ficar bloqueada');
  });

  it('2. com a quota concedida acima do uso, é aceite', async () => {
    const uso = await comA((db) => contarUnidades(db));
    await conceder(IDS.orgA, 'unidades', uso + 1);
    const decisao = await comA(async (db) =>
      podeCapacidade(await estadoComercial(db, IDS.orgA), {
        capacidade: 'unidades', intencao: 'criar', usoActual: uso,
      }),
    );
    assert.ok(decisao.permitido, 'é este caso que dá sentido ao anterior');
  });

  it('e a diferença está medida', async () => {
    const uso = await comA((db) => contarUnidades(db));
    const sem = await comA(async (db) =>
      podeCapacidade(await estadoComercial(db, IDS.orgA), { capacidade: 'unidades', intencao: 'criar', usoActual: uso }));
    await conceder(IDS.orgA, 'unidades', uso + 5);
    const com = await comA(async (db) =>
      podeCapacidade(await estadoComercial(db, IDS.orgA), { capacidade: 'unidades', intencao: 'criar', usoActual: uso }));
    assert.notEqual(sem.permitido, com.permitido);
  });

  it('uma concessão com quota NULA numa quantitativa continua a negar', async () => {
    await conceder(IDS.orgA, 'produtos', null);
    const d = await comA(async (db) =>
      podeCapacidade(await estadoComercial(db, IDS.orgA), { capacidade: 'produtos', intencao: 'criar', usoActual: 0 }));
    assert.ok(!d.permitido);
    assert.equal((d as { motivo: string }).motivo, 'quota_por_configurar');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('tema Starter: recusa coerente E não altera dados', () => {
  const CORES = { primaria: '#1B3A2F', acento: '#C4522E', fundo: '#FBF9F4' };

  it('o Starter não grava cores próprias — e nada fica gravado', async () => {
    const antes = await comA((db) => temaActivo(db, IDS.orgA));

    const r = await comA(async (db) =>
      guardarTema(db, IDS.orgA, await estadoComercial(db, IDS.orgA), CORES));

    assert.ok(!r.ok);
    assert.equal(r.motivo, 'plano', 'nega por PLANO, não por permissão nem por contraste');

    // A outra metade do aceite: recusar e gravar à mesma seria pior do que não
    // recusar, porque ninguém iria procurar o defeito.
    const depois = await comA((db) => temaActivo(db, IDS.orgA));
    assert.deepEqual(depois, antes, 'a tentativa recusada não pode ter tocado nos dados');
    const { rows } = await sql.query('SELECT count(*)::int AS n FROM theme_revisions WHERE organization_id = $1', [IDS.orgA]);
    assert.equal(rows[0].n, 0, 'nem uma revisão inactiva foi criada');
  });

  it('o Pro grava — é o par outra vez', async () => {
    const r = await comB(async (db) =>
      guardarTema(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES));
    assert.ok(r.ok, 'sem este caso, um sistema que nega tudo passaria no anterior');

    const tema = await comB((db) => temaActivo(db, IDS.orgB));
    assert.equal(tema.primaria, CORES.primaria);
    assert.equal(tema.padrao, false);
  });

  it('o Starter vê a paleta BossaOS, e ela é a de origem', async () => {
    const tema = await comA((db) => temaActivo(db, IDS.orgA));
    assert.equal(tema.padrao, true);
    assert.equal(tema.primaria, '#102E35');
  });

  it('cores ilegíveis são bloqueadas mesmo em quem TEM o direito', async () => {
    // O plano dá o direito de escolher; não dá o direito de escolher mal.
    const r = await comB(async (db) =>
      guardarTema(db, IDS.orgB, await estadoComercial(db, IDS.orgB), {
        primaria: '#858585', fundo: '#858585',
      }));
    assert.ok(!r.ok);
    assert.equal(r.motivo, 'contraste');
  });

  it('descer de plano repõe o padrão e GUARDA o tema anterior', async () => {
    await comB(async (db) =>
      guardarTema(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES));

    const r = await comB((db) => reverterAoPadrao(db, IDS.orgB));
    assert.ok(r.revertido);
    assert.ok(r.revisaoGuardada, 'a revisão anterior tem de continuar a existir');

    const depois = await comB((db) => temaActivo(db, IDS.orgB));
    assert.equal(depois.padrao, true, 'volta à paleta BossaOS');

    // "Downgrade preserva dados e tema anterior": se ele voltar a subir, as
    // cores dele estão lá. Apagar tornaria a subida uma reconfiguração do zero.
    const { rows } = await sql.query(
      'SELECT count(*)::int AS n FROM theme_revisions WHERE organization_id = $1 AND padrao = false', [IDS.orgB]);
    assert.ok(rows[0].n >= 1, 'o tema escolhido continua guardado');
  });

  it('a prévia da descida corresponde ao que vai acontecer', async () => {
    await comB(async (db) =>
      guardarTema(db, IDS.orgB, await estadoComercial(db, IDS.orgB), CORES));

    const previa = await comB(async (db) => {
      // O estado comercial DEPOIS: sem a capacidade de cores próprias.
      const depois = { ...(await estadoComercial(db, IDS.orgB)), concessoes: [] };
      return previaDeDescida(db, IDS.orgB, depois);
    });
    assert.ok(previa.perdeCoresProprias);
    assert.equal(previa.tema.padrao, true);

    // E o que a prévia mostrou é o que a efectivação faz. Uma prévia calculada
    // por outra regra que não a da efectivação é uma prévia que mente.
    await comB((db) => reverterAoPadrao(db, IDS.orgB));
    const efectivo = await comB((db) => temaActivo(db, IDS.orgB));
    assert.equal(efectivo.padrao, previa.tema.padrao);
    assert.equal(efectivo.primaria, previa.tema.primaria);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('validade, flags e a regra do dinheiro', () => {
  it('concessão expirada diz "expirado" e não "sem plano"', async () => {
    await conceder(IDS.orgA, 'kds', null, new Date(Date.now() - 3600_000));
    const d = await comA(async (db) =>
      podeCapacidade(await estadoComercial(db, IDS.orgA), { capacidade: 'kds', intencao: 'usar' }));
    assert.ok(!d.permitido);
    assert.equal((d as { motivo: string }).motivo, 'expirado');
  });

  it('flag desligada nega mesmo com a capacidade concedida', async () => {
    await conceder(IDS.orgA, 'kds', null);
    await sql.query(
      `INSERT INTO feature_flags (id, nome, ligada, organization_id, updated_at)
       VALUES (gen_random_uuid(), 'prova.kds', false, NULL, now())
       ON CONFLICT (nome, organization_id) DO UPDATE SET ligada = false`,
    );
    const d = await comA(async (db) =>
      podeCapacidade(await estadoComercial(db, IDS.orgA), {
        capacidade: 'kds', intencao: 'usar', flag: 'prova.kds',
      }));
    assert.ok(!d.permitido);
    assert.equal((d as { motivo: string }).motivo, 'desligado');
  });

  it('reconciliar passa sem plano nenhum — a regra que protege o dinheiro', async () => {
    const d = await comA(async (db) =>
      podeCapacidade(await estadoComercial(db, IDS.orgA), {
        capacidade: 'pagamentos', intencao: 'reconciliar',
      }));
    assert.ok(d.permitido, 'fechar uma obrigação que já existe nunca é bloqueado');
  });

  it('CONTRASTE: criar uma venda nova é recusado', async () => {
    const d = await comA(async (db) =>
      podeCapacidade(await estadoComercial(db, IDS.orgA), {
        capacidade: 'pagamentos', intencao: 'criar', usoActual: 0,
      }));
    assert.ok(!d.permitido, 'é o contraste que dá sentido ao caso anterior');
  });

  it('o Starter não tem KDS; o Pro tem — pelo plano, sem concessão extra', async () => {
    const starter = await comA(async (db) =>
      podeCapacidade(await estadoComercial(db, IDS.orgA), { capacidade: 'kds', intencao: 'usar' }));
    const pro = await comB(async (db) =>
      podeCapacidade(await estadoComercial(db, IDS.orgB), { capacidade: 'kds', intencao: 'usar' }));
    assert.ok(!starter.permitido, 'Starter não inclui KDS');
    assert.ok(pro.permitido, 'Pro inclui');
  });
});

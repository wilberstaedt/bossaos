import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  aplicarDescidaAgendada, comEscopo, descidasDevidas, estadoComercial, guardarTema,
  obterPrisma, podeCapacidade, previaDeDescidaParaPlano, registarDetectorDePendencia,
  temaActivo,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * Descer de plano: o trabalho de fundo do E05.
 *
 * O alvo está em `docs/architecture/planos-e-limites.md`, escrito no E00:
 * *"Preservar dados. Bloquear operações novas. Reverter o tema público ao
 * padrão. Avisar com data. E não efectivar enquanto houver sessões, caixas ou
 * operações incompatíveis abertas."*
 *
 * ── O que esta prova existe para apanhar ────────────────────────────────────
 *
 * O aceite 2 pede a resposta certa *"inclusive em job e rota direta"*, e a razão
 * é concreta: um trabalho de fundo é onde alguém assume que a validação já foi
 * feita antes, porque "isto não vem da internet". O grupo 1 mede o **par entre
 * superfícies** — o mesmo direito expirado, na mesma organização, ao mesmo
 * tempo: o que a rota recusa, o job também tem de recusar.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA }, fn);

async function assinar(organizationId: string, codigo: string) {
  await sql.query(
    `INSERT INTO subscriptions (id, organization_id, plan_id, estado, updated_at)
     SELECT gen_random_uuid(), $1, p.id, 'ACTIVA', now() FROM plan_definitions p WHERE p.codigo = $2
     ON CONFLICT (organization_id) DO UPDATE
       SET plan_id = (SELECT id FROM plan_definitions WHERE codigo = $2),
           estado = 'ACTIVA', valido_ate = NULL,
           descer_para_plano_id = NULL, descer_em = NULL, updated_at = now()`,
    [organizationId, codigo],
  );
}

/** Agendar é acto da PLATAFORMA: escreve-se com a credencial de migração. */
async function agendarDescida(organizationId: string, paraCodigo: string, quando: Date) {
  await sql.query(
    `UPDATE subscriptions
        SET descer_para_plano_id = (SELECT id FROM plan_definitions WHERE codigo = $2),
            descer_em = $3, updated_at = now()
      WHERE organization_id = $1`,
    [organizationId, paraCodigo, quando],
  );
}

async function limpar(organizationId: string) {
  await sql.query("DELETE FROM entitlement_grants WHERE organization_id = $1 AND origem = 'ADICIONAL'", [organizationId]);
  await sql.query('DELETE FROM theme_revisions WHERE organization_id = $1', [organizationId]);
}

const ONTEM = () => new Date(Date.now() - 24 * 60 * 60 * 1000);
const AMANHA = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const CORES = { primaria: '#1B3A2F', acento: '#B4472E', fundo: '#FFFFFF' };

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});

beforeEach(async () => {
  await assinar(IDS.orgA, 'PRO');
  await limpar(IDS.orgA);
});

after(async () => {
  await assinar(IDS.orgA, 'STARTER');
  await limpar(IDS.orgA);
  await sql.end();
  await prisma.$disconnect();
});

describe('1. O par entre superfícies: o que a rota recusa, o job recusa', () => {
  it('direito ao tema VÁLIDO — a rota deixa gravar e o job não reverteria', async () => {
    await assinar(IDS.orgA, 'STARTER');
    // Concessão explícita com validade no futuro: o Starter não dá cores, este
    // adicional dá. É o lado POSITIVO do par — sem ele, um sistema que recusa
    // tudo passava no caso seguinte.
    await sql.query(
      `INSERT INTO entitlement_grants (id, organization_id, capacidade, quota, valido_ate, origem, motivo, updated_at)
       VALUES (gen_random_uuid(), $1, 'tema.coresProprias', NULL, $2, 'ADICIONAL', 'prova das descidas', now())
       ON CONFLICT (organization_id, capacidade, location_id) DO UPDATE SET valido_ate = $2, updated_at = now()`,
      [IDS.orgA, AMANHA()],
    );

    const { permitidoNaRota, previa } = await comA(async (db) => {
      const estado = await estadoComercial(db, IDS.orgA);
      const gravado = await guardarTema(db, IDS.orgA, estado, CORES);
      assert.equal(gravado.ok, true, 'com o direito válido, a rota tinha de gravar');
      return {
        permitidoNaRota: gravado.ok,
        previa: await previaDeDescidaParaPlano(db, IDS.orgA, 'STARTER'),
      };
    });

    assert.equal(permitidoNaRota, true);
    // O que o job faria HOJE, com o direito vivo: manter as cores.
    assert.equal(previa.perdeCoresProprias, false, 'o adicional sobrevive à descida');
  });

  it('direito EXPIRADO — a rota recusa com 402 e o job trata-o como perdido', async () => {
    await assinar(IDS.orgA, 'STARTER');
    await sql.query(
      `INSERT INTO entitlement_grants (id, organization_id, capacidade, quota, valido_ate, origem, motivo, updated_at)
       VALUES (gen_random_uuid(), $1, 'tema.coresProprias', NULL, $2, 'ADICIONAL', 'prova das descidas', now())
       ON CONFLICT (organization_id, capacidade, location_id) DO UPDATE SET valido_ate = $2, updated_at = now()`,
      [IDS.orgA, ONTEM()],
    );

    const r = await comA(async (db) => {
      const estado = await estadoComercial(db, IDS.orgA);
      return {
        rota: await guardarTema(db, IDS.orgA, estado, CORES),
        // A MESMA leitura, no caminho que o worker percorre.
        job: podeCapacidade(estado, { capacidade: 'tema.coresProprias', intencao: 'usar' }),
      };
    });

    assert.equal(r.rota.ok, false, 'a rota deixou gravar com o direito expirado');
    assert.equal(r.rota.ok === false && r.rota.motivo, 'plano');
    assert.equal(r.job.permitido, false, 'o job viu o direito expirado como válido');
    // E diz `expirado`, não `sem_plano`: comprado e caducado não é o mesmo que
    // nunca comprado, e quem lê a mensagem faz coisas diferentes com cada um.
    assert.equal(r.job.permitido === false && r.job.motivo, 'expirado');
  });

  it('flag DESLIGADA — nega antes do plano, nas duas superfícies', async () => {
    await assinar(IDS.orgA, 'PRO');
    await sql.query(
      `INSERT INTO feature_flags (id, nome, organization_id, ligada, updated_at)
       VALUES (gen_random_uuid(), 'tema.coresProprias', $1, false, now())
       ON CONFLICT (nome, organization_id) DO UPDATE SET ligada = false, updated_at = now()`,
      [IDS.orgA],
    );
    try {
      const r = await comA(async (db) => {
        const estado = await estadoComercial(db, IDS.orgA);
        return {
          rota: await guardarTema(db, IDS.orgA, estado, CORES),
          job: podeCapacidade(estado, { capacidade: 'tema.coresProprias', intencao: 'usar' }),
        };
      });
      assert.equal(r.rota.ok, false, 'a rota gravou com a flag desligada');
      assert.equal(r.job.permitido, false, 'o job ignorou a flag');
      // `desligado`, não `sem_plano`. O Pro PAGA as cores; o que falta é a coisa
      // existir. Dizer-lhe para comprar o que já comprou é o erro que este
      // motivo separado evita.
      assert.equal(r.job.permitido === false && r.job.motivo, 'desligado');
    } finally {
      await sql.query("DELETE FROM feature_flags WHERE nome = 'tema.coresProprias' AND organization_id = $1", [IDS.orgA]);
    }
  });
});

describe('2. A descida agendada, efectivada pelo trabalho de fundo', () => {
  it('nada agendado: o job não inventa uma descida', async () => {
    const r = await comA((db) => aplicarDescidaAgendada(db, IDS.orgA));
    assert.equal(r.aplicada, false);
    assert.equal(r.aplicada === false && r.motivo, 'nada_agendado');
  });

  it('agendada para AMANHÃ: não efectiva hoje', async () => {
    await agendarDescida(IDS.orgA, 'STARTER', AMANHA());
    const r = await comA((db) => aplicarDescidaAgendada(db, IDS.orgA));
    assert.equal(r.aplicada, false);
    assert.equal(r.aplicada === false && r.motivo, 'ainda_nao');
    // E o plano não se mexeu. Um "ainda não" que já mudou alguma coisa é a mesma
    // família da recusa que já escreveu.
    const estado = await comA((db) => estadoComercial(db, IDS.orgA));
    assert.equal(estado.planoCodigo, 'PRO');
  });

  it('agendada para ONTEM: efectiva, reverte o tema e PRESERVA o anterior', async () => {
    await comA(async (db) => {
      const estado = await estadoComercial(db, IDS.orgA);
      const g = await guardarTema(db, IDS.orgA, estado, CORES);
      assert.equal(g.ok, true, 'o Pro tinha de conseguir gravar cores');
    });
    await agendarDescida(IDS.orgA, 'STARTER', ONTEM());

    const r = await comA((db) => aplicarDescidaAgendada(db, IDS.orgA));
    assert.equal(r.aplicada, true);
    assert.equal(r.aplicada === true && r.para, 'STARTER');
    assert.equal(r.aplicada === true && r.temaRevertido, true);

    const depois = await comA(async (db) => ({
      estado: await estadoComercial(db, IDS.orgA),
      tema: await temaActivo(db, IDS.orgA),
    }));
    assert.equal(depois.estado.planoCodigo, 'STARTER');
    assert.equal(depois.tema.padrao, true, 'o tema público não voltou ao padrão');
    assert.equal(depois.estado.descerParaPlano, null, 'o agendamento ficou por limpar');

    // "Descida preserva dados e tema anterior": a revisão com as cores continua
    // lá, inactiva. Apagá-la seria a diferença entre bloquear e destruir.
    const { rows } = await sql.query(
      'SELECT primaria, activa FROM theme_revisions WHERE organization_id = $1 AND padrao = false',
      [IDS.orgA],
    );
    assert.equal(rows.length, 1, 'a revisão anterior foi apagada em vez de desactivada');
    assert.equal(rows[0].primaria, CORES.primaria);
    assert.equal(rows[0].activa, false);
  });

  it('a prévia bate com o que fica aplicado, na data de teste', async () => {
    await comA(async (db) => {
      const estado = await estadoComercial(db, IDS.orgA);
      await guardarTema(db, IDS.orgA, estado, CORES);
    });
    const previa = await comA((db) => previaDeDescidaParaPlano(db, IDS.orgA, 'STARTER'));
    assert.equal(previa.perdeCoresProprias, true);
    assert.equal(previa.tema.padrao, true);

    await agendarDescida(IDS.orgA, 'STARTER', ONTEM());
    await comA((db) => aplicarDescidaAgendada(db, IDS.orgA));
    const aplicado = await comA((db) => temaActivo(db, IDS.orgA));

    // Não é "os dois dizem padrão": é o mesmo objecto, campo a campo.
    assert.deepEqual(
      { primaria: aplicado.primaria, acento: aplicado.acento, fundo: aplicado.fundo, padrao: aplicado.padrao },
      { primaria: previa.tema.primaria, acento: previa.tema.acento, fundo: previa.tema.fundo, padrao: previa.tema.padrao },
    );
  });

  it('descer para um plano que MANTÉM as cores não reverte tema nenhum', async () => {
    // O contraste da anterior. Sem ele, um job que revertesse SEMPRE o tema
    // passava em todas as asserções de cima.
    await assinar(IDS.orgA, 'PRO');
    await comA(async (db) => {
      const estado = await estadoComercial(db, IDS.orgA);
      await guardarTema(db, IDS.orgA, estado, CORES);
    });
    await agendarDescida(IDS.orgA, 'RESTAURANT', ONTEM());

    const r = await comA((db) => aplicarDescidaAgendada(db, IDS.orgA));
    assert.equal(r.aplicada, true);
    assert.equal(r.aplicada === true && r.temaRevertido, false, 'reverteu um tema que o plano novo paga');

    const tema = await comA((db) => temaActivo(db, IDS.orgA));
    assert.equal(tema.padrao, false);
    assert.equal(tema.primaria, CORES.primaria);
  });
});

describe('3. Não efectivar por cima de operações abertas', () => {
  it('com uma pendência registada, a descida ADIA e diz qual', async () => {
    // O registo está vazio nesta etapa — caixas e sessões de serviço são E13 e
    // E19. Injecta-se uma para haver população: um mecanismo provado contra uma
    // lista vazia é a mesma coisa que não estar provado.
    const remover = registarDetectorDePendencia(async () => [
      { tipo: 'caixa_aberta', detalhe: 'Caja de la noche, sin cerrar' },
    ]);
    try {
      await agendarDescida(IDS.orgA, 'STARTER', ONTEM());
      const r = await comA((db) => aplicarDescidaAgendada(db, IDS.orgA));
      assert.equal(r.aplicada, false);
      assert.equal(r.aplicada === false && r.motivo, 'pendencias');
      assert.deepEqual(
        r.aplicada === false && r.motivo === 'pendencias' ? r.pendencias : null,
        [{ tipo: 'caixa_aberta', detalhe: 'Caja de la noche, sin cerrar' }],
      );
      // E não fechou a caixa à força: o plano continua o de antes.
      const estado = await comA((db) => estadoComercial(db, IDS.orgA));
      assert.equal(estado.planoCodigo, 'PRO');
    } finally {
      remover();
    }
  });

  it('sem pendências, a MESMA descida efectiva — é o par do caso de cima', async () => {
    await agendarDescida(IDS.orgA, 'STARTER', ONTEM());
    const r = await comA((db) => aplicarDescidaAgendada(db, IDS.orgA));
    assert.equal(r.aplicada, true, 'sem pendências devia ter efectivado');
  });
});

describe('4. As duas portas da base, e os seus limites', () => {
  it('o varrimento RECUSA-SE a responder de dentro de um inquilino', async () => {
    await assert.rejects(
      () => comA((db) => db.$queryRaw`SELECT descidas_devidas()`),
      /varrimento de descidas/,
      'um inquilino conseguiu listar quem mais está a descer de plano',
    );
  });

  it('o varrimento responde fora de escopo, e encontra o que agendei', async () => {
    await agendarDescida(IDS.orgA, 'STARTER', ONTEM());
    const devidas = await descidasDevidas(prisma);
    assert.ok(devidas.includes(IDS.orgA), `${IDS.orgA} não apareceu no varrimento`);
  });

  it('aplicar a descida de OUTRO inquilino rebenta', async () => {
    await agendarDescida(IDS.orgB, 'STARTER', ONTEM());
    // Com escopo de A, a pedir a de B. `SECURITY DEFINER` corre como o dono das
    // tabelas, para quem a política de linha não se aplica — sem a verificação
    // dentro da função, isto passava.
    await assert.rejects(
      () => comA((db) => db.$queryRaw`SELECT aplicar_descida_agendada(${IDS.orgB}::uuid)`),
      /fora do inquilino actual/,
    );
    await assinar(IDS.orgB, 'PRO');
  });

  it('o runtime continua sem poder escrever `subscriptions` à mão', async () => {
    // A porta estreita não devolveu a fechadura. Se esta asserção cair, o E05
    // deixou de proteger o catálogo comercial.
    await assert.rejects(
      () => comA((db) => db.$executeRaw`UPDATE subscriptions SET estado = 'CANCELADA' WHERE organization_id = ${IDS.orgA}::uuid`),
      /permission denied/i,
    );
  });
});

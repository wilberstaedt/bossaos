import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  abrirSessao, arquivarMesa, comEscopo, criarPareamento, definirPin,
  dispositivoPodeComandar, entrarComPin, fecharSessao, historicoDaSessao,
  iniciarEncerramento, obterPrisma, revogarDispositivo, salaAgora, transferirSessao,
  turnoAberto, usarPareamento,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E13 — sala, sessões, dispositivos e PIN.
 *
 * A régua está em `docs/reviews/ALVO-E13.md` e nomeia o defeito mais provável
 * desta etapa antes de ele existir: **concorrência provada em sequência**.
 *
 * > *«Um teste que abre a mesa, espera pela resposta e abre outra vez não testa
 * > nada — testa que o segundo pedido viu o primeiro já gravado.»*
 *
 * Por isso o grupo 1 tem duas provas diferentes da mesma coisa: uma pelo
 * produto, com as duas aberturas disparadas sem esperar; e outra com **duas
 * transacções demonstravelmente abertas ao mesmo tempo**, em que a segunda fica
 * a bloquear enquanto a primeira ainda não fez COMMIT. A segunda é a que não
 * deixa dúvida sobre haver sobreposição.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e13-';
const ACTOR = { email: 'prova-e13@bossaos.example' };
const PIN = '4917';

/** Identificadores fixos: a prova cria o seu cenário e apanha-o no fim. */
const ZONA = 'e13aaaa-0000-4000-8000-000000000001'.replace('e13aaaa', 'e13a1111');
const MESA_A = 'e13a1111-0000-4000-8000-0000000000a1';
const MESA_B = 'e13a1111-0000-4000-8000-0000000000b1';
const DISPOSITIVO = 'e13a1111-0000-4000-8000-0000000000d1';
const DISPOSITIVO_2 = 'e13a1111-0000-4000-8000-0000000000d2';

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA }, fn);

async function semear() {
  await sql.query(
    `INSERT INTO service_areas (id, organization_id, location_id, nome, tipo, ordem, updated_at)
     VALUES ($1, $2, $3, $4, 'SALA', 1, now())
     ON CONFLICT (id) DO UPDATE SET archived_at = NULL, updated_at = now()`,
    [ZONA, IDS.orgA, IDS.unidadeA, `${PREFIXO}Sala`],
  );
  for (const [id, codigo] of [[MESA_A, `${PREFIXO}07`], [MESA_B, `${PREFIXO}08`]] as const) {
    await sql.query(
      `INSERT INTO service_tables (id, organization_id, location_id, area_id, codigo, capacidade, updated_at)
       VALUES ($1, $2, $3, $4, $5, 4, now())
       ON CONFLICT (id) DO UPDATE SET archived_at = NULL, updated_at = now()`,
      [id, IDS.orgA, IDS.unidadeA, ZONA, codigo],
    );
  }
  for (const [id, nome] of [[DISPOSITIVO, `${PREFIXO}Tablet sala`], [DISPOSITIVO_2, `${PREFIXO}Tablet barra`]] as const) {
    await sql.query(
      `INSERT INTO devices (id, organization_id, location_id, nome, estacao, estado, updated_at)
       VALUES ($1, $2, $3, $4, 'SALA', 'ACTIVO', now())
       ON CONFLICT (id) DO UPDATE SET estado = 'ACTIVO', revogado_em = NULL,
         revogado_motivo = NULL, revogado_por_id = NULL, updated_at = now()`,
      [id, IDS.orgA, IDS.unidadeA, nome],
    );
  }
}

async function limpar() {
  await sql.query(`DELETE FROM table_session_events WHERE actor_email LIKE '%@bossaos.example'`);
  await sql.query(
    `DELETE FROM table_sessions WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM device_shifts WHERE device_id IN (SELECT id FROM devices WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM device_pairings WHERE device_id IN (SELECT id FROM devices WHERE nome LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM operator_pins WHERE organization_id = $1`, [IDS.orgA]);
  await sql.query(`DELETE FROM devices WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM table_combination_members WHERE table_id IN (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`);
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

beforeEach(async () => {
  await limpar();
  await semear();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('1. duas aberturas CONCORRENTES produzem UMA sessão', () => {
  it('o cenário existe: a sala não está vazia', async () => {
    // «Verde sobre sala vazia: uma sala sem mesas passa tudo.» A prova declara
    // quantas mesas existem antes de afirmar seja o que for.
    const mesas = await comA((db) => salaAgora(db, IDS.unidadeA));
    assert.equal(mesas.length, 2, `a sala tem ${mesas.length} mesas — não há o que medir`);
    assert.equal(mesas.filter((m) => m.sessao).length, 0, 'já havia sessões abertas antes de começar');
  });

  it('pelo PRODUTO: as duas disparadas SEM esperar pela primeira', async () => {
    const pedido = () => abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, comensais: 2, actor: ACTOR,
    });
    // As duas chamadas são feitas ANTES de qualquer `await`. Esperar pela
    // primeira e só depois lançar a segunda mediria que a segunda viu a primeira
    // já gravada — que é sequência, e não concorrência.
    const [a, b] = await Promise.all([pedido(), pedido()]);

    const vencedores = [a, b].filter((r) => r.ok);
    const perdedores = [a, b].filter((r) => !r.ok);
    assert.equal(vencedores.length, 1, 'as duas aberturas passaram');
    assert.equal(perdedores.length, 1);
    assert.equal((perdedores[0] as { motivo: string }).motivo, 'mesa_ocupada');

    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM table_sessions WHERE table_id = $1 AND estado <> 'FECHADA'`,
      [MESA_A]);
    assert.equal(rows[0].n, 1, `ficaram ${rows[0].n} sessões activas na mesma mesa`);
  });

  it('oito ao mesmo tempo continuam a dar UMA', async () => {
    const resultados = await Promise.all(
      Array.from({ length: 8 }, () => abrirSessao(prisma, IDS.orgA, {
        locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
      })),
    );
    assert.equal(resultados.filter((r) => r.ok).length, 1);
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM table_sessions WHERE table_id = $1 AND estado <> 'FECHADA'`,
      [MESA_A]);
    assert.equal(rows[0].n, 1);
  });

  it('A PROVA QUE NÃO DEIXA DÚVIDA: duas transacções abertas AO MESMO TEMPO', async () => {
    // ── Porque é que esta prova existe ao lado da de cima ─────────────────
    //
    // `Promise.all` dispara as duas sem esperar, e é o que o produto faz. Mas o
    // resultado seria o mesmo se o pool as tivesse servido em fila — e então a
    // prova de cima seria sequência com outro nome.
    //
    // Aqui as duas transacções estão **demonstravelmente abertas ao mesmo
    // tempo**: a segunda insere enquanto a primeira ainda não fez COMMIT, e
    // fica a BLOQUEAR no índice. O bloqueio é medido: a promessa não resolve
    // enquanto a primeira não confirmar.
    const c1 = new Client({ connectionString: RUNTIME });
    const c2 = new Client({ connectionString: RUNTIME });
    await c1.connect();
    await c2.connect();
    try {
      const inserir = (c: Client) => c.query(
        `INSERT INTO table_sessions
           (id, organization_id, location_id, table_id, estado, comensais, aberta_por, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'ABERTA', 2, $4, now())`,
        [IDS.orgA, IDS.unidadeA, MESA_A, ACTOR.email]);

      for (const c of [c1, c2]) {
        await c.query('BEGIN');
        await c.query("SELECT set_config('app.organization_id', $1, true)", [IDS.orgA]);
      }

      await inserir(c1);            // ainda SEM commit
      const segunda = inserir(c2);  // fica a bloquear no índice único

      // O bloqueio é medido, e não assumido: se a segunda tivesse passado já,
      // as duas transacções não estavam a disputar coisa nenhuma.
      let resolveu = false;
      void segunda.then(() => { resolveu = true; }, () => { resolveu = true; });
      await new Promise((r) => setTimeout(r, 300));
      assert.equal(resolveu, false,
        'a segunda inserção não bloqueou — as duas não estavam a disputar a mesma linha');

      await c1.query('COMMIT');
      await assert.rejects(segunda, (e: { code?: string }) => e.code === '23505',
        'a segunda inserção passou depois do COMMIT da primeira');
      await c2.query('ROLLBACK');

      const { rows } = await sql.query(
        `SELECT count(*)::int AS n FROM table_sessions WHERE table_id = $1 AND estado <> 'FECHADA'`,
        [MESA_A]);
      assert.equal(rows[0].n, 1);
    } finally {
      await c1.end().catch(() => {});
      await c2.end().catch(() => {});
    }
  });

  it('O PAR: depois de fechar, a mesa VOLTA a abrir', async () => {
    // Sem isto, um índice único sobre `(table_id)` sem estado passava o aceite 1
    // e deixava a mesa inutilizável para sempre.
    const primeira = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
    });
    assert.ok(primeira.ok);

    const bloqueada = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
    });
    assert.ok(!bloqueada.ok);

    await comA((db) => fecharSessao(db, IDS.orgA, primeira.sessaoId, ACTOR));

    const segunda = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
    });
    assert.ok(segunda.ok, 'a mesa ficou inutilizável depois do primeiro serviço');
    assert.notEqual(segunda.sessaoId, primeira.sessaoId);
  });

  it('pedir a conta NÃO liberta a mesa — há gente sentada', async () => {
    const s = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
    });
    assert.ok(s.ok);
    await comA((db) => iniciarEncerramento(db, IDS.orgA, s.sessaoId, ACTOR));

    const outra = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
    });
    assert.ok(!outra.ok);
    assert.equal(outra.motivo, 'mesa_ocupada');
  });

  it('uma mesa que não existe dá ausência, e não "ocupada"', async () => {
    // Duas causas com a mesma resposta é como se diagnostica a errada.
    const r = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: '00000000-0000-4000-8000-000000000000', actor: ACTOR,
    });
    assert.ok(!r.ok);
    assert.equal(r.motivo, 'mesa_desconhecida');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. revogar encerra o acesso, INCLUSIVE com PIN correto', () => {
  async function comPin() {
    const filiacao = await sql.query(
      'SELECT id FROM memberships WHERE organization_id = $1 LIMIT 1', [IDS.orgA]);
    const membershipId = filiacao.rows[0].id as string;
    await comA((db) => definirPin(db, IDS.orgA, {
      locationId: IDS.unidadeA, membershipId, pin: PIN,
    }));
    return membershipId;
  }

  it('O CONTROLO que dá sentido aos três ataques: NÃO revogado, o PIN entra', async () => {
    // Sem isto, um sistema que recusasse tudo passava os três ataques.
    const membershipId = await comPin();
    const r = await entrarComPin(prisma, IDS.orgA, {
      deviceId: DISPOSITIVO, membershipId, pin: PIN,
    });
    assert.ok(r.ok, `o PIN certo num aparelho activo não entrou: ${JSON.stringify(r)}`);

    const turno = await comA((db) => turnoAberto(db, DISPOSITIVO));
    assert.ok(turno, 'entrou e não abriu turno — não há como medir a revogação a meio');
  });

  it('ataque 1 · revogado, com o PIN CORRECTO: a recusa é pela revogação', async () => {
    const membershipId = await comPin();
    await comA((db) => revogarDispositivo(db, IDS.orgA, {
      deviceId: DISPOSITIVO, motivo: 'perdido na sala', revogadoPorId: IDS.utilizadorA,
    }));

    const r = await entrarComPin(prisma, IDS.orgA, {
      deviceId: DISPOSITIVO, membershipId, pin: PIN,
    });
    assert.ok(!r.ok);
    // E o motivo importa: `pin_errado` mandava quem tem o aparelho tentar outra
    // vez, e o PIN estava certo.
    assert.equal(r.motivo, 'dispositivo_revogado');
  });

  it('ataque 2 · revogar DURANTE o turno: os comandos seguintes param', async () => {
    const membershipId = await comPin();
    const entrada = await entrarComPin(prisma, IDS.orgA, {
      deviceId: DISPOSITIVO, membershipId, pin: PIN,
    });
    assert.ok(entrada.ok);

    // Antes: comanda.
    const antes = await comA((db) => dispositivoPodeComandar(db, DISPOSITIVO));
    assert.ok(antes.pode);

    await comA((db) => revogarDispositivo(db, IDS.orgA, {
      deviceId: DISPOSITIVO, motivo: 'furto', revogadoPorId: IDS.utilizadorA,
    }));

    // Depois: não. Um dispositivo que já entrou não fica com licença vitalícia.
    const depois = await comA((db) => dispositivoPodeComandar(db, DISPOSITIVO));
    assert.ok(!depois.pode);
    assert.equal(depois.motivo, 'dispositivo_revogado');

    const turno = await comA((db) => turnoAberto(db, DISPOSITIVO));
    assert.equal(turno, null, 'o turno ficou aberto num aparelho revogado');
  });

  it('ataque 3 · o PIN de OUTRO dispositivo, no revogado, também não entra', async () => {
    // Um PIN partilhado pela equipa é o caso real, não o improvável.
    const membershipId = await comPin();
    const noOutro = await entrarComPin(prisma, IDS.orgA, {
      deviceId: DISPOSITIVO_2, membershipId, pin: PIN,
    });
    assert.ok(noOutro.ok, 'o mesmo PIN não serve no segundo aparelho — o cenário não é o real');

    await comA((db) => revogarDispositivo(db, IDS.orgA, {
      deviceId: DISPOSITIVO, motivo: 'roubado', revogadoPorId: IDS.utilizadorA,
    }));
    const r = await entrarComPin(prisma, IDS.orgA, {
      deviceId: DISPOSITIVO, membershipId, pin: PIN,
    });
    assert.ok(!r.ok);
    assert.equal(r.motivo, 'dispositivo_revogado');
  });

  it('o PIN errado bloqueia ao fim de cinco, e diz quantas faltam', async () => {
    const membershipId = await comPin();
    let ultimo;
    for (let i = 0; i < 5; i++) {
      ultimo = await entrarComPin(prisma, IDS.orgA, {
        deviceId: DISPOSITIVO, membershipId, pin: '0000',
      });
    }
    assert.ok(ultimo && !ultimo.ok);
    assert.equal(ultimo.motivo, 'pin_errado');
    assert.equal(ultimo.tentativasRestantes, 0);

    // E o PIN CERTO já não entra: o bloqueio é por tentativas, não por PIN.
    const certo = await entrarComPin(prisma, IDS.orgA, {
      deviceId: DISPOSITIVO, membershipId, pin: PIN,
    });
    assert.ok(!certo.ok);
    assert.equal(certo.motivo, 'bloqueado');
  });

  it('o PIN não fica em claro na base', async () => {
    const membershipId = await comPin();
    const { rows } = await sql.query(
      'SELECT resumo, sal FROM operator_pins WHERE membership_id = $1', [membershipId]);
    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].resumo, PIN);
    assert.ok(!String(rows[0].resumo).includes(PIN), 'o PIN aparece no resumo');
    assert.ok(String(rows[0].sal).length >= 16, 'sal curto de mais para servir de sal');
  });

  it('o pareamento é de uso único e tem prazo', async () => {
    const criado = await comA((db) => criarPareamento(db, IDS.orgA, {
      locationId: IDS.unidadeA, nome: `${PREFIXO}Tablet novo`,
      estacao: 'SALA', criadoPorId: IDS.utilizadorA,
    }));
    // Nasce PENDENTE: um dispositivo que nasce activo é um tablet que qualquer
    // pessoa liga à rede e passa a ver a sala.
    const antes = await comA((db) => dispositivoPodeComandar(db, criado.deviceId));
    assert.ok(!antes.pode);
    assert.equal(antes.motivo, 'dispositivo_pendente');

    const usa = await comA((db) => usarPareamento(db, IDS.orgA, criado.token, IDS.utilizadorA));
    assert.ok(usa.ok);
    const depois = await comA((db) => dispositivoPodeComandar(db, criado.deviceId));
    assert.ok(depois.pode);

    // Segunda vez: recusa. O token é de uso único.
    const outra = await comA((db) => usarPareamento(db, IDS.orgA, criado.token, IDS.utilizadorA));
    assert.ok(!outra.ok);
    assert.equal(outra.motivo, 'token_usado');

    // E a base guarda o RESUMO, nunca o token.
    const { rows } = await sql.query(
      'SELECT token_hash FROM device_pairings WHERE device_id = $1', [criado.deviceId]);
    assert.notEqual(rows[0].token_hash, criado.token);
  });

  it('revogar sem motivo é recusado — uma revogação sem motivo não se revê', async () => {
    const r = await comA((db) => revogarDispositivo(db, IDS.orgA, {
      deviceId: DISPOSITIVO, motivo: '   ', revogadoPorId: IDS.utilizadorA,
    }));
    assert.ok(!r.ok);
    assert.equal(r.motivo, 'sem_motivo');
    const ainda = await comA((db) => dispositivoPodeComandar(db, DISPOSITIVO));
    assert.ok(ainda.pode, 'recusou o motivo e revogou à mesma');
  });

  it('a revogação diz o que descarta, e "não reportou" NÃO é zero', async () => {
    // A decisão da regra 3-bis: a revogação DESCARTA a fila local, e diz-se ao
    // revogar. O número vem `null` quando o aparelho nunca reportou — ausência
    // não é zero, e um zero tranquilizador que ninguém mediu é pior do que a
    // frase «não se sabe».
    const semReporte = await comA((db) => revogarDispositivo(db, IDS.orgA, {
      deviceId: DISPOSITIVO, motivo: 'saiu de serviço', revogadoPorId: IDS.utilizadorA,
    }));
    assert.ok(semReporte.ok);
    assert.equal(semReporte.rascunhosDescartados, null);

    await sql.query('UPDATE devices SET rascunhos_por_enviar = 3 WHERE id = $1', [DISPOSITIVO_2]);
    const comReporte = await comA((db) => revogarDispositivo(db, IDS.orgA, {
      deviceId: DISPOSITIVO_2, motivo: 'substituído', revogadoPorId: IDS.utilizadorA,
    }));
    assert.ok(comReporte.ok);
    assert.equal(comReporte.rascunhosDescartados, 3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. transferência coerente, e arquivo que respeita sessões', () => {
  it('transferir move a sessão e deixa a origem livre', async () => {
    const s = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, comensais: 3, actor: ACTOR,
    });
    assert.ok(s.ok);

    const t = await transferirSessao(prisma, IDS.orgA, s.sessaoId, MESA_B, ACTOR);
    assert.ok(t.ok);
    assert.equal(t.de, MESA_A);
    assert.equal(t.para, MESA_B);

    const sala = await comA((db) => salaAgora(db, IDS.unidadeA));
    const a = sala.find((m) => m.id === MESA_A);
    const b = sala.find((m) => m.id === MESA_B);
    assert.equal(a?.sessao, null, 'a origem ficou ocupada por ninguém');
    assert.equal(b?.sessao?.id, s.sessaoId);
    // Os comensais viajaram com a sessão: é a mesma linha, não uma cópia.
    assert.equal(b?.sessao?.comensais, 3);
  });

  it('transferir para uma mesa OCUPADA é recusado, e a origem fica como estava', async () => {
    const s1 = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
    });
    const s2 = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_B, actor: ACTOR,
    });
    assert.ok(s1.ok && s2.ok);

    const t = await transferirSessao(prisma, IDS.orgA, s1.sessaoId, MESA_B, ACTOR);
    assert.ok(!t.ok);
    assert.equal(t.motivo, 'mesa_destino_ocupada');

    // A origem EXACTAMENTE como estava — e o histórico também: o `ROLLBACK`
    // levou o evento de transferência consigo.
    const sala = await comA((db) => salaAgora(db, IDS.unidadeA));
    assert.equal(sala.find((m) => m.id === MESA_A)?.sessao?.id, s1.sessaoId);
    assert.equal(sala.find((m) => m.id === MESA_B)?.sessao?.id, s2.sessaoId);

    const historico = await comA((db) => historicoDaSessao(db, s1.sessaoId));
    assert.equal(historico.filter((e) => e.accao === 'sessao.transferida').length, 0,
      'a transferência falhou e ficou no histórico à mesma');
  });

  it('duas transferências CONCORRENTES para a mesma mesa: só uma passa', async () => {
    // O aceite 1 outra vez, por outra porta — e pelo MESMO índice.
    const s1 = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
    });
    assert.ok(s1.ok);
    await sql.query(
      `INSERT INTO service_tables (id, organization_id, location_id, area_id, codigo, capacidade, updated_at)
       VALUES ($1, $2, $3, $4, $5, 2, now()) ON CONFLICT (id) DO NOTHING`,
      ['e13a1111-0000-4000-8000-0000000000c1', IDS.orgA, IDS.unidadeA, ZONA, `${PREFIXO}09`]);
    const s2 = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: 'e13a1111-0000-4000-8000-0000000000c1', actor: ACTOR,
    });
    assert.ok(s2.ok);

    const [a, b] = await Promise.all([
      transferirSessao(prisma, IDS.orgA, s1.sessaoId, MESA_B, ACTOR),
      transferirSessao(prisma, IDS.orgA, s2.sessaoId, MESA_B, ACTOR),
    ]);
    assert.equal([a, b].filter((r) => r.ok).length, 1, 'as duas transferências passaram');

    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM table_sessions WHERE table_id = $1 AND estado <> 'FECHADA'`,
      [MESA_B]);
    assert.equal(rows[0].n, 1);
  });

  it('arquivar uma mesa com sessão aberta é RECUSADO, e diz qual', async () => {
    const s = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
    });
    assert.ok(s.ok);

    const r = await comA((db) => arquivarMesa(db, IDS.orgA, MESA_A));
    assert.ok(!r.ok);
    assert.equal(r.motivo, 'sessao_aberta');
    // Diz QUAL, para quem arquiva não ter de adivinhar qual mesa bloqueia.
    assert.equal(r.sessaoId, s.sessaoId);

    const { rows } = await sql.query('SELECT archived_at FROM service_tables WHERE id = $1', [MESA_A]);
    assert.equal(rows[0].archived_at, null, 'recusou e arquivou à mesma');
  });

  it('O PAR: depois de fechar a sessão, a mesa arquiva', async () => {
    const s = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
    });
    assert.ok(s.ok);
    await comA((db) => fecharSessao(db, IDS.orgA, s.sessaoId, ACTOR));
    const r = await comA((db) => arquivarMesa(db, IDS.orgA, MESA_A));
    assert.ok(r.ok, 'a recusa acima não era da sessão — recusa sempre');
  });

  it('o histórico é append-only: o runtime não o reescreve nem apaga', async () => {
    const s = await abrirSessao(prisma, IDS.orgA, {
      locationId: IDS.unidadeA, tableId: MESA_A, actor: ACTOR,
    });
    assert.ok(s.ok);
    await transferirSessao(prisma, IDS.orgA, s.sessaoId, MESA_B, ACTOR);

    const historico = await comA((db) => historicoDaSessao(db, s.sessaoId));
    assert.deepEqual(historico.map((e) => e.accao), ['sessao.aberta', 'sessao.transferida']);

    const runtime = new Client({ connectionString: RUNTIME });
    await runtime.connect();
    try {
      await runtime.query('BEGIN');
      await runtime.query("SELECT set_config('app.organization_id', $1, true)", [IDS.orgA]);
      await assert.rejects(
        runtime.query('DELETE FROM table_session_events WHERE session_id = $1', [s.sessaoId]),
        /permission denied|permissão negada/i,
        'o runtime conseguiu apagar o histórico de uma sessão');
      await runtime.query('ROLLBACK');

      await runtime.query('BEGIN');
      await runtime.query("SELECT set_config('app.organization_id', $1, true)", [IDS.orgA]);
      await assert.rejects(
        runtime.query('DELETE FROM table_sessions WHERE id = $1', [s.sessaoId]),
        /permission denied|permissão negada/i,
        'o runtime conseguiu apagar uma sessão inteira');
      await runtime.query('ROLLBACK');
    } finally {
      await runtime.end();
    }
  });
});

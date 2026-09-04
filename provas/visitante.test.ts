import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  abrirVisitante, atenderChamada, chamadasDaVisita, chamadasPorAtender, chamarASala,
  comEscopo, estadoDoVisitante, fecharSessao, obterPrisma, visitanteFalou,
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
  await sql.query(`DELETE FROM guest_calls WHERE table_id IN
     (SELECT id FROM service_tables WHERE codigo LIKE '${PREFIXO}%')`);
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

// ═══════════════════════════════════════════════════════════════════════════
describe('5. chamar a sala: limite, deduplicação e confirmação', () => {
  /** Abre uma visita e devolve o token. */
  async function visitaAberta() {
    const { segredo } = await rodar();
    const v = await entrar(segredo);
    assert.ok(v, 'o cenário não abriu visita nenhuma');
    return v.token;
  }

  it('o cenário não está vazio: há visita aberta e nenhuma chamada ainda', async () => {
    const token = await visitaAberta();
    // «Verde sobre nada» outra vez: declara-se antes de afirmar.
    assert.equal((await chamadasDaVisita(prisma, token)).length, 0,
      'já havia chamadas: a contagem não mediria a deduplicação');
  });

  it('DUAS chamadas seguidas dão UMA', async () => {
    // É o que a régua pede pelo nome. Quem tem o QR — e basta uma fotografia —
    // carrega sem parar, e quem serve recebe avisos que não distingue de
    // chamadas reais numa sala cheia.
    const token = await visitaAberta();

    const primeira = await chamarASala(prisma, { token, tipo: 'AJUDA' });
    assert.ok(primeira);
    assert.equal(primeira.deduplicada, false, 'a primeira chamada foi dada como repetida');

    const segunda = await chamarASala(prisma, { token, tipo: 'AJUDA' });
    assert.ok(segunda);
    assert.equal(segunda.deduplicada, true, 'a segunda criou uma chamada nova');
    assert.equal(segunda.callId, primeira.callId, 'a segunda não é a mesma chamada');

    // E do lado de quem serve há UMA, não duas.
    const naSala = await comA((db) => chamadasPorAtender(db, IDS.unidadeA));
    assert.equal(naSala.length, 1, `a sala recebeu ${naSala.length} avisos para uma chamada`);
  });

  it('O PAR: uma chamada legítima DEPOIS da janela passa', async () => {
    // Sem esta metade, «ignora tudo» passava o teste — e ignorar tudo é pior do
    // que não limitar: quem chamou porque ninguém veio fica sem forma de o dizer.
    const token = await visitaAberta();

    const primeira = await chamarASala(prisma, { token, tipo: 'AJUDA' });
    assert.ok(primeira);

    // A janela passa. Mede-se com o carimbo do SERVIDOR, portanto empurra-se a
    // chamada para trás na base — mudar o relógio do processo não teria efeito
    // nenhum, e é essa a garantia.
    await sql.query(
      `UPDATE guest_calls SET pedida_em = now() - interval '10 minutes' WHERE id = $1`,
      [primeira.callId]);

    const depois = await chamarASala(prisma, { token, tipo: 'AJUDA' });
    assert.ok(depois);
    assert.equal(depois.deduplicada, false, 'a chamada depois da janela foi engolida');
    assert.notEqual(depois.callId, primeira.callId);

    // E a sala vê as DUAS: a primeira ficou por atender, e a segunda diz que
    // ninguém foi. Colapsá-las escondia que a primeira falhou.
    const naSala = await comA((db) => chamadasPorAtender(db, IDS.unidadeA));
    assert.equal(naSala.length, 2);
  });

  it('a janela é por MESA, e não por telemóvel', async () => {
    // Quem tem a fotografia do QR abre outra sessão e chama outra vez. Uma
    // janela por sessão limitava cada telemóvel e não limitava nada.
    const { segredo } = await rodar();
    const um = await entrar(segredo);
    const outro = await entrar(segredo);
    assert.ok(um && outro);
    assert.notEqual(um.token, outro.token, 'as duas visitas são a mesma: não mede nada');

    const primeira = await chamarASala(prisma, { token: um.token, tipo: 'AJUDA' });
    const segunda = await chamarASala(prisma, { token: outro.token, tipo: 'AJUDA' });
    assert.ok(primeira && segunda);
    assert.equal(segunda.deduplicada, true, 'um segundo telemóvel contornou o limite');
    assert.equal(segunda.callId, primeira.callId);
  });

  it('AJUDA e CONTA são chamadas diferentes, e não se deduplicam uma na outra', async () => {
    // Cada uma tem uma resposta diferente do outro lado: uma traz uma pessoa, a
    // outra traz a conta. Colapsá-las fazia quem pediu a conta receber alguém a
    // perguntar o que se passa.
    const token = await visitaAberta();
    const ajuda = await chamarASala(prisma, { token, tipo: 'AJUDA' });
    const conta = await chamarASala(prisma, { token, tipo: 'CONTA' });
    assert.ok(ajuda && conta);
    assert.equal(conta.deduplicada, false, 'pedir a conta foi engolido pela chamada de ajuda');
    assert.notEqual(conta.callId, ajuda.callId);
  });

  it('a CONFIRMAÇÃO fecha o ciclo: quem chamou fica a saber que alguém vem', async () => {
    // «Sem ela, quem chamou não sabe se alguém vem, e volta a carregar.»
    const token = await visitaAberta();
    const chamada = await chamarASala(prisma, { token, tipo: 'AJUDA' });
    assert.ok(chamada);
    assert.equal(chamada.atendidaEm, null, 'nasceu atendida');

    const r = await comA((db) => atenderChamada(db, {
      callId: chamada.callId, actor: ACTOR,
    }));
    assert.ok(r.ok);

    const vistas = await chamadasDaVisita(prisma, token);
    const minha = vistas.find((c) => c.callId === chamada.callId);
    assert.ok(minha);
    assert.ok(minha.atendidaEm, 'o visitante não vê que alguém já foi');
    assert.equal(minha.atendidaPor, ACTOR.email);

    // E sai da lista de quem serve: uma chamada atendida que fica na fila é a
    // mesma sala cheia de avisos que o limite existe para não criar.
    const naSala = await comA((db) => chamadasPorAtender(db, IDS.unidadeA));
    assert.equal(naSala.length, 0);
  });

  it('e quem carrega outra vez depois de atendida VÊ que já foi atendida', async () => {
    // É a informação que o faz parar de carregar. Devolver «criei uma chamada»
    // ali era mentir com boas intenções.
    const token = await visitaAberta();
    const chamada = await chamarASala(prisma, { token, tipo: 'AJUDA' });
    assert.ok(chamada);
    await comA((db) => atenderChamada(db, { callId: chamada.callId, actor: ACTOR }));

    const outraVez = await chamarASala(prisma, { token, tipo: 'AJUDA' });
    assert.ok(outraVez);
    assert.equal(outraVez.deduplicada, true);
    assert.ok(outraVez.atendidaEm, 'quem carregou outra vez não vê que já foi atendida');
  });

  it('atender duas vezes não reescreve quem foi lá primeiro', async () => {
    const token = await visitaAberta();
    const chamada = await chamarASala(prisma, { token, tipo: 'AJUDA' });
    assert.ok(chamada);
    await comA((db) => atenderChamada(db, { callId: chamada.callId, actor: ACTOR }));

    const segunda = await comA((db) => atenderChamada(db, {
      callId: chamada.callId, actor: { email: 'outra-pessoa@bossaos.example' },
    }));
    assert.equal(segunda.ok, false);
    assert.equal(segunda.ok === false ? segunda.motivo : '', 'ja_atendida');

    const vistas = await chamadasDaVisita(prisma, token);
    assert.equal(vistas[0]?.atendidaPor, ACTOR.email, 'a segunda pessoa apagou a primeira');
  });

  it('o sinal de vida CHEGA à base — «nunca pediu nada» deixa de ser verdade', async () => {
    // ── Esta função não era chamada por prova nenhuma ────────────────────
    //
    // Estava exportada e usada só pela rota. Escrevia com o cliente do runtime
    // **sem escopo de inquilino**: a política de linha recusava, o `updateMany`
    // devolvia zero, e o QR-006 mostrava «nunca pediu nada» sobre alguém que
    // tinha acabado de pedir. Não estoirava — mentia.
    //
    // A cobertura de uma função não é ela existir: é alguém chamá-la.
    const token = await visitaAberta();
    const antes = await comA((db) => visitantesDaUnidade(db, IDS.unidadeA));
    assert.equal(antes.length, 1, 'a unidade devia ter exactamente esta visita');
    const meuAntes = antes[0]!;
    assert.equal(meuAntes.ultimaVezEm, null, 'nasceu com sinal de vida');

    await visitanteFalou(prisma, token);

    const depois = await comA((db) => visitantesDaUnidade(db, IDS.unidadeA));
    const meuDepois = depois.find((v: { id: string }) => v.id === meuAntes.id);
    assert.ok(meuDepois?.ultimaVezEm, 'o sinal de vida não chegou à base');
  });

  it('uma credencial REVOGADA não chama', async () => {
    // A porta é a mesma de sempre. Sem isto, revogar fechava os pedidos e
    // deixava a campainha a tocar.
    const token = await visitaAberta();
    await comA((db) => revogarAcessoDaMesa(db, {
      tableId: mesaId, motivo: 'pedidos que o cliente não fez', actor: ACTOR,
    }));
    assert.equal(await chamarASala(prisma, { token, tipo: 'AJUDA' }), null,
      'uma sessão revogada continuou a poder chamar a sala');
  });
});

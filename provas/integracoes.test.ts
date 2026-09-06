import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  RecusaDaIntegracao, aplicarEventoDeCobranca, assinarCorpo, comEscopo,
  criarChave, criarEndpoint, enfileirarEntrega, ligarClienteSaas, listarChaves,
  obterPrisma, receberEventoDeCobranca, resumirChave, revogarChave,
  verificarChave,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E32 — integrações, API e cobrança do SaaS.
 *
 * ── A etapa em que o defeito RENDE DINHEIRO a quem o encontrar ────────────
 *
 * É a primeira em que um estranho fala com o sistema sem passar por tela
 * nenhuma. Não é um erro que prejudica: é uma porta que se atravessa de
 * propósito.
 *
 * **O grupo 7 decide a etapa.** Um webhook com o `organization_id` de outra
 * organização não pode mudar concessão nenhuma — e por isso esta prova usa as
 * DUAS organizações das fixtures. Com um inquilino só, esse defeito é
 * impossível de observar: não há «outra» para onde apontar.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e32-';
const SEGREDO = 'segredo-de-prova-e32';
const CLIENTE_DE_A = `${PREFIXO}cus_A`;

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA, userId: IDS.utilizadorA }, fn);
const comB = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgB, userId: IDS.utilizadorB }, fn);
/** Sem inquilino: é assim que a porta do webhook corre, e é o ponto. */
const semDono = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA }, fn);

async function limpar() {
  await sql.query(`DELETE FROM saas_billing_events WHERE provedor LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM saas_customers WHERE provedor LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM saas_invoices WHERE provedor LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM webhook_deliveries WHERE evento LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM webhook_endpoints WHERE criado_por LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM integration_logs WHERE accao LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM integrations WHERE familia LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM api_keys WHERE nome LIKE '${PREFIXO}%'`);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
  await limpar();
});
beforeEach(limpar);
after(async () => {
  try { await limpar(); } catch (e) { console.error('limpeza:', e); }
  finally { await sql.end(); await prisma.$disconnect(); }
});

const DAQUI_A_UM_ANO = new Date(Date.now() + 365 * 24 * 3600 * 1000);

const novaChave = (escopos: Parameters<typeof criarChave>[2]['escopos']) =>
  comA((db) => criarChave(db, IDS.orgA, {
    nome: `${PREFIXO}chave`, escopos, expiraEm: DAQUI_A_UM_ANO, criadaPor: 'ana',
  }));

// ═════════════════════════════════════════════════════════════════════════════

describe('1 · A chave mostra-se UMA vez', () => {
  it('o valor sai da criação, e não está em lado nenhum da base', async () => {
    const { id, chave } = await novaChave(['CATALOGO_LER']);

    // Não há coluna onde ela caiba. Isto varre TODAS as colunas de texto da
    // tabela, e não só as que eu me lembraria de verificar.
    const { rows } = await sql.query(
      `SELECT to_jsonb(k)::text AS tudo FROM api_keys k WHERE k.id = $1`, [id]);
    assert.ok(!String(rows[0].tudo).includes(chave),
      'a chave está guardada em claro nalguma coluna');

    // O que lá está é o resumo, e o resumo não é a chave.
    const guardado = await sql.query(`SELECT resumo FROM api_keys WHERE id = $1`, [id]);
    assert.equal(guardado.rows[0].resumo, resumirChave(chave));
    assert.notEqual(guardado.rows[0].resumo, chave);
  });

  it('e a listagem não devolve sequer o resumo', async () => {
    // Um ecrã que a mostrasse outra vez provaria que ela está em claro. Este
    // caso mede o passo anterior: o que não sai da projecção não chega ao ecrã.
    await novaChave(['CATALOGO_LER']);
    const lista = await comA((db) => listarChaves(db, IDS.orgA));
    assert.ok(lista.length > 0);
    assert.equal('resumo' in lista[0]!, false, 'o resumo saiu na listagem');
    assert.ok(lista[0]!.prefixo.startsWith('bk_'));
  });

  it('CONTROLO NEGATIVO: guardada em claro, a varredura acende', async () => {
    // O plante escreve o valor numa coluna qualquer e vê o caso 1 cair. Se a
    // varredura não o apanhasse, ela estaria a medir a ausência de uma coluna
    // que eu escolhi, e não a ausência do segredo.
    const { id, chave } = await novaChave(['CATALOGO_LER']);
    await sql.query(`UPDATE api_keys SET nome = $2 WHERE id = $1`, [id, chave]);
    const { rows } = await sql.query(
      `SELECT to_jsonb(k)::text AS tudo FROM api_keys k WHERE k.id = $1`, [id]);
    assert.ok(String(rows[0].tudo).includes(chave),
      'o controlo não acendeu: a varredura não vê todas as colunas');
  });

  it('a base RECUSA uma chave sem âmbito', async () => {
    await assert.rejects(
      () => sql.query(
        `INSERT INTO api_keys (organization_id, nome, prefixo, resumo, escopos, expira_em, criada_por)
         VALUES ($1, $2, 'bk_x', 'r1', '{}', now() + interval '1 day', 'ana')`,
        [IDS.orgA, `${PREFIXO}sem-ambito`]),
      /chave_tem_ambito/,
      'passou uma chave sem âmbito: é uma chave de administrador com outro nome');
  });
});

describe('2 · O âmbito verifica-se POR OPERAÇÃO', () => {
  it('a chave certa passa', async () => {
    const { chave } = await novaChave(['CATALOGO_LER']);
    const r = await comA((db) => verificarChave(db, chave, 'CATALOGO_LER'));
    assert.equal(r.organizationId, IDS.orgA);
  });

  it('e a de âmbito errado NÃO — é o par que interessa', async () => {
    const { chave } = await novaChave(['CATALOGO_LER']);
    await assert.rejects(
      () => comA((db) => verificarChave(db, chave, 'CATALOGO_ESCREVER')),
      (e: Error) => e instanceof RecusaDaIntegracao && e.motivo === 'FORA_DE_AMBITO');
  });

  it('uma chave desconhecida não diz que é desconhecida por outra via', async () => {
    await assert.rejects(
      () => comA((db) => verificarChave(db, 'bk_inventada', 'CATALOGO_LER')),
      (e: Error) => e instanceof RecusaDaIntegracao && e.motivo === 'CHAVE_DESCONHECIDA');
  });
});

describe('3 · Revogar corta JÁ', () => {
  it('revogada, a mesma chave deixa de servir no mesmo segundo', async () => {
    const { id, chave } = await novaChave(['CATALOGO_LER']);
    await comA((db) => verificarChave(db, chave, 'CATALOGO_LER'));

    await comA((db) => revogarChave(db, id, 'ana'));

    await assert.rejects(
      () => comA((db) => verificarChave(db, chave, 'CATALOGO_LER')),
      (e: Error) => e instanceof RecusaDaIntegracao && e.motivo === 'CHAVE_REVOGADA',
      'a chave revogada continuou a servir: há cache no caminho');
  });

  it('e a base RECUSA revogar sem dizer quem', async () => {
    const { id } = await novaChave(['CATALOGO_LER']);
    await assert.rejects(
      () => sql.query(`UPDATE api_keys SET revogada_em = now() WHERE id = $1`, [id]),
      /revogacao_tem_assinatura/);
  });
});

describe('4 · A assinatura é sobre o corpo CRU', () => {
  // Com espaços e quebras de linha: é assim que os provedores enviam, e é o
  // que faz a reconstrução DIFERIR do original. Um corpo compacto reconstruído
  // sai igual, e aí o caso não estaria montado — a prova diz isso em voz alta
  // no primeiro `assert` do controlo, e foi ele que me apanhou à primeira.
  const corpo = '{\n  "a": 1,\n  "b": 2\n}';

  it('assinada sobre o corpo como chegou, confere', async () => {
    const e = await semDono((db) => receberEventoDeCobranca(db, {
      provedor: `${PREFIXO}prov`, provedorEventoId: `${PREFIXO}ev1`,
      tipo: 'subscription.updated', provedorClienteId: CLIENTE_DE_A,
      planoCodigo: 'PRO', organizationIdAlegado: null,
      corpoCru: corpo, assinatura: assinarCorpo(corpo, SEGREDO), segredo: SEGREDO,
    }));
    assert.equal(e.assinaturaConfere, true);
  });

  it('CONTROLO NEGATIVO: assinada sobre a NOSSA reconstrução, não confere', async () => {
    // `JSON.stringify(JSON.parse(corpo))` reordena as chaves e muda o
    // espaçamento. A assinatura passa a ser sobre outra coisa — e verificar
    // sobre a reconstrução não verifica nada.
    const reconstruido = JSON.stringify(JSON.parse(corpo));
    assert.notEqual(reconstruido, corpo, 'a reconstrução saiu igual: o caso não está montado');

    const e = await semDono((db) => receberEventoDeCobranca(db, {
      provedor: `${PREFIXO}prov`, provedorEventoId: `${PREFIXO}ev2`,
      tipo: 'subscription.updated', provedorClienteId: CLIENTE_DE_A,
      planoCodigo: 'PRO', organizationIdAlegado: null,
      corpoCru: corpo, assinatura: assinarCorpo(reconstruido, SEGREDO), segredo: SEGREDO,
    }));
    assert.equal(e.assinaturaConfere, false,
      'a assinatura sobre a reconstrução passou: não se está a verificar o corpo cru');
  });
});

describe('5 · Reenviar não duplica', () => {
  it('o mesmo evento do provedor duas vezes dá UM registo', async () => {
    const entrada = {
      provedor: `${PREFIXO}prov`, provedorEventoId: `${PREFIXO}mesmo`,
      tipo: 'subscription.updated', provedorClienteId: CLIENTE_DE_A,
      planoCodigo: 'PRO', organizationIdAlegado: null,
      corpoCru: '{}', assinatura: assinarCorpo('{}', SEGREDO), segredo: SEGREDO,
    };
    const a = await semDono((db) => receberEventoDeCobranca(db, entrada));
    const b = await semDono((db) => receberEventoDeCobranca(db, entrada));
    assert.equal(a.id, b.id, 'o reenvio criou um segundo evento');

    const n = await sql.query(
      `SELECT count(*)::int AS n FROM saas_billing_events WHERE provedor_evento_id = $1`,
      [`${PREFIXO}mesmo`]);
    assert.equal(n.rows[0].n, 1);
  });

  it('e a entrega que SAI leva identificador próprio, para o outro lado deduplicar',
    async () => {
      const ep = await comA((db) => criarEndpoint(db, IDS.orgA, {
        url: 'https://exemplo.example/hook', eventos: [`${PREFIXO}venda`],
        segredo: SEGREDO, criadoPor: `${PREFIXO}ana`,
      }));
      const d1 = await comA((db) => enfileirarEntrega(
        db, IDS.orgA, ep.id, `${PREFIXO}venda`, { n: 1 }, SEGREDO));
      const d2 = await comA((db) => enfileirarEntrega(
        db, IDS.orgA, ep.id, `${PREFIXO}venda`, { n: 1 }, SEGREDO));
      assert.notEqual(d1.entregaId, d2.entregaId);
      // E o identificador vai NO CORPO, que é o que o outro lado guarda.
      assert.ok(d1.corpo.includes(d1.entregaId));
      assert.ok(d1.corpo.includes('"versao":1'));
    });
});

describe('6 · Destinos internos são recusados', () => {
  it('o motor recusa antes de guardar', async () => {
    await assert.rejects(
      () => comA((db) => criarEndpoint(db, IDS.orgA, {
        url: 'https://169.254.169.254/latest/meta-data/',
        eventos: ['x'], segredo: SEGREDO, criadoPor: `${PREFIXO}ana`,
      })),
      (e: Error) => e instanceof RecusaDaIntegracao && e.motivo === 'DESTINO_RECUSADO',
      'guardou um destino de rede interna: a arma fica carregada');
  });

  it('e a base recusa http mesmo que o motor deixasse passar', async () => {
    await assert.rejects(
      () => sql.query(
        `INSERT INTO webhook_endpoints (organization_id, url, segredo_resumo, eventos, criado_por)
         VALUES ($1, 'http://exemplo.example/x', 'r', '{a}', $2)`,
        [IDS.orgA, `${PREFIXO}ana`]),
      /destino_e_https/);
  });
});

describe('7 · O ACEITE QUE DECIDE A ETAPA', () => {
  /**
   * Duas organizações, e é por isso que elas existem nesta prova.
   *
   * A ligação diz que `cus_A` é da organização A. O webhook chega a alegar que
   * é da B. Nada do que ele diga pode mudar o que a B tem.
   */
  async function eventoQueAlegaOutraOrganizacao(idDoEvento: string) {
    await comA((db) => ligarClienteSaas(
      db, IDS.orgA, `${PREFIXO}prov`, CLIENTE_DE_A, 'ana'));

    const corpo = JSON.stringify({ organization_id: IDS.orgB, plan: 'PRO' });
    return semDono((db) => receberEventoDeCobranca(db, {
      provedor: `${PREFIXO}prov`, provedorEventoId: idDoEvento,
      tipo: 'subscription.updated', provedorClienteId: CLIENTE_DE_A,
      planoCodigo: 'PRO',
      // A alegação. Guarda-se para se poder denunciar; nunca para decidir.
      organizationIdAlegado: IDS.orgB,
      corpoCru: corpo, assinatura: assinarCorpo(corpo, SEGREDO), segredo: SEGREDO,
    }));
  }

  it('um webhook que alega OUTRA organização não muda nada nela', async () => {
    const antesB = await sql.query(
      `SELECT plan_id FROM subscriptions WHERE organization_id = $1`, [IDS.orgB]);

    const e = await eventoQueAlegaOutraOrganizacao(`${PREFIXO}ataque`);
    const estado = await semDono((db) => aplicarEventoDeCobranca(db, e.id));

    const depoisB = await sql.query(
      `SELECT plan_id FROM subscriptions WHERE organization_id = $1`, [IDS.orgB]);
    assert.deepEqual(depoisB.rows, antesB.rows,
      'a subscrição da organização B mudou por causa de um webhook que a alegou');

    // E foi aplicado a QUEM A LIGAÇÃO DIZ, que é a organização A.
    assert.equal(estado, 'APLICADO');
    const registo = await sql.query(
      `SELECT organization_id_resolvido, motivo FROM saas_billing_events WHERE id = $1`,
      [e.id]);
    assert.equal(registo.rows[0].organization_id_resolvido, IDS.orgA);
    assert.match(String(registo.rows[0].motivo), /alegou outra organizacao/,
      'a alegação foi ignorada em silêncio: quem for ver daqui a um ano não a encontra');
  });

  it('e a organização B, pelos SEUS olhos, não vê diferença nenhuma', async () => {
    // ── Porque é que este caso lê pela B e não por SQL cru ───────────────
    //
    // O caso acima mede a tabela. Este mede o que a **vítima vê** — com o
    // escopo dela, pela mesma leitura que a aplicação dela faz. São coisas
    // diferentes: uma linha pode não mudar e o que o inquilino lê mudar na
    // mesma, se a leitura passar por outro caminho.
    //
    // E é a razão de esta prova ter DUAS organizações. Com um inquilino só, não
    // há «outra» para onde apontar, e o defeito mais perigoso da etapa fica
    // impossível de observar.
    const antes = await comB((db) =>
      db.subscription.findFirst({ where: { organizationId: IDS.orgB } }));

    const e = await eventoQueAlegaOutraOrganizacao(`${PREFIXO}ataque-visto-pela-b`);
    await semDono((db) => aplicarEventoDeCobranca(db, e.id));

    const depois = await comB((db) =>
      db.subscription.findFirst({ where: { organizationId: IDS.orgB } }));

    assert.equal(depois?.planId, antes?.planId,
      'a organização B viu o plano dela mudar por causa de um webhook que a alegou');
    assert.equal(depois?.estado, antes?.estado);
    assert.equal(depois?.version, antes?.version,
      'a versão da subscrição da B subiu: alguém lhe escreveu por cima');
  });

  it('sem ligação nossa, o evento fica parado e NÃO muda nada', async () => {
    const corpo = JSON.stringify({ organization_id: IDS.orgB });
    const e = await semDono((db) => receberEventoDeCobranca(db, {
      provedor: `${PREFIXO}prov`, provedorEventoId: `${PREFIXO}orfao`,
      tipo: 'subscription.updated', provedorClienteId: `${PREFIXO}cus_desconhecido`,
      planoCodigo: 'PRO', organizationIdAlegado: IDS.orgB,
      corpoCru: corpo, assinatura: assinarCorpo(corpo, SEGREDO), segredo: SEGREDO,
    }));

    const antes = await sql.query(`SELECT organization_id, plan_id FROM subscriptions`);
    const estado = await semDono((db) => aplicarEventoDeCobranca(db, e.id));
    const depois = await sql.query(`SELECT organization_id, plan_id FROM subscriptions`);

    assert.equal(estado, 'SEM_VINCULO');
    assert.deepEqual(depois.rows, antes.rows,
      'um evento sem ligação mudou uma subscrição');
  });

  it('a base RECUSA escrever uma resolução que a ligação não sustenta', async () => {
    // A garantia por baixo de tudo: mesmo que alguém escrevesse a coluna
    // resolvida à mão, o gatilho recusa. A mentira não chega a ser escrita.
    await comA((db) => ligarClienteSaas(
      db, IDS.orgA, `${PREFIXO}prov`, CLIENTE_DE_A, 'ana'));
    const e = await semDono((db) => receberEventoDeCobranca(db, {
      provedor: `${PREFIXO}prov`, provedorEventoId: `${PREFIXO}forcado`,
      tipo: 'subscription.updated', provedorClienteId: CLIENTE_DE_A,
      planoCodigo: 'PRO', organizationIdAlegado: null,
      corpoCru: '{}', assinatura: assinarCorpo('{}', SEGREDO), segredo: SEGREDO,
    }));

    await assert.rejects(
      () => sql.query(
        `UPDATE saas_billing_events SET organization_id_resolvido = $2, estado = 'APLICADO',
                resolvido_em = now() WHERE id = $1`, [e.id, IDS.orgB]),
      /resolucao_nao_bate_com_a_ligacao/,
      'foi possível resolver um evento para uma organização que a ligação não liga');
  });

  it('E A FRONTEIRA DO E05 SOBREVIVE: o runtime não escreve concessões', async () => {
    // O webhook corre com a credencial do runtime. Se ela pudesse escrever em
    // `entitlement_grants`, toda a arquitectura acima seria contornável por
    // fora — o mesmo defeito com carimbo de integração.
    await assert.rejects(
      () => comA((db) => db.$executeRaw`
        INSERT INTO entitlement_grants (organization_id, capacidade, origem)
        VALUES (${IDS.orgA}::uuid, 'e32-inventada', 'PLANO')`),
      /permission denied|permissão negada/i,
      'o runtime ganhou escrita em entitlement_grants: a fronteira do E05 caiu');
  });

  it('e também não escreve em subscriptions', async () => {
    await assert.rejects(
      () => comA((db) => db.$executeRaw`
        UPDATE subscriptions SET estado = 'ACTIVA' WHERE organization_id = ${IDS.orgA}::uuid`),
      /permission denied|permissão negada/i);
  });
});

describe('8 · Os dois dinheiros não somam', () => {
  it('a factura do SaaS não tem ligação nenhuma à conta do jantar', async () => {
    // Mede-se a AUSÊNCIA de chave estrangeira entre as duas famílias: se
    // existisse, mais cedo ou mais tarde alguém fazia a junção e somava.
    const { rows } = await sql.query(`
      SELECT c.conname FROM pg_constraint c
       WHERE c.conrelid = 'saas_invoices'::regclass
         AND c.contype = 'f'
         AND c.confrelid IN ('bills'::regclass, 'payments'::regclass,
                             'financial_movements'::regclass)`);
    assert.equal(rows.length, 0,
      'a factura do SaaS aponta para o dinheiro da refeição: as duas contabilidades tocam-se');
  });

  it('e o relatório financeiro do E29 não vê as facturas do SaaS', async () => {
    // O outro lado: a receita da casa não pode incluir o que a casa nos paga.
    const { rows } = await sql.query(`
      SELECT count(*)::int AS n FROM information_schema.columns
       WHERE table_name = 'financial_movements'
         AND column_name LIKE '%saas%'`);
    assert.equal(rows[0].n, 0,
      'o movimento financeiro da casa ganhou uma coluna de SaaS');
  });
});

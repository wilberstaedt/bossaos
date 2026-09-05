import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  audiencia, comEscopo, consentimentosDe, criarCampanha, criarCliente,
  criarModeloDeCampanha, criarRecompensa, criarSegmento, enviarCampanha,
  enviosDaCampanha, juntarContactos, movimentarPontos, obterPrisma, origensDaUnidade,
  registarConsentimento, resgatar, temConsentimento,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E27 — CRM, fidelidade e campanhas.
 *
 * ── O que a régua diz que NÃO conta ───────────────────────────────────────
 *
 * «Uma prova que só use quem consentiu tudo. Sem o caso de quem consentiu
 * serviço e recusou campanha, não está provado — está demonstrado.»
 *
 * Por isso o grupo 2 monta as quatro respostas separadas, e o grupo 3 põe uma
 * retirada a meio de uma campanha JÁ A ENVIAR.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e27-';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let n = 0;
const proximo = () => `${PREFIXO}${(n += 1)}`;

const pessoa = (nome = proximo(), origem?: string) => comA((db) => criarCliente(db, {
  organizationId: IDS.orgA, locationId: IDS.unidadeA, nome,
  email: `${nome}@exemplo.example`, telefone: '+34600000000',
  ...(origem ? { origem } : {}),
}));

const consentir = (
  customerId: string, finalidade: 'SERVICO' | 'CAMPANHA', canal: 'EMAIL' | 'SMS',
  accao: 'DADO' | 'RETIRADO' = 'DADO', expiraEm?: Date,
) => comA((db) => registarConsentimento(db, {
  organizationId: IDS.orgA, customerId, finalidade, canal, accao,
  origem: `${PREFIXO}formulário`, ...(expiraEm ? { expiraEm } : {}),
}));

async function campanhaPara(regra: Parameters<typeof criarSegmento>[1]['regra']) {
  const seg = await comA((db) => criarSegmento(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, nome: proximo(), regra,
  }));
  const modelo = await comA((db) => criarModeloDeCampanha(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, nome: proximo(),
    canal: 'EMAIL', assunto: 'olá', corpo: 'promoção',
  }));
  return comA((db) => criarCampanha(db, {
    organizationId: IDS.orgA, locationId: IDS.unidadeA, nome: proximo(),
    canal: 'EMAIL', segmentId: seg.id, templateId: modelo.id,
  }));
}

async function limpar() {
  const gente = `(SELECT id FROM customers WHERE nome LIKE '${PREFIXO}%')`;
  await sql.query(`DELETE FROM campaign_deliveries WHERE customer_id IN ${gente}`);
  await sql.query(`DELETE FROM campaigns WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM campaign_templates WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM segments WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM consent_events WHERE customer_id IN ${gente}`);
  await sql.query(`DELETE FROM loyalty_movements WHERE customer_id IN ${gente}`);
  await sql.query(`DELETE FROM loyalty_rewards WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM feedback_entries WHERE customer_id IN ${gente}`);
  await sql.query(`UPDATE customers SET juntado_a_id = NULL WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM customers WHERE nome LIKE '${PREFIXO}%'`);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
  await limpar();
});
beforeEach(limpar);
after(async () => { await limpar(); await sql.end(); await prisma.$disconnect(); });

describe('1 · existir no CRM não é ter consentido', () => {
  it('quem acabou de nascer no CRM não tem consentimento nenhum', async () => {
    const p = await pessoa();
    for (const f of ['SERVICO', 'CAMPANHA'] as const) {
      for (const c of ['EMAIL', 'SMS'] as const) {
        assert.equal(await comA((db) => temConsentimento(db, p.id, f, c)), false,
          `nasceu com ${f}/${c} — existir passou a ser permissão`);
      }
    }
  });

  it('e não há coluna nenhuma que diga «aceita campanhas»', async () => {
    // Garantia pela ausência: uma coluna que não existe não pode ficar a `true`
    // por omissão, por importação, ou por uma caixa mal marcada.
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'customers'
          AND (column_name ILIKE '%campanha%' OR column_name ILIKE '%marketing%'
               OR column_name ILIKE '%aceita%' OR column_name ILIKE '%opt%')`);
    assert.deepEqual(rows, [], `há coluna de permissão em customers: ${JSON.stringify(rows)}`);
  });
});

describe('2 · por FINALIDADE e por CANAL — quatro respostas, não uma', () => {
  it('serviço por SMS não dá campanha por SMS', async () => {
    const p = await pessoa();
    await consentir(p.id, 'SERVICO', 'SMS');
    assert.equal(await comA((db) => temConsentimento(db, p.id, 'SERVICO', 'SMS')), true);
    assert.equal(await comA((db) => temConsentimento(db, p.id, 'CAMPANHA', 'SMS')), false,
      'o aviso de que a mesa está pronta virou permissão de marketing');
  });

  it('e campanha por EMAIL não dá campanha por SMS', async () => {
    const p = await pessoa();
    await consentir(p.id, 'CAMPANHA', 'EMAIL');
    assert.equal(await comA((db) => temConsentimento(db, p.id, 'CAMPANHA', 'EMAIL')), true);
    assert.equal(await comA((db) => temConsentimento(db, p.id, 'CAMPANHA', 'SMS')), false,
      'aceitar email passou a aceitar SMS');
  });

  it('a retirada manda sobre o consentimento anterior', async () => {
    const p = await pessoa();
    await consentir(p.id, 'CAMPANHA', 'EMAIL');
    await consentir(p.id, 'CAMPANHA', 'EMAIL', 'RETIRADO');
    assert.equal(await comA((db) => temConsentimento(db, p.id, 'CAMPANHA', 'EMAIL')), false);
  });

  it('e o PAR: quem volta a consentir depois de retirar, vale', async () => {
    // Sem este par, «depois de um RETIRADO nunca mais vale» passava o caso de
    // cima — e uma pessoa que mudou de ideias ficava calada para sempre.
    const p = await pessoa();
    await consentir(p.id, 'CAMPANHA', 'EMAIL');
    await consentir(p.id, 'CAMPANHA', 'EMAIL', 'RETIRADO');
    await consentir(p.id, 'CAMPANHA', 'EMAIL');
    assert.equal(await comA((db) => temConsentimento(db, p.id, 'CAMPANHA', 'EMAIL')), true);
  });

  it('um consentimento de serviço EXPIRADO não autoriza nada', async () => {
    // «O contacto de quem esperou tem uma finalidade que ACABA.»
    const p = await pessoa();
    await consentir(p.id, 'SERVICO', 'SMS', 'DADO', new Date(Date.now() - 60_000));
    assert.equal(await comA((db) => temConsentimento(db, p.id, 'SERVICO', 'SMS')), false,
      'o número deixado à porta continuou a autorizar depois de a finalidade acabar');
  });

  it('e sem origem, recusa-se', async () => {
    const p = await pessoa();
    await assert.rejects(comA((db) => registarConsentimento(db, {
      organizationId: IDS.orgA, customerId: p.id,
      finalidade: 'CAMPANHA', canal: 'EMAIL', accao: 'DADO', origem: '   ',
    })), /SEM_ORIGEM/);
  });

  it('as quatro respostas mostram-se separadas', async () => {
    const p = await pessoa();
    await consentir(p.id, 'SERVICO', 'SMS');
    await consentir(p.id, 'CAMPANHA', 'EMAIL');
    const { estado } = await comA((db) => consentimentosDe(db, p.id));
    assert.equal(estado.length, 4);
    assert.equal(estado.filter((e) => e.vivo).length, 2, 'as quatro não são independentes');
  });
});

describe('3 · a retirada vale ANTES do próximo envio', () => {
  it('quem consentiu serviço mas NÃO campanha fica de fora', async () => {
    // O caso que a régua nomeia: se entrar, a etapa reprova.
    const dentro = await pessoa();
    const fora = await pessoa();
    await consentir(dentro.id, 'CAMPANHA', 'EMAIL');
    await consentir(fora.id, 'SERVICO', 'EMAIL');

    const c = await campanhaPara({ exigeConsentimento: { finalidade: 'CAMPANHA', canal: 'EMAIL' } });
    const r = await comA((db) => enviarCampanha(db, c.id));

    assert.equal(r.gravados, 1, 'o número de envios não bate com quem consentiu');
    const envios = await comA((db) => enviosDaCampanha(db, c.id));
    const alvos = envios.map((e) => e.cliente.id);
    assert.ok(alvos.includes(dentro.id));
    assert.ok(!alvos.includes(fora.id),
      'quem só consentiu SERVIÇO entrou numa campanha');
  });

  it('a retirada A MEIO de uma campanha em curso vale para o resto', async () => {
    // ── O caso real, e o único que distingue implementada de declarada ─────
    //
    // A campanha já começou a enviar. Alguém retira. A mensagem seguinte não
    // pode sair — e não sai porque a verificação é na gravação de CADA envio.
    const primeira = await pessoa(`${PREFIXO}a-primeira`);
    const segunda = await pessoa(`${PREFIXO}b-segunda`);
    await consentir(primeira.id, 'CAMPANHA', 'EMAIL');
    await consentir(segunda.id, 'CAMPANHA', 'EMAIL');

    const c = await campanhaPara({ exigeConsentimento: { finalidade: 'CAMPANHA', canal: 'EMAIL' } });

    // O envio da primeira acontece; a seguir, e ANTES do resto, a segunda retira.
    await comA(async (db) => {
      await db.campaignDelivery.create({
        data: {
          organizationId: IDS.orgA, campaignId: c.id, customerId: primeira.id,
          canal: 'EMAIL',
        },
      });
      await db.campaign.update({ where: { id: c.id }, data: { estado: 'A_ENVIAR' } });
    });
    await consentir(segunda.id, 'CAMPANHA', 'EMAIL', 'RETIRADO');

    const r = await comA((db) => enviarCampanha(db, c.id));
    const envios = await comA((db) => enviosDaCampanha(db, c.id));
    const alvos = envios.map((e) => e.cliente.id);

    assert.ok(alvos.includes(primeira.id), 'a que já tinha sido enviada desapareceu');
    assert.ok(!alvos.includes(segunda.id),
      'a retirada a meio da campanha não valeu: a mensagem saiu na mesma');
    assert.equal(r.gravados, 0, 'gravou um envio depois de a pessoa ter retirado');
  });

  it('e a lista de recusados enche-se quando o SEGMENTO não filtra consentimento',
    async () => {
      // ── Dois caminhos diferentes, e este é o segundo ────────────────────
      //
      // O caso de cima passa pela audiência, que já filtra por consentimento.
      // Este passa pelo GATILHO — e é o caminho perigoso a sério: alguém
      // constrói o segmento «toda a gente com 100 pontos» e esquece-se da
      // cláusula do consentimento. A audiência diz que sim, e a única coisa
      // entre o produto e uma mensagem ilegal é a base.
      //
      // A primeira versão desta prova media os dois num caso só, e por isso não
      // media nenhum: a audiência excluía a pessoa antes de o gatilho ter o que
      // recusar, e a lista de recusados ficava vazia com tudo a funcionar.
      const semConsentimento = await pessoa();
      await consentir(semConsentimento.id, 'SERVICO', 'EMAIL');

      const c = await campanhaPara({});
      const r = await comA((db) => enviarCampanha(db, c.id));

      assert.equal(r.gravados, 0, 'gravou para quem nunca consentiu campanha');
      assert.ok(r.recusados.some((x) => x.customerId === semConsentimento.id),
        'a recusa do gatilho não chegou a quem carregou no botão');
      const envios = await comA((db) => enviosDaCampanha(db, c.id));
      assert.equal(envios.length, 0);
    });

  it('e a BASE recusa o envio, mesmo que o código tente à força', async () => {
    // A garantia não está no código: está no gatilho. Um defeito na aplicação
    // não consegue enviar, porque não consegue gravar.
    const p = await pessoa();
    await consentir(p.id, 'SERVICO', 'EMAIL');
    const c = await campanhaPara({});
    await assert.rejects(sql.query(
      `INSERT INTO campaign_deliveries (organization_id, campaign_id, customer_id, canal)
       VALUES ($1, $2, $3, 'EMAIL')`, [IDS.orgA, c.id, p.id]),
      /SEM_CONSENTIMENTO_DE_CAMPANHA/);
  });

  it('e o PAR: com consentimento vivo, a base DEIXA gravar', async () => {
    const p = await pessoa();
    await consentir(p.id, 'CAMPANHA', 'EMAIL');
    const c = await campanhaPara({});
    const { rows } = await sql.query(
      `INSERT INTO campaign_deliveries (organization_id, campaign_id, customer_id, canal)
       VALUES ($1, $2, $3, 'EMAIL') RETURNING id`, [IDS.orgA, c.id, p.id]);
    assert.equal(rows.length, 1);
  });

  it('a mesma pessoa não recebe a mesma campanha duas vezes', async () => {
    const p = await pessoa();
    await consentir(p.id, 'CAMPANHA', 'EMAIL');
    const c = await campanhaPara({ exigeConsentimento: { finalidade: 'CAMPANHA', canal: 'EMAIL' } });
    await comA((db) => enviarCampanha(db, c.id));
    const segunda = await comA((db) => enviarCampanha(db, c.id));
    assert.equal(segunda.gravados, 0, 'carregar duas vezes enviou duas vezes');
    const envios = await comA((db) => enviosDaCampanha(db, c.id));
    assert.equal(envios.length, 1);
  });
});

describe('4 · a audiência é uma REGRA, avaliada no envio', () => {
  it('não existe tabela de membros de segmento', async () => {
    // Garantia pela ausência: uma lista colada não tem origem de consentimento.
    const { rows } = await sql.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND (table_name ILIKE '%segment%member%' OR table_name ILIKE '%segment_customers%'
               OR table_name ILIKE '%audience%')`);
    assert.deepEqual(rows, [], `há tabela de membros: ${JSON.stringify(rows)}`);
  });

  it('a mesma regra dá gente diferente quando o consentimento muda', async () => {
    const p = await pessoa();
    const regra = { exigeConsentimento: { finalidade: 'CAMPANHA' as const, canal: 'EMAIL' as const } };
    assert.equal((await comA((db) => audiencia(db, IDS.unidadeA, regra))).length, 0,
      'a audiência devolveu gente que não consentiu: a regra não é uma consulta sobre quem consentiu');
    await consentir(p.id, 'CAMPANHA', 'EMAIL');
    const depois = await comA((db) => audiencia(db, IDS.unidadeA, regra));
    assert.ok(depois.some((c) => c.id === p.id), 'a regra não foi reavaliada');
  });

  it('e a regra de pontos mínimos filtra pelo saldo DERIVADO', async () => {
    const rico = await pessoa();
    const pobre = await pessoa();
    for (const p of [rico, pobre]) await consentir(p.id, 'CAMPANHA', 'EMAIL');
    await comA((db) => movimentarPontos(db, {
      organizationId: IDS.orgA, customerId: rico.id, tipo: 'GANHO',
      pontos: 500, motivo: 'visita',
    }));
    const dentro = await comA((db) => audiencia(db, IDS.unidadeA, {
      exigeConsentimento: { finalidade: 'CAMPANHA', canal: 'EMAIL' }, pontosMinimos: 100,
    }));
    assert.ok(dentro.some((c) => c.id === rico.id));
    assert.ok(!dentro.some((c) => c.id === pobre.id), 'entrou quem não tinha pontos');
  });
});

describe('5 · pontos são dinheiro, e o saldo deriva-se', () => {
  it('o saldo é a soma dos movimentos', async () => {
    const p = await pessoa();
    await comA((db) => movimentarPontos(db, {
      organizationId: IDS.orgA, customerId: p.id, tipo: 'GANHO', pontos: 300, motivo: 'visita',
    }));
    await comA((db) => movimentarPontos(db, {
      organizationId: IDS.orgA, customerId: p.id, tipo: 'RESGATE', pontos: 100, motivo: 'café',
    }));
    const { rows } = await sql.query('SELECT saldo_pontos FROM customers WHERE id = $1', [p.id]);
    assert.equal(Number(rows[0].saldo_pontos), 200);
  });

  it('escrever o saldo de fora é SUBSTITUÍDO pela base', async () => {
    const p = await pessoa();
    await comA((db) => movimentarPontos(db, {
      organizationId: IDS.orgA, customerId: p.id, tipo: 'GANHO', pontos: 50, motivo: 'visita',
    }));
    await sql.query('UPDATE customers SET saldo_pontos = 99999 WHERE id = $1', [p.id]);
    const { rows } = await sql.query('SELECT saldo_pontos FROM customers WHERE id = $1', [p.id]);
    assert.equal(Number(rows[0].saldo_pontos), 50, 'o saldo escrito à mão FICOU');
  });

  it('pontos com vírgula são recusados com nome', async () => {
    const p = await pessoa();
    await assert.rejects(comA((db) => movimentarPontos(db, {
      organizationId: IDS.orgA, customerId: p.id, tipo: 'GANHO', pontos: 1.5, motivo: 'x',
    })), /PONTOS_INVALIDOS/);
  });

  it('e negativos também — o sinal vem do TIPO', async () => {
    const p = await pessoa();
    await assert.rejects(comA((db) => movimentarPontos(db, {
      organizationId: IDS.orgA, customerId: p.id, tipo: 'GANHO', pontos: -10, motivo: 'x',
    })), /PONTOS_INVALIDOS/);
  });

  it('resgatar sem saldo é recusado, e não deixa saldo negativo', async () => {
    const p = await pessoa();
    const r = await comA((db) => criarRecompensa(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, nome: proximo(),
      custoPontos: 500, valorMenor: 300,
    }));
    await assert.rejects(comA((db) => resgatar(db, {
      organizationId: IDS.orgA, customerId: p.id, rewardId: r.id,
    })), /SALDO_INSUFICIENTE/);
    const { rows } = await sql.query('SELECT saldo_pontos FROM customers WHERE id = $1', [p.id]);
    assert.equal(Number(rows[0].saldo_pontos), 0);
  });

  it('e o PAR: com saldo, resgata e desconta', async () => {
    const p = await pessoa();
    await comA((db) => movimentarPontos(db, {
      organizationId: IDS.orgA, customerId: p.id, tipo: 'GANHO', pontos: 800, motivo: 'visitas',
    }));
    const r = await comA((db) => criarRecompensa(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, nome: proximo(),
      custoPontos: 500, valorMenor: 300,
    }));
    await comA((db) => resgatar(db, {
      organizationId: IDS.orgA, customerId: p.id, rewardId: r.id,
    }));
    const { rows } = await sql.query('SELECT saldo_pontos FROM customers WHERE id = $1', [p.id]);
    assert.equal(Number(rows[0].saldo_pontos), 300);
  });
});

describe('6 · juntar contactos, e de onde chegam', () => {
  it('juntar leva os pontos para quem fica, e não apaga o absorvido', async () => {
    const fica = await pessoa();
    const vai = await pessoa();
    await comA((db) => movimentarPontos(db, {
      organizationId: IDS.orgA, customerId: vai.id, tipo: 'GANHO', pontos: 120, motivo: 'visita',
    }));
    await comA((db) => juntarContactos(db, { absorvidoId: vai.id, ficaId: fica.id }));
    const { rows } = await sql.query(
      'SELECT saldo_pontos FROM customers WHERE id = $1', [fica.id]);
    assert.equal(Number(rows[0].saldo_pontos), 120, 'os pontos ficaram na linha absorvida');
    const { rows: vivo } = await sql.query(
      'SELECT juntado_a_id FROM customers WHERE id = $1', [vai.id]);
    assert.equal(vivo[0].juntado_a_id, fica.id, 'o absorvido foi apagado');
  });

  it('e o absorvido sai das listas e da audiência', async () => {
    const fica = await pessoa();
    const vai = await pessoa();
    for (const p of [fica, vai]) await consentir(p.id, 'CAMPANHA', 'EMAIL');
    await comA((db) => juntarContactos(db, { absorvidoId: vai.id, ficaId: fica.id }));
    const dentro = await comA((db) => audiencia(db, IDS.unidadeA, {
      exigeConsentimento: { finalidade: 'CAMPANHA', canal: 'EMAIL' },
    }));
    assert.ok(!dentro.some((c) => c.id === vai.id),
      'o contacto absorvido continuou a receber a campanha');
  });

  it('as origens contam-se, e quem não tem origem não desaparece', async () => {
    await pessoa(proximo(), 'reserva');
    await pessoa(proximo(), 'reserva');
    await pessoa();
    const origens = await comA((db) => origensDaUnidade(db, IDS.unidadeA));
    const reserva = origens.find((o) => o.origem === 'reserva');
    assert.equal(reserva?.quantos, 2);
    assert.ok(origens.some((o) => o.origem === '—'), 'quem não tem origem sumiu da conta');
  });
});

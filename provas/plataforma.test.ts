import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import {
  RecusaDePlataforma, abrirSessaoDeSuporte, comEscopo, comIdentidade, concederCapacidade,
  enfileirarTrabalho, guardarPoliticaDeAcesso, obterPrisma, reprocessarTrabalho,
  segredosDaPlataforma, sessaoAutoriza, sessoesDaCasa, terminarSessaoDeSuporte,
} from '../packages/db/src/index.ts';
import { identidadeDeTrabalho } from '../packages/domain/src/plataforma.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E33 — plataforma, suporte e governança.
 *
 * ── A etapa em que o atacante somos NÓS ───────────────────────────────────
 *
 * Todas as outras deram poder a quem trabalha na casa. Esta dá-o a quem vende o
 * sistema. **Até aqui protegemos o restaurante de enganos e de estranhos; aqui
 * protegemo-lo de nós.**
 *
 * O grupo 1 decide: uma sessão que só termina quando alguém se lembra é
 * permanente na prática. O grupo 3 é o aceite do sénior: a fronteira do E05 tem
 * de sobreviver a esta etapa — a que traz a interface de escrita das concessões
 * e teria mais tentação de a abrir pelo lado de dentro.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e33-';
/** O grupo 8 é do E34, e marca o que cria com o seu próprio prefixo. */
const PREFIXO_E34 = 'e34-acesso-';
const MOTIVO = 'o cliente reportou pedidos a desaparecer da fila da cozinha';
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA, userId: IDS.utilizadorA }, fn);

async function limpar() {
  await sql.query(
    `DELETE FROM support_sessions WHERE motivo LIKE '%${PREFIXO}%' OR motivo LIKE '${PREFIXO_E34}%' OR motivo = $1`,
    [MOTIVO]);
  // ── Os pedidos do grupo 8 são lixo desta prova ────────────────────────
  //
  // O rasto do acesso NÃO se limpa — a `audit_events` é append-only, e é a
  // garantia a funcionar. Por isso cada caso conta as SUAS linhas pelo
  // identificador do pedido que criou, e nunca por contagens absolutas.
  const pedidosE34 = `(SELECT id FROM orders WHERE aberto_por LIKE '${PREFIXO_E34}%')`;
  await sql.query(`DELETE FROM order_lines WHERE order_id IN ${pedidosE34}`);
  await sql.query(`DELETE FROM orders WHERE aberto_por LIKE '${PREFIXO_E34}%'`);
  await sql.query(`DELETE FROM platform_jobs WHERE tipo LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM platform_secrets WHERE nome LIKE '${PREFIXO.toUpperCase()}%'`);
  // ── A auditoria NÃO se limpa, e isso é a garantia a funcionar ─────────
  //
  // Tentei apagá-la aqui, e a base recusou: «audit_events e append-only, DELETE
  // nao e permitido». Um registo de auditoria que se pode apagar não é um
  // registo de auditoria — e a prova de uma etapa sobre governança seria o
  // último sítio onde isso devia ser possível.
  //
  // As linhas ficam. Cada caso mede as SUAS pelo identificador do que criou, e
  // não por contagens absolutas — a lição do E29, onde uma prova contava linhas
  // partilhadas e partia quando outra semente crescia.
  await sql.query(`DELETE FROM entitlement_grants WHERE motivo = $1`, [MOTIVO]);
  await sql.query(`DELETE FROM plan_capabilities WHERE capacidade LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM access_policies WHERE organization_id = $1`, [IDS.orgA]);
  await sql.query(`DELETE FROM platform_staff WHERE motivo LIKE '${PREFIXO}%'`);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
  await limpar();
});
beforeEach(async () => { await limpar(); await tornarPessoalDaPlataforma(); });
after(async () => {
  try { await limpar(); } catch (e) { console.error('limpeza:', e); }
  finally { await sql.end(); await prisma.$disconnect(); }
});

const PESSOA = { staffUserId: IDS.utilizadorA, staffEmail: `${PREFIXO}ana@bossa.example` };

/** Sem estar na plataforma, ninguém abre sessão. E e isso que se quer. */
async function tornarPessoalDaPlataforma() {
  await sql.query(
    `INSERT INTO platform_staff (user_id, motivo) VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING`, [IDS.utilizadorA, `${PREFIXO}staff`]);
}

const abrir = (extra: Partial<Parameters<typeof abrirSessaoDeSuporte>[2]> = {}) =>
  comA((db) => abrirSessaoDeSuporte(db, IDS.orgA, {
    ...PESSOA, motivo: MOTIVO, ambito: ['LEITURA'], duracaoMinutos: 30, ...extra,
  }));

// ═════════════════════════════════════════════════════════════════════════════

describe('1 · A sessão de suporte EXPIRA SOZINHA', () => {
  it('uma sessão dentro do prazo autoriza a leitura', async () => {
    const s = await abrir();
    const ok = await comA((db) => sessaoAutoriza(db, s.id, 'LEITURA'));
    assert.equal(ok.id, s.id);
  });

  it('O CASO QUE DECIDE: ninguém a fechou, e passado o prazo já não autoriza',
    async () => {
      // «Uma sessão que só termina quando alguém se lembra é permanente na
      // prática.» Aqui ninguém a fecha — e ela deixa de valer na mesma.
      const s = await abrir();
      const daquiAUmaHora = new Date(Date.now() + 3600_000);
      await assert.rejects(
        () => comA((db) => sessaoAutoriza(db, s.id, 'LEITURA', daquiAUmaHora)),
        (e: Error) => e instanceof RecusaDePlataforma && e.motivo === 'SESSAO_EXPIRADA',
        'a sessão esquecida continuou a autorizar: o suporte virou dono');
    });

  it('e a base RECUSA um prazo que já passou quando se abre', async () => {
    await assert.rejects(
      () => sql.query(
        `INSERT INTO support_sessions (organization_id, staff_user_id, staff_email,
           motivo, ambito, aberta_em, expira_em)
         VALUES ($1, $2, $3, $4, '{LEITURA}', now(), now() - interval '1 minute')`,
        [IDS.orgA, IDS.utilizadorA, PESSOA.staffEmail, MOTIVO]),
      /prazo_e_futuro/);
  });

  it('e o âmbito verifica-se por operação: ler não dá mexer', async () => {
    const s = await abrir({ ambito: ['LEITURA'] });
    await assert.rejects(
      () => comA((db) => sessaoAutoriza(db, s.id, 'DADOS_OPERACIONAIS')),
      (e: Error) => e instanceof RecusaDePlataforma && e.motivo === 'FORA_DE_AMBITO');
  });

  it('a base RECUSA uma sessão sem motivo que explique', async () => {
    await assert.rejects(
      () => abrir({ motivo: 'x' }),
      (e: Error) => e instanceof RecusaDePlataforma && e.motivo === 'SEM_MOTIVO');
  });

  it('e RECUSA uma sessão sem âmbito nenhum', async () => {
    await assert.rejects(
      () => sql.query(
        `INSERT INTO support_sessions (organization_id, staff_user_id, staff_email,
           motivo, ambito, expira_em)
         VALUES ($1, $2, $3, $4, '{}', now() + interval '10 minutes')`,
        [IDS.orgA, IDS.utilizadorA, PESSOA.staffEmail, MOTIVO]),
      /sessao_tem_ambito/,
      'passou uma sessão sem âmbito: o suporte vê a casa inteira');
  });


  it('fechar à mão TERMINA-A, e deixa rasto da saída', async () => {
    // ── Fechar à mão continua a existir, e não é a garantia ─────────────
    //
    // A garantia é a expiração; isto é a conveniência. Mas a saída também
    // deixa rasto: quem entrou numa casa e saiu tem as duas pontas escritas, e
    // uma entrada sem saída registada é uma pergunta sem resposta seis meses
    // depois.
    const s = await abrir();
    const fechada = await comA((db) =>
      terminarSessaoDeSuporte(db, s.id, `${PREFIXO}resolvido`, PESSOA.staffEmail));
    assert.ok(fechada.terminadaEm instanceof Date);

    const { rows } = await sql.query(
      `SELECT actor_email FROM audit_events
        WHERE accao = 'plataforma.suporte.saiu' AND alvo_id = $1`, [s.id]);
    assert.equal(rows.length, 1, 'saiu e não ficou escrito');
    assert.equal(rows[0].actor_email, PESSOA.staffEmail);
  });

  it('e fechar duas vezes não esconde a primeira razão', async () => {
    const s = await abrir();
    await comA((db) => terminarSessaoDeSuporte(db, s.id, `${PREFIXO}primeira`, PESSOA.staffEmail));
    await assert.rejects(
      () => comA((db) => terminarSessaoDeSuporte(db, s.id, `${PREFIXO}segunda`, PESSOA.staffEmail)),
      (e: Error) => e instanceof RecusaDePlataforma && e.motivo === 'SESSAO_JA_TERMINADA');

    const { rows } = await sql.query(
      `SELECT terminada_motivo FROM support_sessions WHERE id = $1`, [s.id]);
    assert.match(String(rows[0].terminada_motivo), /primeira/,
      'a segunda razão escreveu por cima da primeira');
  });
});

describe('2 · O INQUILINO vê a entrada', () => {
  it('a casa lê as sessões de suporte dela, com quem, quando e porquê', async () => {
    // Não é cortesia: é a segunda das quatro condições. Um acesso que só aparece
    // do nosso lado é um acesso que o cliente não pode contestar.
    const s = await abrir();
    const vistas = await comA((db) => sessoesDaCasa(db, IDS.orgA));
    const minha = vistas.find((x: { id: string }) => x.id === s.id);
    assert.ok(minha, 'a casa não vê a entrada do suporte');
    assert.equal(minha.staffEmail, PESSOA.staffEmail, 'a casa não vê QUEM entrou');
    assert.equal(minha.motivo, MOTIVO, 'a casa não vê PORQUÊ');
    assert.ok(minha.abertaEm instanceof Date, 'a casa não vê QUANDO');
  });

  it('e a casa NÃO pode apagar o registo dessa entrada', async () => {
    // Ver, sim: é o direito dela. Apagar, não — uma casa que pudesse apagar a
    // entrada que lhe interessasse esconder tem o mesmo poder que nós, e é
    // desse poder que esta etapa protege.
    const s = await abrir();
    await assert.rejects(
      () => comA((db) => db.$executeRaw`DELETE FROM support_sessions WHERE id = ${s.id}::uuid`),
      /permission denied|permissão negada/i);
  });

  it('e o runtime também não a pode CRIAR — quem abre é a plataforma', async () => {
    await assert.rejects(
      () => comA((db) => db.$executeRaw`
        INSERT INTO support_sessions (organization_id, staff_user_id, staff_email,
          motivo, ambito, expira_em)
        VALUES (${IDS.orgA}::uuid, ${IDS.utilizadorA}::uuid, 'x@y.example',
          ${MOTIVO}, '{LEITURA}', now() + interval '10 minutes')`),
      /permission denied|permissão negada/i);
  });
});

describe('3 · A política é DA CASA', () => {
  it('a casa aperta o tecto, e o suporte não pode pedir mais', async () => {
    await comA((db) => guardarPoliticaDeAcesso(db, IDS.orgA, {
      exigeConsentimento: false, duracaoMaximaMin: 15,
      actualizadaPor: 'dono@casa.example',
    }));
    await assert.rejects(
      () => abrir({ duracaoMinutos: 60 }),
      (e: Error) => e instanceof RecusaDePlataforma && e.motivo === 'EXCEDE_O_TECTO',
      'o suporte pediu mais tempo do que a casa aceita, e passou');
  });

  it('e o PAR: dentro do tecto, abre', async () => {
    // Sem isto, «recusa sempre» passava o caso de cima e o suporte nunca entrava.
    await comA((db) => guardarPoliticaDeAcesso(db, IDS.orgA, {
      exigeConsentimento: false, duracaoMaximaMin: 15,
      actualizadaPor: 'dono@casa.example',
    }));
    const s = await abrir({ duracaoMinutos: 10 });
    assert.ok(s.id);
  });

  it('a casa que exige consentimento não deixa entrar sem ele', async () => {
    await comA((db) => guardarPoliticaDeAcesso(db, IDS.orgA, {
      exigeConsentimento: true, duracaoMaximaMin: 60,
      actualizadaPor: 'dono@casa.example',
    }));
    await assert.rejects(
      () => abrir(),
      (e: Error) => e instanceof RecusaDePlataforma && e.motivo === 'EXIGE_CONSENTIMENTO');

    // E com consentimento, entra — e fica escrito quem consentiu.
    const s = await abrir({ consentidaPor: 'dono@casa.example' });
    assert.equal(s.consentidaPor, 'dono@casa.example');
  });
});

describe('4 · O rasto guarda a PESSOA, não o papel', () => {
  it('a base RECUSA uma acção da plataforma assinada por «suporte»', async () => {
    await assert.rejects(
      () => sql.query(
        `INSERT INTO audit_events (id, organization_id, actor_id, actor_email, accao)
         VALUES (gen_random_uuid(), $1, $2, 'suporte@bossa.example', 'plataforma.teste')`,
        [IDS.orgA, IDS.utilizadorA]),
      /rasto_assinado_por_um_papel/,
      '«suporte» passou como resposta a QUEM FEZ ISTO');
  });

  it('e RECUSA uma acção da plataforma sem pessoa nenhuma', async () => {
    await assert.rejects(
      () => sql.query(
        `INSERT INTO audit_events (id, organization_id, accao)
         VALUES (gen_random_uuid(), $1, 'plataforma.teste')`,
        [IDS.orgA]),
      /rasto_sem_pessoa/);
  });

  it('e ACEITA uma pessoa — senão isto recusava toda a gente', async () => {
    const r = await sql.query(
      `INSERT INTO audit_events (id, organization_id, actor_id, actor_email, accao)
       VALUES (gen_random_uuid(), $1, $2, $3, 'plataforma.teste') RETURNING id`,
      [IDS.orgA, IDS.utilizadorA, `${PREFIXO}ana@bossa.example`]);
    assert.equal(r.rowCount, 1);
  });

  it('e as acções do PRODUTO não são afectadas — o gatilho é só da plataforma',
    async () => {
      // Sem este par, o gatilho podia estar a recusar tudo e ninguém dava por
      // isso até uma tela do restaurante deixar de gravar auditoria.
      const r = await sql.query(
        `INSERT INTO audit_events (id, organization_id, accao)
         VALUES (gen_random_uuid(), $1, 'produto.teste') RETURNING id`, [IDS.orgA]);
      assert.equal(r.rowCount, 1);
    });
});

describe('5 · O ACEITE DO SÉNIOR: a fronteira do E05 sobrevive', () => {
  it('o runtime NÃO escreve em entitlement_grants, nem nesta etapa', async () => {
    // Esta é a etapa que traz a interface de escrita das concessões — a que
    // teria mais tentação de abrir a porta pelo lado de dentro. Não abre.
    await assert.rejects(
      () => comA((db) => db.$executeRaw`
        INSERT INTO entitlement_grants (organization_id, capacidade, origem)
        VALUES (${IDS.orgA}::uuid, 'e33-inventada', 'PLANO')`),
      /permission denied|permissão negada/i,
      'o runtime ganhou escrita em entitlement_grants: a fronteira do E05 caiu');
  });

  it('e a concessão passa pelo CAMINHO PRÓPRIO, com pessoa e motivo', async () => {
    await sql.query(
      `INSERT INTO platform_staff (user_id, motivo) VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`, [IDS.utilizadorA, `${PREFIXO}staff`]);

    const id = await comA((db) => concederCapacidade(db, IDS.orgA, {
      capacidade: 'relatorios.avancados', quota: null, validoAte: null,
      staffUserId: IDS.utilizadorA, staffEmail: `${PREFIXO}ana@bossa.example`,
      motivo: MOTIVO,
    }));
    assert.ok(id);

    // E a auditoria saiu na MESMA transacção. Conceder e registar não são duas
    // coisas — se fossem, a segunda seria a que falha num dia com pressa.
    const { rows } = await sql.query(
      `SELECT actor_email, motivo FROM audit_events
        WHERE accao = 'plataforma.capacidade.concedida' AND alvo_id = $1`, [id]);
    assert.equal(rows.length, 1, 'concedeu e não registou');
    assert.equal(rows[0].actor_email, `${PREFIXO}ana@bossa.example`);
    assert.equal(rows[0].motivo, MOTIVO);
  });

  it('e quem NÃO é da plataforma não concede', async () => {
    await sql.query(`DELETE FROM platform_staff WHERE user_id = $1`, [IDS.utilizadorA]);
    await assert.rejects(
      () => comA((db) => concederCapacidade(db, IDS.orgA, {
        capacidade: 'relatorios.avancados', quota: null, validoAte: null,
        staffUserId: IDS.utilizadorA, staffEmail: `${PREFIXO}ana@bossa.example`,
        motivo: MOTIVO,
      })),
      (e: Error) => e instanceof RecusaDePlataforma && e.motivo === 'NAO_E_DA_PLATAFORMA');
  });

  it('e conceder sem motivo que explique é recusado', async () => {
    await sql.query(
      `INSERT INTO platform_staff (user_id, motivo) VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`, [IDS.utilizadorA, `${PREFIXO}staff`]);
    await assert.rejects(
      () => comA((db) => concederCapacidade(db, IDS.orgA, {
        capacidade: 'relatorios.avancados', quota: null, validoAte: null,
        staffUserId: IDS.utilizadorA, staffEmail: `${PREFIXO}ana@bossa.example`,
        // ── O caso estava EXACTAMENTE no limiar, e passou ────────────
        //
        // A primeira versão usava «porque sim»: dez caracteres, e o limiar é
        // «menos de dez». Passou — e passou com razão, segundo a regra escrita.
        //
        // Fica dito o que a regra é e o que ela não é: **mede comprimento, não
        // sentido**. «porque sim» explica tanto como «ok», e nenhuma verificação
        // automática distingue um motivo longo e vazio de um curto e certo. O
        // que o comprimento apanha é o campo despachado à pressa, que é a forma
        // mais comum — e é para isso que serve.
        motivo: 'urgente',
      })),
      (e: Error) => e instanceof RecusaDePlataforma && e.motivo === 'SEM_MOTIVO');
  });


  it('e NÃO se concede o que já é de todas as casas', async () => {
    // ── Porque é que isto é uma recusa e não uma concessão inofensiva ────
    //
    // Conceder «dados.exportar» como adicional passaria a ideia de que a casa
    // não a tinha antes — e é essa ideia que abre a porta a alguém lha tirar um
    // dia. A capacidade não se concede porque nunca esteve por conceder.
    await assert.rejects(
      () => comA((db) => concederCapacidade(db, IDS.orgA, {
        capacidade: 'dados.exportar', quota: null, validoAte: null,
        staffUserId: IDS.utilizadorA, staffEmail: `${PREFIXO}ana@bossa.example`,
        motivo: MOTIVO,
      })),
      (e: Error) => e instanceof RecusaDePlataforma && e.motivo === 'CAPACIDADE_PROTEGIDA');
  });
});

describe('6 · Segurança, privacidade e exportação NÃO ficam atrás do plano', () => {
  it('a base RECUSA pôr a exportação atrás de um plano', async () => {
    // «Começa por "a exportação em massa é uma funcionalidade Pro" e acaba com
    // um cliente sem forma de sair.» A regra não é técnica, e por isso está em
    // SQL: uma constante muda-se num commit e ninguém repara.
    const { rows } = await sql.query(`SELECT id FROM plan_definitions LIMIT 1`);
    await assert.rejects(
      () => sql.query(
        `INSERT INTO plan_capabilities (id, plan_id, capacidade)
         VALUES (gen_random_uuid(), $1, 'dados.exportar')`,
        [rows[0].id]),
      /capacidade_protegida_atras_do_plano/,
      'a exportação ficou atrás do plano');
  });

  it('e a CONVENIÊNCIA pode ficar — senão não haveria planos nenhuns', async () => {
    const { rows } = await sql.query(`SELECT id FROM plan_definitions LIMIT 1`);
    const r = await sql.query(
      `INSERT INTO plan_capabilities (id, plan_id, capacidade)
       VALUES (gen_random_uuid(), $1, $2) ON CONFLICT DO NOTHING RETURNING id`,
      [rows[0].id, `${PREFIXO}relatorios.avancados`]);
    assert.equal(r.rowCount, 1, 'nem a conveniência entra: o gatilho recusa tudo');
  });
});

describe('7 · Nenhum segredo sai, e reprocessar não duplica', () => {
  it('a tabela de segredos não tem coluna nenhuma para o valor', async () => {
    // Varre TODAS as colunas, e não as que eu me lembraria de verificar.
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'platform_secrets'`);
    const nomes = rows.map((r: { column_name: string }) => r.column_name);
    for (const proibida of ['valor', 'value', 'segredo', 'secret', 'chave', 'token']) {
      assert.ok(!nomes.includes(proibida),
        `a tabela de segredos tem uma coluna "${proibida}"`);
    }
  });

  it('e o que se mostra é o ESTADO, lido do ambiente e não guardado', async () => {
    await sql.query(
      `INSERT INTO platform_secrets (nome, descricao) VALUES ($1, $2)`,
      [`${PREFIXO.toUpperCase()}SEGREDO_X`, 'um segredo de prova']);

    const semAmbiente = await comA((db) => segredosDaPlataforma(db, {}));
    const comAmbiente = await comA((db) => segredosDaPlataforma(db, {
      [`${PREFIXO.toUpperCase()}SEGREDO_X`]: 'sk_live_zzz',
    }));

    const antes = semAmbiente.find((s) => s.nome === `${PREFIXO.toUpperCase()}SEGREDO_X`);
    const depois = comAmbiente.find((s) => s.nome === `${PREFIXO.toUpperCase()}SEGREDO_X`);
    assert.equal(antes?.configurado, false);
    assert.equal(depois?.configurado, true,
      'o estado não vem do ambiente: uma coluna fica a mentir no dia em que a variável sai');
    // E o valor não aparece em lado nenhum da projecção.
    assert.ok(!JSON.stringify(comAmbiente).includes('sk_live_zzz'));
  });

  it('DUAS CASAS com o mesmo pedido enfileiram as DUAS', async () => {
    // ── O caso que o sénior apanhou na revisão do E33 ────────────────────
    //
    // A identidade era `tipo:alvo:tentativa` e o índice único é global: a casa
    // B levava `duplicate key` e **nunca enfileirava**. Copiei a forma da
    // impressão do E31, onde funciona porque o `documento_id` é um UUID — e
    // aqui o `alvo` é texto livre.
    //
    // Mede-se contra a BASE, e não só no domínio: o que garante é o gatilho,
    // e a cópia em TypeScript é só para quem precisa da identidade antes de
    // escrever. Se as duas divergirem, a base ganha.
    const daA = await comA((db) => enfileirarTrabalho(db, {
      organizationId: IDS.orgA, tipo: `${PREFIXO}exportacao`, alvo: 'relatorio-mensal',
    }));
    const daB = await comEscopo(prisma, { organizationId: IDS.orgB, userId: IDS.utilizadorB },
      (db) => enfileirarTrabalho(db, {
        organizationId: IDS.orgB, tipo: `${PREFIXO}exportacao`, alvo: 'relatorio-mensal',
      }));

    assert.notEqual(daA.id, daB.id, 'as duas casas partilharam o trabalho');
    assert.notEqual(daA.identidade, daB.identidade,
      'a identidade atravessa inquilinos: a segunda casa nunca enfileira');

    const n = await sql.query(
      `SELECT count(*)::int AS n FROM platform_jobs WHERE tipo = $1`,
      [`${PREFIXO}exportacao`]);
    assert.equal(n.rows[0].n, 2, 'uma das casas ficou sem trabalho');
  });

  it('e a MESMA casa duas vezes continua a deduplicar', async () => {
    // O par. Uma correcção que pusesse algo único por linha na identidade
    // fazia as duas casas caberem **e** destruía a deduplicação, que é a razão
    // de a fila existir.
    const uma = await comA((db) => enfileirarTrabalho(db, {
      organizationId: IDS.orgA, tipo: `${PREFIXO}dedup`, alvo: 'x',
    }));
    const outra = await comA((db) => enfileirarTrabalho(db, {
      organizationId: IDS.orgA, tipo: `${PREFIXO}dedup`, alvo: 'x',
    }));
    assert.equal(uma.id, outra.id, 'a mesma casa duas vezes criou dois trabalhos');
  });

  it('e a identidade que a base escreve é a que o domínio calcula', async () => {
    // As duas cópias da regra têm de dizer o mesmo. Se divergirem, a base ganha
    // e a inserção falha — modo de falha certo, mas silencioso até acontecer.
    const t = await comA((db) => enfileirarTrabalho(db, {
      organizationId: IDS.orgA, tipo: `${PREFIXO}acordo`, alvo: 'y',
    }));
    assert.equal(t.identidade,
      identidadeDeTrabalho(IDS.orgA, `${PREFIXO}acordo`, 'y', 1),
      'o gatilho e o domínio calculam identidades diferentes');
  });

  it('reprocessar o mesmo trabalho duas vezes dá UM trabalho por tentativa', async () => {
    const t = await comA((db) => enfileirarTrabalho(db, {
      organizationId: IDS.orgA, tipo: `${PREFIXO}envio`, alvo: 'abc',
    }));
    const igual = await comA((db) => enfileirarTrabalho(db, {
      organizationId: IDS.orgA, tipo: `${PREFIXO}envio`, alvo: 'abc',
    }));
    assert.equal(t.id, igual.id, 'pedir a mesma tentativa criou um trabalho novo');

    const seguinte = await comA((db) => reprocessarTrabalho(db, t.id));
    assert.notEqual(seguinte.id, t.id, 'reprocessar devolveu o mesmo trabalho');
    assert.equal(seguinte.tentativa, 2);

    const n = await sql.query(
      `SELECT count(*)::int AS n FROM platform_jobs WHERE tipo = $1`, [`${PREFIXO}envio`]);
    assert.equal(n.rows[0].n, 2, 'ficaram mais trabalhos do que tentativas');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
/**
 * E34 · aceite 3, família ACESSO — uma leitura do suporte contra a revogação.
 *
 * ── O único dos três em que a resposta certa NÃO é determinista ───────────
 *
 * O `suporte_com_concessao_viva` é `STABLE`. Dentro do instantâneo de uma
 * instrução, uma leitura que começou antes de a revogação **confirmar** continua
 * a ver a concessão viva. **Isso é o isolamento do PostgreSQL a funcionar, e não
 * um defeito.** Uma prova que exigisse «a leitura tem de falhar» estava a exigir
 * o impossível, e seria intermitente.
 *
 * Por isso aqui não se afirma qual dos dois ganhou. Afirmam-se as duas coisas
 * que são verdade nas duas ordens:
 *
 *   1. **rastos = leituras bem sucedidas.** Nenhuma leitura passa sem registo,
 *      e nenhuma leitura recusada deixa registo de um acesso que não houve.
 *   2. Depois de a revogação estar **confirmada**, toda a leitura seguinte é
 *      recusada.
 *
 * E um detalhe de medição, que já apanhou quem escreveu a régua: **não se conta
 * o rasto na mesma instrução que o provoca.** A CTE que escreve não é visível ao
 * resto da instrução que a desencadeou — a contagem faz-se depois, noutra
 * instrução, ou lê-se zero e conclui-se um defeito que não existe.
 */
describe('8 · leitura do suporte e revogação da concessão, concorrentes (E34)', () => {
  function encontro(quantos: number) {
    let chegaram = 0;
    let abrir!: () => void;
    const porta = new Promise<void>((r) => { abrir = r; });
    return async () => {
      chegaram += 1;
      if (chegaram === quantos) abrir();
      await porta;
    };
  }

  /** A testemunha da sobreposição: quantas OUTRAS ligações estão em transacção. */
  async function outrasTransaccoesAbertas(db: { $queryRaw: typeof prisma.$queryRaw }) {
    const r = await db.$queryRaw<{ outros: number }[]>`
      SELECT count(*)::int AS outros FROM pg_stat_activity
       WHERE datname = current_database() AND xact_start IS NOT NULL
         AND pid <> pg_backend_pid() AND backend_type = 'client backend'`;
    return r[0]!.outros;
  }

  const EMAIL = `${PREFIXO_E34}ana@bossa.example`;
  const MOTIVO_E34 = `${PREFIXO_E34}o cliente diz que um pedido sumiu da fila da cozinha`;

  /** Um pedido real da casa A, com linhas — sem linhas, o pedido chega vazio. */
  async function pedidoDaCasa() {
    const { rows } = await sql.query(
      `INSERT INTO orders (id, organization_id, location_id, canal, numero, estado,
                           aberto_por, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'SALA', $3, 'ACEITE', $4, now())
       RETURNING id`,
      [IDS.orgA, IDS.unidadeA, `${PREFIXO_E34}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
       `${PREFIXO_E34}quem`]);
    const id = rows[0].id as string;
    await sql.query(
      `INSERT INTO order_lines (id, organization_id, order_id, nome, quantidade, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'bacalhau à Brás', 2, 'ACEITE', now())`,
      [IDS.orgA, id]);
    return id;
  }

  const concessao = (ambito: 'LEITURA' | 'DADOS_OPERACIONAIS' = 'DADOS_OPERACIONAIS') =>
    comA((db) => abrirSessaoDeSuporte(db, IDS.orgA, {
      staffUserId: IDS.utilizadorA, staffEmail: EMAIL, motivo: MOTIVO_E34,
      ambito: [ambito], duracaoMinutos: 30,
    }));

  /**
   * A leitura pelo caminho REAL do suporte: `comIdentidade`, sem organização no
   * contexto — que é a decisão inteira do E34 e a razão de a `suporte_le_pedido`
   * existir. Devolve o pedido, ou `null` quando a concessão não autoriza.
   */
  const lerComoSuporte = (pedidoId: string, sessaoId: string) =>
    comIdentidade(prisma, IDS.utilizadorA, async (db) => {
      const linhas = await db.$queryRaw<{ suporte_le_pedido: unknown }[]>`
        SELECT suporte_le_pedido(${pedidoId}::uuid, ${sessaoId}::uuid)`;
      return linhas[0]?.suporte_le_pedido ?? null;
    });

  /** Contado NOUTRA instrução, e depois. Nunca na que o provoca. */
  const rastos = async (pedidoId: string) => (await sql.query(
    `SELECT count(*)::int AS n FROM audit_events
      WHERE accao = 'plataforma.suporte.pedido.lido' AND alvo_id = $1`, [pedidoId])).rows[0].n as number;

  it('a leitura e a revogação ao mesmo tempo: rastos = leituras bem sucedidas', async () => {
    const pedido = await pedidoDaCasa();
    const s = await concessao();

    // ── Controlo positivo, e é ele que impede a prova de medir uma porta já
    //    fechada ────────────────────────────────────────────────────────────
    //
    // Sem isto, «zero leituras e zero rastos» satisfaz o invariante 1 e o caso
    // sai a verde sobre população zero — com o caminho partido, aliás, que foi
    // exactamente o que aconteceu na J15 antes do E34.
    const controlo = await lerComoSuporte(pedido, s.id);
    assert.ok(controlo, 'a leitura autorizada não devolveu nada: o caminho está fechado antes de começar');
    assert.equal(await rastos(pedido), 1, 'a leitura passou e NÃO deixou rasto');
    let boas = 1;

    // As duas partem juntas: a leitura e a revogação são concorrentes, e
    // nenhuma espera pela resposta da outra.
    const juntos = encontro(2);
    const sobrepostas: number[] = [];

    const leitura = comIdentidade(prisma, IDS.utilizadorA, async (db) => {
      await db.$queryRaw`SELECT 1`;
      await juntos();
      sobrepostas.push(await outrasTransaccoesAbertas(db));
      const linhas = await db.$queryRaw<{ suporte_le_pedido: unknown }[]>`
        SELECT suporte_le_pedido(${pedido}::uuid, ${s.id}::uuid)`;
      return linhas[0]?.suporte_le_pedido ?? null;
    });
    const revogacao = comEscopo(prisma, { organizationId: IDS.orgA, userId: IDS.utilizadorA },
      async (db) => {
        await db.$queryRaw`SELECT 1`;
        await juntos();
        sobrepostas.push(await outrasTransaccoesAbertas(db));
        return terminarSessaoDeSuporte(db, s.id, `${PREFIXO_E34}o cliente retirou o acesso`, EMAIL);
      });

    const [saiuLeitura, saiuRevogacao] = await Promise.allSettled([leitura, revogacao]);

    assert.ok(sobrepostas.every((n) => n >= 1),
      `a leitura e a revogação não se sobrepuseram (${sobrepostas.join(',')}): isto é sequência`);
    assert.equal(saiuLeitura.status, 'fulfilled',
      `a leitura estoirou em vez de recusar: ${saiuLeitura.status === 'rejected'
        ? String(saiuLeitura.reason).slice(0, 160) : ''}`);
    assert.equal(saiuRevogacao.status, 'fulfilled',
      `a revogação falhou: ${saiuRevogacao.status === 'rejected'
        ? String(saiuRevogacao.reason).slice(0, 160) : ''}`);

    // ── E aqui NÃO se afirma quem ganhou ─────────────────────────────────
    //
    // Medido a 07/09 em 20 corridas: 20 vezes a leitura chegou primeiro e leu.
    // Isso é um facto desta máquina e deste dia, não um invariante — e uma
    // asserção construída sobre ele seria uma moeda ao ar com sorte boa.
    const leu = (saiuLeitura as PromiseFulfilledResult<unknown>).value !== null;
    if (leu) boas += 1;
    assert.equal(await rastos(pedido), boas,
      leu ? 'a leitura da corrida passou sem deixar rasto'
          : 'ficou um rasto de um acesso que não devolveu nada');

    // ── Invariante 2: com a revogação confirmada, acabou ─────────────────
    const { rows } = await sql.query(
      `SELECT terminada_em FROM support_sessions WHERE id = $1`, [s.id]);
    assert.ok(rows[0].terminada_em, 'a revogação disse que sim e a sessão continua por fechar');
    assert.equal(await lerComoSuporte(pedido, s.id), null,
      'a concessão foi revogada e a leitura seguinte continuou a passar');
    assert.equal(await rastos(pedido), boas,
      'uma leitura recusada deixou rasto de um acesso que não aconteceu');
  });

  it('e o PAR: revogada aquela, uma concessão NOVA volta a ler — e a deixar rasto',
    async () => {
      // Sem este par, «depois da revogação recusa sempre» passava num sistema
      // que recusasse tudo, incluindo o caminho legítimo. A recusa tem de ser
      // sobre a concessão morta, e não sobre o pedido.
      const pedido = await pedidoDaCasa();
      const primeira = await concessao();
      assert.ok(await lerComoSuporte(pedido, primeira.id), 'a primeira concessão não leu');
      await comA((db) => terminarSessaoDeSuporte(
        db, primeira.id, `${PREFIXO_E34}fim do diagnóstico`, EMAIL));
      assert.equal(await lerComoSuporte(pedido, primeira.id), null, 'a sessão fechada continuou a ler');
      assert.equal(await rastos(pedido), 1);

      const segunda = await concessao();
      assert.ok(await lerComoSuporte(pedido, segunda.id),
        'uma concessão nova e viva não leu: a recusa não era da concessão');
      assert.equal(await rastos(pedido), 2, 'a leitura nova não deixou rasto');
    });

  /**
   * ── CORRECÇÃO 14 · a sessão NOMEADA também tem de estar viva ──────────────
   *
   * Achado ao escrever a prova concorrente de cima, a 07/09, e corrigido na
   * migração `20260918010000_e34_a_sessao_nomeada_tem_de_estar_viva`.
   *
   * A correcção 13 tinha ligado a sessão nomeada por três condições — `s.id`, a
   * organização e o agente — e não pela liveness dela. Quem verificava liveness
   * era o `suporte_com_concessao_viva(org)`, e a pergunta dele é outra: **«este
   * agente tem ALGUMA concessão viva nesta casa?»**, e não «é ESTA».
   *
   * O que medi, nesta ordem:
   *
   *   1. sessão A (DADOS_OPERACIONAIS) viva          → lê. Correcto.
   *   2. A revogada, nenhuma outra viva              → não lê. Correcto.
   *   3. A revogada, **B viva**, a ler com o id de A → **lia**, e o rasto nomeava A.
   *
   * Não era fuga de dados — só lê quem tem, naquele instante, uma concessão viva
   * e em âmbito para aquela casa. O que se estragava era o **rasto**, que é a
   * razão de ser desta etapa: o agente escolhia qual das suas sessões passadas
   * ficava escrita, e a casa lia um acesso atribuído a uma sessão já fechada,
   * com um motivo que não era o do acesso.
   *
   * Os dois casos seguintes exigem o invariante a sério. O terceiro é o controlo
   * negativo que lhes dá sentido: sem ele, não se sabe se estes dois medem a
   * correcção ou se sempre teriam passado.
   */
  it('uma concessão REVOGADA não volta a ler quando o mesmo agente abre outra',
    async () => {
      const pedido = await pedidoDaCasa();
      const revogada = await concessao();
      assert.ok(await lerComoSuporte(pedido, revogada.id), 'a concessão não leu enquanto viva');
      await comA((db) => terminarSessaoDeSuporte(
        db, revogada.id, `${PREFIXO_E34}o cliente retirou o acesso`, EMAIL));
      assert.equal(await lerComoSuporte(pedido, revogada.id), null,
        'controlo: sem nenhuma concessão viva, a revogada já não lê');

      // Uma concessão NOVA, legítima, para outro diagnóstico. Nada nela diz
      // respeito à sessão que a casa mandou fechar.
      const viva = await concessao();
      assert.ok(await lerComoSuporte(pedido, viva.id),
        'controlo: a concessão nova lê — senão este caso passava por a casa estar fechada');

      assert.equal(await lerComoSuporte(pedido, revogada.id), null,
        'a concessão revogada voltou a ler porque o agente abriu outra — e o rasto nomeia a revogada');
      // E não ficou rasto da tentativa recusada: são 2 leituras boas, 2 rastos.
      assert.equal(await rastos(pedido), 2,
        'ficou rasto de um acesso que a concessão revogada não chegou a fazer');
    });

  it('e a sessão de LEITURA revogada continua sem ler o que nunca pôde ler', async () => {
    const pedido = await pedidoDaCasa();
    const soLeitura = await concessao('LEITURA');
    // Enquanto viva, esta sessão recusa — o âmbito é a terceira das quatro
    // condições, e funciona. É o controlo positivo do caso: se ela já lesse
    // aqui, o que se mede a seguir não era sobre a revogação.
    assert.equal(await lerComoSuporte(pedido, soLeitura.id), null,
      'controlo: uma sessão de LEITURA viva não lê dados operacionais');
    await comA((db) => terminarSessaoDeSuporte(
      db, soLeitura.id, `${PREFIXO_E34}fim da consulta de configuração`, EMAIL));
    const operacional = await concessao('DADOS_OPERACIONAIS');
    assert.ok(await lerComoSuporte(pedido, operacional.id), 'controlo: a sessão em âmbito lê');

    assert.equal(await lerComoSuporte(pedido, soLeitura.id), null,
      'a sessão de LEITURA, já terminada, leu os dados operacionais — e o rasto ficou com o motivo dela');
    assert.equal(await rastos(pedido), 1, 'ficou rasto de um acesso que não aconteceu');
  });

  /**
   * ── O CONTROLO NEGATIVO, e sem ele os dois casos de cima não valem nada ───
   *
   * A pergunta que ele responde é «estes casos medem a correcção 14, ou teriam
   * passado na mesma?». A resposta tem de sair de correr **a função anterior** —
   * e não da minha palavra de que ela era diferente.
   *
   * A versão anterior não está transcrita aqui: é **lida do ficheiro da
   * migração** que a criou. Uma transcrição minha podia divergir do que estava
   * mesmo em produção, e aí o controlo media a minha cópia.
   *
   * Corre tudo numa transacção **revertida** e na MESMA ligação — o `CREATE OR
   * REPLACE` é transaccional no PostgreSQL, e uma ligação diferente não veria a
   * substituição antes do commit. As duas medições saem da mesma ligação, do
   * mesmo papel, sobre os mesmos dados: a **única** variável é o corpo da
   * função. E o `ROLLBACK` repõe a corrigida — incluindo o rasto que a versão
   * com defeito escrever pelo caminho.
   */
  it('CONTROLO NEGATIVO: com a função ANTERIOR à correcção 14, as duas leituras passam',
    async () => {
      const pedido = await pedidoDaCasa();
      const revogada = await concessao();
      await comA((db) => terminarSessaoDeSuporte(
        db, revogada.id, `${PREFIXO_E34}o cliente retirou o acesso`, EMAIL));
      const soLeitura = await concessao('LEITURA');
      await comA((db) => terminarSessaoDeSuporte(
        db, soLeitura.id, `${PREFIXO_E34}fim da consulta de configuração`, EMAIL));
      await concessao('DADOS_OPERACIONAIS');

      const anterior = await readFile(new URL(
        '../packages/db/prisma/migrations/'
        + '20260917990000_e34_o_rasto_do_suporte_nao_se_separa_da_leitura/migration.sql',
        import.meta.url), 'utf8');
      assert.ok(anterior.includes('CREATE OR REPLACE FUNCTION suporte_le_pedido'),
        'o ficheiro da migração anterior não define a função: o controlo não mede nada');

      const lerPorAqui = async (sessaoId: string) => (await sql.query(
        `SELECT suporte_le_pedido($1::uuid, $2::uuid) AS d`, [pedido, sessaoId])).rows[0].d;

      /**
       * As duas medições saem daqui dentro, e a transacção fecha-se sempre.
       * Se o `CREATE OR REPLACE` rebentar, o erro sobe e o caso falha — um
       * controlo que não chegou a correr não pode sair a verde.
       */
      const medir = async () => {
        await sql.query('BEGIN');
        try {
          await sql.query(`SELECT set_config('app.user_id', $1, true)`, [IDS.utilizadorA]);
          // A corrigida, medida por ESTA ligação — para a comparação ser entre
          // corpos de função, e não entre caminhos.
          const corrigida = [await lerPorAqui(revogada.id), await lerPorAqui(soLeitura.id)];
          await sql.query(anterior);
          const antiga = [await lerPorAqui(revogada.id), await lerPorAqui(soLeitura.id)];
          return { corrigida, antiga };
        } finally {
          await sql.query('ROLLBACK');
        }
      };
      const { corrigida, antiga } = await medir();

      assert.deepEqual(corrigida, [null, null],
        'a função corrigida ainda lê por uma sessão revogada: a correcção 14 não pegou');
      assert.ok(antiga[0],
        'a função ANTERIOR já recusava a sessão revogada: o caso não mede a correcção 14');
      assert.ok(antiga[1],
        'a função ANTERIOR já recusava a sessão de LEITURA revogada: o caso não mede a correcção 14');

      // E o `ROLLBACK` desfez tudo: a função viva é outra vez a corrigida, e o
      // rasto que a versão com defeito escreveu não ficou.
      assert.equal(await lerComoSuporte(pedido, revogada.id), null,
        'a substituição temporária sobreviveu à transacção');
      assert.equal(await rastos(pedido), 0,
        'ficou na auditoria um rasto escrito pela versão com defeito');
    });

  it('e a concessão de LEITURA não chega para ver o pedido — nem deixa rasto', async () => {
    // O âmbito é a terceira das quatro condições, e é a que distingue «ver que a
    // casa existe» de «ver o que ela vendeu». Sem este caso, o par de cima
    // provava que uma sessão qualquer serve.
    const pedido = await pedidoDaCasa();
    const s = await concessao('LEITURA');
    assert.equal(await lerComoSuporte(pedido, s.id), null,
      'uma sessão de LEITURA leu os dados operacionais da casa');
    assert.equal(await rastos(pedido), 0, 'ficou rasto de um acesso que não aconteceu');
  });
});

import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  comEscopo, corrigir, correccoesDaUnidade, criarFuncao, criarTurno, diaDeServicoDe,
  jornadaDoDia, marcacoesDoDia, minutosNoDiaDeServico, obterPrisma, picar,
  turnosDaSemana,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E28 — equipa, escalas e ponto.
 *
 * ── O que a régua diz que NÃO conta ───────────────────────────────────────
 *
 * «Uma prova que só use o turno que corre bem. Sem turno atravessado, sem
 * correcção e sem esquecimento de picar, não está provado — está demonstrado.»
 *
 * Por isso o grupo 2 atravessa a meia-noite, o grupo 3 corrige de duas maneiras
 * e o grupo 4 deixa uma jornada aberta de propósito.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e28-';
const FUSO = 'Europe/Madrid';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let n = 0;
const proximo = () => `${PREFIXO}${(n += 1)}`;

/** Duas pertenças: uma é a pessoa, a outra é quem a corrige. */
let pessoa = '';
let encarregado = '';

const marcar = (
  tipo: 'ENTRADA' | 'SAIDA', momento: string, quem = pessoa, autor = quem,
) => comA((db) => picar(db, {
  organizationId: IDS.orgA, locationId: IDS.unidadeA,
  membershipId: quem, autorMembershipId: autor,
  tipo, momento: new Date(momento), fuso: FUSO, origem: PREFIXO,
}));

/**
 * ── A limpeza tem de DESLIGAR o gatilho, e isso é o gatilho a funcionar ────
 *
 * `time_entries` é imutável: o `DELETE` do arnês é recusado como o de um
 * encarregado. A primeira versão desta prova não corria por causa disso — e a
 * mensagem que a fez cair foi `REGISTO_IMUTAVEL`, ou seja, a defesa a defender.
 *
 * É o mesmo caminho que o E22 abriu para os movimentos de caixa: desliga-se
 * para limpar o que a prova sujou, e volta a ligar-se. O que NÃO se faz é
 * abrandar o gatilho para o teste ser mais fácil de escrever.
 */
async function gatilhos(estado: 'DISABLE' | 'ENABLE') {
  await sql.query(`ALTER TABLE "time_entries" ${estado} TRIGGER USER`);
}

async function limpar() {
  await gatilhos('DISABLE');
  // ── As CORRECÇÕES primeiro, e a ordem não é arrumação ──────────────────
  //
  // `corrige_id` é `ON DELETE RESTRICT`: apagar a marcação original enquanto a
  // correcção lhe aponta falha com violação de chave estrangeira. A primeira
  // versão apagava tudo numa instrução, a limpeza rebentava, e a suite inteira
  // ficava cancelada por hook falhado — o que se via era «0 casos», não um erro.
  //
  // O `RESTRICT` está certo: é ele que impede alguém de apagar a marcação
  // original e deixar a correcção a apontar ao vazio.
  await sql.query(
    `DELETE FROM time_entries
      WHERE corrige_id IS NOT NULL AND (origem = $1 OR motivo LIKE $2
            OR corrige_id IN (SELECT id FROM time_entries WHERE origem = $1))`,
    [PREFIXO, `${PREFIXO}%`]);
  await sql.query(
    `DELETE FROM time_entries WHERE origem = $1 OR motivo LIKE $2`, [PREFIXO, `${PREFIXO}%`]);
  await sql.query(`DELETE FROM shifts WHERE nota LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM team_roles WHERE nome LIKE '${PREFIXO}%'`);
  await gatilhos('ENABLE');
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
  const { rows } = await sql.query(
    `SELECT m.id FROM memberships m WHERE m.organization_id = $1 ORDER BY m.created_at LIMIT 2`,
    [IDS.orgA]);
  assert.ok(rows.length >= 2, 'a semente precisa de duas pertenças na org A');
  pessoa = rows[0].id; encarregado = rows[1].id;
  await limpar();
});
// Se a limpeza entre casos falhar, o caso seguinte falha por sujidade — que é
// um vermelho legível. O que não pode é ficar pendurada.
beforeEach(limpar);
/**
 * ── A saída fecha SEMPRE, mesmo quando a limpeza falha ────────────────────
 *
 * Com a restrição desligada por um controlo negativo, a limpeza pode rebentar —
 * e a primeira versão disto deixava as ligações abertas quando isso acontecia.
 * O node não saía, o guião ficava parado, e um VERMELHO passava a parecer «ainda
 * a correr». Um arnês que pendura transforma uma falha medida numa falha
 * invisível.
 */
after(async () => {
  try {
    await limpar();
  } catch (e) {
    console.error('limpeza final falhou:', e instanceof Error ? e.message : e);
  } finally {
    await sql.end();
    await prisma.$disconnect();
  }
});

describe('1 · o dia de serviço não é o dia do calendário', () => {
  it('quem saiu às 00h42 de sábado trabalhou na SEXTA', () => {
    // 00h42 em Madrid, no sábado 2026-09-05 → 22h42 UTC de sexta.
    // 00h42 de SÁBADO em Madrid é 22h42 UTC de sexta.
    const saida = new Date('2026-09-04T22:42:00Z');
    const civil = new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(saida);
    assert.equal(civil, '2026-09-05', 'a montagem do caso está errada: não é sábado');
    assert.equal(diaDeServicoDe(saida, FUSO), '2026-09-04',
      'o turno da sexta foi cortado ao meio pela data civil');
  });

  it('e o PAR: às 18h de sexta o dia de serviço é a própria sexta', () => {
    // Sem este par, «o dia de serviço é sempre o anterior» passava o caso acima.
    const entrada = new Date('2026-09-04T16:00:00Z'); // 18h em Madrid
    assert.equal(diaDeServicoDe(entrada, FUSO), '2026-09-04');
  });

  it('às 04h59 ainda é o dia anterior; às 05h01 já é o novo', () => {
    assert.equal(diaDeServicoDe(new Date('2026-09-05T02:59:00Z'), FUSO), '2026-09-04');
    assert.equal(diaDeServicoDe(new Date('2026-09-05T03:01:00Z'), FUSO), '2026-09-05');
  });

  it('e a hora de VERÃO muda o dia de serviço do MESMO instante do relógio', () => {
    // ── A primeira versão deste caso não media nada ─────────────────────
    //
    // Escolhi 23h30 UTC e esperei dias diferentes; dão o mesmo, e os dois
    // valores que escrevi estavam errados. Um caso que passa com um
    // deslocamento fixo não prova que a hora de Verão foi respeitada.
    //
    // 03h30 UTC discrimina: em Janeiro (UTC+1) são 04h30 locais, antes do corte
    // das 05h, e o dia de serviço é o ANTERIOR; em Julho (UTC+2) são 05h30,
    // depois do corte, e o dia é o PRÓPRIO. Mesmo relógio, dias diferentes.
    assert.equal(diaDeServicoDe(new Date('2026-01-15T03:30:00Z'), FUSO), '2026-01-14');
    assert.equal(diaDeServicoDe(new Date('2026-07-15T03:30:00Z'), FUSO), '2026-07-15');
  });

  it('os minutos de uma saída depois da meia-noite passam de 1440', () => {
    const dia = '2026-09-04';
    const saida = new Date('2026-09-04T22:42:00Z'); // 00h42 de sábado em Madrid
    assert.equal(minutosNoDiaDeServico(saida, FUSO, dia), 1482,
      '00h42 do dia seguinte foi contado como 42 minutos');
  });
});

describe('2 · a marcação é um FACTO e a base não a deixa reescrever', () => {
  it('apagar uma marcação FALHA na base', async () => {
    const m = await marcar('ENTRADA', '2026-09-04T16:00:00Z');
    await assert.rejects(
      sql.query('DELETE FROM time_entries WHERE id = $1', [m.id]),
      /REGISTO_IMUTAVEL/);
  });

  it('e reescrever a hora também FALHA', async () => {
    const m = await marcar('ENTRADA', '2026-09-04T16:00:00Z');
    await assert.rejects(
      sql.query(`UPDATE time_entries SET momento = now() WHERE id = $1`, [m.id]),
      /REGISTO_IMUTAVEL/);
  });

  it('e o PAR: a correcção legítima FUNCIONA e fica visível como correcção',
    async () => {
      const m = await marcar('ENTRADA', '2026-09-04T16:07:00Z');
      await comA((db) => corrigir(db, {
        organizationId: IDS.orgA, locationId: IDS.unidadeA,
        marcacaoId: m.id, autorMembershipId: encarregado,
        momento: new Date('2026-09-04T16:00:00Z'), fuso: FUSO,
        motivo: `${PREFIXO}entrou às 18h, o relógio da porta estava atrasado`,
      }));
      const lidas = await comA((db) => marcacoesDoDia(db, {
        membershipId: pessoa, diaDeServico: '2026-09-04',
      }));
      const original = lidas.find((x) => x.id === m.id);
      const correccao = lidas.find((x) => x.ehCorreccao);
      assert.equal(original?.corrigida, true, 'a original não ficou marcada como corrigida');
      assert.ok(correccao, 'a correcção não aparece');
      assert.equal(correccao!.motivo?.includes('relógio'), true,
        'a correcção não mostra o motivo');
      assert.equal(lidas.length, 2, 'a original desapareceu — o rasto perdeu-se');
    });

  it('uma correcção SEM motivo é recusada, e a base recusa-a também', async () => {
    const m = await marcar('ENTRADA', '2026-09-04T16:00:00Z');
    await assert.rejects(comA((db) => corrigir(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA,
      marcacaoId: m.id, autorMembershipId: encarregado,
      momento: new Date('2026-09-04T16:05:00Z'), fuso: FUSO, motivo: '   ',
    })), /SEM_MOTIVO/);
    await assert.rejects(sql.query(
      `INSERT INTO time_entries (organization_id, location_id, membership_id, tipo,
         momento, dia_de_servico, autor_membership_id, corrige_id)
       VALUES ($1, $2, $3, 'ENTRADA', now(), '2026-09-04', $4, $5)`,
      [IDS.orgA, IDS.unidadeA, pessoa, encarregado, m.id]),
      /correccao_exige_motivo/);
  });

  it('e uma «correcção» que troca a pessoa é recusada pela base', async () => {
    // A imutabilidade protege o passado; isto protege o SENTIDO. Sem ele, o
    // rasto ficava impecável a documentar uma coisa que nunca aconteceu.
    const m = await marcar('ENTRADA', '2026-09-04T16:00:00Z');
    await assert.rejects(sql.query(
      `INSERT INTO time_entries (organization_id, location_id, membership_id, tipo,
         momento, dia_de_servico, autor_membership_id, corrige_id, motivo)
       VALUES ($1, $2, $3, 'ENTRADA', now(), '2026-09-04', $4, $5, 'trocado')`,
      [IDS.orgA, IDS.unidadeA, encarregado, encarregado, m.id]),
      /CORRECCAO_TROCA_A_MARCACAO/);
  });

  it('e uma marcação já corrigida não se corrige outra vez pela original', async () => {
    const m = await marcar('ENTRADA', '2026-09-04T16:07:00Z');
    await comA((db) => corrigir(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, marcacaoId: m.id,
      autorMembershipId: encarregado, momento: new Date('2026-09-04T16:00:00Z'),
      fuso: FUSO, motivo: `${PREFIXO}primeira`,
    }));
    await assert.rejects(comA((db) => corrigir(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, marcacaoId: m.id,
      autorMembershipId: encarregado, momento: new Date('2026-09-04T15:55:00Z'),
      fuso: FUSO, motivo: `${PREFIXO}segunda`,
    })), /JA_CORRIGIDA/);
  });
});

describe('3 · quem corrige não é quem é corrigido — e distingue-se', () => {
  it('a correcção por terceiro NÃO é autocorrecção', async () => {
    const m = await marcar('ENTRADA', '2026-09-04T16:07:00Z');
    await comA((db) => corrigir(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, marcacaoId: m.id,
      autorMembershipId: encarregado, momento: new Date('2026-09-04T16:00:00Z'),
      fuso: FUSO, motivo: `${PREFIXO}corrigido pelo turno`,
    }));
    const lidas = await comA((db) => marcacoesDoDia(db, {
      membershipId: pessoa, diaDeServico: '2026-09-04',
    }));
    const c = lidas.find((x) => x.ehCorreccao)!;
    assert.equal(c.autocorreccao, false);
  });

  it('e o PAR: corrigida pela própria pessoa, É autocorrecção', async () => {
    // Não se proíbe — é decisão da casa. Exige-se que se distinga.
    const m = await marcar('ENTRADA', '2026-09-04T16:07:00Z');
    await comA((db) => corrigir(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, marcacaoId: m.id,
      autorMembershipId: pessoa, momento: new Date('2026-09-04T16:00:00Z'),
      fuso: FUSO, motivo: `${PREFIXO}esqueci-me de picar`,
    }));
    const lidas = await comA((db) => marcacoesDoDia(db, {
      membershipId: pessoa, diaDeServico: '2026-09-04',
    }));
    const c = lidas.find((x) => x.ehCorreccao)!;
    assert.equal(c.autocorreccao, true,
      'uma correcção feita pela própria pessoa passou por correcção de terceiro');
  });

  it('e a lista de revisão mostra as duas, com quem fez cada uma', async () => {
    const a = await marcar('ENTRADA', '2026-09-04T16:07:00Z');
    await comA((db) => corrigir(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, marcacaoId: a.id,
      autorMembershipId: encarregado, momento: new Date('2026-09-04T16:00:00Z'),
      fuso: FUSO, motivo: `${PREFIXO}pelo turno`,
    }));
    const lista = await comA((db) => correccoesDaUnidade(db, IDS.unidadeA));
    const minhas = lista.filter((c) => c.motivo?.startsWith(PREFIXO));
    assert.equal(minhas.length, 1);
    assert.equal(minhas[0]!.autorMembershipId, encarregado);
    assert.notEqual(minhas[0]!.autorMembershipId, minhas[0]!.membershipId);
  });
});

describe('4 · previsto e real são DOIS números', () => {
  const DIA = '2026-09-04';

  async function turnoDas18As24() {
    const funcao = await comA((db) => criarFuncao(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, nome: proximo(),
    }));
    return comA((db) => criarTurno(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, membershipId: pessoa,
      roleId: funcao.id, diaDeServico: DIA,
      inicioMinutos: 18 * 60, fimMinutos: 24 * 60, nota: `${PREFIXO}sexta`,
    }));
  }

  it('escalado 6h, picou 6h35 — e a diferença VÊ-SE', async () => {
    await turnoDas18As24();
    await marcar('ENTRADA', '2026-09-04T16:07:00Z'); // 18h07
    await marcar('SAIDA', '2026-09-04T22:42:00Z');   // 00h42 do dia seguinte
    const j = await comA((db) => jornadaDoDia(db, {
      membershipId: pessoa, locationId: IDS.unidadeA, diaDeServico: DIA, fuso: FUSO,
    }));
    assert.equal(j.previstoMinutos, 360);
    assert.equal(j.realMinutos, 395, 'a jornada atravessada não foi contada inteira');
    assert.equal(j.diferencaMinutos, 35);
    assert.equal(j.aberta, false);
  });

  it('e o PAR: quem picou no previsto não gera divergência', async () => {
    // Sem este par, «marca sempre divergência» passava o caso de cima.
    await turnoDas18As24();
    await marcar('ENTRADA', '2026-09-04T16:00:00Z');
    await marcar('SAIDA', '2026-09-04T22:00:00Z');
    const j = await comA((db) => jornadaDoDia(db, {
      membershipId: pessoa, locationId: IDS.unidadeA, diaDeServico: DIA, fuso: FUSO,
    }));
    assert.equal(j.diferencaMinutos, 0);
  });

  it('sem turno previsto não há diferença NENHUMA — e não é zero', async () => {
    await marcar('ENTRADA', '2026-09-04T16:00:00Z');
    await marcar('SAIDA', '2026-09-04T20:00:00Z');
    const j = await comA((db) => jornadaDoDia(db, {
      membershipId: pessoa, locationId: IDS.unidadeA, diaDeServico: DIA, fuso: FUSO,
    }));
    assert.equal(j.previstoMinutos, null);
    assert.equal(j.diferencaMinutos, null,
      'sem escala, o produto inventou uma diferença contra o trabalhador');
    assert.equal(j.realMinutos, 240);
  });

  it('quem entrou e nunca saiu tem jornada ABERTA, e não de zero', async () => {
    // Um produto que trate a ausência de saída como saída à meia-noite inventa
    // uma hora que ninguém picou.
    await turnoDas18As24();
    await marcar('ENTRADA', '2026-09-04T16:00:00Z');
    const j = await comA((db) => jornadaDoDia(db, {
      membershipId: pessoa, locationId: IDS.unidadeA, diaDeServico: DIA, fuso: FUSO,
    }));
    assert.equal(j.aberta, true, 'o esquecimento de picar passou por jornada fechada');
    assert.equal(j.realMinutos, 0);
  });

  it('a marcação CORRIGIDA não conta; a correcção dela é que conta', async () => {
    // ── A direcção da correcção decide se este caso mede alguma coisa ─────
    //
    // A primeira versão corrigia a entrada para MAIS CEDO. O emparelhamento
    // ordena as entradas e usa a mais antiga — que passava a ser a correcção —
    // e por isso o total dava o mesmo com e sem o defeito. O controlo negativo
    // ficou VERDE com a conta estragada, e foi assim que se soube.
    //
    // Agora a correcção empurra a entrada para MAIS TARDE: contar a original
    // dá 360 minutos, contar a correcção dá 300. Os dois números separam-se.
    await turnoDas18As24();
    const errada = await marcar('ENTRADA', '2026-09-04T16:00:00Z'); // 18h, cedo demais
    await marcar('SAIDA', '2026-09-04T22:00:00Z');                  // 00h
    await comA((db) => corrigir(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, marcacaoId: errada.id,
      autorMembershipId: encarregado, momento: new Date('2026-09-04T17:00:00Z'),
      fuso: FUSO, motivo: `${PREFIXO}picou à chegada, só entrou ao serviço às 19h`,
    }));
    const j = await comA((db) => jornadaDoDia(db, {
      membershipId: pessoa, locationId: IDS.unidadeA, diaDeServico: DIA, fuso: FUSO,
    }));
    assert.equal(j.realMinutos, 300, 'a marcação corrigida continuou a contar');
    // E a contagem de entradas que VALEM tem de ser uma, não duas: sem isto,
    // um emparelhamento que ignore a entrada a mais esconde o mesmo defeito.
    assert.equal(j.entradas, 1, 'a original e a correcção contam as duas como entrada');
    assert.equal(j.correccoes, 1);
  });

  it('os minutos são inteiros, e um turno com vírgula é recusado', async () => {
    await assert.rejects(comA((db) => criarTurno(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, membershipId: pessoa,
      diaDeServico: DIA, inicioMinutos: 1080.5, fimMinutos: 1440, nota: `${PREFIXO}x`,
    })), /MINUTOS_INVALIDOS/);
  });

  it('e um turno que acaba antes de começar é recusado nos dois sítios', async () => {
    await assert.rejects(comA((db) => criarTurno(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, membershipId: pessoa,
      diaDeServico: DIA, inicioMinutos: 1440, fimMinutos: 1080, nota: `${PREFIXO}x`,
    })), /MINUTOS_INVALIDOS/);
    await assert.rejects(sql.query(
      `INSERT INTO shifts (organization_id, location_id, membership_id, dia_de_servico,
         inicio_minutos, fim_minutos, nota)
       VALUES ($1, $2, $3, $4, 1440, 1080, '${PREFIXO}x')`,
      [IDS.orgA, IDS.unidadeA, pessoa, DIA]),
      /turno_comeca_antes_de_acabar/);
  });

  it('a escala da semana devolve o turno atravessado com os minutos > 1440',
    async () => {
      await comA((db) => criarTurno(db, {
        organizationId: IDS.orgA, locationId: IDS.unidadeA, membershipId: pessoa,
        diaDeServico: DIA, inicioMinutos: 18 * 60, fimMinutos: 25 * 60,
        nota: `${PREFIXO}até à 1h`,
      }));
      const semana = await comA((db) => turnosDaSemana(db, {
        locationId: IDS.unidadeA, de: '2026-09-01', ate: '2026-09-07',
      }));
      const meu = semana.find((t) => t.nota?.startsWith(PREFIXO));
      assert.ok(meu, 'o turno não aparece na semana');
      assert.equal(meu!.fimMinutos, 1500, 'o turno até à 1h foi cortado à meia-noite');
    });
});

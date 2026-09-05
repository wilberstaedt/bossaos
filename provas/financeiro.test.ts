import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  caixaDoPeriodo, comEscopo, confirmarCorrespondencia, converterTotal, criarConta,
  criarPeriodo, extractoDaConta, fecharPeriodo, importarExtracto, obterPrisma,
  periodosDaUnidade, reabrirPeriodo, registarMovimento, resultadoDoPeriodo,
  sugerirCorrespondencia, totalizar,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E29 — financeiro e conciliação.
 *
 * ── O que a régua diz que NÃO conta ───────────────────────────────────────
 *
 * «A semente tem de conter o caso mau: uma linha duplicada LEGÍTIMA e uma
 * devolução a atravessar o mês. Sem isso a prova mede o caminho feliz.»
 *
 * E há um caso aqui cujo sinal de avaria é **dois números baterem certo**:
 * colapsar as três datas e ver os dois relatórios passarem a concordar.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e29-';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

let n = 0;
const proximo = () => `${PREFIXO}${(n += 1)}`;

const conta = () => comA((db) => criarConta(db, {
  organizationId: IDS.orgA, locationId: IDS.unidadeA, nome: proximo(),
}));

async function limpar() {
  const contas = `(SELECT id FROM bank_accounts WHERE nome LIKE '${PREFIXO}%')`;
  await sql.query(`DELETE FROM reconciliations WHERE bank_line_id IN (SELECT id FROM bank_lines WHERE account_id IN ${contas})`);
  await sql.query(`DELETE FROM bank_lines WHERE account_id IN ${contas}`);
  await sql.query(`DELETE FROM statement_imports WHERE account_id IN ${contas}`);
  await sql.query(`DELETE FROM bank_accounts WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM reconciliations WHERE movement_id IN (SELECT id FROM financial_movements WHERE conceito LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM financial_movements WHERE conceito LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM period_events WHERE period_id IN (SELECT id FROM accounting_periods WHERE location_id = '${IDS.unidadeA}')`);
  await sql.query(`DELETE FROM accounting_periods WHERE location_id = '${IDS.unidadeA}'`);
  await sql.query(`DELETE FROM exchange_rates WHERE fonte LIKE '${PREFIXO}%'`);
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

describe('1 · importar duas vezes não duplica, e o par não apaga factos', () => {
  /** O ficheiro tem DUAS linhas legítimas iguais no mesmo dia. É o caso mau. */
  const FICHEIRO = [
    { dataValor: '2026-09-28', montanteMenor: 4500, referencia: 'TPV', descricao: 'menu' },
    { dataValor: '2026-09-28', montanteMenor: 4500, referencia: 'TPV', descricao: 'menu' },
    { dataValor: '2026-09-29', montanteMenor: -12000, referencia: 'FORN', descricao: 'peixe' },
  ];

  it('as duas linhas legítimas iguais no mesmo dia ENTRAM as duas', async () => {
    // Sem este caso, o detector de duplicados apaga factos reais — e uma prova
    // que só reimporta o ficheiro nunca o descobre.
    const c = await conta();
    const r = await comA((db) => importarExtracto(db, {
      organizationId: IDS.orgA, accountId: c.id, ficheiro: 'set.csv', linhas: FICHEIRO,
    }));
    assert.equal(r.novas, 3, 'a segunda linha legítima foi apagada como duplicado');
    assert.equal(r.jaVistas, 0);
  });

  it('e reimportar o MESMO ficheiro cria zero, e diz quantas ignorou', async () => {
    const c = await conta();
    await comA((db) => importarExtracto(db, {
      organizationId: IDS.orgA, accountId: c.id, ficheiro: 'set.csv', linhas: FICHEIRO,
    }));
    const segunda = await comA((db) => importarExtracto(db, {
      organizationId: IDS.orgA, accountId: c.id, ficheiro: 'set.csv', linhas: FICHEIRO,
    }));
    assert.equal(segunda.novas, 0, 'a reimportação duplicou os lançamentos');
    assert.equal(segunda.jaVistas, 3, 'ignorou em silêncio: não disse quantas');
    assert.equal(segunda.ignoradas.length, 3, 'a lista do que ficou de fora está vazia');
  });

  it('e a BASE recusa a impressão digital repetida, mesmo à força', async () => {
    const c = await conta();
    await comA((db) => importarExtracto(db, {
      organizationId: IDS.orgA, accountId: c.id, ficheiro: 'x.csv',
      linhas: [FICHEIRO[0]!],
    }));
    await assert.rejects(sql.query(
      `INSERT INTO bank_lines (organization_id, account_id, data_valor, montante_menor,
         referencia, ordem_no_dia)
       VALUES ($1, $2, '2026-09-28', 4500, 'TPV', 1)`, [IDS.orgA, c.id]),
      /uma_linha_por_impressao_digital/);
  });

  it('e uma importação que só traz linhas já vistas não é indistinguível de vazia',
    async () => {
      const c = await conta();
      await comA((db) => importarExtracto(db, {
        organizationId: IDS.orgA, accountId: c.id, ficheiro: 'a.csv', linhas: FICHEIRO,
      }));
      const r = await comA((db) => importarExtracto(db, {
        organizationId: IDS.orgA, accountId: c.id, ficheiro: 'b.csv', linhas: FICHEIRO,
      }));
      // As duas mostram zero lançamentos novos. O que as distingue é o número.
      assert.equal(r.novas, 0);
      assert.ok(r.jaVistas > 0, 'zero novas e zero ignoradas: não se sabe se leu o ficheiro');
    });
});

describe('2 · conciliado é DERIVADO, e nada se auto-confirma', () => {
  async function cenario() {
    const c = await conta();
    await comA((db) => importarExtracto(db, {
      organizationId: IDS.orgA, accountId: c.id, ficheiro: 'x.csv',
      linhas: [{ dataValor: '2026-09-28', montanteMenor: 4500, referencia: 'TPV' }],
    }));
    const [linha] = await comA((db) => extractoDaConta(db, c.id));
    const m = await comA((db) => registarMovimento(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, tipo: 'RECEITA',
      conceito: proximo(), montanteMenor: 4500,
      ocorrenciaEm: '2026-09-28', valorEm: '2026-09-28',
      origemTipo: 'bill', origemId: IDS.unidadeA,
    }));
    return { conta: c, linha: linha!, movimento: m };
  }

  it('não há coluna «conciliado» em tabela nenhuma', async () => {
    const { rows } = await sql.query(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name ILIKE '%conciliad%'`);
    assert.deepEqual(rows, [], `há coluna de conciliado: ${JSON.stringify(rows)}`);
  });

  it('uma correspondência a 100 continua SUGESTÃO', async () => {
    const { conta: c, linha, movimento } = await cenario();
    await comA((db) => sugerirCorrespondencia(db, {
      organizationId: IDS.orgA, bankLineId: linha.id, movementId: movimento.id,
      semelhanca: 100,
    }));
    const [depois] = await comA((db) => extractoDaConta(db, c.id));
    assert.equal(depois!.conciliada, false, 'a semelhança perfeita auto-confirmou');
    assert.equal(depois!.sugestoes, 1);
  });

  it('e o PAR: confirmada por alguém, PASSA a conciliada', async () => {
    const { conta: c, linha, movimento } = await cenario();
    const r = await comA((db) => sugerirCorrespondencia(db, {
      organizationId: IDS.orgA, bankLineId: linha.id, movementId: movimento.id,
      semelhanca: 100,
    }));
    await comA((db) => confirmarCorrespondencia(db, {
      reconciliationId: r.id, autor: `${PREFIXO}ana`,
    }));
    const [depois] = await comA((db) => extractoDaConta(db, c.id));
    assert.equal(depois!.conciliada, true, 'confirmar não tornou conciliada');
  });

  it('confirmar sem autor é recusado, e a base recusa-o também', async () => {
    const { linha, movimento } = await cenario();
    const r = await comA((db) => sugerirCorrespondencia(db, {
      organizationId: IDS.orgA, bankLineId: linha.id, movementId: movimento.id,
      semelhanca: 90,
    }));
    await assert.rejects(comA((db) => confirmarCorrespondencia(db, {
      reconciliationId: r.id, autor: '  ',
    })), /SEM_AUTOR/);
    await assert.rejects(sql.query(
      `UPDATE reconciliations SET estado = 'CONFIRMADA' WHERE id = $1`, [r.id]),
      /confirmada_tem_autor_e_momento/);
  });
});

describe('3 · as três datas NÃO colapsam', () => {
  const SET = { de: '2026-09-01', ate: '2026-09-30' };
  const OUT = { de: '2026-10-01', ate: '2026-10-31' };

  /** A venda de 28 de Setembro e a devolução de 3 de Outubro. O caso mau. */
  async function vendaEDevolucao() {
    await comA((db) => registarMovimento(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, tipo: 'RECEITA',
      conceito: `${PREFIXO}venda`, montanteMenor: 10000,
      ocorrenciaEm: '2026-09-28', valorEm: '2026-09-28',
      origemTipo: 'bill', origemId: IDS.unidadeA,
    }));
    await comA((db) => registarMovimento(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, tipo: 'DEVOLUCAO',
      conceito: `${PREFIXO}devolucao`, montanteMenor: 3000,
      // A devolução ACONTECEU sobre a venda de Setembro; o dinheiro mexeu-se
      // em Outubro. As duas datas são verdadeiras.
      ocorrenciaEm: '2026-09-28', valorEm: '2026-10-03',
      origemTipo: 'refund', origemId: IDS.unidadeA,
    }));
  }

  it('a devolução de Outubro entra no CAIXA de Outubro', async () => {
    await vendaEDevolucao();
    const caixa = await comA((db) => caixaDoPeriodo(db, { locationId: IDS.unidadeA, ...OUT }));
    assert.equal(caixa.length, 1, 'a devolução não apareceu no caixa de Outubro');
    assert.equal(caixa[0]!.conceito, `${PREFIXO}devolucao`);
  });

  it('e no RESULTADO de Setembro, que é quando aconteceu', async () => {
    await vendaEDevolucao();
    const resultado = await comA((db) => resultadoDoPeriodo(db, {
      locationId: IDS.unidadeA, ...SET,
    }));
    assert.equal(resultado.length, 2, 'a devolução não voltou ao mês da venda');
    assert.ok(resultado.some((l) => l.conceito === `${PREFIXO}devolucao`));
  });

  it('os dois relatórios de Setembro DISCORDAM — e é isso que está certo',
    async () => {
      // ── O caso cujo sinal de avaria é dois números baterem certo ─────────
      //
      // Caixa de Setembro: só a venda (10000). Resultado de Setembro: a venda
      // menos a devolução (7000). Se estes dois números passarem a ser iguais,
      // alguém colapsou as datas — e o sistema passa a mentir com todos os
      // totais certos.
      await vendaEDevolucao();
      const caixa = totalizar(await comA((db) => caixaDoPeriodo(db, {
        locationId: IDS.unidadeA, ...SET,
      })));
      const resultado = totalizar(await comA((db) => resultadoDoPeriodo(db, {
        locationId: IDS.unidadeA, ...SET,
      })));
      // ── A discordância mede-se PRIMEIRO ─────────────────────────────
      //
      // É ela que dá nome ao caso. Na primeira versão vinha depois de duas
      // asserções de valor, e o controlo negativo caía numa delas — no caso
      // certo, mas a dizer outra coisa. Um caso que falha antes de chegar à
      // sua própria pergunta responde-a por acidente.
      assert.notEqual(caixa[0]!.totalMenor, resultado[0]!.totalMenor,
        'os dois relatórios concordam: as três datas foram colapsadas numa só');
      assert.equal(caixa[0]!.totalMenor, 10000n, 'o caixa de Setembro não é só a venda');
      assert.equal(resultado[0]!.totalMenor, 7000n, 'o resultado não desconta a devolução');
    });

  it('e do total chega-se à TRANSACÇÃO de origem, nas duas leituras', async () => {
    await vendaEDevolucao();
    for (const linhas of [
      await comA((db) => caixaDoPeriodo(db, { locationId: IDS.unidadeA, ...OUT })),
      await comA((db) => resultadoDoPeriodo(db, { locationId: IDS.unidadeA, ...SET })),
    ]) {
      for (const l of linhas) {
        assert.ok(l.origemTipo, `a linha «${l.conceito}» não diz de onde veio`);
        assert.ok(l.origemId, `a linha «${l.conceito}» não desce à transacção`);
      }
    }
  });
});

describe('4 · fechar PROÍBE, e o ajuste nasce no período aberto', () => {
  async function periodoFechado() {
    const p = await comA((db) => criarPeriodo(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, de: '2026-09-01', ate: '2026-09-30',
    }));
    await comA((db) => fecharPeriodo(db, {
      organizationId: IDS.orgA, periodId: p.id, autor: `${PREFIXO}ana`,
    }));
    return p;
  }

  it('lançar dentro de um período fechado é recusado NA BASE', async () => {
    await periodoFechado();
    await assert.rejects(comA((db) => registarMovimento(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, tipo: 'DESPESA',
      conceito: `${PREFIXO}tarde`, montanteMenor: 500,
      ocorrenciaEm: '2026-09-15', valorEm: '2026-09-15',
    })), /PERIODO_FECHADO/);
  });

  it('e o AJUSTE pós-fecho passa, a apontar para o período fechado', async () => {
    const p = await periodoFechado();
    const ajuste = await comA((db) => registarMovimento(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, tipo: 'AJUSTE',
      conceito: `${PREFIXO}ajuste`, montanteMenor: 500,
      // Nasce em Outubro — no período ABERTO — a apontar para Setembro.
      ocorrenciaEm: '2026-10-05', valorEm: '2026-10-05',
      ajustaPeriodoId: p.id, motivo: 'factura que chegou tarde',
    }));
    assert.equal(ajuste.ajustaPeriodoId, p.id);
  });

  it('e o PAR: com o período ABERTO, lançar dentro funciona', async () => {
    // Sem este par, «recusa sempre» passava o caso de cima.
    await comA((db) => criarPeriodo(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, de: '2026-09-01', ate: '2026-09-30',
    }));
    const m = await comA((db) => registarMovimento(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, tipo: 'DESPESA',
      conceito: `${PREFIXO}a-tempo`, montanteMenor: 500,
      ocorrenciaEm: '2026-09-15', valorEm: '2026-09-15',
    }));
    assert.ok(m.id);
  });

  it('o fecho NÃO copia totais para lado nenhum', async () => {
    // Se copiasse, esses totais eram uma segunda verdade que envelhece.
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'accounting_periods'
          AND (column_name ILIKE '%total%' OR column_name ILIKE '%saldo%')`);
    assert.deepEqual(rows, [], `o período guarda totais: ${JSON.stringify(rows)}`);
  });

  it('reabrir exige MOTIVO, e fica com autor e momento', async () => {
    const p = await periodoFechado();
    await assert.rejects(comA((db) => reabrirPeriodo(db, {
      organizationId: IDS.orgA, periodId: p.id, autor: `${PREFIXO}ana`, motivo: '  ',
    })), /SEM_AUTOR/);
    await comA((db) => reabrirPeriodo(db, {
      organizationId: IDS.orgA, periodId: p.id, autor: `${PREFIXO}ana`,
      motivo: 'faltou a factura do peixe',
    }));
    const [periodo] = await comA((db) => periodosDaUnidade(db, IDS.unidadeA));
    assert.equal(periodo!.estado, 'ABERTO');
    const reabertura = periodo!.acontecimentos.find((a) => a.tipo === 'REABERTURA');
    assert.ok(reabertura, 'a reabertura não deixou acontecimento');
    assert.ok(reabertura!.motivo?.includes('peixe'));
  });

  it('e a base recusa uma reabertura sem motivo', async () => {
    const p = await periodoFechado();
    await assert.rejects(sql.query(
      `INSERT INTO period_events (organization_id, period_id, tipo, autor)
       VALUES ($1, $2, 'REABERTURA', 'alguem')`, [IDS.orgA, p.id]),
      /reabertura_exige_motivo/);
  });
});

describe('5 · moedas não se somam', () => {
  async function duasMoedas() {
    await comA((db) => registarMovimento(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, tipo: 'DESPESA',
      conceito: `${PREFIXO}euros`, montanteMenor: 10000, moeda: 'EUR',
      ocorrenciaEm: '2026-09-10', valorEm: '2026-09-10',
    }));
    await comA((db) => registarMovimento(db, {
      organizationId: IDS.orgA, locationId: IDS.unidadeA, tipo: 'DESPESA',
      conceito: `${PREFIXO}dolares`, montanteMenor: 5000, moeda: 'USD',
      ocorrenciaEm: '2026-09-11', valorEm: '2026-09-11',
    }));
  }

  it('o total vem AGRUPADO por moeda, e não somado', async () => {
    await duasMoedas();
    const totais = totalizar(await comA((db) => resultadoDoPeriodo(db, {
      locationId: IDS.unidadeA, de: '2026-09-01', ate: '2026-09-30',
    })));
    assert.equal(totais.length, 2, 'somou moedas diferentes num total só');
    assert.deepEqual(totais.map((t) => t.moeda), ['EUR', 'USD']);
  });

  it('converter SEM taxa é recusado — adivinhar um câmbio é o defeito', async () => {
    await duasMoedas();
    const totais = totalizar(await comA((db) => resultadoDoPeriodo(db, {
      locationId: IDS.unidadeA, de: '2026-09-01', ate: '2026-09-30',
    })));
    const usd = totais.find((t) => t.moeda === 'USD')!;
    await assert.rejects(comA((db) => converterTotal(db, {
      organizationId: IDS.orgA, total: usd, para: 'EUR', em: '2026-09-30',
    })), /SEM_TAXA/);
  });

  it('e o PAR: com taxa carimbada, converte e MOSTRA a fonte e a data', async () => {
    await duasMoedas();
    await sql.query(
      `INSERT INTO exchange_rates (organization_id, de, para, taxa_micro, fonte, em_vigor_de)
       VALUES ($1, 'USD', 'EUR', 920000, $2, '2026-09-01')`,
      [IDS.orgA, `${PREFIXO}BCE`]);
    const totais = totalizar(await comA((db) => resultadoDoPeriodo(db, {
      locationId: IDS.unidadeA, de: '2026-09-01', ate: '2026-09-30',
    })));
    const usd = totais.find((t) => t.moeda === 'USD')!;
    const c = await comA((db) => converterTotal(db, {
      organizationId: IDS.orgA, total: usd, para: 'EUR', em: '2026-09-30',
    }));
    // -5000 (despesa) × 0,92 = -4600. Inteiro de ponta a ponta.
    assert.equal(c.totalMenor, -4600n);
    assert.ok(c.fonte.includes('BCE'), 'converteu sem dizer a fonte');
    assert.ok(c.emVigorDe instanceof Date, 'converteu sem dizer a data da taxa');
  });

  it('e a base recusa uma taxa sem fonte', async () => {
    await assert.rejects(sql.query(
      `INSERT INTO exchange_rates (organization_id, de, para, taxa_micro, fonte, em_vigor_de)
       VALUES ($1, 'GBP', 'EUR', 1150000, '  ', '2026-09-01')`, [IDS.orgA]),
      /fonte_da_taxa_nao_e_vazia/);
  });
});

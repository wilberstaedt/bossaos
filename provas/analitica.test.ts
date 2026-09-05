import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  comEscopo, janelasDasUnidades, obterPrisma, registarMovimento,
  totalDaOrganizacao, vendasPorUnidade,
} from '../packages/db/src/index.ts';
import { mediaPonderada, porLinhaMenor } from '../packages/domain/src/agregacao.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E30 — analítica e agregação.
 *
 * ── O aceite que a régua põe em primeiro lugar ────────────────────────────
 *
 * «Ausência não é zero.» Zero euros ao almoço diz que a casa abriu e não
 * vendeu; sem dados diz que ninguém sabe. Quem lê o primeiro fecha o turno de
 * almoço — e se o que lá estava era o segundo, fechou-o por engano.
 *
 * E há um caso com critério invulgar, que a régua nomeia: o da média ponderada
 * **tem de mudar o número**. Se a média de médias der igual, não é o código que
 * está certo — são os dados de prova que não têm o caso.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e30-';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

const JANELA = { de: '2026-09-01', ate: '2026-09-30' };

/**
 * ── A prova traz o seu próprio CASO MAU ───────────────────────────────────
 *
 * A primeira corrida caiu com «todas as unidades no mesmo fuso: o caso mau não
 * está semeado» — que é exactamente o que a régua manda fazer quando um caso
 * não tem dados: **corrigir a semente, não aceitar a prova**.
 *
 * A unidade das Canárias não é um exemplo inventado: Espanha tem duas horas
 * legais, e um grupo com uma casa em Madrid e outra em Las Palmas é o caso
 * normal deste produto, não o exótico.
 */
const CANARIAS = 'e30-canarias';

async function criarUnidadeNoutroFuso() {
  const { rows } = await sql.query(
    `SELECT id FROM brands WHERE organization_id = $1 LIMIT 1`, [IDS.orgA]);
  const brandId = rows[0]?.id;
  await sql.query(
    `INSERT INTO locations (id, organization_id, brand_id, nome, slug, moeda, fuso, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $3, 'EUR', 'Atlantic/Canary', now())
     ON CONFLICT DO NOTHING`, [IDS.orgA, brandId, CANARIAS]);
}

async function limpar() {
  await sql.query(`DELETE FROM financial_movements WHERE conceito LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM locations WHERE slug = '${CANARIAS}'`);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
  await limpar();
  await criarUnidadeNoutroFuso();
});
beforeEach(async () => { await limpar(); await criarUnidadeNoutroFuso(); });
after(async () => {
  try { await limpar(); } catch (e) { console.error('limpeza:', e); }
  finally { await sql.end(); await prisma.$disconnect(); }
});

const vender = (locationId: string, montante: number, n = 1) => comA(async (db) => {
  for (let i = 0; i < n; i += 1) {
    await registarMovimento(db, {
      organizationId: IDS.orgA, locationId, tipo: 'RECEITA',
      conceito: `${PREFIXO}venda ${i}`, montanteMenor: montante,
      ocorrenciaEm: '2026-09-15', valorEm: '2026-09-15',
      origemTipo: 'bill', origemId: locationId,
    });
  }
});

describe('1 · AUSÊNCIA não é zero', () => {
  it('sem linhas nenhumas o agregado diz «não medi»', () => {
    const r = mediaPonderada([]);
    assert.equal(r.medido, false,
      'um conjunto vazio devolveu um número: ausência passou por zero');
  });

  it('e o PAR: com uma linha de zero, diz «medi, e deu zero»', () => {
    // Sem este par, «devolve sempre ausência» passava o caso de cima — e uma
    // casa que abriu e não vendeu aparecia como não medida.
    const r = mediaPonderada([{ moeda: 'EUR', somaMenor: 0n, contagem: 1 }]);
    assert.equal(r.medido, true, 'zero medido passou por ausência de dados');
    assert.equal(r.medido && r.valor.somaMenor, 0n);
    assert.equal(r.medido && r.valor.contagem, 1);
  });

  it('as duas coisas são DISTINGUÍVEIS, e é essa a diferença que importa', () => {
    const semDados = mediaPonderada([]);
    const zeroMedido = mediaPonderada([{ moeda: 'EUR', somaMenor: 0n, contagem: 1 }]);
    assert.notDeepEqual(semDados, zeroMedido,
      'sem dados e zero medido são a mesma coisa: quem lê fecha o turno por engano');
  });

  it('uma unidade sem movimentos devolve ausência, e não zero', async () => {
    const unidades = await comA((db) => vendasPorUnidade(db, JANELA));
    const vazias = unidades.filter((u) => !u.agregado.medido);
    assert.ok(vazias.length > 0,
      'nenhuma unidade sem dados: a prova não tem o caso que interessa');
    for (const v of vazias) assert.equal(v.linhas.length, 0);
  });

  it('e uma unidade sem dados NÃO puxa o total da organização para baixo',
    async () => {
      // ── Mede-se a DIFERENÇA, e não o número absoluto ────────────────
      //
      // A primeira versão exigia `contagem === 2`, e caiu quando a semeadura da
      // inspecção deixou movimentos noutras unidades. **Uma prova que afirma um
      // número absoluto sobre dados partilhados está a medir a base inteira, e
      // não o seu próprio caso** — e falha por uma razão que nada tem a ver com
      // o que ela diz medir.
      //
      // O que o caso afirma é que a unidade vazia não acrescenta linhas. Isso
      // mede-se pela diferença: duas vendas têm de dar exactamente mais duas.
      const antes = totalDaOrganizacao(await comA((db) => vendasPorUnidade(db, JANELA)));
      const contagemAntes = antes.medido ? antes.valor.contagem : 0;

      await vender(IDS.unidadeA, 10000, 2);

      const depois = totalDaOrganizacao(await comA((db) => vendasPorUnidade(db, JANELA)));
      assert.equal(depois.medido, true);
      const contagemDepois = depois.medido ? depois.valor.contagem : 0;
      assert.equal(contagemDepois - contagemAntes, 2,
        'a unidade sem dados entrou na conta como se tivesse vendido zero');
    });
});

describe('2 · o denominador viaja com o numerador', () => {
  it('a média ponderada NÃO é a média das médias', () => {
    // ── O caso cujo critério a régua nomeia ─────────────────────────────
    //
    // Uma unidade com 10 linhas a 20 € e outra com 200 a 10 €. A média de
    // médias dá 15 €; a ponderada dá 10,47 €. Se estes dois números fossem
    // iguais, o caso não estaria a medir nada — e a régua manda corrigir a
    // semente, não aceitar a prova.
    const partes = [
      { moeda: 'EUR', somaMenor: 20000n, contagem: 10 },
      { moeda: 'EUR', somaMenor: 200000n, contagem: 200 },
    ];
    const ponderada = mediaPonderada(partes);
    assert.equal(ponderada.medido, true);
    const porLinha = porLinhaMenor(ponderada.medido ? ponderada.valor : partes[0]!);

    const mediaDeMedias = partes
      .map((p) => Number(p.somaMenor) / p.contagem)
      .reduce((a, b) => a + b, 0) / partes.length;

    assert.equal(Number(porLinha), 1047,
      'a ponderada não é 10,47 €: os denominadores não estão a contar');
    assert.equal(Math.round(mediaDeMedias), 1500);
    assert.notEqual(Number(porLinha), Math.round(mediaDeMedias),
      'a ponderada e a média de médias dão o mesmo: os dados de prova não têm o caso');
  });

  it('e com denominadores IGUAIS as duas coincidem — o par que o prova',
    async () => {
      // Sem este par, «devolve sempre outro número» passava o caso de cima.
      // Com 10 e 10, a média de médias está certa — e a ponderada dá o mesmo.
      const partes = [
        { moeda: 'EUR', somaMenor: 20000n, contagem: 10 },
        { moeda: 'EUR', somaMenor: 10000n, contagem: 10 },
      ];
      const ponderada = mediaPonderada(partes);
      const porLinha = Number(porLinhaMenor(ponderada.medido ? ponderada.valor : partes[0]!));
      const mediaDeMedias = partes
        .map((p) => Number(p.somaMenor) / p.contagem)
        .reduce((a, b) => a + b, 0) / partes.length;
      assert.equal(porLinha, Math.round(mediaDeMedias));
    });

  it('moedas diferentes não se somam num agregado só', () => {
    const r = mediaPonderada([
      { moeda: 'EUR', somaMenor: 10000n, contagem: 5 },
      { moeda: 'USD', somaMenor: 90000n, contagem: 1 },
    ]);
    assert.equal(r.medido, true);
    // ── A soma mede-se PRIMEIRO: é ela que dá nome ao caso ──────────────
    //
    // Na primeira versão vinha depois do rótulo da moeda, e o controlo caía no
    // caso certo a dizer «USD !== EUR» — verdade, mas não o defeito. É a mesma
    // lição do E29: um caso que falha antes de chegar à sua própria pergunta
    // responde-a por acidente.
    assert.equal(r.medido && r.valor.somaMenor, 10000n,
      'somou euros com dólares: o total é uma opinião com aspecto de facto');
    // E devolve a de maior contagem, NUNCA a soma das duas.
    assert.equal(r.medido && r.valor.moeda, 'EUR');
  });
});

describe('3 · o período resolve-se POR UNIDADE, e só depois se soma', () => {
  it('o mesmo instante dá dias de serviço diferentes em fusos diferentes',
    async () => {
      const janelas = await comA((db) => janelasDasUnidades(db, new Date('2026-09-15T03:30:00Z')));
      assert.ok(janelas.length > 1, 'só há uma unidade: a prova não tem o caso');
      const fusos = new Set(janelas.map((j) => j.fuso));
      assert.ok(fusos.size > 1,
        'todas as unidades no mesmo fuso: o caso mau não está semeado');
      const dias = new Set(janelas.map((j) => j.diaDeServico));
      assert.ok(dias.size > 1,
        'o mesmo instante deu o mesmo dia em fusos diferentes: resolveu-se antes de somar');
    });

  it('e o PAR: duas unidades no MESMO fuso dão o mesmo dia', async () => {
    // Sem este par, «devolve sempre dias diferentes» passava o caso de cima.
    const janelas = await comA((db) => janelasDasUnidades(db, new Date('2026-09-15T12:00:00Z')));
    const madrid = janelas.filter((j) => j.fuso === 'Europe/Madrid');
    assert.ok(madrid.length > 1, 'não há duas unidades em Madrid para comparar');
    assert.equal(new Set(madrid.map((j) => j.diaDeServico)).size, 1);
  });
});

describe('4 · do indicador desce-se à transacção', () => {
  it('cada linha do indicador diz de onde veio', async () => {
    await vender(IDS.unidadeA, 5000, 3);
    const unidades = await comA((db) => vendasPorUnidade(db, JANELA));
    const comDados = unidades.filter((u) => u.agregado.medido);
    assert.ok(comDados.length > 0);
    for (const u of comDados) {
      for (const l of u.linhas) {
        assert.ok(l.origemTipo, `a linha «${l.conceito}» não diz de onde veio`);
        assert.ok(l.origemId, `a linha «${l.conceito}» não desce à transacção`);
      }
    }
  });

  it('e a contagem do agregado bate com as linhas que o formaram', async () => {
    await vender(IDS.unidadeA, 5000, 3);
    const unidades = await comA((db) => vendasPorUnidade(db, JANELA));
    const u = unidades.find((x) => x.locationId === IDS.unidadeA)!;
    assert.equal(u.agregado.medido, true);
    assert.equal(u.agregado.medido && u.agregado.valor.contagem, u.linhas.length,
      'o número mostrado não corresponde às linhas que se conseguem abrir');
  });
});

describe('5 · duas organizações não se somam', () => {
  it('não existe função que receba duas organizações', async () => {
    const { readFile } = await import('node:fs/promises');
    // ── Tira-se os comentários ANTES de procurar ──────────────────────
    //
    // A primeira versão acusou o próprio comentário que diz «não tem
    // `consolidarOrganizacoes`». Uma guarda que lê prosa mede o que está
    // escrito sobre o código, e não o código — é o mesmo defeito que a guarda
    // das rotas teve no E24.
    const bruto = await readFile('packages/db/src/analitica.ts', 'utf8');
    const fonte = bruto
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    for (const palavra of ['consolidar', 'organizationIds', 'todasAsOrganizacoes']) {
      assert.ok(!fonte.includes(palavra),
        `o motor tem «${palavra}»: a consolidação é uma decisão que ninguém tomou`);
    }
    // Controlo do próprio leitor: se a limpeza comesse o ficheiro todo, a
    // asserção acima passava sobre o vazio.
    assert.ok(fonte.includes('mediaPonderada'),
      'a limpeza dos comentários comeu o código: esta guarda não mediu nada');
  });

  it('e o escopo de uma organização não vê as unidades da outra', async () => {
    const daA = await comA((db) => janelasDasUnidades(db, new Date()));
    const daB = await comEscopo(prisma,
      { organizationId: IDS.orgB, userId: IDS.utilizadorB },
      (db) => janelasDasUnidades(db, new Date()));
    const idsA = new Set(daA.map((u) => u.locationId));
    for (const u of daB) {
      assert.ok(!idsA.has(u.locationId),
        'uma unidade apareceu nas duas organizações: o isolamento vazou no relatório');
    }
  });
});

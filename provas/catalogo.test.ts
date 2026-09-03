import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  bloquearProduto, comEscopo, desbloquearProduto, estaDisponivel,
  fichaDeAlergeniosDoProduto, guardarAlergenios, guardarGrupo, guardarProduto,
  obterProduto, obterPrisma, precoEfectivo, validarEscolhasDoProduto,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * A prova do E07.
 *
 * O alvo está em `docs/architecture/catalogo-e-publicacao.md` e `dinheiro.md`,
 * escritos no E00, e em `docs/reviews/ALVO-E07.md`.
 *
 * ── O que a decide ──────────────────────────────────────────────────────────
 *
 * O par dos alérgenos, contra a base a sério:
 *
 *   1. alérgeno **não declarado** → `DESCONHECIDO`
 *   2. o **mesmo** alérgeno, declarado ausente → `NAO_CONTEM`
 *
 * Se os dois derem a mesma coisa, a distinção não existe no modelo. E é a
 * distinção que manda alguém para o hospital.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;
const marca = Date.now();
const PREFIXO = `e07-${marca}`;

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA, userId: IDS.utilizadorA }, fn);
const comB = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgB, userId: IDS.utilizadorB }, fn);

/** Cria um produto de prova. O nome entra como argumento porque um dos casos é
 *  precisamente sobre o NOME não influenciar nada. */
async function criarProduto(nome: string, sku?: string): Promise<string> {
  return comA(async (db) => {
    const p = await db.product.create({
      data: {
        organizationId: IDS.orgA, brandId: IDS.marcaA, nome,
        ...(sku ? { sku: `${PREFIXO}-${sku}` } : {}),
      },
      select: { id: true },
    });
    return p.id;
  });
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
});

after(async () => {
  // Tudo o que esta prova cria sai daqui, e o padrão do nome é a rede de
  // segurança — foi lixo de uma prova minha que partiu a prova de isolamento do
  // E03 no E06, e o `criadas.push` esquecido não pode voltar a custar isso.
  await sql.query(`DELETE FROM products WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM modifier_groups WHERE nome LIKE '${PREFIXO}%'`);
  await sql.end();
  await prisma.$disconnect();
});

describe('1. O par dos alérgenos, contra a base', () => {
  let produto: string;
  beforeEach(async () => { produto = await criarProduto(`${PREFIXO} croquetas`); });

  it('sem declaração nenhuma, TODOS os catorze são DESCONHECIDO', async () => {
    const ficha = await comA((db) => fichaDeAlergeniosDoProduto(db, produto));
    assert.equal(ficha.length, 14, 'a ficha tem de trazer os catorze, não só os declarados');
    assert.equal(ficha.filter((l) => l.estado === 'DESCONHECIDO').length, 14);
  });

  it('declarado AUSENTE, o mesmo alérgeno passa a NAO_CONTEM — e é outra coisa', async () => {
    const antes = await comA((db) => fichaDeAlergeniosDoProduto(db, produto));
    await comA((db) => guardarAlergenios(db, IDS.orgA, produto,
      [{ codigo: 'amendoins', estado: 'NAO_CONTEM' }], 'Ana'));
    const depois = await comA((db) => fichaDeAlergeniosDoProduto(db, produto));

    const de = (f: typeof antes, c: string) => f.find((l) => l.alergenio === c)!.estado;
    assert.equal(de(antes, 'amendoins'), 'DESCONHECIDO');
    assert.equal(de(depois, 'amendoins'), 'NAO_CONTEM');
    assert.notEqual(de(antes, 'amendoins'), de(depois, 'amendoins'), 'a distinção não existe no modelo');
    // E declarar um não diz nada sobre os outros.
    assert.equal(de(depois, 'leite'), 'DESCONHECIDO');
  });

  it('um produto chamado "Tarta de almendra" continua DESCONHECIDO nos frutos', async () => {
    // O caso do contrato, ponta a ponta. Uma tarte de amêndoa pode não levar
    // amêndoa: leva o nome de uma receita, não a receita. Nada na cadeia — nem a
    // consulta, nem o motor — recebe o nome do produto.
    const tarta = await criarProduto(`${PREFIXO} Tarta de almendra`);
    const ficha = await comA((db) => fichaDeAlergeniosDoProduto(db, tarta));
    assert.equal(ficha.find((l) => l.alergenio === 'frutos-de-casca')?.estado, 'DESCONHECIDO');
  });

  it('apagar a declaração devolve o alérgeno a DESCONHECIDO', async () => {
    // Quem percebe que declarou o que não sabia tem de conseguir voltar atrás.
    // Sem isto, a única saída seria declarar NAO_CONTEM — que é exactamente a
    // mentira que esta etapa existe para impedir.
    await comA((db) => guardarAlergenios(db, IDS.orgA, produto, [{ codigo: 'leite', estado: 'CONTEM' }], 'Ana'));
    assert.equal(
      (await comA((db) => fichaDeAlergeniosDoProduto(db, produto))).find((l) => l.alergenio === 'leite')?.estado,
      'CONTEM',
    );
    await comA((db) => guardarAlergenios(db, IDS.orgA, produto, [{ codigo: 'leite', estado: null }], 'Ana'));
    assert.equal(
      (await comA((db) => fichaDeAlergeniosDoProduto(db, produto))).find((l) => l.alergenio === 'leite')?.estado,
      'DESCONHECIDO',
    );
  });

  it('a declaração fica com responsável e data', async () => {
    await comA((db) => guardarAlergenios(db, IDS.orgA, produto, [{ codigo: 'gluten', estado: 'CONTEM' }], 'Ana'));
    const l = (await comA((db) => fichaDeAlergeniosDoProduto(db, produto))).find((x) => x.alergenio === 'gluten');
    assert.equal(l?.revistoPor, 'Ana');
    assert.ok(l?.revistoEm instanceof Date);
  });

  it('o runtime NÃO pode acrescentar um alérgeno à biblioteca', async () => {
    // A lista é legal. Um restaurante que lhe possa acrescentar linhas pode
    // apagá-las, e uma biblioteca de alérgenos editável pelo processo do
    // restaurante é a mesma família do catálogo de planos do E05.
    await assert.rejects(
      () => comA((db) => db.$executeRaw`INSERT INTO allergens (id, codigo, regiao) VALUES (gen_random_uuid(), 'inventado', 'UE')`),
      /permission denied/i,
    );
  });
});

describe('2. Preferência alimentar não toca na declaração de segurança', () => {
  it('marcar "vegetariano" não declara nada sobre leite nem ovos', async () => {
    // A armadilha: um produto vegetariano continua a ter leite e ovos por
    // declarar. A etiqueta diz o que a receita pretende ser; a declaração diz o
    // que a cozinha garante.
    const produto = await criarProduto(`${PREFIXO} ensalada`);
    await comA((db) => db.productDietaryTag.create({
      data: { organizationId: IDS.orgA, productId: produto, codigo: 'vegetariano' },
    }));
    const ficha = await comA((db) => fichaDeAlergeniosDoProduto(db, produto));
    assert.equal(ficha.find((l) => l.alergenio === 'leite')?.estado, 'DESCONHECIDO');
    assert.equal(ficha.find((l) => l.alergenio === 'ovos')?.estado, 'DESCONHECIDO');
    // E o par: a preferência ficou mesmo gravada, não é o teste a medir nada.
    const tags = await comA((db) => db.productDietaryTag.findMany({ where: { productId: produto } }));
    assert.deepEqual(tags.map((t) => t.codigo), ['vegetariano']);
  });
});

describe('3. Preços: a precedência e o empate, contra a base', () => {
  let produto: string;
  beforeEach(async () => {
    produto = await criarProduto(`${PREFIXO} arroz`);
    await sql.query('UPDATE locations SET moeda = $1 WHERE id = $2', ['EUR', IDS.unidadeA]);
  });

  const regra = (montante: number, extra: Record<string, unknown> = {}) =>
    comA((db) => db.priceRule.create({
      data: { organizationId: IDS.orgA, productId: produto, montanteMenor: montante, moeda: 'EUR', ...extra },
      select: { id: true },
    }));

  it('a base é HERDADA, e o override da unidade vence-a', async () => {
    await regra(800);
    const herdado = await comA((db) => precoEfectivo(db, produto, IDS.unidadeA, 'CARTA'));
    assert.equal(herdado.ok && herdado.preco.montanteMenor, 800);
    assert.equal(herdado.ok && herdado.herdado, true);

    await regra(900, { locationId: IDS.unidadeA });
    const local = await comA((db) => precoEfectivo(db, produto, IDS.unidadeA, 'CARTA'));
    assert.equal(local.ok && local.preco.montanteMenor, 900);
    assert.equal(local.ok && local.herdado, false, 'o CAT-010 mostra "Local" a partir daqui');
  });

  it('dois overrides do MESMO nível recusam, e nomeiam os dois', async () => {
    // O alvo que o sénior nomeou. Devolver o primeiro faria o preço depender da
    // ordem de leitura da base, que é estável até deixar de ser.
    const a = await regra(900, { locationId: IDS.unidadeA, canal: 'CARTA' });
    const b = await regra(950, { locationId: IDS.unidadeA, canal: 'CARTA' });
    const r = await comA((db) => precoEfectivo(db, produto, IDS.unidadeA, 'CARTA'));
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.erro, 'conflito');
    assert.deepEqual(
      r.ok === false && r.erro === 'conflito' ? [...r.regras].sort() : null,
      [a.id, b.id].sort(),
    );
  });

  it('e uma regra só desse nível resolve — é o par', async () => {
    await regra(900, { locationId: IDS.unidadeA, canal: 'CARTA' });
    const r = await comA((db) => precoEfectivo(db, produto, IDS.unidadeA, 'CARTA'));
    assert.equal(r.ok, true);
  });

  it('moeda diferente da unidade é ERRO, não conversão', async () => {
    await comA((db) => db.priceRule.create({
      data: { organizationId: IDS.orgA, productId: produto, montanteMenor: 5000, moeda: 'BRL', locationId: IDS.unidadeA },
    }));
    const r = await comA((db) => precoEfectivo(db, produto, IDS.unidadeA, 'CARTA'));
    assert.equal(r.ok === false && r.erro, 'moeda_incompativel');
  });

  it('uma unidade SEM moeda recusa em vez de assumir a da marca', async () => {
    await sql.query('UPDATE locations SET moeda = NULL WHERE id = $1', [IDS.unidadeA]);
    await regra(800);
    const r = await comA((db) => precoEfectivo(db, produto, IDS.unidadeA, 'CARTA'));
    assert.equal(r.ok === false && r.erro, 'unidade_sem_moeda');
    await sql.query('UPDATE locations SET moeda = $1 WHERE id = $2', ['EUR', IDS.unidadeA]);
  });

  it('a BASE recusa um preço com moeda mal formada', async () => {
    await assert.rejects(
      () => comA((db) => db.$executeRaw`
        INSERT INTO price_rules (id, organization_id, product_id, montante_menor, moeda, updated_at)
        VALUES (gen_random_uuid(), ${IDS.orgA}::uuid, ${produto}::uuid, 800, 'eur', now())`),
      /preco_moeda_iso/,
    );
  });
});

describe('4. Modificadores validados por chamada directa', () => {
  let produto: string;
  let grupo: string;

  beforeEach(async () => {
    produto = await criarProduto(`${PREFIXO} entrecot`);
    const r = await comA((db) => guardarGrupo(db, IDS.orgA, {
      id: '', brandId: IDS.marcaA, nome: `${PREFIXO} ponto`,
      obrigatorio: true, minimo: 1, maximo: 1,
      opcoes: [{ id: '', nome: 'Poco hecho' }, { id: '', nome: 'Al punto' }, { id: '', nome: 'Hecho' }],
    }));
    assert.ok(r.ok, 'o grupo tinha de ser criado');
    grupo = r.ok ? r.id : '';
    await comA((db) => db.productModifierGroup.create({
      data: { organizationId: IDS.orgA, productId: produto, groupId: grupo },
    }));
  });

  it('sem escolher nada, um grupo obrigatório recusa', async () => {
    // O pedido que o formulário nunca deixaria sair. Os limites vêm da BASE,
    // não do que o cliente enviou — uma rota que validasse com os limites que
    // recebeu não validava nada.
    const p = await comA((db) => validarEscolhasDoProduto(db, produto, new Map()));
    assert.deepEqual(p, [{ erro: 'obrigatorio', grupoId: grupo }]);
  });

  it('acima do máximo recusa, com os números da base', async () => {
    const opcoes = await comA((db) => db.modifierOption.findMany({
      where: { groupId: grupo }, select: { id: true }, orderBy: { ordem: 'asc' },
    }));
    const p = await comA((db) => validarEscolhasDoProduto(db, produto,
      new Map([[grupo, opcoes.map((o) => o.id)]])));
    assert.equal(p.length, 1);
    assert.equal(p[0]?.erro, 'acima_do_maximo');
  });

  it('uma escolha válida passa — é o par', async () => {
    const opcoes = await comA((db) => db.modifierOption.findMany({
      where: { groupId: grupo }, select: { id: true }, orderBy: { ordem: 'asc' },
    }));
    assert.deepEqual(
      await comA((db) => validarEscolhasDoProduto(db, produto, new Map([[grupo, [opcoes[0]!.id]]]))),
      [],
    );
  });

  it('a BASE recusa um grupo mal formado, para quem não passar pelo serviço', async () => {
    await assert.rejects(
      () => comA((db) => db.$executeRaw`
        INSERT INTO modifier_groups (id, organization_id, brand_id, nome, obrigatorio, minimo, maximo, updated_at)
        VALUES (gen_random_uuid(), ${IDS.orgA}::uuid, ${IDS.marcaA}::uuid, ${`${PREFIXO} mau`}, true, 3, 2, now())`),
      /grupo_bem_formado/,
    );
  });
});

describe('5. Edição concorrente: a segunda vê conflito', () => {
  it('duas edições com a MESMA versão — a segunda não sobrescreve', async () => {
    const produto = await criarProduto(`${PREFIXO} concorrente`);
    const antes = await comA((db) => obterProduto(db, produto));
    assert.ok(antes);

    const primeira = await comA((db) => guardarProduto(db, produto, antes.version, { nome: `${PREFIXO} primeira` }));
    assert.equal(primeira.ok, true);

    // A segunda pessoa tinha o ecrã aberto e ainda tem a versão antiga.
    const segunda = await comA((db) => guardarProduto(db, produto, antes.version, { nome: `${PREFIXO} segunda` }));
    assert.equal(segunda.ok, false);
    assert.equal(segunda.ok === false && segunda.erro, 'conflito_de_versao');

    // E a primeira ganhou: sobrescrever em silêncio perderia a edição dela.
    const depois = await comA((db) => obterProduto(db, produto));
    assert.equal(depois?.nome, `${PREFIXO} primeira`);
  });

  it('um produto que não existe diz NÃO ENCONTRADO, não conflito', async () => {
    const r = await comA((db) => guardarProduto(db, IDS.orgB, 1, { nome: 'x' }));
    assert.equal(r.ok === false && r.erro, 'nao_encontrado');
  });
});

describe('6. Disponibilidade: o bloqueio expira sozinho', () => {
  it('bloquear tira da venda; a data de fim devolve-o', async () => {
    const produto = await criarProduto(`${PREFIXO} polvo`);
    assert.equal((await comA((db) => estaDisponivel(db, produto, IDS.unidadeA))).disponivel, true);

    await comA((db) => bloquearProduto(db, IDS.orgA, produto, IDS.unidadeA, 'Se acabó', null));
    assert.equal((await comA((db) => estaDisponivel(db, produto, IDS.unidadeA))).disponivel, false);

    // Com data no passado, volta sozinho — é o "hasta próximo servicio" do
    // atlas. Sem isso alguém teria de se lembrar amanhã de manhã.
    await comA((db) => bloquearProduto(db, IDS.orgA, produto, IDS.unidadeA, 'Se acabó',
      new Date(Date.now() - 60_000)));
    assert.equal((await comA((db) => estaDisponivel(db, produto, IDS.unidadeA))).disponivel, true);

    await comA((db) => desbloquearProduto(db, produto, IDS.unidadeA));
    assert.equal((await comA((db) => estaDisponivel(db, produto, IDS.unidadeA))).disponivel, true);
  });
});

describe('7. O catálogo de A não é visível a B', () => {
  it('as tabelas novas têm política de linha, como todas as outras', async () => {
    const produto = await criarProduto(`${PREFIXO} isolado`);
    assert.equal(await comA((db) => db.product.count({ where: { id: produto } })), 1);
    assert.equal(await comB((db) => db.product.count({ where: { id: produto } })), 0, 'B viu o produto de A');
  });
});

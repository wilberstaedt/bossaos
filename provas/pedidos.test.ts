import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  acrescentarLinhas, cancelarLinha, comEscopo, enviarPedido, guardarPedido,
  historicoDoPedido, listarPedidos, obterPedido, obterPrisma, pedidoPorComando,
  totalDoPedido,
} from '../packages/db/src/index.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E14 — motor de pedidos e entrega confiável.
 *
 * A régua (`docs/reviews/ALVO-E14.md`) diz que os três aceites são **três formas
 * de a mesma coisa falhar: duas escritas que se encontram**. E nomeia, para cada
 * uma, o defeito que passa despercebido:
 *
 *   1. idempotência por consulta prévia em vez de restrição única;
 *   2. ler o pedido, juntar o item, gravar o pedido inteiro — a última escrita
 *      ganha e o item do outro desaparece **sem erro nenhum**;
 *   3. preço lido ao fechar a conta, e carrinho limpo ao rejeitar um esgotado.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e14-';
const ACTOR = { email: 'prova-e14@bossaos.example' };
const CATEGORIA = 'e14a1111-0000-4000-8000-0000000000c1';
const PRATO = 'e14a1111-0000-4000-8000-00000000f1a1';
const OUTRO = 'e14a1111-0000-4000-8000-00000000f1a2';
const PRECO_INICIAL = 1250;

const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) =>
  comEscopo(prisma, { organizationId: IDS.orgA }, fn);

async function semear() {
  await sql.query(
    `INSERT INTO categories (id, organization_id, brand_id, nome, ordem, updated_at)
     VALUES ($1, $2, $3, $4, 1, now()) ON CONFLICT (id) DO NOTHING`,
    [CATEGORIA, IDS.orgA, IDS.marcaA, `${PREFIXO}Para partilhar`]);
  for (const [id, nome] of [[PRATO, 'Arroz de sepia'], [OUTRO, 'Croquetas']] as const) {
    await sql.query(
      `INSERT INTO products (id, organization_id, brand_id, category_id, nome, estado, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVO', now())
       ON CONFLICT (id) DO UPDATE SET estado = 'ACTIVO', updated_at = now()`,
      [id, IDS.orgA, IDS.marcaA, CATEGORIA, `${PREFIXO}${nome}`]);
    await sql.query(
      `INSERT INTO price_rules (id, organization_id, product_id, montante_menor, moeda, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'EUR', now())`,
      [IDS.orgA, id, PRECO_INICIAL]);
  }
}

async function limpar() {
  await sql.query(`DELETE FROM order_events WHERE actor_email LIKE '%@bossaos.example'`);
  await sql.query(`DELETE FROM order_lines WHERE nome LIKE '${PREFIXO}%' OR nome = '(desconhecido)'`);
  await sql.query(`DELETE FROM order_submissions WHERE command_id LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM order_events WHERE order_id IN (SELECT id FROM orders WHERE aberto_por LIKE '%@bossaos.example')`);
  await sql.query(`DELETE FROM order_lines WHERE order_id IN (SELECT id FROM orders WHERE aberto_por LIKE '%@bossaos.example')`);
  await sql.query(`DELETE FROM order_submissions WHERE order_id IN (SELECT id FROM orders WHERE aberto_por LIKE '%@bossaos.example')`);
  await sql.query(`DELETE FROM orders WHERE aberto_por LIKE '%@bossaos.example'`);
  await sql.query(`DELETE FROM outbox_tasks WHERE tipo = 'pedido.entregar'`);
  await sql.query(`DELETE FROM product_availability WHERE product_id IN ($1, $2)`, [PRATO, OUTRO]);
  await sql.query(`DELETE FROM price_rules WHERE product_id IN ($1, $2)`, [PRATO, OUTRO]);
  await sql.query(`DELETE FROM products WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM categories WHERE nome LIKE '${PREFIXO}%'`);
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

const umaLinha = (productId = PRATO, quantidade = 1) => [{ productId, quantidade }];

// ═══════════════════════════════════════════════════════════════════════════
describe('1. timeout DEPOIS do commit, e reenvio com a mesma chave', () => {
  it('o cenário não está vazio: o produto existe e tem preço', async () => {
    // «Verde sobre pedido vazio»: um pedido sem linhas passa quase tudo. Antes de
    // afirmar seja o que for, declara-se o que existe.
    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM price_rules WHERE product_id = $1`, [PRATO]);
    assert.equal(rows[0].n, 1, 'sem regra de preço não há o que aceitar');
  });

  it('o mesmo command_id duas vezes cria UM pedido, e devolve a MESMA resposta', async () => {
    const comando = `${PREFIXO}${Date.now()}-a`;
    const enviar = () => enviarPedido(prisma, IDS.orgA, {
      commandId: comando, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });

    const primeira = await enviar();
    assert.ok(primeira.ok);
    assert.equal(primeira.repetido, false);

    // O caso é este: gravou, a resposta perdeu-se, o cliente reenvia.
    const segunda = await enviar();
    assert.ok(segunda.ok);
    assert.equal(segunda.repetido, true, 'o reenvio criou um segundo envio');
    assert.equal(segunda.orderId, primeira.orderId);
    assert.equal(segunda.submissionId, primeira.submissionId);
    assert.equal(segunda.aceites, primeira.aceites);

    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM order_submissions WHERE command_id = $1`, [comando]);
    assert.equal(rows[0].n, 1);
  });

  it('O PAR: duas chaves DIFERENTES criam dois pedidos', async () => {
    // Sem isto, um sistema que ignorasse o segundo envio passava o caso de cima e
    // perdia pedidos legítimos.
    const a = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-b1`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    const b = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-b2`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(a.ok && b.ok);
    assert.notEqual(a.orderId, b.orderId, 'duas chaves diferentes colapsaram num pedido só');
  });

  it('dois reenvios SIMULTÂNEOS: um grava, o outro recebe a mesma resposta', async () => {
    // Disparados juntos, sem `await` entre eles — a régua do E13 nomeou a
    // sequência disfarçada de concorrência, e vale igual aqui.
    const comando = `${PREFIXO}${Date.now()}-c`;
    const pedir = () => enviarPedido(prisma, IDS.orgA, {
      commandId: comando, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    const [x, y] = await Promise.all([pedir(), pedir()]);
    assert.ok(x.ok && y.ok);
    assert.equal(x.submissionId, y.submissionId, 'os dois envios simultâneos criaram dois');

    const { rows } = await sql.query(
      `SELECT count(*)::int AS n FROM order_submissions WHERE command_id = $1`, [comando]);
    assert.equal(rows[0].n, 1);
  });

  it('a mesma chave com corpo DIFERENTE é conflito, e não repetição', async () => {
    const comando = `${PREFIXO}${Date.now()}-d`;
    const primeira = await enviarPedido(prisma, IDS.orgA, {
      commandId: comando, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(PRATO, 1), actor: ACTOR,
    });
    assert.ok(primeira.ok);

    const outra = await enviarPedido(prisma, IDS.orgA, {
      commandId: comando, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(PRATO, 5), actor: ACTOR,
    });
    assert.ok(!outra.ok);
    assert.equal(outra.motivo, 'conflito_de_chave');
  });

  it('a consulta por command_id responde — é como o cliente pergunta se chegou', async () => {
    const comando = `${PREFIXO}${Date.now()}-e`;
    await enviarPedido(prisma, IDS.orgA, {
      commandId: comando, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    const achado = await comA((db) => pedidoPorComando(db, comando));
    assert.ok(achado, 'a consulta por command_id não encontrou o envio');
  });

  it('o envio, o evento e o outbox ficam na MESMA transacção', async () => {
    const comando = `${PREFIXO}${Date.now()}-f`;
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: comando, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(r.ok);
    // Duas consultas e nao uma: o mesmo $1 servia um uuid de um lado e um text
    // do outro, e o PostgreSQL recusa - com razao.
    const eventos = await sql.query(
      'SELECT count(*)::int AS n FROM order_events WHERE order_id = $1::uuid', [r.orderId]);
    const tarefas = await sql.query(
      "SELECT count(*)::int AS n FROM outbox_tasks WHERE payload->>'orderId' = $1", [r.orderId]);
    assert.ok(eventos.rows[0].n > 0, 'não ficou evento');
    assert.equal(tarefas.rows[0].n, 1, 'não ficou tarefa de entrega');
  });

  it('o runtime não reescreve nem apaga um envio', async () => {
    // É a outra metade do aceite 1: um envio apagável é uma chave que volta a
    // ficar livre, e o reenvio deixaria de devolver a mesma resposta.
    const comando = `${PREFIXO}${Date.now()}-g`;
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: comando, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(r.ok);

    const runtime = new Client({ connectionString: RUNTIME });
    await runtime.connect();
    try {
      for (const comando_sql of [
        'DELETE FROM order_submissions WHERE organization_id = $1',
        "UPDATE order_submissions SET payload_hash = 'x' WHERE organization_id = $1",
      ]) {
        await runtime.query('BEGIN');
        await runtime.query("SELECT set_config('app.organization_id', $1, true)", [IDS.orgA]);
        await assert.rejects(
          runtime.query(comando_sql, [IDS.orgA]),
          /permission denied|permissão negada/i,
          `o runtime conseguiu: ${comando_sql}`);
        await runtime.query('ROLLBACK');
      }
    } finally {
      await runtime.end();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('2. dois operadores sem apagar o trabalho um do outro', () => {
  async function pedidoAberto() {
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-${Math.random()}`, locationId: IDS.unidadeA,
      canal: 'SALA', linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(r.ok);
    return r.orderId;
  }

  it('dois acrescentos EM PARALELO e os dois itens ficam lá', async () => {
    const orderId = await pedidoAberto();
    const juntar = (productId: string) => acrescentarLinhas(prisma, IDS.orgA, {
      orderId, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: [{ productId, quantidade: 1 }], actor: ACTOR,
    });

    // Disparados juntos. O padrão que perde trabalho — ler tudo, juntar, gravar
    // tudo — faria o segundo apagar o primeiro **sem erro nenhum**.
    const [a, b] = await Promise.all([juntar(PRATO), juntar(OUTRO)]);
    assert.ok(a.ok && b.ok);

    const pedido = await comA((db) => obterPedido(db, orderId));
    const nomes = (pedido?.linhas ?? []).map((l) => l.nome);
    assert.ok(nomes.some((n) => n.includes('Arroz')), 'o item de um operador desapareceu');
    assert.ok(nomes.some((n) => n.includes('Croquetas')), 'o item do outro operador desapareceu');
    assert.equal(pedido?.linhas.length, 3, `ficaram ${pedido?.linhas.length} linhas`);
  });

  it('uma versão desactualizada dá CONFLITO — e recuperável', async () => {
    const orderId = await pedidoAberto();
    const primeiro = await comA((db) => guardarPedido(db, IDS.orgA, {
      orderId, versaoEsperada: 1, estado: 'EM_PREPARO', actor: ACTOR,
    }));
    assert.ok(primeiro.ok);

    const segundo = await comA((db) => guardarPedido(db, IDS.orgA, {
      orderId, versaoEsperada: 1, estado: 'PRONTO', actor: ACTOR,
    }));
    assert.ok(!segundo.ok);
    assert.equal(segundo.motivo, 'conflito');

    // «Recuperável» é a palavra: um 409 que obrigue a refazer do zero cumpre a
    // letra e falha a pessoa. Tem de vir com que continuar.
    assert.equal(segundo.versaoActual, 2);
    assert.ok(segundo.mudou.length > 0, 'o conflito não diz o que mudou');
    assert.ok(segundo.linhas.length > 0, 'o conflito não devolve as linhas para continuar');
    assert.ok(segundo.mudou.some((m) => m.porQuem === ACTOR.email), 'não diz quem mudou');
  });

  it('O PAR: com a versão certa, grava', async () => {
    // Sem isto, o conflito acima passava num sistema que recusasse sempre.
    const orderId = await pedidoAberto();
    const r = await comA((db) => guardarPedido(db, IDS.orgA, {
      orderId, versaoEsperada: 1, estado: 'EM_PREPARO', actor: ACTOR,
    }));
    assert.ok(r.ok);
    assert.equal(r.versao, 2);
  });

  it('cancelar uma linha não apaga as outras', async () => {
    const orderId = await pedidoAberto();
    await acrescentarLinhas(prisma, IDS.orgA, {
      orderId, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: [{ productId: OUTRO, quantidade: 1 }], actor: ACTOR,
    });
    const antes = await comA((db) => obterPedido(db, orderId));
    const alvo = antes!.linhas[0]!;

    await comA((db) => cancelarLinha(db, IDS.orgA, alvo.id, ACTOR));

    const depois = await comA((db) => obterPedido(db, orderId));
    assert.equal(depois?.linhas.length, antes?.linhas.length, 'cancelar apagou a linha');
    assert.equal(depois?.linhas.find((l) => l.id === alvo.id)?.estado, 'CANCELADA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('3. preço novo não mexe em linha aceite, e o esgotado preserva o carrinho', () => {
  it('publicar preço novo NÃO altera a linha já aceite', async () => {
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-h`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(r.ok);

    const antes = await comA((db) => obterPedido(db, r.orderId));
    assert.equal(antes?.linhas[0]?.precoMenor, PRECO_INICIAL);

    // A cozinha actualiza a carta a meio do serviço.
    await sql.query('UPDATE price_rules SET montante_menor = $2 WHERE product_id = $1',
      [PRATO, PRECO_INICIAL + 400]);

    const depois = await comA((db) => obterPedido(db, r.orderId));
    assert.equal(depois?.linhas[0]?.precoMenor, PRECO_INICIAL,
      'a conta de quem está sentado mudou porque a carta mudou');

    // E o total é a soma dos INSTANTÂNEOS, não uma leitura do catálogo.
    const total = totalDoPedido(depois!.linhas.map((l) => ({
      estado: String(l.estado), precoMenor: l.precoMenor,
      quantidade: l.quantidade, moeda: l.moeda,
    })));
    assert.equal(total?.montanteMenor, PRECO_INICIAL);
  });

  it('O PAR: uma linha NOVA usa o preço novo', async () => {
    // Sem isto, um sistema que ignorasse a publicação passava o caso de cima.
    await sql.query('UPDATE price_rules SET montante_menor = $2 WHERE product_id = $1',
      [PRATO, PRECO_INICIAL + 400]);
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-i`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(r.ok);
    const pedido = await comA((db) => obterPedido(db, r.orderId));
    assert.equal(pedido?.linhas[0]?.precoMenor, PRECO_INICIAL + 400);
  });

  it('a BASE recusa mudar o preço de uma linha aceite', async () => {
    // O caminho que sobra depois da forma: alguém a reescrever a linha. É um
    // gatilho e não um privilégio porque a coluna TEM de ser escrita uma vez.
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-j`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(r.ok);
    const pedido = await comA((db) => obterPedido(db, r.orderId));
    const linha = pedido!.linhas[0]!;

    await assert.rejects(
      sql.query('UPDATE order_lines SET preco_menor = 1 WHERE id = $1', [linha.id]),
      /nao muda de preco/i,
      'a base deixou reescrever o preço de uma linha aceite');

    // E o PAR: cancelar continua a poder. É o estado que muda, não o preço.
    await comA((db) => cancelarLinha(db, IDS.orgA, linha.id, ACTOR));
    const depois = await comA((db) => obterPedido(db, r.orderId));
    assert.equal(depois?.linhas[0]?.estado, 'CANCELADA');
  });

  it('o esgotado é REJEITADO com o carrinho preservado', async () => {
    await sql.query(
      `INSERT INTO product_availability (id, organization_id, product_id, location_id, bloqueado, motivo, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, true, 'acabou', now())`,
      [IDS.orgA, OUTRO, IDS.unidadeA]);

    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-k`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: [{ productId: PRATO, quantidade: 1 }, { productId: OUTRO, quantidade: 2 }],
      actor: ACTOR,
    });
    assert.ok(r.ok);
    assert.equal(r.aceites, 1);
    assert.equal(r.rejeitadas.length, 1);
    assert.equal(r.rejeitadas[0]?.motivo, 'ESGOTADO');

    // O CARRINHO FICA. Limpar ao rejeitar é o defeito que faz a pessoa desistir —
    // e passa qualquer teste que só verifique a rejeição.
    const pedido = await comA((db) => obterPedido(db, r.orderId));
    assert.equal(pedido?.linhas.length, 2, 'o carrinho foi limpo ao rejeitar');
    assert.ok(pedido!.linhas.some((l) => l.estado === 'ACEITE'), 'a linha boa desapareceu');
    const rejeitada = pedido!.linhas.find((l) => l.estado === 'REJEITADA');
    assert.equal(rejeitada?.motivoRejeicao, 'ESGOTADO');
    // E diz PORQUÊ: «indisponível» sem motivo faz a pessoa pedir a mesma coisa
    // outra vez.
    assert.ok(rejeitada?.nome.includes('Croquetas'));
  });

  it('A DECISÃO DO OFFLINE: um preço proposto que divergiu é rejeitado, não aplicado', async () => {
    // A pergunta que a régua trouxe: um pedido escrito offline e aceite mais
    // tarde cobra a que preço? Decisão: o do SERVIDOR ao aceitar — e a divergência
    // não é aplicada em silêncio, é dita.
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-l`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: [{ productId: PRATO, quantidade: 1, precoPropostoMenor: PRECO_INICIAL - 300 }],
      actor: ACTOR,
    });
    assert.ok(r.ok);
    assert.equal(r.aceites, 0);
    assert.equal(r.rejeitadas[0]?.motivo, 'PRECO_DIVERGENTE');

    const pedido = await comA((db) => obterPedido(db, r.orderId));
    const linha = pedido!.linhas[0]!;
    // A linha guarda AS DUAS: o que o cliente propôs e o que o servidor diz. Sem
    // as duas, o ecrã não consegue explicar a divergência a quem está à mesa.
    assert.equal(linha.precoPropostoMenor, PRECO_INICIAL - 300);
    assert.equal(linha.precoMenor, PRECO_INICIAL);
  });

  it('O PAR: sem preço proposto, o do servidor vale e a linha passa', async () => {
    // Quem pede online e confia no que está na carta não propõe preço nenhum —
    // e nesse caso não há divergência que valha a pena levantar.
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-m`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(r.ok);
    assert.equal(r.aceites, 1);
  });

  it('COMBO: a conta soma UMA vez, e o componente continua identificável', async () => {
    // «Não some o preço do combo e de seus componentes duas vezes» (E14,
    // entregar 7). O defeito é fácil de escrever: o combo entra com preço fixo,
    // os componentes entram para a cozinha saber o que fazer, e a soma apanha os
    // dois. Cada linha isolada está certa; a conta vem a dobrar.
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-combo`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(r.ok);
    const pedido = await comA((db) => obterPedido(db, r.orderId));
    const pai = pedido!.linhas[0]!;

    // Um componente: linha filha, sem preço próprio.
    await sql.query(
      `INSERT INTO order_lines (id, organization_id, order_id, linha_pai_id, nome,
                                quantidade, estado, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 1, 'ACEITE', now())`,
      [IDS.orgA, r.orderId, pai.id, `${PREFIXO}Componente do menu`]);

    const comComponente = await comA((db) => obterPedido(db, r.orderId));
    // IDENTIFICÁVEL: a cozinha vê-o.
    assert.equal(comComponente?.linhas.length, 2);
    assert.ok(comComponente!.linhas.some((l) => l.linhaPaiId === pai.id));

    // E a conta soma UMA vez.
    const total = totalDoPedido(comComponente!.linhas.map((l) => ({
      estado: String(l.estado), precoMenor: l.precoMenor,
      quantidade: l.quantidade, moeda: l.moeda, linhaPaiId: l.linhaPaiId,
    })));
    assert.equal(total?.montanteMenor, PRECO_INICIAL, 'o combo foi somado duas vezes');
  });

  it('a BASE recusa dar preço a um componente de combo', async () => {
    // A segunda porta, e falha por outro motivo: quem escrever um relatório novo
    // daqui a seis meses não conhece a regra do `linha_pai_id`, e sem esta
    // restrição bastava-lhe somar tudo.
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-combo2`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(r.ok);
    const pedido = await comA((db) => obterPedido(db, r.orderId));
    const pai = pedido!.linhas[0]!;

    await assert.rejects(
      sql.query(
        `INSERT INTO order_lines (id, organization_id, order_id, linha_pai_id, nome,
                                  quantidade, preco_menor, moeda, estado, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'com preco', 1, 500, 'EUR', 'ACEITE', now())`,
        [IDS.orgA, r.orderId, pai.id]),
      /componente_de_combo_nao_tem_preco/,
      'a base deixou dar preço próprio a um componente de combo');
  });

  it('a lista e o histórico respondem — e o histórico não se reescreve', async () => {
    const r = await enviarPedido(prisma, IDS.orgA, {
      commandId: `${PREFIXO}${Date.now()}-n`, locationId: IDS.unidadeA, canal: 'SALA',
      linhas: umaLinha(), actor: ACTOR,
    });
    assert.ok(r.ok);
    const lista = await comA((db) => listarPedidos(db, IDS.unidadeA));
    assert.ok(lista.length > 0);
    const historico = await comA((db) => historicoDoPedido(db, r.orderId));
    assert.ok(historico.some((e) => e.accao === 'pedido.enviado'));
  });
});

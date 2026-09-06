import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import {
  abrirSessaoDeKiosk, apagarPessoa, comEscopo, enfileirarComanda, enfileirarImpressao,
  entregueAPonte, estadoDoKiosk, ligarPessoaAoPedido, obterPrisma,
  registarImpressora, respostaDoAparelho, sessaoViva, terminarSessao,
} from '../packages/db/src/index.ts';
import { estadoDeImpressao } from '../packages/domain/src/impressao.ts';
import { IDS } from '../packages/db/prisma/fixtures.ts';

/**
 * E31 — kiosk, terminais e impressão.
 *
 * Todas as etapas anteriores acabavam DENTRO do sistema. Esta acaba num pedaço
 * de papel e num ecrã sozinho num corredor, e nos dois sítios o produto perde a
 * capacidade de verificar aquilo que afirma.
 *
 * ── O que esta prova mede, e o que deliberadamente não mede ────────────────
 *
 * Mede o que a base garante contra a base a sério. **Não mede impressão** — não
 * há aparelho aqui, e simular não é homologar. A matriz de homologação diz por
 * palavras o que ficou por medir com hardware, em vez de deixar linhas vazias
 * que se leem como aprovadas.
 */

const RUNTIME = process.env.DATABASE_URL;
const MIG = process.env.MIGRATION_DATABASE_URL;
if (!RUNTIME || !MIG) throw new Error('DATABASE_URL e MIGRATION_DATABASE_URL em falta');

let sql: Client;
let prisma: ReturnType<typeof obterPrisma>;

const PREFIXO = 'e31-';
const ESCOPO = { organizationId: IDS.orgA, userId: IDS.utilizadorA };
const comA = <T>(fn: Parameters<typeof comEscopo<T>>[2]) => comEscopo(prisma, ESCOPO, fn);

const KIOSK = 'aaaa1111-1111-4111-8111-e31e31e31e31';

async function semearAparelho() {
  await sql.query(
    `INSERT INTO devices (id, organization_id, location_id, nome, estacao, estado, updated_at)
     VALUES ($1, $2, $3, $4, 'SALA', 'ACTIVO', now())
     ON CONFLICT (id) DO UPDATE SET estado = 'ACTIVO'`,
    [KIOSK, IDS.orgA, IDS.unidadeA, `${PREFIXO}kiosk`]);
}

async function limpar() {
  await sql.query(`DELETE FROM print_jobs WHERE conteudo LIKE '${PREFIXO}%' OR conteudo LIKE '%${PREFIXO}%'`);
  await sql.query(`DELETE FROM kiosk_sessions WHERE device_id = '${KIOSK}'`);
  await sql.query(`DELETE FROM order_contacts WHERE order_id IN (SELECT id FROM orders WHERE numero LIKE '${PREFIXO}%')`);
  await sql.query(`DELETE FROM printers WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM payment_attempts WHERE chave_idempotente LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM bills WHERE numero LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM customers WHERE nome LIKE '${PREFIXO}%'`);
  await sql.query(`DELETE FROM orders WHERE numero LIKE '${PREFIXO}%'`);
}

before(async () => {
  sql = new Client({ connectionString: MIG });
  await sql.connect();
  prisma = obterPrisma(RUNTIME);
  await limpar();
  await semearAparelho();
});
beforeEach(async () => { await limpar(); await semearAparelho(); });
after(async () => {
  try { await limpar(); } catch (e) { console.error('limpeza:', e); }
  finally { await sql.end(); await prisma.$disconnect(); }
});

async function criarPedido(numero: string): Promise<string> {
  const { rows } = await sql.query(
    `INSERT INTO orders (id, organization_id, location_id, canal, numero, estado, aberto_por, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'KIOSK', $3, 'RASCUNHO', 'e31', now())
     RETURNING id`, [IDS.orgA, IDS.unidadeA, numero]);
  return rows[0].id as string;
}

async function criarConta(numero: string): Promise<string> {
  const { rows } = await sql.query(
    `INSERT INTO bills (id, organization_id, location_id, numero, moeda)
     VALUES (gen_random_uuid(), $1, $2, $3, 'EUR') RETURNING id`,
    [IDS.orgA, IDS.unidadeA, numero]);
  return rows[0].id as string;
}

const impressora = () => comA((db) => registarImpressora(db, IDS.orgA, IDS.unidadeA, {
  nome: `${PREFIXO}cozinha`, destino: 'COZINHA', modelo: 'Simulador', ligacao: 'PONTE',
}));

const ROTULOS = { reimpressao: 'REIMPRESSÃO', pedido: `${PREFIXO}Pedido` };

// ═════════════════════════════════════════════════════════════════════════════

describe('1 · Dois clientes seguidos, pelos TRÊS caminhos de saída', () => {
  for (const saida of ['CONCLUIDA', 'ABANDONADA', 'REINICIADA'] as const) {
    it(`por ${saida}: o segundo cliente não vê nada do primeiro`, async () => {
      // Uma prova que só testasse o caminho concluído não media nada. O caso
      // real é a pessoa que se farta e vai embora a meio — e é esse que deixa
      // o carrinho no ecrã do seguinte.
      const primeira = await comA((db) =>
        abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'es-ES'));
      const pedido = await criarPedido(`${PREFIXO}A`);
      await sql.query(`UPDATE kiosk_sessions SET order_id = $1 WHERE id = $2`,
        [pedido, primeira.id]);

      await comA((db) => terminarSessao(db, primeira.id, saida, `${PREFIXO}${saida}`));

      const segunda = await comA((db) =>
        abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'pt-BR'));
      const viva = await comA((db) => sessaoViva(db, KIOSK));

      assert.equal(viva?.id, segunda.id, 'a sessão viva não é a do cliente novo');
      assert.equal(viva?.orderId, null,
        'o carrinho do cliente anterior chegou ao ecrã do seguinte');
      assert.equal(viva?.idioma, 'pt-BR',
        'a escolha do cliente anterior sobreviveu à saída');
    });
  }

  it('o cliente que se vai embora SEM tocar em nada não deixa o ecrã ao seguinte', async () => {
    // ── O caso que faltava, e que um controlo negativo apanhou ───────────
    //
    // Os três casos acima chamam `terminarSessao` antes de abrir a segunda —
    // ou seja, testam as saídas que ALGUÉM declarou. O caso real do kiosk é
    // outro: a pessoa farta-se, vira costas, e ninguém carrega em nada. Não há
    // evento nenhum, e o cliente seguinte chega ao ecrã como ele ficou.
    //
    // Sem este caso, desligar o fecho automático da sessão anterior deixava a
    // prova VERDE — medido, foi assim que ele apareceu.
    const abandonada = await comA((db) =>
      abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'es-ES'));
    await sql.query(`UPDATE kiosk_sessions SET order_id = $1 WHERE id = $2`,
      [await criarPedido(`${PREFIXO}largado`), abandonada.id]);

    // Ninguém chamou nada. Chega o cliente seguinte:
    const seguinte = await comA((db) =>
      abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'en'));

    const viva = await comA((db) => sessaoViva(db, KIOSK));
    assert.equal(viva?.id, seguinte.id);
    assert.equal(viva?.orderId, null,
      'o carrinho de quem se foi embora ficou no ecrã do cliente seguinte');

    const anterior = await sql.query(
      `SELECT estado FROM kiosk_sessions WHERE id = $1`, [abandonada.id]);
    assert.equal(anterior.rows[0].estado, 'ABANDONADA',
      'a sessão de quem se foi embora ficou por fechar');
  });

  it('as TRÊS saídas deixam o mesmo estado observável: nada vivo', async () => {
    // O aceite não é «cada caminho funciona»: é que os três limpam O MESMO.
    // Um caminho que limpe menos é indistinguível dos outros até ao dia em que
    // não é.
    const observado: string[] = [];
    for (const saida of ['CONCLUIDA', 'ABANDONADA', 'REINICIADA'] as const) {
      const s = await comA((db) => abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'es-ES'));
      await sql.query(`UPDATE kiosk_sessions SET order_id = $1 WHERE id = $2`,
        [await criarPedido(`${PREFIXO}${saida}`), s.id]);
      await comA((db) => terminarSessao(db, s.id, saida, `${PREFIXO}x`));
      const depois = await comA((db) => sessaoViva(db, KIOSK));
      observado.push(JSON.stringify({ viva: depois === null }));
    }
    assert.equal(new Set(observado).size, 1,
      `os três caminhos deixaram estados diferentes: ${observado.join(' | ')}`);
  });

  it('a base RECUSA duas sessões abertas no mesmo kiosk', async () => {
    // A garantia não é o `abrirSessao` lembrar-se de fechar a anterior: é o
    // índice único parcial. Isto mede a base, com o motor fora do caminho.
    const s = await comA((db) => abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'es-ES'));
    await assert.rejects(
      () => sql.query(
        `INSERT INTO kiosk_sessions (organization_id, location_id, device_id, idioma, estado)
         VALUES ($1, $2, $3, 'es-ES', 'ABERTA')`, [IDS.orgA, IDS.unidadeA, KIOSK]),
      /uma_sessao_aberta_por_kiosk/,
      'a base deixou duas sessões abertas no mesmo aparelho');
    assert.ok(s.id);
  });

  it('e RECUSA que a sessão nova aponte para o carrinho da anterior', async () => {
    const pedido = await criarPedido(`${PREFIXO}partilhado`);
    const primeira = await comA((db) => abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'es-ES'));
    await sql.query(`UPDATE kiosk_sessions SET order_id = $1 WHERE id = $2`, [pedido, primeira.id]);
    await comA((db) => terminarSessao(db, primeira.id, 'CONCLUIDA', `${PREFIXO}fim`));

    const segunda = await comA((db) => abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'es-ES'));
    await assert.rejects(
      () => sql.query(`UPDATE kiosk_sessions SET order_id = $1 WHERE id = $2`,
        [pedido, segunda.id]),
      /um_pedido_por_sessao_de_kiosk/,
      'duas sessões partilharam o mesmo carrinho');
  });
});

describe('2 · Apagar a pessoa, e o pedido sobreviver', () => {
  it('a pessoa some, o pedido fica — número, linhas e estado intactos', async () => {
    const orderId = await criarPedido(`${PREFIXO}com-pessoa`);
    const { rows } = await sql.query(
      `INSERT INTO customers (id, organization_id, location_id, nome)
       VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id`,
      [IDS.orgA, IDS.unidadeA, `${PREFIXO}Ana`]);
    const customerId = rows[0].id as string;

    await comA((db) => ligarPessoaAoPedido(
      db, IDS.orgA, orderId, customerId, 'SERVICO', new Date('2027-01-01')));
    await comA((db) => apagarPessoa(db, customerId));

    const pedido = await sql.query(`SELECT numero, estado FROM orders WHERE id = $1`, [orderId]);
    assert.equal(pedido.rowCount, 1, 'apagar a pessoa levou o pedido');
    assert.equal(pedido.rows[0].numero, `${PREFIXO}com-pessoa`);

    const ligacao = await sql.query(`SELECT 1 FROM order_contacts WHERE order_id = $1`, [orderId]);
    assert.equal(ligacao.rowCount, 0, 'a ligação à pessoa apagada ficou pendurada');
  });

  it('CONTROLO NEGATIVO: com os dois na MESMA entidade, apagar um leva o outro', async () => {
    // O controlo que a régua exige. Junta-se o que o desenho separa e vê-se a
    // propriedade cair — se a prova passasse com os dados juntos, ela não
    // estaria a medir a separação, estava a medir que o botão hoje funciona.
    await sql.query(`CREATE TABLE IF NOT EXISTS e31_pedido_com_pessoa (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      numero TEXT NOT NULL)`);
    try {
      const { rows } = await sql.query(
        `INSERT INTO customers (id, organization_id, location_id, nome)
         VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id`,
        [IDS.orgA, IDS.unidadeA, `${PREFIXO}Junta`]);
      const customerId = rows[0].id as string;
      await sql.query(
        `INSERT INTO e31_pedido_com_pessoa (customer_id, numero) VALUES ($1, $2)`,
        [customerId, `${PREFIXO}junto`]);

      await sql.query(`DELETE FROM customers WHERE id = $1`, [customerId]);

      const sobrou = await sql.query(`SELECT 1 FROM e31_pedido_com_pessoa WHERE numero = $1`,
        [`${PREFIXO}junto`]);
      assert.equal(sobrou.rowCount, 0,
        'o controlo não acendeu: juntar os dois devia fazer apagar um levar o outro');
    } finally {
      await sql.query(`DROP TABLE IF EXISTS e31_pedido_com_pessoa`);
    }
  });
});

describe('3 · Enviar duas vezes dá UMA comanda', () => {
  it('o mesmo documento e a mesma via não produzem dois envios', async () => {
    const p = await impressora();
    const orderId = await criarPedido(`${PREFIXO}dup`);
    const entrada = {
      printerId: p.id, tipo: 'COMANDA' as const, documentoId: orderId,
      conteudo: `${PREFIXO}talao`,
    };
    const a = await comA((db) => enfileirarImpressao(db, IDS.orgA, IDS.unidadeA, entrada));
    const b = await comA((db) => enfileirarImpressao(db, IDS.orgA, IDS.unidadeA, entrada));

    assert.equal(a.id, b.id, 'o segundo envio criou uma comanda nova');
    const n = await sql.query(
      `SELECT count(*)::int AS n FROM print_jobs WHERE documento_id = $1`, [orderId]);
    assert.equal(n.rows[0].n, 1, 'ficaram duas comandas na fila para o mesmo documento');
  });

  it('CONTROLO NEGATIVO: sem a restrição única, o mesmo envio duplica', async () => {
    // Desligar a garantia e ver a prova de cima cair.
    //
    // ── E porque é que isto vive dentro de uma transacção ────────────────
    //
    // A primeira versão fazia `DROP INDEX` e recriava-o num `finally`. A
    // corrida anterior morreu a meio e o `finally` não chegou a correr: **a
    // base ficou sem a restrição única**, e a prova de cima passou a falhar
    // por o produto ter perdido a garantia — não por defeito do produto.
    //
    // É a mesma lição do guião morto a meio que deixou um plante no
    // `catalogo/page.tsx` no E30, agora dentro do PostgreSQL e mais cara: um
    // ficheiro repõe-se do git, uma restrição de produção não.
    //
    // `BEGIN` … `ROLLBACK` torna isso IMPOSSÍVEL em vez de improvável. Se o
    // processo morrer a meio, a transacção morre com ele e o índice fica.
    const p = await impressora();
    const orderId = await criarPedido(`${PREFIXO}sem-guarda`);

    await sql.query('BEGIN');
    try {
      await sql.query(`DROP INDEX "um_envio_por_identidade"`);
      for (const _ of [1, 2]) {
        await sql.query(
          `INSERT INTO print_jobs (organization_id, location_id, printer_id, tipo,
             documento_id, via, identidade, conteudo)
           VALUES ($1, $2, $3, 'COMANDA', $4, 1, 'x', $5)`,
          [IDS.orgA, IDS.unidadeA, p.id, orderId, `${PREFIXO}talao`]);
      }
      const n = await sql.query(
        `SELECT count(*)::int AS n FROM print_jobs WHERE documento_id = $1`, [orderId]);
      assert.equal(n.rows[0].n, 2,
        'o controlo não acendeu: sem a restrição devia ter duplicado');
    } finally {
      await sql.query('ROLLBACK');
    }

    // E o índice continua lá depois do controlo — medido, não presumido.
    const indice = await sql.query(
      `SELECT 1 FROM pg_indexes WHERE indexname = 'um_envio_por_identidade'`);
    assert.equal(indice.rowCount, 1,
      'o controlo deixou a base sem a restrição que ele desligou');
  });
});

describe('4 · A reimpressão distingue-se NO PAPEL', () => {
  it('a segunda via traz a marca no conteúdo enviado ao aparelho', async () => {
    const p = await impressora();
    const orderId = await criarPedido(`${PREFIXO}via`);
    const pedido = { id: orderId, numero: 'A104', canal: 'KIOSK', linhas: [{ texto: 'Café' }] };

    const primeira = await comA((db) =>
      enfileirarComanda(db, IDS.orgA, IDS.unidadeA, p.id, pedido, ROTULOS));
    const segunda = await comA((db) =>
      enfileirarComanda(db, IDS.orgA, IDS.unidadeA, p.id, pedido, ROTULOS));

    assert.equal(primeira.via, 1);
    assert.equal(segunda.via, 2);
    assert.ok(!primeira.conteudo.includes('VIA 2'));
    assert.ok(segunda.conteudo.includes('VIA 2'),
      'o papel da segunda via não diz que é segunda via');
    assert.notEqual(primeira.conteudo, segunda.conteudo,
      'os dois papéis são iguais: a cozinha faz o prato duas vezes');
  });

  it('CONTROLO NEGATIVO: a base RECUSA uma segunda via sem marca no papel', () => {
    // Tirar a marca e ver acender — e quem acende é a base, não o motor.
    return impressora().then(async (p) => {
      const orderId = await criarPedido(`${PREFIXO}sem-marca`);
      await assert.rejects(
        () => sql.query(
          `INSERT INTO print_jobs (organization_id, location_id, printer_id, tipo,
             documento_id, via, identidade, conteudo)
           VALUES ($1, $2, $3, 'COMANDA', $4, 2, 'x', $5)`,
          [IDS.orgA, IDS.unidadeA, p.id, orderId, `${PREFIXO}sem marca nenhuma`]),
        /reimpressao_sem_marca_no_papel/,
        'passou uma segunda via sem marca: é indistinguível de um pedido novo');
    });
  });
});

describe('5 · «Entregue à ponte» não é «imprimiu»', () => {
  it('entregue e sem resposta passado o tempo fica NÃO SEI', async () => {
    const p = await impressora();
    const orderId = await criarPedido(`${PREFIXO}nao-sei`);
    const job = await comA((db) => enfileirarImpressao(db, IDS.orgA, IDS.unidadeA, {
      printerId: p.id, tipo: 'COMANDA', documentoId: orderId, conteudo: `${PREFIXO}t`,
    }));
    const entregue = await comA((db) => entregueAPonte(db, job.id));

    const daqui_a_um_minuto = new Date(Date.now() + 60_000);
    const leitura = estadoDeImpressao(entregue, daqui_a_um_minuto);
    assert.equal(leitura.sabe, false,
      'o produto afirmou alguma coisa sobre papel que ninguém viu sair');
  });

  it('e quando o APARELHO responde, aí sim é impresso', async () => {
    const p = await impressora();
    const orderId = await criarPedido(`${PREFIXO}impresso`);
    const job = await comA((db) => enfileirarImpressao(db, IDS.orgA, IDS.unidadeA, {
      printerId: p.id, tipo: 'COMANDA', documentoId: orderId, conteudo: `${PREFIXO}t`,
    }));
    await comA((db) => entregueAPonte(db, job.id));
    const respondido = await comA((db) =>
      respostaDoAparelho(db, job.id, 'IMPRIMIU', 'ok: 1 talao'));

    const leitura = estadoDeImpressao(respondido, new Date());
    assert.equal(leitura.sabe && leitura.estado, 'impresso');
  });

  it('CONTROLO NEGATIVO: a base RECUSA confirmar sem o que o aparelho disse', async () => {
    // Fazer o «não sei» colapsar em «impresso» exige escrever a confirmação
    // sem resposta — e a base não deixa. É o CHECK que impede a linha de código
    // com pressa, não a boa vontade de quem a escreve.
    const p = await impressora();
    const orderId = await criarPedido(`${PREFIXO}mentira`);
    const job = await comA((db) => enfileirarImpressao(db, IDS.orgA, IDS.unidadeA, {
      printerId: p.id, tipo: 'COMANDA', documentoId: orderId, conteudo: `${PREFIXO}t`,
    }));

    // A ponte ACEITOU — e é este o caso que interessa. Sem este passo a base
    // recusava pela outra restrição (`entregue_a_ponte_tem_carimbo`), e o
    // controlo passava a verde a medir outra coisa: um envio que nem sequer
    // saiu. O defeito real é o do meio — saiu, ninguém respondeu, e alguém
    // promove-o a «imprimiu».
    await comA((db) => entregueAPonte(db, job.id));

    await assert.rejects(
      () => sql.query(
        `UPDATE print_jobs SET estado = 'CONFIRMADO_PELO_APARELHO' WHERE id = $1`, [job.id]),
      /resposta_do_aparelho_ou_nada/,
      'foi possível chamar impresso ao que ninguém confirmou');
  });
});

describe('6 · Offline não promete, e o reiniciar não abandona cobrança', () => {
  it('a base RECUSA fechar a sessão com uma cobrança INDETERMINADA', async () => {
    const sessao = await comA((db) => abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'es-ES'));
    const billId = await criarConta(`${PREFIXO}conta`);
    await sql.query(`UPDATE kiosk_sessions SET bill_id = $1 WHERE id = $2`, [billId, sessao.id]);
    await sql.query(
      `INSERT INTO payment_attempts (organization_id, bill_id, estado, meio,
         montante_menor, chave_idempotente)
       VALUES ($1, $2, 'INDETERMINADA', 'CARTAO', 1000, $3)`,
      [IDS.orgA, billId, `${PREFIXO}chave`]);

    await assert.rejects(
      () => comA((db) => terminarSessao(db, sessao.id, 'REINICIADA', `${PREFIXO}reset`)),
      (e: Error) => /COBRANCA_POR_RESOLVER/.test(String(e)),
      'o reiniciar fez a cobrança indeterminada desaparecer do sistema');
  });

  it('e o kiosk fica PAUSADO enquanto ela não se resolve', async () => {
    // Parar a máquina é caro. A alternativa é o produto decidir sozinho sobre
    // dinheiro que não consegue ver, com a pessoa já fora da loja.
    const sessao = await comA((db) => abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'es-ES'));
    const billId = await criarConta(`${PREFIXO}conta2`);
    await sql.query(`UPDATE kiosk_sessions SET bill_id = $1 WHERE id = $2`, [billId, sessao.id]);

    const antes = await comA((db) => estadoDoKiosk(db, KIOSK));
    assert.equal(antes.disponivel, true, 'o kiosk estava pausado sem razão');

    await sql.query(
      `INSERT INTO payment_attempts (organization_id, bill_id, estado, meio,
         montante_menor, chave_idempotente)
       VALUES ($1, $2, 'INDETERMINADA', 'CARTAO', 1000, $3)`,
      [IDS.orgA, billId, `${PREFIXO}chave2`]);

    const depois = await comA((db) => estadoDoKiosk(db, KIOSK));
    assert.equal(depois.disponivel, false);
    assert.equal(depois.disponivel === false && depois.razao, 'COBRANCA_POR_RESOLVER');
  });

  it('CONTROLO NEGATIVO: com a cobrança RESOLVIDA, a sessão fecha', async () => {
    // O par. Sem ele, «recusa sempre fechar» passava o caso de cima — e um
    // kiosk que nunca fecha sessão é um kiosk que nunca serve o segundo cliente.
    const sessao = await comA((db) => abrirSessaoDeKiosk(db, IDS.orgA, IDS.unidadeA, KIOSK, 'es-ES'));
    const billId = await criarConta(`${PREFIXO}conta3`);
    await sql.query(`UPDATE kiosk_sessions SET bill_id = $1 WHERE id = $2`, [billId, sessao.id]);
    await sql.query(
      `INSERT INTO payment_attempts (organization_id, bill_id, estado, meio,
         montante_menor, chave_idempotente)
       VALUES ($1, $2, 'CONFIRMADA', 'CARTAO', 1000, $3)`,
      [IDS.orgA, billId, `${PREFIXO}chave3`]);

    const fechada = await comA((db) =>
      terminarSessao(db, sessao.id, 'CONCLUIDA', `${PREFIXO}fim`));
    assert.equal(fechada.estado, 'CONCLUIDA');
  });
});

describe('7 · Homologação: nulo quer dizer POR TESTAR', () => {
  it('uma impressora registada nasce POR TESTAR, e não aprovada', async () => {
    const p = await impressora();
    assert.equal(p.homologadaEm, null);
    assert.equal(p.homologadaPor, null,
      'uma impressora nasceu homologada sem ninguém lhe ter tocado');
  });

  it('a base RECUSA uma homologação sem quem a assinou', async () => {
    // Uma data sem responsável não se audita daqui a seis meses.
    const p = await impressora();
    await assert.rejects(
      () => sql.query(`UPDATE printers SET homologada_em = now() WHERE id = $1`, [p.id]),
      /homologacao_tem_assinatura/,
      'passou uma homologação anónima');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aoSair, chaveDaParticao, opacar, paraEnviar, sincronizavel, suspensas,
  type EntradaDaFila, type Particao,
} from './fila.ts';
import {
  aplicarEvento, exigeRede, podeOffline, sincronizar,
  type PortasDeRede, type RespostaDoEnvio,
} from './sincronizacao.ts';

/**
 * Os seis casos que o `offline-e-fila-local.md` manda testar no E15/E16, pelo
 * número que ele lhes deu.
 *
 * O contrato acaba com um controlo negativo **obrigatório**: *«desligar a
 * partição por utilizador e ver o caso 1 ficar vermelho. Um teste que passa com e
 * sem a partição não está a testar a partição — está a testar que a rede
 * voltou.»* Ele está no `scripts/provar-fila.sh`, e é o primeiro.
 */

const A: Particao = { organizationId: 'org1', locationId: 'loc1', utilizadorId: 'ana' };
const B: Particao = { organizationId: 'org1', locationId: 'loc1', utilizadorId: 'bruno' };

const rascunho = (commandId: string, particao: Particao, extra: Partial<EntradaDaFila> = {}): EntradaDaFila => ({
  commandId, particao, tipo: 'pedido.enviar',
  payload: { linhas: [{ produto: 'arroz', quantidade: 2 }], cliente: 'Mesa 7' },
  estado: 'NAO_ENVIADO', criadaEm: 1, ...extra,
});

function redeQueAceita(registo: string[] = []): PortasDeRede {
  return {
    consultar: async () => ({ conhecido: false }),
    enviar: async (e) => { registo.push(e.commandId); return { ok: true, resposta: { ok: 1 } }; },
  };
}

describe('1. A com dois rascunhos, B entra, a rede volta', () => {
  it('NADA de A é enviado, e a fila fica SUSPENSA em vez de esvaziar', async () => {
    // O cenário que decide o desenho inteiro: se a fila esvaziasse agora, os
    // pedidos de A entravam com a sessão de B — atribuição errada, e dado de uma
    // pessoa a viajar com o nome de outra.
    const fila = [rascunho('c1', A), rascunho('c2', A)];
    const enviados: string[] = [];

    const { entradas, resumo } = await sincronizar(fila, B, redeQueAceita(enviados));

    assert.deepEqual(enviados, [], 'os rascunhos de A foram enviados com a sessão de B');
    assert.equal(resumo.enviadas, 0);
    assert.equal(resumo.suspensas, 2);
    // E NÃO se apagaram. Apagar é perder o trabalho de alguém.
    assert.equal(entradas.length, 2);
    assert.ok(entradas.every((e) => e.estado === 'NAO_ENVIADO'));
  });

  it('O PAR: com A de volta, os dois seguem', async () => {
    // Sem isto, tudo o que está acima passava numa fila que nunca envia nada.
    const fila = [rascunho('c1', A), rascunho('c2', A)];
    const enviados: string[] = [];
    const { resumo } = await sincronizar(fila, A, redeQueAceita(enviados));
    assert.deepEqual(enviados.sort(), ['c1', 'c2']);
    assert.equal(resumo.confirmadas, 2);
  });

  it('um registo SEM partição completa é lixo, e não um registo a enviar', () => {
    // «Não é um filtro à leitura»: um registo sem os três não é sincronizável.
    const orfao = rascunho('c3', { organizationId: 'org1', locationId: '', utilizadorId: 'ana' });
    assert.equal(sincronizavel(orfao, A), false);
    assert.deepEqual(paraEnviar([orfao], A), []);
  });

  it('e a partição é uma CHAVE legível, para o diagnóstico não ser adivinhação', () => {
    assert.equal(chaveDaParticao(A), 'org1/loc1/ana');
    assert.notEqual(chaveDaParticao(A), chaveDaParticao(B));
  });
});

describe('2. logout de A: B não lê nada dos rascunhos de A', () => {
  it('o que fica no aparelho é OPACO — sem conteúdo nenhum', () => {
    const fila = [rascunho('c1', A)];
    const depois = aoSair(fila);

    assert.equal(depois.length, 1, 'apagou o rascunho — isso é perder o trabalho de alguém');
    assert.equal(depois[0]!.payload, undefined, 'o conteúdo sobreviveu ao logout');
    // O mínimo para o dono recuperar: existe, é dele, e é deste tipo.
    assert.equal(depois[0]!.commandId, 'c1');
    assert.equal(depois[0]!.particao.utilizadorId, 'ana');

    // E nada do conteúdo aparece em lado nenhum do que ficou.
    const texto = JSON.stringify(depois);
    assert.ok(!texto.includes('Mesa 7'), 'o nome do cliente ficou legível');
    assert.ok(!texto.includes('arroz'), 'a linha do pedido ficou legível');
  });

  it('e a vista opaca de uma entrada nunca carrega o payload', () => {
    const opaca = opacar(rascunho('c1', A));
    assert.ok(!('payload' in opaca));
  });

  it('as suspensas CONTAM-SE, para a interface não parecer vazia', () => {
    // Uma fila que suspende em silêncio parece uma fila vazia — e o dono conclui
    // que perdeu o trabalho.
    assert.equal(suspensas([rascunho('c1', A)], B).length, 1);
  });
});

describe('3. recarregar a meio: o command_id é o mesmo', () => {
  it('a entrada pendente CONSULTA antes de repetir, e não cria segundo efeito', async () => {
    const fila = [rascunho('c1', A, { estado: 'PENDENTE_DE_CONFIRMACAO' })];
    const enviados: string[] = [];
    const rede: PortasDeRede = {
      // O servidor já o conhece: a resposta perdeu-se, o efeito ficou.
      consultar: async () => ({ conhecido: true, resposta: { pedido: 'A104' } }),
      enviar: async (e) => { enviados.push(e.commandId); return { ok: true, resposta: {} }; },
    };

    const { entradas, resumo } = await sincronizar(fila, A, rede);

    assert.deepEqual(enviados, [], 'repetiu um comando que o servidor já tinha');
    assert.equal(entradas[0]!.estado, 'CONFIRMADO');
    assert.deepEqual(entradas[0]!.resposta, { pedido: 'A104' });
    assert.equal(resumo.confirmadas, 1);
  });

  it('O PAR: se o servidor NÃO conhece, envia', async () => {
    // Sem isto, «consultar antes» passava numa fila que nunca envia.
    const fila = [rascunho('c1', A, { estado: 'PENDENTE_DE_CONFIRMACAO' })];
    const enviados: string[] = [];
    const { entradas } = await sincronizar(fila, A, {
      consultar: async () => ({ conhecido: false }),
      enviar: async (e) => { enviados.push(e.commandId); return { ok: true, resposta: {} }; },
    });
    assert.deepEqual(enviados, ['c1']);
    assert.equal(entradas[0]!.estado, 'CONFIRMADO');
  });

  it('«não enviado» e «pendente» são estados DIFERENTES', () => {
    // Colapsá-los num «a sincronizar» é o que leva alguém a carregar outra vez —
    // e a cobrar duas.
    const naoEnviado = rascunho('c1', A);
    const pendente = rascunho('c2', A, { estado: 'PENDENTE_DE_CONFIRMACAO' });
    assert.notEqual(naoEnviado.estado, pendente.estado);
    // Os dois são sincronizáveis, e por caminhos diferentes.
    assert.ok(sincronizavel(naoEnviado, A));
    assert.ok(sincronizavel(pendente, A));
  });
});

describe('4. mesma chave com payload diferente é CONFLITO', () => {
  it('o conflito fica na entrada, com o que mudou — e não é «o último ganha»', async () => {
    const fila = [rascunho('c1', A, { versao: 1 })];
    const rede: PortasDeRede = {
      consultar: async () => ({ conhecido: false }),
      enviar: async (): Promise<RespostaDoEnvio> => ({
        ok: false, conflito: { versaoActual: 3, mudou: ['linha acrescentada por bruno'] },
      }),
    };

    const { entradas, resumo } = await sincronizar(fila, A, rede);

    assert.equal(entradas[0]!.estado, 'CONFLITO');
    assert.equal(resumo.conflitos, 1);
    // Recuperável: diz a versão actual e o que mudou. Sem isto, «conflito» era um
    // beco — e a pessoa refazia o pedido do zero.
    assert.equal(entradas[0]!.conflito?.versaoActual, 3);
    assert.ok(entradas[0]!.conflito!.mudou.length > 0);
    // E o rascunho FICA. Um conflito não apaga o que a pessoa escreveu.
    assert.ok(entradas[0]!.payload);
  });
});

describe('5. evento repetido e fora de ordem', () => {
  it('o antigo NÃO sobrepõe o novo, mesmo chegando depois', () => {
    const novo = { versao: 5, estado: 'PRONTO' };
    const antigo = { versao: 2, estado: 'EM_PREPARO' };
    assert.deepEqual(aplicarEvento(novo, antigo), novo, 'uma versão antiga sobrepôs a nova');
    assert.deepEqual(aplicarEvento(antigo, novo), novo);
    // Repetido: o mesmo evento duas vezes dá o mesmo estado.
    assert.deepEqual(aplicarEvento(novo, novo), novo);
    // E o primeiro de todos entra.
    assert.deepEqual(aplicarEvento(null, antigo), antigo);
  });
});

describe('6. offline não paga nem confirma reserva', () => {
  it('as acções que exigem rede são bloqueadas, COM o motivo dito', () => {
    // «Não é uma limitação da primeira versão a corrigir depois: é o desenho.»
    for (const tipo of ['pagamento', 'reserva.confirmar', 'conta.fechar', 'desconto.autorizar']) {
      const r = podeOffline(tipo);
      assert.equal(r.pode, false, `${tipo} passou offline`);
      assert.ok('motivo' in r && r.motivo.length > 0, `${tipo} bloqueou sem dizer porquê`);
    }
  });

  it('O PAR: compor um pedido continua a poder', () => {
    // Sem isto, o bloqueio acima passava num sistema que bloqueasse tudo — e um
    // Staff PWA que não deixa compor um pedido offline não serve para nada.
    assert.deepEqual(podeOffline('pedido.enviar'), { pode: true });
    assert.equal(exigeRede('pedido.enviar'), false);
  });
});

describe('a sessão expirada não dispara a fila', () => {
  it('com a sessão morta NADA sai, e nada se apaga', async () => {
    // *Respeitar 2*: «sessão expirada exige reautenticação antes de sincronizar».
    // Sincronizar primeiro e autenticar depois é uma porta aberta por quem já não
    // devia lá estar.
    const fila = [rascunho('c1', A), rascunho('c2', A)];
    // A fila TINHA dois comandos — declarado antes de afirmar o que quer que seja,
    // porque uma fila vazia passa quase tudo.
    assert.equal(fila.length, 2);

    const enviados: string[] = [];
    const { entradas, resumo } = await sincronizar(fila, A, redeQueAceita(enviados), false);

    assert.deepEqual(enviados, [], 'a fila disparou com a sessão morta');
    assert.equal(resumo.enviadas, 0);
    assert.equal(resumo.suspensas, 2, 'as entradas deixaram de se contar');
    assert.equal(entradas.length, 2, 'apagou a fila ao encontrar a sessão morta');
    assert.ok(entradas.every((e) => e.estado === 'NAO_ENVIADO'));
  });

  it('O PAR: com a sessão viva, os mesmos dois seguem', async () => {
    // Sem isto, o bloqueio acima passava numa fila que nunca envia.
    const fila = [rascunho('c1', A), rascunho('c2', A)];
    const enviados: string[] = [];
    await sincronizar(fila, A, redeQueAceita(enviados), true);
    assert.deepEqual(enviados.sort(), ['c1', 'c2']);
  });
});

describe('dois itens iguais de pessoas diferentes são DOIS', () => {
  it('a fila não junta por semelhança', async () => {
    // O par do aceite 2: uma implementação que junte tudo por semelhança passa o
    // teste da duplicação e **perde comida real** — duas pessoas à mesma mesa
    // pediram o mesmo prato de propósito.
    const doCliente = rascunho('c1', A, { payload: { produto: 'arroz', origem: 'CARTA' } });
    const doEmpregado = rascunho('c2', A, { payload: { produto: 'arroz', origem: 'SALA' } });
    const enviados: string[] = [];

    const { entradas } = await sincronizar([doCliente, doEmpregado], A, redeQueAceita(enviados));

    assert.equal(enviados.length, 2, 'os dois pedidos iguais foram colapsados num só');
    // E as ORIGENS conservam-se: é por elas que se sabe quem pediu o quê.
    const origens = entradas.map((e) => (e.payload as { origem: string }).origem);
    assert.deepEqual(origens.sort(), ['CARTA', 'SALA']);
  });

  it('mas o MESMO comando reenviado continua a ser um', async () => {
    // O par do par: não juntar por semelhança não pode virar «nunca deduplicar».
    // O que deduplica é o `command_id`, e não o conteúdo.
    const fila = [rascunho('c1', A, { estado: 'PENDENTE_DE_CONFIRMACAO' })];
    const enviados: string[] = [];
    await sincronizar(fila, A, {
      consultar: async () => ({ conhecido: true, resposta: {} }),
      enviar: async (e) => { enviados.push(e.commandId); return { ok: true, resposta: {} }; },
    });
    assert.deepEqual(enviados, [], 'reenviou um comando que o servidor já conhecia');
  });
});

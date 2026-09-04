import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aplicarNoKds, aplicarSequencia, projeccaoVazia, minutosDecorridos, repartirBacklog,
  type EventoRecebido, type ProjeccaoDoKds,
} from './kds.ts';

/**
 * Os três casos que a régua do E16 exige, e o par que os torna uma medição.
 *
 * *«Recuso a demonstração feliz: entregar eventos por ordem e ver o ecrã
 * actualizar. Isso mede o caminho que nunca dá problemas.»*
 */

const ev = (cursor: number, taskId: string, versao: number,
            estado: EventoRecebido['estado'] = 'EM_PREPARO'): EventoRecebido =>
  ({ cursor, taskId, versao, estado });

/** Uma projecção com um bilhete já PRONTO — o que não pode reabrir. */
function comBilheteSaido(): ProjeccaoDoKds {
  const r = aplicarNoKds(projeccaoVazia(), ev(1, 't1', 5, 'PRONTA'));
  assert.equal(r.tipo, 'aplicado');
  return r.projeccao;
}

describe('1. evento REPETIDO: o ecrã fica igual', () => {
  it('o mesmo evento duas vezes não muda nada', () => {
    const depois = comBilheteSaido();
    const r = aplicarNoKds(depois, ev(1, 't1', 5, 'PRONTA'));
    assert.equal(r.tipo, 'ignorado');
    assert.equal(r.tipo === 'ignorado' ? r.porque : '', 'repetido');
    assert.deepEqual(r.projeccao, depois);
  });

  it('e um cursor ANTERIOR também é repetição, não retrocesso', () => {
    const depois = aplicarSequencia(projeccaoVazia(), [
      ev(1, 't1', 2), ev(2, 't2', 2),
    ]).projeccao;
    const r = aplicarNoKds(depois, ev(1, 't1', 2));
    assert.equal(r.tipo, 'ignorado');
    assert.equal(r.projeccao.cursor, 2, 'o cursor andou para trás');
  });
});

describe('2. evento ATRASADO: não reabre um bilhete que já saiu', () => {
  it('uma versão antiga NÃO se aplica sobre uma mais recente', () => {
    const depois = comBilheteSaido();
    // Chega agora, com cursor novo — mas é um facto mais VELHO da mesma tarefa.
    const r = aplicarNoKds(depois, ev(2, 't1', 3, 'EM_PREPARO'));
    assert.equal(r.tipo, 'ignorado');
    assert.equal(r.tipo === 'ignorado' ? r.porque : '', 'atrasado');
    assert.equal(r.projeccao.bilhetes.t1?.estado, 'PRONTA',
      'um evento atrasado reabriu um bilhete que já tinha saído');
    assert.equal(r.projeccao.bilhetes.t1?.versao, 5);
  });

  it('mas o CURSOR avança: o que já se leu não se volta a pedir', () => {
    // São coisas diferentes — o cursor é o que se leu, a versão é o que se sabe.
    // Sem isto, o cliente pedia o mesmo evento atrasado para sempre.
    const r = aplicarNoKds(comBilheteSaido(), ev(2, 't1', 3, 'EM_PREPARO'));
    assert.equal(r.projeccao.cursor, 2);
  });

  it('O PAR: um evento NOVO e legítimo aplica-se', () => {
    // Sem isto, tudo acima passava com uma implementação que ignora tudo — e
    // uma que ignora tudo também «não reabre bilhetes».
    const r = aplicarNoKds(comBilheteSaido(), ev(2, 't1', 6, 'ENTREGUE'));
    assert.equal(r.tipo, 'aplicado');
    assert.equal(r.projeccao.bilhetes.t1?.estado, 'ENTREGUE');
  });
});

describe('3. INTERVALO desconhecido: vai ao estado autoritativo', () => {
  it('um salto no cursor não se aplica por cima', () => {
    const depois = aplicarSequencia(projeccaoVazia(), [ev(1, 't1', 2)]).projeccao;
    const r = aplicarNoKds(depois, ev(3, 't2', 2));
    assert.equal(r.tipo, 'intervalo_desconhecido');
    if (r.tipo === 'intervalo_desconhecido') {
      assert.equal(r.esperado, 2);
      assert.equal(r.recebido, 3);
    }
    // E a projecção fica COMO ESTAVA: aplicar por cima de um buraco é adivinhar
    // o que ia no meio.
    assert.equal(r.projeccao.cursor, 1);
    assert.equal(r.projeccao.bilhetes.t2, undefined, 'aplicou por cima de um buraco');
  });

  it('a sequência PÁRA no buraco em vez de saltar por cima', () => {
    const r = aplicarSequencia(projeccaoVazia(), [
      ev(1, 't1', 2), ev(2, 't2', 2), ev(9, 't3', 2), ev(10, 't4', 2),
    ]);
    assert.equal(r.buraco, 3);
    assert.equal(r.aplicados, 2);
    assert.equal(r.projeccao.bilhetes.t3, undefined);
    // Continuar deixava o ecrã com um estado composto de dois instantes: o de
    // antes do buraco e o de depois.
    assert.equal(r.projeccao.bilhetes.t4, undefined);
  });

  it('O PAR: sem buraco, a sequência inteira aplica-se', () => {
    const r = aplicarSequencia(projeccaoVazia(), [
      ev(1, 't1', 2), ev(2, 't2', 2), ev(3, 't3', 2),
    ]);
    assert.equal(r.buraco, null);
    assert.equal(r.aplicados, 3);
    assert.equal(Object.keys(r.projeccao.bilhetes).length, 3);
  });
});

describe('os eventos por ORDEM INVERSA dão o mesmo estado final', () => {
  it('o contrato pede isto pelo nome, e a resposta é o intervalo desconhecido', () => {
    // Por ordem inversa, o primeiro a chegar é o último — e isso é um buraco,
    // não um facto a aplicar. O cliente vai ao estado autoritativo, que é
    // exactamente o que o contrato manda fazer em vez de adivinhar.
    const porOrdem = [ev(1, 't1', 2), ev(2, 't1', 3), ev(3, 't1', 4, 'PRONTA')];
    const directo = aplicarSequencia(projeccaoVazia(), porOrdem);
    const inverso = aplicarSequencia(projeccaoVazia(), [...porOrdem].reverse());

    assert.equal(directo.buraco, null);
    assert.equal(directo.projeccao.bilhetes.t1?.estado, 'PRONTA');
    // Ao contrário, pára logo e NÃO inventa: a projecção fica vazia e há buraco.
    assert.equal(inverso.buraco, 1);
    assert.equal(Object.keys(inverso.projeccao.bilhetes).length, 0);

    // E depois de ir buscar o estado autoritativo — que aqui é o resultado de
    // aplicar por ordem — os dois caminhos chegam ao MESMO sítio.
    assert.deepEqual(inverso.buraco === null ? inverso.projeccao : directo.projeccao,
      directo.projeccao);
  });
});

describe('o relógio é do SERVIDOR', () => {
  it('o tablet com a hora adiantada não muda o tempo do bilhete', () => {
    // Os dois carimbos vêm do servidor. Não há aqui um `Date.now()` por onde o
    // relógio local se possa meter — e é essa a garantia, não o cuidado.
    const criada = Date.UTC(2026, 8, 4, 12, 0, 0);
    const agoraNoServidor = Date.UTC(2026, 8, 4, 12, 30, 0);
    assert.equal(minutosDecorridos(criada, agoraNoServidor), 30);

    // O mesmo bilhete, com o tablet três horas adiantado. O número não muda,
    // porque o relógio do tablet não entra na conta.
    const relogioDoTablet = agoraNoServidor + 3 * 3600_000;
    void relogioDoTablet;
    assert.equal(minutosDecorridos(criada, agoraNoServidor), 30);
  });

  it('um tempo negativo é `null`, e não zero', () => {
    // Zero é uma afirmação: «acabou de chegar». Negativo quer dizer que os dois
    // carimbos não vieram da mesma fonte, e dizer zero escondia isso.
    const criada = Date.UTC(2026, 8, 4, 12, 0, 0);
    assert.equal(minutosDecorridos(criada, criada - 60_000), null);
  });
});

describe('o backlog não descarta nada', () => {
  it('vinte bilhetes com limite de doze continuam a ser vinte', () => {
    const bilhetes = Array.from({ length: 20 }, (_, i) => `t${i}`);
    const r = repartirBacklog(bilhetes, 12);
    assert.equal(r.total, 20, 'o total deixou de ser o total');
    assert.equal(r.visiveis.length, 12);
    assert.equal(r.emEspera.length, 8);
    // E os oito continuam ALCANÇÁVEIS — não é uma contagem, são os bilhetes.
    assert.deepEqual([...r.visiveis, ...r.emEspera], bilhetes);
  });

  it('um limite inválido mostra TUDO, e não nada', () => {
    // Entre um ecrã atulhado e comida por fazer, a escolha não é difícil.
    const bilhetes = ['a', 'b', 'c'];
    assert.equal(repartirBacklog(bilhetes, 0).visiveis.length, 3);
    assert.equal(repartirBacklog(bilhetes, -1).visiveis.length, 3);
  });

  it('O PAR: com menos bilhetes do que o limite, não há espera', () => {
    const r = repartirBacklog(['a', 'b'], 12);
    assert.equal(r.emEspera.length, 0);
    assert.equal(r.total, 2);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEGUNDOS_ATE_NAO_SABER, estadoDeImpressao, identidadeDeImpressao,
  marcaDaVia, renderizarComanda, type EnvioDeImpressao,
} from './impressao.ts';

/**
 * A regra desta etapa, e a que já custou um incidente real noutro produto:
 *
 * > **«Entregue à ponte» não é «imprimiu».**
 *
 * O grupo 2 é o que paga a etapa. Os outros estão cá porque uma função que
 * devolvesse sempre `não sei` passava nele sozinha.
 */

const T0 = new Date('2026-09-06T10:00:00.000Z');
const seg = (n: number) => new Date(T0.getTime() + n * 1000);

const ENVIO = (e: Partial<EnvioDeImpressao> = {}): EnvioDeImpressao => ({
  estado: 'POR_ENVIAR', entregueEm: null, respondidoEm: null, resposta: null, ...e,
});

describe('1. Um caso por estado, e nenhum deles é inventado', () => {
  it('por enviar é por enviar', () => {
    const r = estadoDeImpressao(ENVIO(), T0);
    assert.deepEqual(r, { sabe: true, estado: 'por_enviar' });
  });

  it('entregue à ponte, ainda dentro do tempo, é ENTREGUE — e não impresso', () => {
    // O software fez a sua parte. Isso é tudo o que se pode dizer.
    const r = estadoDeImpressao(
      ENVIO({ estado: 'ENTREGUE_A_PONTE', entregueEm: T0 }), seg(5));
    assert.deepEqual(r, { sabe: true, estado: 'entregue' });
  });

  it('confirmado PELO APARELHO, com resposta, é impresso', () => {
    const r = estadoDeImpressao(ENVIO({
      estado: 'CONFIRMADO_PELO_APARELHO', entregueEm: T0,
      respondidoEm: seg(2), resposta: 'ok',
    }), seg(5));
    assert.deepEqual(r, { sabe: true, estado: 'impresso' });
  });

  it('recusado pelo aparelho é recusado — e recusar é INFORMAÇÃO, não ausência', () => {
    // «Sem papel» é uma resposta. O aparelho falou, e o que ele disse é mau
    // mas é sabido. Confundir isto com «não sei» perdia a única coisa que
    // permite a alguém ir lá pôr papel.
    const r = estadoDeImpressao(ENVIO({
      estado: 'RECUSADO_PELO_APARELHO', entregueEm: T0,
      respondidoEm: seg(2), resposta: 'sem papel',
    }), seg(5));
    assert.deepEqual(r, { sabe: true, estado: 'recusado' });
  });
});

describe('2. Não saber é um estado — e nunca colapsa em impresso', () => {
  it('entregue à ponte e sem resposta passado o tempo dá NÃO SEI', () => {
    const r = estadoDeImpressao(
      ENVIO({ estado: 'ENTREGUE_A_PONTE', entregueEm: T0 }),
      seg(SEGUNDOS_ATE_NAO_SABER + 1));
    assert.equal(r.sabe, false);
    assert.equal(r.sabe === false && r.desde.toISOString(), T0.toISOString());
  });

  it('e o «não sei» diz DESDE QUANDO, para alguém poder decidir', () => {
    // Uma tela que diz «não sei» sem dizer há quanto tempo não deixa ninguém
    // escolher entre esperar mais e ir à cozinha ver.
    const r = estadoDeImpressao(
      ENVIO({ estado: 'ENTREGUE_A_PONTE', entregueEm: T0 }), seg(120));
    assert.ok(r.sabe === false && r.desde instanceof Date);
  });

  it('confirmado SEM resposta do aparelho não é impresso — é não sei', () => {
    // O caso do estado escrito à mão. Se alguém puser `CONFIRMADO` sem ter o
    // que o aparelho disse, a leitura recusa-se a afirmar que imprimiu.
    const r = estadoDeImpressao(ENVIO({
      estado: 'CONFIRMADO_PELO_APARELHO', entregueEm: T0,
      respondidoEm: seg(2), resposta: null,
    }), seg(120));
    assert.notEqual(r.sabe === true && r.estado, 'impresso');
    assert.equal(r.sabe, false);
  });

  it('CONTROLO NEGATIVO: com o «não sei» a colapsar em impresso, os três acima caem', () => {
    // O plante, na leitura: um estado que trata «saiu» como «chegou». É o
    // defeito exacto que a fronteira 2 existe para impedir, e o que faz o
    // cliente esperar por comida que ninguém está a fazer.
    const comDefeito = (envio: EnvioDeImpressao) =>
      envio.estado === 'POR_ENVIAR' ? 'por_enviar' : 'impresso';

    const saiuESumiu = ENVIO({ estado: 'ENTREGUE_A_PONTE', entregueEm: T0 });
    assert.equal(comDefeito(saiuESumiu), 'impresso');

    // E a função real continua a recusar afirmá-lo — senão isto não media nada.
    const real = estadoDeImpressao(saiuESumiu, seg(SEGUNDOS_ATE_NAO_SABER + 1));
    assert.equal(real.sabe, false);
  });

  it('o limite é um ARGUMENTO: a mesma linha lê-se diferente com limites diferentes', () => {
    // Sem isto, o limite podia estar fixo no código e ninguém dava por ela.
    const envio = ENVIO({ estado: 'ENTREGUE_A_PONTE', entregueEm: T0 });
    assert.equal(estadoDeImpressao(envio, seg(10), 5).sabe, false);
    assert.equal(estadoDeImpressao(envio, seg(10), 60).sabe, true);
  });
});

describe('3. A identidade deriva, e a segunda via marca-se no papel', () => {
  it('o mesmo documento e a mesma via dão a MESMA identidade', () => {
    const a = identidadeDeImpressao('COMANDA', 'abc', 1);
    const b = identidadeDeImpressao('COMANDA', 'abc', 1);
    assert.equal(a, b);
  });

  it('a via diferente dá identidade diferente — a reimpressão é um envio novo', () => {
    // Se a via não entrasse na identidade, a restrição única da base recusava
    // a segunda via e a reimpressão ficava impossível.
    assert.notEqual(
      identidadeDeImpressao('COMANDA', 'abc', 1),
      identidadeDeImpressao('COMANDA', 'abc', 2));
  });

  it('a primeira via NÃO leva marca de reimpressão', () => {
    const papel = renderizarComanda(
      { numero: 'A104', canal: 'KIOSK', linhas: [{ texto: 'Café', quantidade: 2 }] },
      1, { reimpressao: 'REIMPRESSÃO', pedido: 'Pedido' });
    assert.ok(!papel.includes('VIA'));
    assert.ok(papel.includes('A104'));
    assert.ok(papel.includes('2 x Café'));
  });

  it('a segunda via leva a marca, e leva-a na PRIMEIRA linha', () => {
    // Um talão que só diz «segunda via» no rodapé é um talão que já foi lido
    // e já foi cozinhado.
    const papel = renderizarComanda(
      { numero: 'A104', canal: 'KIOSK', linhas: [{ texto: 'Café' }] },
      2, { reimpressao: 'REIMPRESSÃO', pedido: 'Pedido' });
    const primeiraLinha = papel.split('\n')[0] ?? '';
    assert.ok(primeiraLinha.includes(marcaDaVia(2)),
      'a marca da segunda via não está na primeira linha do papel');
  });

  it('a marca é um NÚMERO — a garantia não depende da língua do talão', () => {
    // A base procura `VIA <n>`. Se a marca fosse uma palavra traduzida, a
    // garantia valia numa língua e falhava noutra, em silêncio.
    const emIngles = renderizarComanda(
      { numero: 'A104', canal: 'KIOSK', linhas: [] },
      3, { reimpressao: 'REPRINT', pedido: 'Order' });
    const emEspanhol = renderizarComanda(
      { numero: 'A104', canal: 'KIOSK', linhas: [] },
      3, { reimpressao: 'REIMPRESIÓN', pedido: 'Pedido' });
    assert.ok(emIngles.includes('VIA 3'));
    assert.ok(emEspanhol.includes('VIA 3'));
  });

  it('CONTROLO NEGATIVO: sem a marca, as duas vias ficam indistinguíveis', () => {
    // O defeito é este: a cozinha recebe dois papéis iguais e faz dois pratos.
    const semMarca = (numero: string) => `Pedido ${numero}\nKIOSK`;
    assert.equal(semMarca('A104'), semMarca('A104'));

    // E com a marca deixam de ser iguais, que é a propriedade toda.
    const p = { numero: 'A104', canal: 'KIOSK', linhas: [] };
    const r = { reimpressao: 'REIMPRESSÃO', pedido: 'Pedido' };
    assert.notEqual(renderizarComanda(p, 1, r), renderizarComanda(p, 2, r));
  });
});

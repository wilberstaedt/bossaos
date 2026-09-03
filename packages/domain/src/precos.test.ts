import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  nivelDaRegra, precosPorCanal, resolverPreco, unidadesAfectadasPelaBase,
  type RegraDePreco,
} from './precos.ts';

/**
 * Precedência de preço, e o que fazer com empates.
 *
 * > **Duas regras de igual prioridade a colidir são erro, não sorteio.**
 *
 * O grupo 2 é o que decide. A tentação é ordenar e ficar com a primeira, e isso
 * funciona até ao dia em que o plano de execução muda e o preço de um prato muda
 * sozinho. Ninguém liga uma alteração de preço a um `ORDER BY` ausente.
 */

const UNIDADE = 'unidade-a';
const OUTRA = 'unidade-b';
const base = (montanteMenor: number, id = 'base'): RegraDePreco =>
  ({ id, montanteMenor, moeda: 'EUR' });
const pedido = (regras: readonly RegraDePreco[], canal = 'carta', quando?: Date) =>
  ({ regras, locationId: UNIDADE, canal, moedaDaUnidade: 'EUR', ...(quando ? { quando } : {}) });

describe('1. A mais específica vence, pela FORMA e não pela ordem', () => {
  const regras: RegraDePreco[] = [
    base(800),
    { id: 'u', montanteMenor: 900, moeda: 'EUR', locationId: UNIDADE },
    { id: 'uc', montanteMenor: 1000, moeda: 'EUR', locationId: UNIDADE, canal: 'carta' },
    {
      id: 'ucp', montanteMenor: 1100, moeda: 'EUR', locationId: UNIDADE, canal: 'carta',
      deQuando: new Date('2026-01-01T00:00:00Z'), ateQuando: new Date('2027-01-01T00:00:00Z'),
    },
  ];

  it('unidade + canal + período vence tudo', () => {
    const r = resolverPreco(pedido(regras, 'carta', new Date('2026-06-01T12:00:00Z')));
    assert.equal(r.ok && r.regraId, 'ucp');
    assert.equal(r.ok && r.nivel, 'unidade_canal_periodo');
    assert.equal(r.ok && r.herdado, false);
  });

  it('fora do período, cai para unidade + canal', () => {
    const r = resolverPreco(pedido(regras, 'carta', new Date('2028-06-01T12:00:00Z')));
    assert.equal(r.ok && r.regraId, 'uc');
  });

  it('noutro canal, cai para a regra da unidade', () => {
    const r = resolverPreco(pedido(regras, 'sala', new Date('2026-06-01T12:00:00Z')));
    assert.equal(r.ok && r.regraId, 'u');
  });

  it('noutra unidade, cai para a base — e diz que é HERDADO', () => {
    const r = resolverPreco({ regras, locationId: OUTRA, canal: 'sala', moedaDaUnidade: 'EUR' });
    assert.equal(r.ok && r.regraId, 'base');
    assert.equal(r.ok && r.herdado, true, 'o CAT-010 mostra "Heredado" a partir daqui');
  });

  it('a ORDEM na lista não muda nada — é a forma que decide', () => {
    // O controlo negativo da precedência: se ela dependesse da ordem, inverter
    // a lista mudava o resultado. É exactamente o defeito que o `ORDER BY`
    // ausente introduz, e este caso é o que o apanharia.
    const invertidas = [...regras].reverse();
    const a = resolverPreco(pedido(regras, 'carta', new Date('2026-06-01T12:00:00Z')));
    const b = resolverPreco(pedido(invertidas, 'carta', new Date('2026-06-01T12:00:00Z')));
    assert.deepEqual(a, b);
  });

  it('o nível sai da forma da regra, não de ser recente', () => {
    assert.equal(nivelDaRegra(base(800)), 'base');
    assert.equal(nivelDaRegra({ id: 'x', montanteMenor: 1, moeda: 'EUR', locationId: UNIDADE }), 'unidade');
    assert.equal(nivelDaRegra({ id: 'x', montanteMenor: 1, moeda: 'EUR', canal: 'carta' }), 'base',
      'canal sem unidade não é um override de unidade');
  });
});

describe('2. Empate é ERRO, não sorteio', () => {
  it('dois overrides do MESMO nível recusam, e dizem quais', () => {
    const r = resolverPreco(pedido([
      base(800),
      { id: 'um', montanteMenor: 900, moeda: 'EUR', locationId: UNIDADE, canal: 'carta' },
      { id: 'dois', montanteMenor: 950, moeda: 'EUR', locationId: UNIDADE, canal: 'carta' },
    ]));
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.erro, 'conflito');
    assert.equal(r.ok === false && r.erro === 'conflito' && r.nivel, 'unidade_canal');
    // Os identificadores das duas, para quem tem de resolver saber onde ir.
    assert.deepEqual(r.ok === false && r.erro === 'conflito' ? r.regras : null, ['dois', 'um']);
  });

  it('e o par: UMA regra desse nível resolve — o conflito não é o normal', () => {
    // Sem este caso, um resolvedor que recusasse sempre passava no de cima.
    const r = resolverPreco(pedido([
      base(800),
      { id: 'um', montanteMenor: 900, moeda: 'EUR', locationId: UNIDADE, canal: 'carta' },
    ]));
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.preco.montanteMenor, 900);
  });

  it('o empate só conta entre regras APLICÁVEIS', () => {
    // Duas regras do mesmo nível, mas uma para outro canal. Não colidem —
    // recusar aqui seria bloquear um catálogo normal.
    const r = resolverPreco(pedido([
      { id: 'carta', montanteMenor: 900, moeda: 'EUR', locationId: UNIDADE, canal: 'carta' },
      { id: 'sala', montanteMenor: 950, moeda: 'EUR', locationId: UNIDADE, canal: 'sala' },
    ]));
    assert.equal(r.ok && r.regraId, 'carta');
  });

  it('dois empates em NÍVEIS diferentes não são empate', () => {
    const r = resolverPreco(pedido([
      { id: 'u', montanteMenor: 900, moeda: 'EUR', locationId: UNIDADE },
      { id: 'uc', montanteMenor: 950, moeda: 'EUR', locationId: UNIDADE, canal: 'carta' },
    ]));
    assert.equal(r.ok && r.regraId, 'uc');
  });
});

describe('3. Moeda não se converte, e sem preço não é zero', () => {
  it('moeda diferente da unidade é ERRO', () => {
    const r = resolverPreco({
      regras: [{ id: 'brl', montanteMenor: 5000, moeda: 'BRL', locationId: UNIDADE }],
      locationId: UNIDADE, canal: 'carta', moedaDaUnidade: 'EUR',
    });
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.erro, 'moeda_incompativel');
    assert.equal(r.ok === false && r.erro === 'moeda_incompativel' && r.esperada, 'EUR');
  });

  it('sem regra nenhuma é SEM PREÇO, não grátis', () => {
    // Zero é um preço. Um produto sem regra não custa zero: não se sabe quanto
    // custa, e vender por zero é pior do que não vender.
    const r = resolverPreco(pedido([]));
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.erro, 'sem_preco');
  });

  it('uma regra fora da janela não conta como regra', () => {
    const r = resolverPreco(pedido(
      [{
        id: 'natal', montanteMenor: 1200, moeda: 'EUR', locationId: UNIDADE, canal: 'carta',
        deQuando: new Date('2026-12-01T00:00:00Z'), ateQuando: new Date('2026-12-26T00:00:00Z'),
      }],
      'carta', new Date('2026-06-01T12:00:00Z'),
    ));
    assert.equal(r.ok === false && r.erro, 'sem_preco');
  });

  it('a janela é SEMIABERTA: abre no início, fecha no fim', () => {
    const r = (quando: string) => resolverPreco(pedido(
      [{
        id: 'j', montanteMenor: 1200, moeda: 'EUR', locationId: UNIDADE, canal: 'carta',
        deQuando: new Date('2026-12-01T00:00:00Z'), ateQuando: new Date('2026-12-26T00:00:00Z'),
      }],
      'carta', new Date(quando),
    ));
    assert.equal(r('2026-12-01T00:00:00Z').ok, true, 'o primeiro instante está dentro');
    assert.equal(r('2026-12-25T23:59:59Z').ok, true);
    assert.equal(r('2026-12-26T00:00:00Z').ok, false, 'o instante de fecho já está fora');
  });
});

describe('4. A origem é visível, e a base diz quem afecta', () => {
  it('cada canal traz o seu preço e a sua origem', () => {
    const mapa = precosPorCanal(
      [base(800), { id: 'take', montanteMenor: 850, moeda: 'EUR', locationId: UNIDADE, canal: 'takeaway' }],
      ['carta', 'sala', 'takeaway'], UNIDADE, 'EUR',
    );
    assert.equal(mapa.get('carta')?.ok && mapa.get('carta')?.herdado, true);
    assert.equal(mapa.get('takeaway')?.ok && mapa.get('takeaway')?.herdado, false);
    // O mesmo NÚMERO com origens diferentes é o caso que o atlas desenha: sem a
    // origem, quem edita não sabe se muda aquele canal ou a herança de todos.
    const so = precosPorCanal([base(800), { id: 'igual', montanteMenor: 800, moeda: 'EUR', locationId: UNIDADE, canal: 'sala' }],
      ['carta', 'sala'], UNIDADE, 'EUR');
    assert.equal(so.get('carta')?.ok && so.get('carta')?.preco.montanteMenor, 800);
    assert.equal(so.get('sala')?.ok && so.get('sala')?.preco.montanteMenor, 800);
    assert.notEqual(so.get('carta')?.ok && so.get('carta')?.herdado, so.get('sala')?.ok && so.get('sala')?.herdado);
  });

  it('mudar a base afecta só quem HERDA', () => {
    // "Editar base de marca deve mostrar as unidades afetadas." Uma unidade com
    // override próprio não é afectada — listá-la seria assustar quem edita com
    // um número que não é verdade.
    const regras = [base(800), { id: 'ov', montanteMenor: 900, moeda: 'EUR', locationId: OUTRA }];
    const afectadas = unidadesAfectadasPelaBase(regras, [UNIDADE, OUTRA], ['carta']);
    assert.deepEqual(afectadas, [UNIDADE]);
  });

  it('uma unidade com override num canal só continua afectada nos outros', () => {
    const regras = [base(800), { id: 'ov', montanteMenor: 900, moeda: 'EUR', locationId: UNIDADE, canal: 'carta' }];
    assert.deepEqual(unidadesAfectadasPelaBase(regras, [UNIDADE], ['carta']), []);
    assert.deepEqual(unidadesAfectadasPelaBase(regras, [UNIDADE], ['carta', 'sala']), [UNIDADE]);
  });
});

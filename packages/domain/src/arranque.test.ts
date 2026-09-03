import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  listaDeArranque, pendentesDoArranque, podeSeguirParaCatalogo,
  type FactosDoArranque,
} from './arranque.ts';

/**
 * A lista de arranque, e o aceite 3 do E06.
 *
 * > *"Onboarding Starter pode chegar ao passo de catálogo sem exigir etapas
 * > Restaurant/Pro."*
 */

const STARTER = new Set(['carta.digital', 'site.restaurante']);
const RESTAURANT = new Set(['carta.digital', 'site.restaurante', 'reservas', 'sala', 'kds']);

const TUDO_FEITO: FactosDoArranque = {
  perfilCompleto: true, temMarca: true, temUnidade: true,
  unidadeConfigurada: true, diasDeHorario: 5, pessoasActivas: 3,
};
const estado = (chave: string, capacidades: ReadonlySet<string>, f = TUDO_FEITO) =>
  listaDeArranque(f, capacidades).find((i) => i.chave === chave)?.estado;

describe('1. O plano decide o que se aplica', () => {
  it('no Starter, o pedido de prova NÃO SE APLICA — não fica pendente', () => {
    assert.equal(estado('pedidoDeProva', STARTER), 'nao_aplicavel');
  });

  it('no Restaurant, aplica-se — e é o par do caso de cima', () => {
    // Sem este, um `listaDeArranque` que devolvesse `nao_aplicavel` a tudo
    // passava no caso anterior e a lista não media nada.
    assert.equal(estado('pedidoDeProva', RESTAURANT), 'por_medir');
  });

  it('propriedade geral: sem a capacidade, o item exigente é sempre não aplicável', () => {
    // Não é uma asserção sobre um item: é sobre a regra. Um item novo com
    // `exigeCapacidade` fica coberto por isto sem ninguém escrever um teste.
    const semNada = listaDeArranque(TUDO_FEITO, new Set());
    const comTudo = listaDeArranque(TUDO_FEITO, RESTAURANT);
    const mudaram = comTudo.filter((i, n) => i.estado !== semNada[n]!.estado);
    assert.ok(mudaram.length > 0, 'nenhum item reage ao plano — a lista não é adaptada');
    for (const i of mudaram) {
      assert.equal(semNada.find((x) => x.chave === i.chave)?.estado, 'nao_aplicavel');
    }
  });
});

describe('2. Os cinco itens que se medem hoje', () => {
  it('com tudo feito, um Starter pode seguir para o catálogo', () => {
    assert.equal(podeSeguirParaCatalogo(listaDeArranque(TUDO_FEITO, STARTER)), true);
  });

  it('sem horários configurados, não pode — e é o horário que o diz', () => {
    const itens = listaDeArranque({ ...TUDO_FEITO, diasDeHorario: 0 }, STARTER);
    assert.deepEqual(pendentesDoArranque(itens), ['horarios']);
    assert.equal(podeSeguirParaCatalogo(itens), false);
  });

  it('cada facto em falta nomeia o seu item, e só o seu', () => {
    const casos: Array<[Partial<FactosDoArranque>, string]> = [
      [{ perfilCompleto: false }, 'organizacao'],
      [{ temMarca: false }, 'marca'],
      [{ unidadeConfigurada: false }, 'unidade'],
      [{ diasDeHorario: 0 }, 'horarios'],
      [{ pessoasActivas: 1 }, 'equipa'],
    ];
    for (const [falta, esperado] of casos) {
      assert.deepEqual(
        pendentesDoArranque(listaDeArranque({ ...TUDO_FEITO, ...falta }, STARTER)),
        [esperado],
        `${esperado}: faltava ele e a lista apontou para outro sítio`,
      );
    }
  });

  it('uma unidade que existe mas não está configurada continua pendente', () => {
    // `temUnidade` sem `unidadeConfigurada` é a unidade criada sem moeda nem
    // fuso. Existe e não serve — e a lista tem de o dizer.
    const itens = listaDeArranque({ ...TUDO_FEITO, unidadeConfigurada: false }, STARTER);
    assert.equal(itens.find((i) => i.chave === 'unidade')?.estado, 'pendente');
  });
});

describe('3. Por medir não bloqueia, e não finge estar feito', () => {
  it('a carta está POR MEDIR, não pendente nem feita', () => {
    const carta = listaDeArranque(TUDO_FEITO, STARTER).find((i) => i.chave === 'carta');
    assert.equal(carta?.estado, 'por_medir');
    assert.equal(carta?.razao, 'catalogo');
  });

  it('e por isso não entra nos pendentes', () => {
    // Se entrasse, a lista nunca ficava verde e o aceite 3 era impossível de
    // cumprir — que é o defeito que este estado existe para evitar.
    const pendentes = pendentesDoArranque(listaDeArranque(TUDO_FEITO, STARTER));
    assert.deepEqual(pendentes, []);
  });

  it('nenhum item por medir aparece como feito', () => {
    // O controlo negativo do estado: se `por_medir` colapsasse em `feito`, a
    // lista ficava verde com metade dela por construir.
    const porMedir = listaDeArranque(TUDO_FEITO, RESTAURANT).filter((i) => i.estado === 'por_medir');
    assert.ok(porMedir.length >= 4, `só ${porMedir.length} itens por medir — a lista mudou de forma?`);
    for (const i of porMedir) assert.ok(i.razao, `${i.chave} está por medir e não diz porquê`);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAPACIDADES, decidirCapacidade, estadoHttpDeCapacidade, tipoDaCapacidade,
  type Concessao,
} from './capacidades.ts';

const UNIDADE_A = 'aaaa1111-1111-4111-8111-222222222222';
const UNIDADE_B = 'aaaa1111-1111-4111-8111-333333333333';
const ONTEM = new Date(Date.now() - 86_400_000);
const AMANHA = new Date(Date.now() + 86_400_000);

describe('quota por configurar significa NEGADO', () => {
  // O par que a régua exige. Sem o segundo caso, o primeiro passa num sistema
  // que nega tudo — e é essa a armadilha, a mesma do caso 3 do isolamento.
  it('1. sem concessão nenhuma, criar a segunda unidade é RECUSADO', () => {
    const r = decidirCapacidade({
      capacidade: 'unidades', intencao: 'criar', concessoes: [], usoActual: 1,
    });
    assert.ok(!r.permitido);
    assert.equal(r.motivo, 'sem_plano');
  });

  it('2. com a quota concedida a 3, criar a segunda é ACEITE', () => {
    const r = decidirCapacidade({
      capacidade: 'unidades', intencao: 'criar',
      concessoes: [{ capacidade: 'unidades', quota: 3 }], usoActual: 1,
    });
    assert.ok(r.permitido, 'é este caso que dá sentido ao anterior');
  });

  it('e a diferença está medida, não assumida', () => {
    const sem = decidirCapacidade({ capacidade: 'unidades', intencao: 'criar', concessoes: [], usoActual: 1 });
    const com = decidirCapacidade({
      capacidade: 'unidades', intencao: 'criar',
      concessoes: [{ capacidade: 'unidades', quota: 3 }], usoActual: 1,
    });
    assert.notEqual(sem.permitido, com.permitido);
  });

  it('o reflexo errado: ausência NUNCA é ilimitado', () => {
    // `if (limite == null) return SEM_LIMITE` é o que a mão escreve sozinha.
    for (const uso of [0, 1, 50, 5000]) {
      const r = decidirCapacidade({ capacidade: 'produtos', intencao: 'criar', concessoes: [], usoActual: uso });
      assert.ok(!r.permitido, `com uso ${uso} e sem concessão tem de negar`);
    }
  });
});

describe('"não configurado" não é "configurado a zero"', () => {
  it('são dois estados distintos, com motivos distintos', () => {
    const semLinha = decidirCapacidade({
      capacidade: 'unidades', intencao: 'criar', concessoes: [], usoActual: 0,
    });
    const linhaSemNumero = decidirCapacidade({
      capacidade: 'unidades', intencao: 'criar',
      concessoes: [{ capacidade: 'unidades', quota: null }], usoActual: 0,
    });
    const linhaComZero = decidirCapacidade({
      capacidade: 'unidades', intencao: 'criar',
      concessoes: [{ capacidade: 'unidades', quota: 0 }], usoActual: 0,
    });

    // Os três negam. O que muda é o PORQUÊ — e é o porquê que decide a
    // mensagem: "não contratado", "por configurar" e "sem folga" mandam quem
    // está à frente do ecrã a três sítios diferentes.
    assert.ok(!semLinha.permitido && !linhaSemNumero.permitido && !linhaComZero.permitido);
    assert.equal(semLinha.motivo, 'sem_plano');
    assert.equal(linhaSemNumero.motivo, 'quota_por_configurar');
    assert.equal(linhaComZero.motivo, 'quota_esgotada');
    assert.equal(new Set([semLinha.motivo, linhaSemNumero.motivo, linhaComZero.motivo]).size, 3);
  });

  it('uma quantitativa com quota nula nega mesmo com uso zero', () => {
    const r = decidirCapacidade({
      capacidade: 'armazenamentoMB', intencao: 'criar',
      concessoes: [{ capacidade: 'armazenamentoMB', quota: null }], usoActual: 0,
    });
    assert.ok(!r.permitido);
    assert.equal(r.motivo, 'quota_por_configurar');
  });

  it('mas uma BOOLEANA com quota nula é normal — não tem número para ter', () => {
    const r = decidirCapacidade({
      capacidade: 'kds', intencao: 'usar', concessoes: [{ capacidade: 'kds', quota: null }],
    });
    assert.ok(r.permitido, 'uma booleana concedida não precisa de número');
  });
});

describe('a regra que protege o dinheiro', () => {
  it('reconciliar passa mesmo SEM plano nenhum', () => {
    // O erro que isto previne: o restaurante desce de plano, o módulo de
    // pagamentos desliga, e um pagamento indeterminado fica sem forma de ser
    // fechado. O dinheiro existe no adquirente e deixa de existir no sistema.
    const r = decidirCapacidade({ capacidade: 'pagamentos', intencao: 'reconciliar', concessoes: [] });
    assert.ok(r.permitido, 'fechar uma obrigação que já existe nunca é bloqueado');
  });

  it('e passa mesmo com a concessão EXPIRADA', () => {
    const r = decidirCapacidade({
      capacidade: 'pagamentos', intencao: 'reconciliar',
      concessoes: [{ capacidade: 'pagamentos', quota: null, validoAte: ONTEM }],
    });
    assert.ok(r.permitido);
  });

  it('e passa mesmo com a FLAG desligada', () => {
    const r = decidirCapacidade({
      capacidade: 'pagamentos', intencao: 'reconciliar', concessoes: [],
      flag: { nome: 'pagamentos.v2', ligada: false },
    });
    assert.ok(r.permitido, 'nem uma flag pode transformar indeterminado em falhado');
  });

  it('CONTRASTE: criar uma venda nova, essa sim, é recusada', () => {
    // Sem este caso, os três acima passariam num sistema que permite tudo.
    const r = decidirCapacidade({ capacidade: 'pagamentos', intencao: 'criar', concessoes: [], usoActual: 0 });
    assert.ok(!r.permitido, 'é o contraste que dá sentido aos três acima');
    assert.equal(r.motivo, 'sem_plano');
  });
});

describe('validade e flags', () => {
  it('concessão expirada diz "expirado", não "sem plano"', () => {
    // Quem pagou e deixou caducar precisa de saber que basta renovar. Dizer
    // "não tens plano" manda-o à página de vendas em vez da de renovação.
    const r = decidirCapacidade({
      capacidade: 'kds', intencao: 'usar',
      concessoes: [{ capacidade: 'kds', quota: null, validoAte: ONTEM }],
    });
    assert.ok(!r.permitido);
    assert.equal(r.motivo, 'expirado');
  });

  it('concessão dentro da validade passa', () => {
    const r = decidirCapacidade({
      capacidade: 'kds', intencao: 'usar',
      concessoes: [{ capacidade: 'kds', quota: null, validoAte: AMANHA }],
    });
    assert.ok(r.permitido);
  });

  it('flag desligada nega ANTES do plano, e diz que ainda não existe', () => {
    // "Capacidade paga mas flag desligada: recusado, e a mensagem diz que ainda
    // não existe." Dizer "compra o plano acima" para algo não construído é
    // vender o que não há.
    const r = decidirCapacidade({
      capacidade: 'kds', intencao: 'usar',
      concessoes: [{ capacidade: 'kds', quota: null }],
      flag: { nome: 'kds.v1', ligada: false },
    });
    assert.ok(!r.permitido);
    assert.equal(r.motivo, 'desligado');
  });

  it('e a ordem importa: sem plano E flag desligada dá "desligado"', () => {
    const r = decidirCapacidade({
      capacidade: 'kds', intencao: 'usar', concessoes: [],
      flag: { nome: 'kds.v1', ligada: false },
    });
    assert.equal(r.permitido, false);
    assert.equal((r as { motivo: string }).motivo, 'desligado');
  });
});

describe('escopo da concessão', () => {
  it('concessão de uma unidade não vale noutra', () => {
    const so_a: Concessao[] = [{ capacidade: 'kds', quota: null, locationId: UNIDADE_A }];
    assert.ok(decidirCapacidade({ capacidade: 'kds', intencao: 'usar', concessoes: so_a, locationId: UNIDADE_A }).permitido);
    const noutra = decidirCapacidade({ capacidade: 'kds', intencao: 'usar', concessoes: so_a, locationId: UNIDADE_B });
    assert.ok(!noutra.permitido);
    assert.equal(noutra.motivo, 'sem_plano');
  });

  it('concessão da organização vale em qualquer unidade', () => {
    const org: Concessao[] = [{ capacidade: 'kds', quota: null }];
    assert.ok(decidirCapacidade({ capacidade: 'kds', intencao: 'usar', concessoes: org, locationId: UNIDADE_B }).permitido);
  });

  it('quotas de várias concessões não se somam', () => {
    // Somar inventaria um número que ninguém contratou. Fica a maior.
    const r = decidirCapacidade({
      capacidade: 'produtos', intencao: 'criar',
      concessoes: [
        { capacidade: 'produtos', quota: 10 },
        { capacidade: 'produtos', quota: 25 },
      ],
      usoActual: 25,
    });
    assert.ok(!r.permitido, 'com uso 25 e a maior quota 25, criar mais é recusado');
    assert.equal((r as { quota: number }).quota, 25, 'a maior, não 35');
  });
});

describe('o que não se presume', () => {
  it('um add-on não liberta os módulos operacionais todos', () => {
    const soKds: Concessao[] = [{ capacidade: 'kds', quota: null }];
    assert.ok(decidirCapacidade({ capacidade: 'kds', intencao: 'usar', concessoes: soKds }).permitido);
    for (const outra of ['tpv', 'stock', 'reservas', 'pagamentos'] as const) {
      const r = decidirCapacidade({ capacidade: outra, intencao: 'usar', concessoes: soKds });
      assert.ok(!r.permitido, `${outra} não vem de graça com o kds`);
    }
  });

  it('o catálogo de capacidades é separado do de flags', () => {
    // Se um dia alguém puser uma flag no catálogo de capacidades, isto apanha:
    // são vocabulários diferentes e misturá-los faz "não existe" ler-se como
    // "compra o plano acima".
    for (const nome of Object.keys(CAPACIDADES)) {
      assert.doesNotMatch(nome, /\.v[0-9]+$|^flag\.|lancamento/i, `"${nome}" parece uma flag, não uma capacidade`);
    }
  });

  it('cada capacidade tem tipo declarado, e só há dois', () => {
    const tipos = new Set(Object.keys(CAPACIDADES).map((c) => tipoDaCapacidade(c as never)));
    assert.deepEqual([...tipos].sort(), ['booleana', 'quantitativa']);
  });
});

describe('o código HTTP diz a coisa certa', () => {
  it('falta de plano é 402, não 403', () => {
    // 403 diria a quem paga que o problema é a pessoa, e mandava-o pedir
    // permissões a si próprio. É a confusão que o CT-02 proíbe.
    for (const r of [
      decidirCapacidade({ capacidade: 'kds', intencao: 'usar', concessoes: [] }),
      decidirCapacidade({ capacidade: 'unidades', intencao: 'criar', concessoes: [{ capacidade: 'unidades', quota: null }], usoActual: 0 }),
      decidirCapacidade({ capacidade: 'unidades', intencao: 'criar', concessoes: [{ capacidade: 'unidades', quota: 1 }], usoActual: 1 }),
      decidirCapacidade({ capacidade: 'kds', intencao: 'usar', concessoes: [{ capacidade: 'kds', quota: null, validoAte: ONTEM }] }),
    ]) {
      assert.equal(estadoHttpDeCapacidade(r), 402);
    }
  });

  it('flag desligada é 404 — não existe ainda', () => {
    const r = decidirCapacidade({
      capacidade: 'kds', intencao: 'usar', concessoes: [],
      flag: { nome: 'kds.v1', ligada: false },
    });
    assert.equal(estadoHttpDeCapacidade(r), 404);
  });

  it('permitido é 200', () => {
    assert.equal(estadoHttpDeCapacidade({ permitido: true }), 200);
  });
});

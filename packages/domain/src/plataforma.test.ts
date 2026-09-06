import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  NUNCA_ATRAS_DO_PLANO, ambitoChega, eUmaPessoa, estadoDaSessao,
  identidadeDeTrabalho, mostrarSegredo, podeFicarAtrasDoPlano, sessaoViva,
} from './plataforma.ts';

/**
 * A etapa em que o atacante somos nós.
 *
 * O grupo 1 é o que decide: **uma sessão que só termina quando alguém se lembra
 * é permanente na prática.** Os outros estão cá porque uma função que devolvesse
 * sempre `false` passava nele sozinha.
 */

const AGORA = new Date('2026-09-06T12:00:00.000Z');
const D = (iso: string) => new Date(iso);

describe('1. A sessão de suporte EXPIRA SOZINHA', () => {
  it('uma sessão dentro do prazo e sem fim está viva', () => {
    assert.equal(
      sessaoViva({ terminadaEm: null, expiraEm: D('2026-09-06T12:30:00Z') }, AGORA), true);
  });

  it('uma sessão que alguém fechou não está viva', () => {
    assert.equal(
      sessaoViva({ terminadaEm: D('2026-09-06T11:00:00Z'), expiraEm: D('2026-09-06T13:00:00Z') },
        AGORA), false);
  });

  it('O CASO QUE DECIDE: ninguém a fechou, e o prazo passou — já não vale', () => {
    // «Uma sessão que só termina quando alguém se lembra é permanente na
    // prática.» Este caso é a diferença entre uma sessão de suporte e uma chave
    // de casa que ficou com o canalizador.
    assert.equal(
      sessaoViva({ terminadaEm: null, expiraEm: D('2026-09-06T11:59:00Z') }, AGORA), false);
  });

  it('e TERMINADA distingue-se de EXPIRADA, porque contam histórias diferentes', () => {
    // Uma diz «acabámos»; a outra diz «esquecemo-nos». Colapsá-las apagava a
    // única informação que interessa a quem lê o registo daqui a seis meses.
    assert.equal(
      estadoDaSessao({ terminadaEm: D('2026-09-06T11:00:00Z'), expiraEm: D('2026-09-06T13:00:00Z') },
        AGORA), 'terminada');
    assert.equal(
      estadoDaSessao({ terminadaEm: null, expiraEm: D('2026-09-06T11:00:00Z') },
        AGORA), 'expirada');
  });

  it('CONTROLO NEGATIVO: se depender de alguém fechar, a esquecida fica viva', () => {
    // O plante é a versão que quase toda a gente escreve à primeira: olhar só
    // para o fim. É exactamente o defeito que a régua manda plantar.
    const soOFim = (s: { terminadaEm: Date | null }) => s.terminadaEm === null;

    const esquecida = { terminadaEm: null, expiraEm: D('2026-09-06T11:59:00Z') };
    assert.equal(soOFim(esquecida), true, 'o plante não montou o caso');
    assert.equal(sessaoViva(esquecida, AGORA), false,
      'a sessão esquecida continua viva: o suporte virou dono');
  });
});

describe('2. O âmbito verifica-se por operação', () => {
  it('o âmbito certo passa, o errado não', () => {
    assert.equal(ambitoChega(['LEITURA'], 'LEITURA'), true);
    assert.equal(ambitoChega(['LEITURA'], 'CONFIGURACAO'), false);
  });

  it('ler não dá mexer — o par que interessa', () => {
    // Sem este caso, uma implementação que devolvesse sempre `true` passava o
    // primeiro. E «o suporte vê tudo» é o que se escreve quando o âmbito
    // incomoda a meio de um incidente.
    assert.equal(ambitoChega(['LEITURA'], 'DADOS_OPERACIONAIS'), false);
  });
});

describe('3. O rasto guarda a PESSOA, não o papel', () => {
  for (const papel of [
    'suporte@bossa.example', 'support@bossa.example', 'plataforma@bossa.example',
    'sistema@bossa.example', 'admin@bossa.example', 'bot@bossa.example',
  ]) {
    it(`recusa ${papel}`, () => {
      assert.equal(eUmaPessoa(papel), false,
        `${papel} passou: «suporte» não responde a quem fez isto`);
    });
  }

  it('e ACEITA uma pessoa — senão isto recusava toda a gente', () => {
    assert.equal(eUmaPessoa('ana@bossa.example'), true);
    // O domínio não diz nada: uma pessoa numa equipa de suporte é uma pessoa.
    assert.equal(eUmaPessoa('ana@suporte.example'), true);
  });

  it('e um email vazio não é ninguém', () => {
    assert.equal(eUmaPessoa('@bossa.example'), false);
  });
});

describe('4. Segurança, privacidade e exportação NÃO ficam atrás do plano', () => {
  for (const protegida of NUNCA_ATRAS_DO_PLANO) {
    it(`${protegida} não pode ficar atrás do plano`, () => {
      assert.equal(podeFicarAtrasDoPlano(protegida), false);
    });
  }

  it('e a CONVENIÊNCIA pode — senão não haveria planos nenhuns', () => {
    // O par. Sem ele, «nada fica atrás do plano» passava tudo acima, e o
    // produto deixava de poder vender.
    assert.equal(podeFicarAtrasDoPlano('relatorios.avancados'), true);
    assert.equal(podeFicarAtrasDoPlano('unidades.multiplas'), true);
    assert.equal(podeFicarAtrasDoPlano('integracoes.api'), true);
  });

  it('a lista inclui EXPORTAR, que é a que costuma cair primeiro', () => {
    // «Começa por "a exportação em massa é uma funcionalidade Pro" e acaba com
    // um cliente sem forma de sair.»
    assert.ok((NUNCA_ATRAS_DO_PLANO as readonly string[]).includes('dados.exportar'));
  });
});

describe('5. Nenhum segredo sai, e não há onde ele caiba', () => {
  it('o que se mostra são quatro coisas, e nenhuma é o valor', () => {
    const visivel = mostrarSegredo({
      nome: 'SAAS_WEBHOOK_SEGREDO_X', configurado: true,
      rodadoEm: AGORA, rodadoPor: 'ana@bossa.example',
    });
    assert.deepEqual(Object.keys(visivel).sort(),
      ['configurado', 'nome', 'rodadoEm', 'rodadoPor']);
    // A propriedade: não há campo onde um valor caiba.
    assert.equal('valor' in visivel, false);
    assert.equal('segredo' in visivel, false);
  });

  it('e um valor passado por engano NÃO sobrevive à travessia', () => {
    // A função copia campo a campo, e não faz *spread*. Um `{ ...s }` teria
    // deixado passar o que viesse a mais — e o que vem a mais é sempre a coisa
    // que ninguém previu.
    const comValor = {
      nome: 'X', configurado: true, rodadoEm: null, rodadoPor: null,
      valor: 'sk_live_muito_secreto',
    };
    const visivel = mostrarSegredo(comValor) as unknown as Record<string, unknown>;
    assert.ok(!JSON.stringify(visivel).includes('sk_live_muito_secreto'),
      'o valor atravessou: a projecção não é uma lista de permissão');
  });
});

describe('6. Reprocessar não duplica', () => {
  it('a mesma tentativa dá a mesma identidade', () => {
    assert.equal(identidadeDeTrabalho('envio', 'abc', 1), identidadeDeTrabalho('envio', 'abc', 1));
  });

  it('e a tentativa seguinte dá outra — senão reprocessar era impossível', () => {
    assert.notEqual(identidadeDeTrabalho('envio', 'abc', 1), identidadeDeTrabalho('envio', 'abc', 2));
  });
});

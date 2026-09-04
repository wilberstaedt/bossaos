import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  avaliarVerificacao, nomeDoRegistoDeProva, serveConteudo, valorDoRegistoDeProva,
} from './dominios.ts';

const NOSSO = valorDoRegistoDeProva('abc123');
const DE_OUTRO = valorDoRegistoDeProva('token-de-outra-empresa');

describe('a máquina de estados do domínio', () => {
  it('vê a nossa prova e verifica', () => {
    const v = avaliarVerificacao('PENDENTE', NOSSO, {
      tipo: 'registos', valores: ['v=spf1 -all', NOSSO],
    });
    assert.equal(v.estado, 'VERIFICADO');
  });

  it('respondeu e não tem nada nosso: fica PENDENTE, não perde a posse', () => {
    const v = avaliarVerificacao('PENDENTE', NOSSO, { tipo: 'registos', valores: [] });
    assert.equal(v.estado, 'PENDENTE');
  });
});

describe('regra 2 — verificado uma vez não é verificado para sempre', () => {
  it('o DNS não responde e o domínio ESTAVA verificado: INDETERMINADO', () => {
    // «Perder a posse é uma conclusão que exige ver OUTRO dono, não deixar de
    // ver o nosso.» Um tempo-limite de rede não é uma mudança de dono.
    const v = avaliarVerificacao('VERIFICADO', NOSSO, {
      tipo: 'nao_respondeu', erro: 'ETIMEDOUT',
    });
    assert.equal(v.estado, 'INDETERMINADO');
    assert.match(v.motivo, /não respondeu/);
  });

  it('e INDETERMINADO CONTINUA A SERVIR — é o ponto inteiro da regra', () => {
    // Se não servisse, uma falha de rede de dez segundos tirava do ar o site de
    // um cliente que não fez nada. É o dano que a regra existe para impedir.
    assert.equal(serveConteudo('INDETERMINADO'), true);
    assert.equal(serveConteudo('VERIFICADO'), true);
  });

  it('o DNS não responde e o domínio NUNCA esteve verificado: continua PENDENTE', () => {
    // Dizer INDETERMINADO aqui sugeria que já esteve bom. Nunca esteve.
    const v = avaliarVerificacao('PENDENTE', NOSSO, {
      tipo: 'nao_respondeu', erro: 'ENOTFOUND',
    });
    assert.equal(v.estado, 'PENDENTE');
  });

  it('o registo desapareceu, e ninguém o substituiu: INDETERMINADO', () => {
    const v = avaliarVerificacao('VERIFICADO', NOSSO, {
      tipo: 'registos', valores: ['v=spf1 -all'],
    });
    assert.equal(v.estado, 'INDETERMINADO');
  });
});

describe('CONTESTADO exige ver OUTRO dono', () => {
  it('a prova de outra empresa publicada no nosso domínio contesta a posse', () => {
    const v = avaliarVerificacao('VERIFICADO', NOSSO, {
      tipo: 'registos', valores: [DE_OUTRO],
    });
    assert.equal(v.estado, 'CONTESTADO');
  });

  it('e CONTESTADO NÃO serve conteúdo', () => {
    assert.equal(serveConteudo('CONTESTADO'), false);
  });

  it('o PAR que separa as duas: sem prova de ninguém NÃO é contestado', () => {
    // Sem este caso, uma implementação que declarasse CONTESTADO sempre que não
    // visse a nossa prova passava no caso de cima — e desligava o site de quem
    // simplesmente ainda não publicou o registo.
    const v = avaliarVerificacao('VERIFICADO', NOSSO, {
      tipo: 'registos', valores: ['algo que não é prova de ninguém'],
    });
    assert.notEqual(v.estado, 'CONTESTADO');
    assert.equal(v.estado, 'INDETERMINADO');
  });
});

describe('regra 1 — sem prova não há conteúdo', () => {
  it('PENDENTE não serve', () => {
    assert.equal(serveConteudo('PENDENTE'), false);
  });
});

describe('não responder e responder vazio são coisas DIFERENTES', () => {
  it('e o tipo obriga a distingui-las', () => {
    // Uma lista vazia é "respondeu, e não há lá nada", que é informação. Não
    // responder não é informação nenhuma. Colapsá-las num `string[]` fazia um
    // corte de rede ler-se como um registo apagado.
    const semResposta = avaliarVerificacao('VERIFICADO', NOSSO, {
      tipo: 'nao_respondeu', erro: 'ESERVFAIL',
    });
    const respostaVazia = avaliarVerificacao('VERIFICADO', NOSSO, {
      tipo: 'registos', valores: [],
    });
    assert.equal(semResposta.estado, 'INDETERMINADO');
    assert.equal(respostaVazia.estado, 'INDETERMINADO');
    // Os estados coincidem aqui, e os MOTIVOS não — que é o que o ecrã mostra.
    assert.notEqual(semResposta.motivo, respostaVazia.motivo);
  });
});

describe('o registo que o cliente tem de publicar', () => {
  it('o nome é o subdomínio de prova, em minúsculas', () => {
    assert.equal(nomeDoRegistoDeProva('  Carta.Exemplo.Example '), '_bossaos.carta.exemplo.example');
  });

  it('e o valor traz o prefixo por onde se reconhece a prova de outro', () => {
    assert.equal(valorDoRegistoDeProva('xyz'), 'bossaos-site-verification=xyz');
  });
});

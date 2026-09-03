/**
 * A redacção tem de ser propriedade do transporte, não boa vontade de quem
 * escreve a chamada. Estes testes guardam os dois caminhos por onde uma
 * credencial escapa na prática: pelo NOME da chave, e dentro de uma URL cujo
 * nome de chave é inocente.
 *
 * CONTROLE NEGATIVO (a correr): remover `redigirUrlComCredencial` faz cair
 * "credencial dentro de uma URL"; esvaziar CHAVES_SENSIVEIS faz cair "chave
 * sensivel pelo nome".
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { criarLogger, redigir } from './logger.ts';

function capturar() {
  const linhas: string[] = [];
  const log = criarLogger({ nivel: 'debug', escrever: (l) => linhas.push(l) });
  return { log, linhas };
}

describe('logger', () => {
  test('carimba request_id em todas as linhas derivadas', () => {
    const { log, linhas } = capturar();
    log.comRequestId('req-abc').info('chegou');
    const obj = JSON.parse(linhas[0]!);
    assert.equal(obj.request_id, 'req-abc');
    assert.equal(obj.msg, 'chegou');
  });

  test('chave sensivel pelo nome e redigida', () => {
    const { log, linhas } = capturar();
    log.info('login', { email: 'a@b.c', password: 'nao-devia-sair' });
    assert.ok(!linhas[0]!.includes('nao-devia-sair'));
    assert.ok(linhas[0]!.includes('a@b.c'), 'o que nao e sensivel continua legivel');
  });

  test('credencial dentro de uma URL, com chave de nome inocente', () => {
    const { log, linhas } = capturar();
    log.info('upstream', { destino: 'postgres://user:senha123@host:5432/db' });
    assert.ok(!linhas[0]!.includes('senha123'), 'a senha viajou dentro da URL');
    assert.ok(linhas[0]!.includes('host:5432/db'), 'o resto da URL continua util para depurar');
  });

  test('redige em profundidade, nao so no primeiro nivel', () => {
    const saida = JSON.stringify(redigir({ a: { b: { c: { token: 'x' } } } }));
    assert.ok(!saida.includes('"x"'));
  });

  test('erro nao arrasta a credencial na mensagem', () => {
    const saida = JSON.stringify(redigir(new Error('falhou a ligar a postgres://u:p@h/d')));
    assert.ok(!saida.includes(':p@'));
  });

  test('nivel filtra o que nao interessa', () => {
    const linhas: string[] = [];
    const log = criarLogger({ nivel: 'warn', escrever: (l) => linhas.push(l) });
    log.info('nao sai');
    log.warn('sai');
    assert.equal(linhas.length, 1);
  });
});

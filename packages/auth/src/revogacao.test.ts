import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtroDeRevogacao } from './revogacao.ts';

/**
 * O raio de alcance da revogação.
 *
 * Por HTTP prova-se que quem foi revogado deixa de entrar — e é essa a prova que
 * mais vale. Mas de fora **não se distingue "apagou a sessão dela" de "apagou a
 * sessão dela e mais alguma coisa"**: as duas leem-se igual do lado de quem foi
 * revogado. Estas asserções olham para o filtro em si.
 */

test('o filtro NUNCA sai sem o dono — é isto que impede apagar o produto inteiro', () => {
  const f = filtroDeRevogacao('utilizador-a');
  assert.equal(f.userId, 'utilizador-a');
  // Não é redundante com a linha acima: a de cima passaria com o `userId` a
  // `undefined` se alguém lhe desse esse valor, e `where: { userId: undefined }`
  // no Prisma é um `DELETE` sem cláusula — todas as sessões de todos.
  assert.ok(f.userId, 'um filtro com dono vazio apagaria as sessões de toda a gente');
  assert.deepEqual(Object.keys(f), ['userId']);
});

test('sem `excepto`, fecha tudo o que é dela — incluindo a sessão de onde o pedido veio', () => {
  assert.deepEqual(filtroDeRevogacao('utilizador-a'), { userId: 'utilizador-a' });
});

test('com `excepto`, poupa exactamente uma sessão e continua preso ao dono', () => {
  const f = filtroDeRevogacao('utilizador-a', { excepto: 'token-desta-sessao' });
  assert.equal(f.userId, 'utilizador-a');
  assert.deepEqual((f as { NOT: unknown }).NOT, { token: 'token-desta-sessao' });
});

test('`excepto` vazio cai para o lado FECHADO, não para "excepto nada"', () => {
  // Uma variável que veio vazia é o caso real: o token não foi lido do pedido.
  // Se isto virasse `NOT: { token: '' }`, a revogação passava a poupar todas as
  // sessões cujo token não é a string vazia — ou seja, todas.
  const f = filtroDeRevogacao('utilizador-a', { excepto: '' });
  assert.deepEqual(f, { userId: 'utilizador-a' });
  assert.ok(!('NOT' in f));
});

test('trocar o dono muda o filtro — o controlo negativo desta asserção', () => {
  // Sem esta, as quatro de cima passariam com um filtro que ignorasse o
  // argumento e devolvesse sempre a mesma constante.
  assert.notDeepEqual(filtroDeRevogacao('utilizador-a'), filtroDeRevogacao('utilizador-b'));
});

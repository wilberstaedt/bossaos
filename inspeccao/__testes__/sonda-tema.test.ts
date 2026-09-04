import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TOKENS_FIXOS, TOKENS_PUBLICOS, exigirTokensLidos } from '../sonda-tema.ts';

describe('sonda do tema — a guarda que impede o verde sobre nada', () => {
  it('aceita tokens com valor', () => {
    exigirTokensLidos({ '--bo-publico-acento': '#c0562f', '--bo-estado-perigo': '#b3261e' });
  });

  it('O CASO QUE INTERESSA: tokens vazios são a folha que não chegou, não "nada mudou"', () => {
    assert.throws(
      () => exigirTokensLidos({ '--bo-publico-acento': '', '--bo-publico-fundo': '' }),
      /folha de estilos não chegou/,
    );
  });

  it('e basta UM vazio para parar — meio lido é lido mal', () => {
    assert.throws(
      () => exigirTokensLidos({ '--bo-publico-acento': '#c0562f', '--bo-fonte-titulo': '' }),
      /--bo-fonte-titulo/,
    );
  });

  it('as duas famílias não se cruzam — um token não pode ser público E fixo', () => {
    const cruzados = TOKENS_PUBLICOS.filter((t) => (TOKENS_FIXOS as readonly string[]).includes(t));
    assert.deepEqual(cruzados, [], `tokens em ambas as listas: ${cruzados.join(', ')}`);
  });

  it('e nenhum estado ficou de fora dos fixos, que é onde o dano seria maior', () => {
    for (const estado of ['sucesso', 'aviso', 'perigo', 'info']) {
      assert.ok(
        (TOKENS_FIXOS as readonly string[]).includes(`--bo-estado-${estado}`),
        `--bo-estado-${estado} não está protegido`,
      );
    }
  });
});

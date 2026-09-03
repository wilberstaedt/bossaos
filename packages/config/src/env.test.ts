/**
 * O critério de aceite 3 do E01 tem duas metades, e a segunda é a que se
 * esquece: "configuração obrigatória ausente falha com mensagem útil, **sem
 * revelar credenciais**".
 *
 * É fácil escrever o erro que ajuda. É fácil escrever o erro que não vaza. O
 * que parte é fazer as duas ao mesmo tempo — a forma natural de ajudar é
 * imprimir o valor que veio, e é exactamente isso que põe a senha no CI.
 *
 * CONTROLE NEGATIVO (a correr): pôr `issue.input` na mensagem faz cair "a
 * mensagem nao contem o valor"; aceitar DATABASE_URL vazia faz cair "falta a
 * base de dados".
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv, EnvError } from './env.ts';

const VALIDO = { DATABASE_URL: 'postgresql://app:x@127.0.0.1:5432/bossaos_dev' };

describe('loadEnv', () => {
  test('aceita o minimo e aplica os valores por omissao', () => {
    const env = loadEnv(VALIDO);
    assert.equal(env.NODE_ENV, 'development');
    assert.equal(env.SMTP_PORT, 1025);
    assert.equal(env.STORAGE_DRIVER, 'local');
  });

  test('falta a base de dados -> erro que diz QUAL variavel falta', () => {
    assert.throws(
      () => loadEnv({}),
      (err: unknown) => {
        assert.ok(err instanceof EnvError);
        assert.match(err.message, /DATABASE_URL/, 'tem de nomear a variavel em falta');
        return true;
      },
    );
  });

  test('A MENSAGEM NAO CONTEM O VALOR — nem sequer parte dele', () => {
    const SENHA = 'senha-super-secreta-123';
    try {
      loadEnv({ DATABASE_URL: `mysql://app:${SENHA}@host/db` });
      assert.fail('devia ter recusado uma ligacao que nao e PostgreSQL');
    } catch (err) {
      assert.ok(err instanceof EnvError);
      assert.ok(!err.message.includes(SENHA), 'a senha apareceu na mensagem de erro');
      assert.ok(!err.message.includes('mysql://'), 'a ligacao inteira apareceu na mensagem');
      assert.match(err.message, /DATABASE_URL/, 'mas continua a dizer qual variavel falhou');
    }
  });

  test('a credencial de MIGRACAO e separada e opcional no runtime', () => {
    // O processo de execucao nao deve sequer ter a credencial que altera schema.
    const env = loadEnv(VALIDO);
    assert.equal(env.MIGRATION_DATABASE_URL, undefined);
    const comMigracao = loadEnv({ ...VALIDO, MIGRATION_DATABASE_URL: 'postgresql://mig:y@127.0.0.1:5432/bossaos_dev' });
    assert.ok(comMigracao.MIGRATION_DATABASE_URL);
  });

  test('porta invalida e recusada, nao silenciosamente convertida', () => {
    assert.throws(() => loadEnv({ ...VALIDO, PORT: 'oitenta' }), EnvError);
  });
});

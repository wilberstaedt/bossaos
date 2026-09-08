import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { criarAutenticacao } from '../packages/auth/src/autenticacao.ts';
import { correioDeMemoria } from '../packages/auth/src/correio.ts';
import { criarUtilizador, ISSUER_DE_CREDENCIAL } from '../packages/auth/src/criar-utilizador.ts';

/**
 * O `criarUtilizador` assenta em API **privada** do `better-auth` — o
 * `internalAdapter` tem zero ocorrências no `index.d.mts`. A mitigação combinada
 * foi: uma função só a tocar-lhe, e este ficheiro a prendê-la.
 *
 * **Três coisas de uma vez, porque só as três juntas querem dizer «conta».**
 * Criar linhas não é ter conta: a primeira versão desta função criava e o
 * `sign-in` recusava, porque o `issuer` ficava no `@default` do esquema. Um
 * utilizador que existe e não entra passaria num teste que só contasse linhas.
 *
 * Se uma actualização do `better-auth` mudar o interior, é aqui que se ouve.
 */

const LIGACAO = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
const EMAIL = 'prova-criar-utilizador@bossaos.invalid';
const SENHA = 'Prova-Criar-2026!';

const auth = criarAutenticacao({
  authDatabaseUrl: LIGACAO,
  segredo: 'a'.repeat(32),
  urlBase: 'http://127.0.0.1:3999',
  correio: correioDeMemoria(),
});

let sql: Client;
const apagar = async () => {
  const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
  for (const { id } of rows) {
    await sql.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    await sql.query('DELETE FROM accounts WHERE user_id = $1', [id]);
    await sql.query('DELETE FROM users    WHERE id      = $1', [id]);
  }
};

before(async () => {
  sql = new Client({ connectionString: LIGACAO });
  await sql.connect();
  await apagar();
});
after(async () => { await apagar(); await sql.end(); });

describe('criarUtilizador — a porta que não é a rota de registo', () => {
  it('cria, ENTRA com a senha criada, e o issuer sai certo', async () => {
    const antes = (await sql.query('SELECT count(*)::int n FROM users')).rows[0].n;

    const id = await criarUtilizador(auth, { email: EMAIL, senha: SENHA, nome: 'Prova' });
    assert.ok(id, 'não devolveu id');

    // 1 · a linha existe
    const { rows: us } = await sql.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
    assert.equal(us.length, 1, 'a função devolveu sem criar o utilizador');

    // 2 · a conta ENTRA pela porta real do produto. É esta que separa «criou
    //     linhas» de «tem conta», e é a que a primeira versão falhava.
    // O `signInEmail` LANÇA quando recusa — não devolve algo falso. Sem este
    // `catch`, uma conta que não entra saía como um `APIError` cru e a frase
    // que a explica nunca chegava a aparecer. Medido a plantar o `issuer`.
    let entrou = false;
    try {
      await auth.api.signInEmail({ body: { email: EMAIL, password: SENHA } });
      entrou = true;
    } catch { entrou = false; }
    assert.ok(entrou, 'criou o utilizador e ele não entra');

    // 3 · o issuer é o que o `sign-in` procura, e não o `@default` da coluna
    const { rows: cs } = await sql.query(
      'SELECT issuer, provider_id, password FROM accounts WHERE user_id = $1', [id]);
    assert.equal(cs.length, 1, 'não escreveu credencial');
    assert.equal(cs[0].issuer, ISSUER_DE_CREDENCIAL,
      `issuer ${cs[0].issuer}: com o \`@default\` da coluna a conta existe e não entra`);
    assert.equal(cs[0].provider_id, 'credential');
    assert.ok(cs[0].password && cs[0].password.length > 0, 'credencial sem senha guardada');

    const depois = (await sql.query('SELECT count(*)::int n FROM users')).rows[0].n;
    assert.equal(depois, antes + 1, 'criou mais do que um utilizador');
  });

  // ── CONTROLO NEGATIVO ────────────────────────────────────────────────────
  //
  // O teste de cima é verde enquanto a função funcionar. Se ela passar a
  // devolver sem escrever — um `catch` engolido, um adaptador que muda de nome
  // e falha em silêncio — a asserção «a função devolveu sem criar» tem de ser
  // a que acende. Aqui prova-se que ela acende: simula-se exactamente esse
  // regresso vazio e exige-se que a verificação o apanhe.
  it('a verificação apanha uma função que devolve sem criar', async () => {
    await apagar();
    const criarQueNaoCria = async () => 'um-id-inventado';

    const id = await criarQueNaoCria();
    const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
    assert.ok(id, 'o simulacro devia devolver um id — senão não é o caso que se teme');
    assert.equal(rows.length, 0,
      'o simulacro não devia ter criado nada; se criou, este controlo não mede o que diz');

    // E é ISTO que o teste de cima faria: a mesma asserção, sobre o mesmo
    // estado, tem de falhar.
    assert.throws(
      () => assert.equal(rows.length, 1, 'a função devolveu sem criar o utilizador'),
      /devolveu sem criar/,
      'a asserção do teste de cima NÃO acusa um regresso vazio — ela não prova nada',
    );
  });
});

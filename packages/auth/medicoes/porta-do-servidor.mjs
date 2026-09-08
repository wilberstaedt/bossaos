// ── A pergunta que o `97174d6` deixou marcada como «não sei» ────────────────
//
//   «a API do servidor consegue criar a conta sem abrir rota HTTP e sem senha
//    escrita à mão»
//
// Ela decide entre cura limpa e remendo, e não se responde a ler: o símbolo
// `disableSignUp` aparece em ficheiros de plugin no `dist`, e o revisor
// escreveu — com razão — que ler o núcleo seria adivinhar.
//
// Isto EXERCITA a biblioteca. A `autenticacao.test.ts` diz de si própria que
// «nada aqui exercita a biblioteca», e é por isso que a resposta não estava lá.
//
// ── O controlo, e sem ele isto não vale nada ────────────────────────────────
//
// Uma recusa sozinha não distingue «a API respeita a bandeira» de «eu invoquei
// mal». Por isso corre DUAS vezes: a configuração do produto, e a MESMA
// configuração com a bandeira desligada — um só campo trocado, tudo o resto
// herdado por espalhamento. Se a segunda também recusar, a medição não mede a
// bandeira e diz-se isso em vez de se concluir.
//
// ── A base ─────────────────────────────────────────────────────────────────
//
// Conta antes, tenta, apaga o que tenha nascido, conta depois. É o padrão do
// `provar-demonstracao.sh` e pela mesma razão: uma medição que deixa sujidade
// mediu-se a si própria na corrida seguinte.
import { betterAuth } from 'better-auth';
import { Client } from 'pg';
import { criarAutenticacao } from '../src/autenticacao.ts';
import { correioDeMemoria } from '../src/correio.ts';

const URL_BASE = 'http://127.0.0.1:3999';
const EMAIL = 'porta-do-servidor@bossaos.invalid';
const SENHA = 'Porta-Do-Servidor-2026!';
const LIGACAO = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!LIGACAO) { console.log('NAO MEDI  sem ligacao a base'); process.exit(2); }

const sql = new Client({ connectionString: LIGACAO });
await sql.connect();

const contar = async () => (await sql.query('SELECT count(*)::int n FROM users')).rows[0].n;
const apagar = async () => {
  const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
  for (const { id } of rows) {
    await sql.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    await sql.query('DELETE FROM accounts WHERE user_id = $1', [id]);
    await sql.query('DELETE FROM users    WHERE id      = $1', [id]);
  }
  return rows.length;
};

const produto = criarAutenticacao({
  authDatabaseUrl: LIGACAO, segredo: 'a'.repeat(32), urlBase: URL_BASE,
  correio: correioDeMemoria(),
});
// A MESMA configuração com um campo trocado. Não é uma instância parecida
// escrita à mão: é a do produto espalhada, e só a bandeira muda.
const controlo = betterAuth({
  ...produto.options,
  emailAndPassword: { ...produto.options.emailAndPassword, disableSignUp: false },
});

const tentar = async (auth, rotulo) => {
  await apagar();
  let veredicto;
  try {
    await auth.api.signUpEmail({ body: { email: EMAIL, password: SENHA, name: 'Porta' } });
    veredicto = 'CRIOU';
  } catch (e) {
    veredicto = `RECUSOU ${e?.body?.code ?? e?.status ?? e?.message ?? e}`;
  }
  const { rows } = await sql.query('SELECT count(*)::int n FROM users WHERE email = $1', [EMAIL]);
  // O que conta e' a LINHA na base, nao o que a chamada devolveu: uma API que
  // devolve sucesso sem escrever nao criou conta nenhuma.
  console.log(`  ${rotulo.padEnd(28)} ${veredicto.padEnd(42)} linhas=${rows[0].n}`);
  await apagar();
  return rows[0].n;
};

const antes = await contar();
console.log(`  utilizadores antes: ${antes}`);
console.log(`  disableSignUp no produto: ${produto.options.emailAndPassword?.disableSignUp}`);
console.log(`  disableSignUp no controlo: ${controlo.options.emailAndPassword?.disableSignUp}`);
const comBandeira = await tentar(produto, 'produto (bandeira ligada)');
const semBandeira = await tentar(controlo, 'controlo (bandeira desligada)');
// ── A terceira medição: existe uma porta que não é a rota nem a senha à mão? ─
//
// O `auth.api` tem 41 funções e só uma cria identidade. Mas o `$context` expõe
// um `internalAdapter` com `createUser`, `createAccount` e `updatePassword`, e
// um `ctx.password.hash` — o hasher da própria biblioteca.
//
// «Existe» não é «funciona». O revisor escreveu o modo de falha exacto:
// **um utilizador que existe e não entra.** Por isso não basta criar as linhas:
// entra-se a seguir, pela porta real do produto, e é a ENTRADA que decide.
const pelaPortaInterna = async () => {
  await apagar();
  const ctx = await produto.$context;
  let criou = 'NAO';
  try {
    const u = await ctx.internalAdapter.createUser({ email: EMAIL, name: 'Porta', emailVerified: true });
    await ctx.internalAdapter.createAccount({
      userId: u.id, providerId: 'credential', accountId: u.id,
      // `issuer` NÃO é decoração e a primeira versão disto errou-o. Deixei o
      // `@default("credential")` do schema e a entrada recusava com
      // INVALID_EMAIL_OR_PASSWORD — o modo de falha que o revisor previu, «um
      // utilizador que existe e não entra». Ia concluir «não há porta limpa».
      // A comparação das duas linhas na base é que o disse: o `sign-up` real
      // escreve `local:credential`, e tudo o resto era igual, incluindo o
      // comprimento 161 da senha. O defeito era meu, não da porta.
      issuer: 'local:credential',
      password: await ctx.password.hash(SENHA),
    });
    criou = 'SIM';
  } catch (e) { criou = `falhou: ${e?.message ?? e}`; }

  let entrou;
  try {
    await produto.api.signInEmail({ body: { email: EMAIL, password: SENHA } });
    entrou = 'ENTROU';
  } catch (e) { entrou = `NAO ENTROU ${e?.body?.code ?? e?.message ?? e}`; }

  console.log(`  ${'porta interna'.padEnd(28)} criou=${criou.padEnd(6)} ${entrou}`);
  // Controlo da própria entrada: com a senha errada TEM de recusar. Sem isto,
  // um `signInEmail` que dissesse sim a tudo lia-se como porta boa.
  let comSenhaErrada;
  try {
    await produto.api.signInEmail({ body: { email: EMAIL, password: `${SENHA}-errada` } });
    comSenhaErrada = 'ACEITOU (a entrada nao verifica nada)';
  } catch (e) { comSenhaErrada = `recusou ${e?.body?.code ?? e?.message ?? e}`; }
  console.log(`  ${'controlo da entrada'.padEnd(28)} senha errada -> ${comSenhaErrada}`);
  await apagar();
  return entrou === 'ENTROU' && comSenhaErrada.startsWith('recusou');
};
const portaInterna = await pelaPortaInterna();

const depois = await contar();
console.log(`  utilizadores depois: ${depois}`);

if (antes !== depois) {
  console.log(`  NAO MEDI  a medicao deixou sujidade: ${antes} -> ${depois}`);
  await sql.end(); process.exit(2);
}
if (semBandeira === 0) {
  console.log('  NAO MEDI  o controlo tambem nao criou — a invocacao esta errada,');
  console.log('            e a recusa do produto nao prova nada sobre a bandeira.');
  await sql.end(); process.exit(2);
}
console.log(comBandeira === 0
  ? '  RESPOSTA 1  a API PUBLICA respeita o disableSignUp: o signUpEmail nao serve.'
  : '  RESPOSTA 1  a API publica IGNORA o disableSignUp.');
console.log(portaInterna
  ? '  RESPOSTA 2  o internalAdapter CRIA e a conta ENTRA pela porta real do produto:'
    + ' existe caminho sem rota HTTP e sem senha escrita a mao.'
  : '  RESPOSTA 2  o internalAdapter nao deu uma conta utilizavel — nao ha porta limpa.');
await sql.end();

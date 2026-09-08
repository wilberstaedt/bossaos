// ── A última medição antes de alguém escolher ──────────────────────────────
//
// O caminho já medido (`porta-do-servidor.mjs`) funciona e assenta no
// `internalAdapter`, que tem ZERO ocorrências no `index.d.mts` — é interface
// privada, sem promessa de estabilidade, e pode mudar numa versão menor em
// silêncio.
//
// O plugin `admin` vem no pacote, é público e documentado, e expõe `createUser`.
// A pergunta: **cria com a bandeira ligada?** Se criar, ganha-se o mesmo
// resultado com promessa de estabilidade. Se não criar, a escolha é entre API
// privada e nada.
//
// O revisor procurou no código se o `admin.createUser` consulta a bandeira e não
// encontrou consulta nenhuma — e escreveu que **o grep não ter encontrado não é
// prova**. Por isso mede-se.
//
// ── ISTO NÃO IMPLEMENTA NADA ───────────────────────────────────────────────
//
// O plugin é montado numa instância DE MEDIÇÃO, construída aqui a partir das
// opções do produto. O produto não o ganha: `packages/auth/src/autenticacao.ts`
// não é tocado.
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { Client } from 'pg';
import { criarAutenticacao } from '../src/autenticacao.ts';
import { correioDeMemoria } from '../src/correio.ts';

const URL_BASE = 'http://127.0.0.1:3999';
const EMAIL = 'porta-do-admin@bossaos.invalid';
const SENHA = 'Porta-Do-Admin-2026!';
const LIGACAO = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!LIGACAO) { console.log('NAO MEDI  sem ligacao a base'); process.exit(2); }

const sql = new Client({ connectionString: LIGACAO });
await sql.connect();
const contar = async () => (await sql.query('SELECT count(*)::int n FROM users')).rows[0].n;
const linhas = async () => (await sql.query(
  'SELECT count(*)::int n FROM users WHERE email=$1', [EMAIL])).rows[0].n;
const apagar = async () => {
  const { rows } = await sql.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
  for (const { id } of rows) {
    await sql.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    await sql.query('DELETE FROM accounts WHERE user_id = $1', [id]);
    await sql.query('DELETE FROM users    WHERE id      = $1', [id]);
  }
};

const produto = criarAutenticacao({
  authDatabaseUrl: LIGACAO, segredo: 'a'.repeat(32), urlBase: URL_BASE,
  correio: correioDeMemoria(),
});
const comAdmin = (bandeira) => betterAuth({
  ...produto.options,
  emailAndPassword: { ...produto.options.emailAndPassword, disableSignUp: bandeira },
  plugins: [...(produto.options.plugins ?? []), admin()],
});
const ligado = comAdmin(true);
const desligado = comAdmin(false);

// ── 0 · A função existe, e com que nome? ───────────────────────────────────
// Concluir «não cria» a partir de uma função que não existe seria medir o meu
// dedo. O nome vem da própria instância, não da documentação.
const nomes = Object.keys(ligado.api).filter((n) => /createUser|admin|setRole|listUsers/i.test(n));
console.log(`  funcoes do plugin visiveis: ${nomes.join(' ') || '(nenhuma)'}`);
if (typeof ligado.api.createUser !== 'function') {
  console.log('  NAO MEDI  o plugin nao expoe createUser nesta versao — nada a medir.');
  await sql.end(); process.exit(2);
}

const chamar = async (auth, corpo) => {
  try { await auth.api.createUser({ body: corpo }); return 'PASSOU'; }
  catch (e) { return `recusou ${e?.body?.code ?? e?.status ?? e?.message ?? e}`; }
};

const antes = await contar();
console.log(`  utilizadores antes: ${antes}`);

// ── 1 · A ORDEM: a bandeira é consultada ANTES da validação? ───────────────
//
// Corpo inválido de propósito, para que nada possa nascer se a resposta for
// recusa. A resposta separa duas coisas que uma recusa sozinha confunde:
//   · código da bandeira  → ela é consultada primeiro
//   · erro de validação   → a bandeira NÃO é o primeiro portão
await apagar();
const ordem = await chamar(ligado, { email: 'isto-nao-e-email', password: '', name: '' });
console.log(`  1 ordem (corpo invalido)      ${ordem}`.padEnd(74) + `linhas=${await linhas()}`);

// ── 2 · Cria com a bandeira LIGADA? ────────────────────────────────────────
await apagar();
const comBandeira = await chamar(ligado, { email: EMAIL, password: SENHA, name: 'Admin' });
const nasceuLigado = await linhas();
console.log(`  2 bandeira ligada             ${comBandeira}`.padEnd(74) + `linhas=${nasceuLigado}`);

// ── 3 · O CONTROLO dos dois lados ──────────────────────────────────────────
// A mesma instância com um só campo trocado. Sem isto, uma recusa em 2 não
// distingue «respeita a bandeira» de «invoquei mal».
let entrou = '(nao aplicavel)';
let issuer;
if (nasceuLigado > 0) {
  // Não basta criar: o revisor lembrou o modo de falha que quase me enganou.
  try { await produto.api.signInEmail({ body: { email: EMAIL, password: SENHA } }); entrou = 'ENTROU'; }
  catch (e) { entrou = `NAO ENTROU ${e?.body?.code ?? e?.message ?? e}`; }
  const { rows } = await sql.query(
    'SELECT a.issuer FROM accounts a JOIN users u ON u.id=a.user_id WHERE u.email=$1', [EMAIL]);
  issuer = rows[0]?.issuer ?? '(sem linha de conta)';
  console.log(`  2b entrada pela porta real    ${entrou}`);
  console.log(`     issuer na base             ${issuer}   (o @default do schema e' 'credential')`);
}
await apagar();
const semBandeira = await chamar(desligado, { email: EMAIL, password: SENHA, name: 'Admin' });
const nasceuDesligado = await linhas();
console.log(`  3 controlo bandeira desligada ${semBandeira}`.padEnd(74) + `linhas=${nasceuDesligado}`);
await apagar();

const depois = await contar();
console.log(`  utilizadores depois: ${depois}`);
console.log('');

if (antes !== depois) {
  console.log(`  NAO MEDI  a medicao deixou sujidade: ${antes} -> ${depois}`);
  await sql.end(); process.exit(2);
}
const porEsquema = (r) => /Unknown argument|Invalid .*invocation|column .* does not exist/i.test(r);
if (nasceuDesligado === 0) {
  // ── A terceira coisa, que nenhum dos dois previu ────────────────────────
  //
  // O controlo nao criou, mas NAO por causa da bandeira: as duas corridas
  // falharam com o MESMO erro do Prisma. Isso e' informacao e nao ausencia
  // dela, e ha duas leituras a separar.
  if (porEsquema(comBandeira) && porEsquema(semBandeira)) {
    console.log('  ACHADO   o plugin nao chega a decidir sobre a bandeira: falha ANTES, no');
    console.log('           esquema. As duas corridas — ligada e desligada — dao o mesmo erro.');
    console.log('');
    console.log('           E ha uma conclusao que ISTO prova, ao contrario:');
    console.log('           com a bandeira LIGADA a chamada chegou a ESCRITA na base. Se o');
    console.log('           `disableSignUp` fosse consultado, tinha recusado antes de la');
    console.log('           chegar. Logo o caminho do admin NAO consulta a bandeira.');
    console.log('');
    console.log('           O que falta nao e' + "' " + 'permissao: sao COLUNAS. O plugin escreve');
    console.log('           `role`, `banned`, `banReason` e `banExpires` em `users`, e');
    console.log('           `impersonatedBy` em `sessions`. Nenhuma existe neste esquema.');
    console.log('  NAO MEDI se a conta nasceria utilizavel: nunca houve linha para entrar.');
    await sql.end(); process.exit(2);
  }
  console.log('  NAO MEDI  o controlo tambem nao criou, e nao foi por esquema. A invocacao');
  console.log('            esta errada ou o plugin exige sessao de administrador, e a recusa');
  console.log('            em 2 nao prova nada sobre a bandeira.');
  await sql.end(); process.exit(2);
}
if (nasceuLigado > 0 && entrou === 'ENTROU') {
  console.log('  RESPOSTA  o admin CRIA com a bandeira ligada e a conta ENTRA pela porta real.');
  console.log('            Mesmo resultado do internalAdapter, com API publica.');
} else if (nasceuLigado > 0) {
  console.log(`  RESPOSTA  o admin cria com a bandeira ligada MAS a conta nao entra (${entrou}).`);
  console.log('            Criar nao e' + "' " + 'ter conta utilizavel.');
} else {
  console.log('  RESPOSTA  o admin RESPEITA a bandeira: nao cria com ela ligada.');
  console.log('            A escolha fica entre API privada e nada.');
}
await sql.end();

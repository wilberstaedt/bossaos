// ── Criar uma conta no servidor ────────────────────────────────────────────
//
// O registo público está fechado (`disableSignUp: true`), e a política de quem
// pode ter conta ainda não foi decidida. Enquanto for «por agora só eu crio
// contas», é isto que a cria — à mão, no servidor, por quem tem acesso a ele.
//
// **Não substitui uma política.** É a ferramenta que torna a política
// «só eu crio» executável; no dia em que houver outra, esta sai.
//
// ── Uso ────────────────────────────────────────────────────────────────────
//
//   echo -n 'a-senha' | node --experimental-strip-types \
//     packages/auth/ferramentas/criar-conta.mjs alguem@casa.pt
//
//   node --experimental-strip-types \
//     packages/auth/ferramentas/criar-conta.mjs alguem@casa.pt --gerar
//
// ── Porque é que a senha NÃO entra por argumento ──────────────────────────
//
// Um argumento de linha de comando fica no histórico da shell e é visível no
// `ps` a quem estiver na máquina. Lê-se de `stdin`, ou gera-se e imprime-se UMA
// vez. Se alguém passar algo parecido com uma senha em argumento, isto recusa —
// avisar depois de ela já estar no histórico não a tira de lá.
import { Client } from 'pg';
import { criarAutenticacao } from '../src/autenticacao.ts';
import { criarUtilizador } from '../src/criar-utilizador.ts';
import { correioDeMemoria } from '../src/correio.ts';
import { randomBytes } from 'node:crypto';

const morrer = (m) => { console.error(`ERRO: ${m}`); process.exit(1); };

const args = process.argv.slice(2).filter((a) => a !== '--gerar');
const gerar = process.argv.includes('--gerar');
const email = args[0];

if (!email) morrer('falta o email. Uso: … criar-conta.mjs <email> [--gerar]');
if (args.length > 1) {
  morrer('argumentos a mais. A SENHA NAO ENTRA POR ARGUMENTO: fica no historico '
    + 'da shell e no `ps`. Usa `echo -n <senha> | … criar-conta.mjs <email>` ou `--gerar`.');
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) morrer(`'${email}' nao parece um email`);

// ── As duas variáveis, e o motivo de falhar alto ──────────────────────────
//
// Já pagámos uma medição inteira a descobrir que **com o segredo errado a conta
// nasce e não entra**. Um valor por omissão aqui produzia exactamente isso, em
// silêncio, e só se descobriria quando a pessoa tentasse entrar.
const url = process.env.AUTH_DATABASE_URL;
const segredo = process.env.BETTER_AUTH_SECRET;
if (!url) morrer('AUTH_DATABASE_URL em falta. E a credencial que o runtime usa; '
  + 'sem ela nao se sabe em que base se estaria a escrever.');
if (!segredo) morrer('BETTER_AUTH_SECRET em falta. TEM de ser o mesmo que a aplicacao '
  + 'usa: com outro, a conta nasce e NAO ENTRA — e isso so se descobre quando a '
  + 'pessoa tenta entrar.');

async function lerSenha() {
  if (gerar) {
    // 24 caracteres de base64url. Impressa uma vez, no fim, e nunca guardada.
    return randomBytes(18).toString('base64url');
  }
  if (process.stdin.isTTY) {
    morrer('sem senha. Passa-a por stdin (`echo -n … |`) ou usa `--gerar`.');
  }
  const pedacos = [];
  for await (const p of process.stdin) pedacos.push(p);
  const senha = Buffer.concat(pedacos).toString('utf8').replace(/\r?\n$/, '');
  if (senha.length < 12) {
    morrer(`a senha tem ${senha.length} caracteres e o minimo aqui sao 12.`);
  }
  return senha;
}

const senha = await lerSenha();

const sql = new Client({ connectionString: url });
await sql.connect();
try {
  // ── Recusa em vez de criar um segundo em silêncio ───────────────────────
  const { rows } = await sql.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
  if (rows.length > 0) {
    morrer(`ja existe uma conta com ${email} (id ${rows[0].id}). NAO criei uma segunda: `
      + 'duas contas com o mesmo email e um problema de identidade, nao uma conveniencia.');
  }

  const auth = criarAutenticacao({
    authDatabaseUrl: url,
    segredo,
    urlBase: process.env.BETTER_AUTH_URL ?? 'http://127.0.0.1:3000',
    correio: correioDeMemoria(),
  });

  const id = await criarUtilizador(auth, { email, senha, nome: email.split('@')[0] });

  // ── A ferramenta prova o seu próprio trabalho ───────────────────────────
  //
  // Criar linhas não é ter conta. O modo de falha conhecido é «existe e não
  // entra», e quem corre isto no servidor não tem como o descobrir senão
  // tentando. Tenta-se aqui, e diz-se.
  let entrou = false;
  try {
    await auth.api.signInEmail({ body: { email, password: senha } });
    entrou = true;
  } catch { entrou = false; }

  if (!entrou) {
    morrer(`a conta ${email} foi criada (id ${id}) mas NAO ENTRA com a senha dada. `
      + 'Quase de certeza o BETTER_AUTH_SECRET nao e o da aplicacao. Apaga-a e repete.');
  }

  console.log(`conta criada e verificada: ${email} (id ${id})`);
  if (gerar) {
    console.log('');
    console.log(`  senha: ${senha}`);
    console.log('  ^ impressa UMA vez. Nao fica guardada em lado nenhum.');
  }
  console.log('');
  console.log('Nota: esta conta ainda nao pertence a organizacao nenhuma. A pertenca');
  console.log('entra pelo convite, que e a porta do produto — nao por aqui.');
} finally {
  await sql.end();
}

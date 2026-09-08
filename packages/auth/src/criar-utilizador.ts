import type { Autenticacao } from './autenticacao.ts';

/**
 * Cria uma conta com senha **sem passar pela rota de registo**.
 *
 * ── Porque é que isto existe ──────────────────────────────────────────────
 *
 * O `disableSignUp: true` fechou a única porta por onde uma conta nascia neste
 * sistema, e isso partiu quatro coisas de uma vez: as capturas comerciais da
 * sala, as telas-mestre da página de aprovação, a semeadura da demonstração e
 * qualquer cliente novo. Medido: `POST /api/auth/sign-up/email` → **400
 * `EMAIL_PASSWORD_SIGN_UP_DISABLED`**, e `POST /api/convites/aceitar` → **401
 * `sem_sessao`**, porque o convite dá pertença a uma conta que já existe.
 *
 * Esta função é a porta que faltava, e é chamável de dentro — nunca por HTTP.
 * **Quem pode chamá-la é política, e a política não vive aqui:** hoje chama-a a
 * semeadura da demonstração.
 *
 * ── AVISO: isto assenta em API PRIVADA do `better-auth` ───────────────────
 *
 * O `ctx.internalAdapter` e o `ctx.password` **não estão na superfície de tipos
 * exportada**: `internalAdapter` tem **zero ocorrências no `index.d.mts`** do
 * pacote. Não há promessa de estabilidade, e uma versão menor pode mudá-los sem
 * aviso — em silêncio, que é o pior modo.
 *
 * **A mitigação é esta função ser a ÚNICA que lhes toca**, e o
 * `provas/criar-utilizador.test.ts` fixar as três coisas que decidem: que cria,
 * que a conta ENTRA com a senha criada, e que o `issuer` sai certo. Uma
 * actualização que parta isto parte o teste em voz alta em vez de partir o
 * produto em silêncio.
 *
 * As alternativas foram medidas e recusadas. O `auth.api.signUpEmail` do lado do
 * servidor **respeita a bandeira** (recusa com o mesmo código). O plugin `admin`
 * é público mas nem chega a decidir: falha antes, no esquema, porque escreve
 * `role`, `banned`, `banReason` e `banExpires` em `users` e `impersonatedBy` em
 * `sessions` — e fazê-lo funcionar instalaria um papel global ao lado do `Papel`
 * por organização, e uma personificação ao lado da sessão de suporte do E33, que
 * tem quatro condições e essa não teria nenhuma.
 *
 * ── O `issuer`, que não é decoração ───────────────────────────────────────
 *
 * O `sign-in` procura a credencial por `issuer = 'local:credential'`. O
 * `@default` da coluna é `'credential'`, e deixá-lo assim dá **um utilizador que
 * existe e não entra** — foi o que aconteceu na primeira medição, e a comparação
 * com a linha que o registo real escreve é que o disse.
 */
export const ISSUER_DE_CREDENCIAL = 'local:credential';

export interface ContaNova {
  email: string;
  senha: string;
  nome: string;
  /**
   * **Por omissão `false`, e a omissão é a decisão.**
   *
   * `emailVerified` é a afirmação «este endereço foi provado». Quem a faz tem de
   * ter a prova — e quem chama esta função com pressa não tem. O convite tem: o
   * endereço prova-se por lá ter chegado, e é o `autenticacao.ts` que o escreve
   * («o convite JÁ prova o email — foi para lá que ele foi»).
   *
   * A primeira versão desta função tinha `true` por omissão, **e contradizia o
   * comentário que estava na linha de cima**, que dizia que a semeadura não tem
   * a quem provar nada. Ninguém tinha decidido; tinha-se escolhido o valor mais
   * cómodo e escrito o argumento contrário ao lado.
   *
   * Medido antes de mudar: **nada em `apps/` ou `packages/` lê `emailVerified`**
   * — nenhum ecrã o mostra, nenhum portão o consulta, e o
   * `requireEmailVerification` já está a `false`, portanto não trava a entrada.
   * O campo hoje não custa nada, e é por isso que a escolha se faz agora e não
   * quando custar: **o chamador que se vai esquecer deste parâmetro é o caminho
   * de entrada que ainda não foi escrito.** Com `true` por omissão, esquecê-lo
   * afirmava uma prova que ninguém tinha; com `false`, esquecê-lo não afirma
   * nada — e quem tiver a prova declara-a.
   */
  emailVerificado?: boolean;
}

/** Devolve o `id` do utilizador criado. */
export async function criarUtilizador(
  auth: Autenticacao,
  { email, senha, nome, emailVerificado = false }: ContaNova,
): Promise<string> {
  const ctx = await auth.$context;

  const utilizador = await ctx.internalAdapter.createUser({
    email, name: nome, emailVerified: emailVerificado,
  });

  await ctx.internalAdapter.createAccount({
    userId: utilizador.id,
    providerId: 'credential',
    accountId: utilizador.id,
    issuer: ISSUER_DE_CREDENCIAL,
    // O hash é o da biblioteca. O `schema.prisma` é explícito: «guardada pela
    // biblioteca, com o algoritmo dela. Nunca por nós.»
    password: await ctx.password.hash(senha),
  });

  return utilizador.id;
}

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { twoFactor } from 'better-auth/plugins';
import { obterPrismaDeAutenticacao } from '@bossaos/db';
import type { Correio } from './correio.ts';

/**
 * Autenticação global.
 *
 * O E04 é explícito: **não se constrói criptografia, recuperação nem
 * armazenamento de senha próprios**. Tudo isso é da biblioteca. O que é nosso é
 * onde ela se liga e o que ela pode ver — e isso é a parte que interessa.
 *
 * Liga-se com `bossaos_auth`, o terceiro acesso do CT-04: vê `users`,
 * `sessions`, `accounts` e `verifications`, e **nada de inquilino**. Verificado
 * na base: `SELECT count(*) FROM brands` com esta credencial devolve
 * `permission denied`.
 *
 * A identidade continua a ser UMA tabela. O campo `name` da biblioteca aponta
 * para a coluna `nome` do E03 por configuração, em vez de haver duas tabelas de
 * pessoas a fingir que são a mesma.
 */
export interface OpcoesDeAutenticacao {
  authDatabaseUrl: string;
  segredo: string;
  urlBase: string;
  correio: Correio;
  /** Segundos. Configuração, não constante escolhida por quem programa. */
  duracaoDaSessaoSegundos?: number;
}

const SETE_DIAS = 60 * 60 * 24 * 7;

export function criarAutenticacao(opcoes: OpcoesDeAutenticacao) {
  const prisma = obterPrismaDeAutenticacao(opcoes.authDatabaseUrl);

  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: opcoes.segredo,
    baseURL: opcoes.urlBase,

    user: {
      // A coluna chama-se `nome`. A biblioteca chama-lhe `name`.
      fields: { name: 'nome' },
    },

    session: {
      expiresIn: opcoes.duracaoDaSessaoSegundos ?? SETE_DIAS,
      // Renova a sessão activa quando falta menos de um dia. Sem isto, quem
      // trabalha todos os dias é expulso a meio de um serviço ao sétimo.
      updateAge: 60 * 60 * 24,
      // `cookieCache` NÃO é activada, e isso é uma decisão e não um esquecimento.
      //
      // Poupava uma consulta por pedido. Em troca, uma sessão em cache sobrevive
      // à revogação durante o tempo da cache — e é nesse intervalo que a pessoa
      // que acabou de ser despedida ainda fecha a caixa. Sem cache, cada pedido
      // lê a linha; apagada a linha, o pedido seguinte já não entra.
      //
      // Quem quiser ligá-la tem de vir aqui, e então tem de responder ao teste
      // `revogacao` da prova do E04, que mede exactamente este intervalo.
    },

    emailAndPassword: {
      enabled: true,
      // ── O REGISTO FECHA-SE, e ninguém o tinha aberto de propósito ────────
      //
      // `enabled: true` sem `disableSignUp` faz o `better-auth` 1.7.2 registar
      // `POST /api/auth/sign-up/email` **exista ou não uma página**. Medido a
      // 07/09 **localmente, sobre o build de produção** — e NÃO no domínio
      // público: ninguém sondou a autenticação ao vivo, de propósito. (Esta
      // linha dizia «no domínio público»; corrigida por quem tirou a medida.)
      // Com controlos: uma rota inventada dá 404, o
      // `sign-in/email` dá 400 porque existe, e o `sign-up/email` dava **400 a
      // validar `name`, `email` e `password`** — a rota existia e aceitava um
      // registo. Ninguém a quis: o produto é POR CONVITE, e está escrito duas
      // linhas abaixo, na razão de não se exigir verificação de email.
      //
      // Isto não acrescenta uma regra nova. Faz o código dizer o que o
      // ficheiro já declarava — e foi a distância entre as duas coisas que
      // deixou a porta aberta sem ninguém a abrir.
      //
      // **Não parte o convite:** quem aceita chama `/api/convites/aceitar`, que
      // exige sessão e nunca passa por aqui. E a prova mede a RESPOSTA do
      // servidor, não esta linha — ler a configuração foi o que fez alguém
      // afirmar hoje que o registo não existia.
      disableSignUp: true,
      // A verificação de email não bloqueia a entrada de quem aceitou um
      // convite: o convite JÁ prova o endereço — foi para lá que ele foi.
      requireEmailVerification: false,
      // Recuperar a senha FECHA as sessões que já existem.
      //
      // O `revogacao.ts` escreve que "uma senha mudada com quem já entrou a
      // continuar lá dentro parece resolvido e não está" — e durante o E04 isso
      // esteve escrito e não estava ligado. Quem recupera o acesso está a
      // responder a uma suspeita: perdeu o portátil, partilhou a senha, foi-lhe
      // aberta a conta. Trocar a senha e deixar a sessão do outro lado viva
      // resolve exactamente nada, e resolve-o de forma convincente.
      //
      // A sessão de quem acabou de repor sobrevive — é ele que está a repô-la.
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, url }) {
        await opcoes.correio.enviar({
          para: user.email,
          assunto: 'Recupera tu acceso a BossaOS',
          texto:
            `Hola,\n\nHas pedido recuperar el acceso a BossaOS.\n\n${url}\n\n` +
            `El enlace es de un solo uso y caduca en 15 minutos. Si no has sido tú, ` +
            `ignora este mensaje: tu acceso sigue intacto.\n`,
        });
      },
    },

    emailVerification: {
      async sendVerificationEmail({ user, url }) {
        await opcoes.correio.enviar({
          para: user.email,
          assunto: 'Confirma tu email en BossaOS',
          texto: `Hola,\n\nConfirma tu dirección de email:\n\n${url}\n`,
        });
      },
    },

    // MFA em TODOS os planos, não num escalão acima. É decisão registada no
    // contrato: a segurança da conta de quem trabalha no restaurante não é uma
    // capacidade que se venda.
    plugins: [twoFactor({ issuer: 'BossaOS' })],

    advanced: {
      // A base gera os UUID (as colunas são `@db.Uuid`). Sem isto a biblioteca
      // gera identificadores dela e o `INSERT` rebenta no tipo.
      database: { generateId: false },
    },
  });
}

export type Autenticacao = ReturnType<typeof criarAutenticacao>;

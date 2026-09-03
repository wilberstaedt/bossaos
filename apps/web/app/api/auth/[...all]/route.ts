import { toNextJsHandler } from 'better-auth/next-js';
import { obterAutenticacao } from '../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A biblioteca de autenticação, montada.
 *
 * Entrar, sair, recuperar, verificar email e segundo factor passam todos por
 * aqui. **Nada disto é escrito por nós** — o E04 é explícito em não construir
 * criptografia, recuperação nem armazenamento de senha próprios.
 *
 * Liga-se com `bossaos_auth`, que não vê uma linha de inquilino.
 */
const { GET: obter, POST: publicar } = toNextJsHandler(obterAutenticacao());

export { obter as GET, publicar as POST };

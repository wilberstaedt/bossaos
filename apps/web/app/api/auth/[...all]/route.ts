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
 *
 * **Montada ao primeiro pedido, não à importação.** Estava
 * `toNextJsHandler(obterAutenticacao())` no topo do módulo, e o Next importa
 * cada rota para recolher os dados da página: o BUILD passava a exigir o
 * segredo e as duas URLs de base de dados. Em CI não se via, porque o job
 * exporta tudo; via-se numa shell limpa, que é onde a próxima pessoa compila.
 * Um build que precisa de segredos de produção para compilar é um build que
 * não se pode correr sem eles.
 */
let manipulador: ReturnType<typeof toNextJsHandler> | undefined;

function handlers() {
  manipulador ??= toNextJsHandler(obterAutenticacao());
  return manipulador;
}

export function GET(pedido: Request) {
  return handlers().GET(pedido);
}

export function POST(pedido: Request) {
  return handlers().POST(pedido);
}

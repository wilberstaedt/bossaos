import { NextResponse, type NextRequest } from 'next/server';
import { IDIOMAS, resolverIdioma } from '@bossaos/i18n';
import { FICHEIROS_NA_RAIZ } from './src/seo/rotas.ts';

/** Cabeçalho onde viaja o identificador do pedido, ida e volta. */
export const CABECALHO_REQUEST_ID = 'x-request-id';

/**
 * Carimba um `request_id` em cada pedido.
 *
 * Chama-se `proxy` e não `middleware` porque o Next 16 depreciou a convenção
 * antiga; começar já na nova evita uma migração forçada daqui a uma versão.
 *
 * Aceita um que venha de fora — é assim que um rasto atravessa serviços — mas
 * só se parecer um identificador. Um `x-request-id` vindo da Internet acaba
 * dentro de linhas de log; sem esta validação, quem o envia escolhe o que é
 * escrito no nosso log, incluindo mudanças de linha e JSON falso.
 */
const ACEITAVEL = /^[A-Za-z0-9._-]{8,128}$/;

/** Um endereço já tem idioma quando começa por `/es-ES`, `/pt-BR` ou `/en`. */
function temIdioma(caminho: string): boolean {
  return IDIOMAS.some((i) => caminho === `/${i}` || caminho.startsWith(`/${i}/`));
}

export function proxy(pedido: NextRequest) {
  const caminho = pedido.nextUrl.pathname;

  // Endereço sem idioma: negoceia-se pelo `Accept-Language` e redirecciona-se.
  // As rotas de API ficam de fora — uma sonda de saúde não fala línguas, e um
  // 307 numa sonda faria o orquestrador ler "vivo" onde só houve um desvio.
  // A carta pública leva o idioma no SEGUNDO segmento (`/r/<slug>/<idioma>/menu`),
  // que é o endereço que o atlas desenha e o que vai impresso num QR. Um QR é
  // papel colado numa mesa: `/es-ES/r/marina/es-ES/menu` repete o idioma e é mais
  // longo para o mesmo destino, e mudar um endereço impresso custa reimprimir.
  const cartaPublica = caminho === '/r' || caminho.startsWith('/r/');

  // Os ficheiros da raiz também não levam idioma, e o `robots.txt` é o caso que
  // obriga: o protocolo manda lê-lo em `/robots.txt` e mais lado nenhum, por
  // isso um 307 para `/es-ES/robots.txt` não o move de sítio — apaga-o. Estava
  // a acontecer, e só apareceu quando o ficheiro passou a existir.
  const ficheiroDaRaiz = (FICHEIROS_NA_RAIZ as readonly string[]).includes(caminho);

  if (!caminho.startsWith('/api/') && !cartaPublica && !ficheiroDaRaiz && !temIdioma(caminho)) {
    const idioma = resolverIdioma(pedido.headers.get('accept-language'));
    const destino = new URL(`/${idioma}${caminho === '/' ? '' : caminho}`, pedido.url);
    destino.search = pedido.nextUrl.search;
    return NextResponse.redirect(destino);
  }

  const recebido = pedido.headers.get(CABECALHO_REQUEST_ID);
  const requestId = recebido && ACEITAVEL.test(recebido) ? recebido : crypto.randomUUID();

  const cabecalhos = new Headers(pedido.headers);
  cabecalhos.set(CABECALHO_REQUEST_ID, requestId);

  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  // Devolvido ao cliente: sem isto, quem reporta um erro não tem o que citar.
  resposta.headers.set(CABECALHO_REQUEST_ID, requestId);
  return resposta;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

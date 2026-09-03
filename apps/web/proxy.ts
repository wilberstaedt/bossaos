import { NextResponse, type NextRequest } from 'next/server';

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

export function proxy(pedido: NextRequest) {
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

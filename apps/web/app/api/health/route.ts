import { NextResponse } from 'next/server';
import { CABECALHO_REQUEST_ID } from '../../../proxy.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vivacidade: este processo está a responder?
 *
 * NÃO toca na base de dados, e é essa a diferença para `/ready`. Confundir as
 * duas é o erro clássico: um health que consulta a base faz o orquestrador
 * reiniciar a aplicação quando quem está em baixo é o Postgres — e reiniciar
 * não cura uma base em baixo, só apaga o processo que sabia reportá-lo.
 */
export function GET(pedido: Request) {
  const requestId = pedido.headers.get(CABECALHO_REQUEST_ID) ?? undefined;
  return NextResponse.json(
    { estado: 'vivo', ts: new Date().toISOString(), ...(requestId ? { request_id: requestId } : {}) },
    { status: 200, headers: { 'cache-control': 'no-store' } },
  );
}

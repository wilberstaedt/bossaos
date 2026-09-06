import { NextResponse } from 'next/server';
import { entregar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Envia uma entrega da fila, **seguindo os redireccionamentos à mão**.
 *
 * O `entregar` do motor usa `redirect: 'manual'` e revalida o destino a cada
 * salto. É a outra metade da protecção: um endereço público que responde `302`
 * para `169.254.169.254` levaria o nosso servidor lá se seguíssemos redirecções
 * automaticamente — e quem escreveu o endereço nem precisava de controlar o
 * destino, só de o apontar a um redireccionador.
 */
export async function POST(
  pedido: Request, ctx: { params: Promise<{ orgSlug: string; endpointId: string }> },
) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as { entregaId?: string } | null;
  if (!corpo?.entregaId) return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });

  const feita = await comEscopoDoPedido(sessao, (db) => entregar(db, corpo.entregaId as string));
  return NextResponse.json(
    { estado: feita.estado, tentativas: feita.tentativas }, { status: 200 });
}

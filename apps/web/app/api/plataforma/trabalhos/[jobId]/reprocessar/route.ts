import { NextResponse } from 'next/server';
import { comIdentidade, obterPrisma, reprocessarTrabalho } from '@bossaos/db';
import { actorDoPedido } from '../../../../../../src/sessao.ts';
import { obterEnv } from '../../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reprocessa um trabalho — **e não duplica**.
 *
 * O `reprocessarTrabalho` cria a **tentativa seguinte**, com identidade própria
 * e restrição única na base. Carregar duas vezes no botão não produz dois
 * efeitos: a segunda vez pede a mesma tentativa e recebe o mesmo trabalho.
 *
 * É o que faz este botão poder existir sem medo — e quem carrega é sempre quem
 * não sabe se a primeira passou.
 */
export async function POST(
  pedido: Request, ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;
  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 });

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  await comIdentidade(prisma, actor.id,
    (db) => reprocessarTrabalho(db as never, jobId));

  return NextResponse.redirect(new URL(pedido.headers.get('referer') ?? '/', pedido.url), 303);
}

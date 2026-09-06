import { NextResponse } from 'next/server';
import {
  RecusaDePlataforma, comIdentidade, obterPrisma, terminarSessaoDeSuporte,
} from '@bossaos/db';
import { actorDoPedido } from '../../../../../../src/sessao.ts';
import { obterEnv } from '../../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fecha uma sessão de suporte à mão.
 *
 * ── E isto NÃO é a garantia ───────────────────────────────────────────────
 *
 * A garantia é a expiração. Esta rota é a conveniência de sair mais cedo — e a
 * diferença entre as duas é a razão pela qual `expira_em` é `NOT NULL`.
 *
 * Se esta rota não existisse, nada mudava na segurança do produto: a sessão
 * expirava na mesma. Se a expiração não existisse, esta rota seria a única
 * saída — e uma saída que depende de alguém se lembrar é permanente na prática.
 */
export async function POST(
  pedido: Request, ctx: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await ctx.params;
  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 });

  const dados = await pedido.formData().catch(() => null);
  const motivo = String(dados?.get('motivo') ?? '').trim();
  if (motivo === '') {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  try {
    // A pessoa, e nunca o papel. É o `actor.email` que vai para o rasto, e o
    // gatilho da base recusa qualquer coisa que pareça um papel.
    await comIdentidade(prisma, actor.id, (db) =>
      terminarSessaoDeSuporte(db as never, sessionId, motivo, actor.email));
  } catch (erro) {
    if (erro instanceof RecusaDePlataforma) {
      // Já estava fechada, ou expirou. Não é erro de quem carregou.
      return NextResponse.redirect(
        new URL(pedido.headers.get('referer') ?? '/', pedido.url), 303);
    }
    throw erro;
  }

  return NextResponse.redirect(new URL(pedido.headers.get('referer') ?? '/', pedido.url), 303);
}

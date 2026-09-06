import { NextResponse } from 'next/server';
import { registar, revogarChave } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Revoga uma chave. **No mesmo segundo.**
 *
 * Não há cache a invalidar porque não há cache: a `verificarChave` vai à base
 * todas as vezes, e a porta estreita que resolve o inquilino já não responde por
 * chaves revogadas. Custa uma consulta por pedido, e é o preço certo — o caso em
 * que se revoga é alguém ter levado a chave.
 *
 * Responde por redirecção porque quem chama é um formulário na INT-008.
 */
export async function POST(
  pedido: Request, ctx: { params: Promise<{ orgSlug: string; chaveId: string }> },
) {
  const { orgSlug, chaveId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  await comEscopoDoPedido(sessao, async (db) => {
    await revogarChave(db, chaveId, sessao.actor.email);
    await registar(db, sessao.contexto.organizationId, {
      accao: 'chave.revogada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'api_key', alvoId: chaveId, detalhe: {},
    });
  });

  return NextResponse.redirect(new URL(pedido.headers.get('referer') ?? '/', pedido.url), 303);
}

import { NextResponse } from 'next/server';
import { abrirPedidoDeAjuda } from '@bossaos/db';
import { corpoDaResposta, estadoHttp } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Abrir um pedido de ajuda.
 *
 * ── Sem `exigirAccao`, e é deliberado ─────────────────────────────────────
 *
 * Qualquer pessoa com sessão na casa pode pedir ajuda. Pôr isto atrás de uma
 * permissão de gestão significaria que quem está ao balcão às onze da noite, com
 * o problema à frente, não consegue reportá-lo — e teria de esperar por quem
 * tem a permissão, que é quem está a dormir.
 *
 * É a mesma família da fronteira 6: **pedir ajuda não é conveniência.**
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }

  const dados = await pedido.formData().catch(() => null);
  const assunto = String(dados?.get('assunto') ?? '').trim();
  const corpo = String(dados?.get('corpo') ?? '').trim();
  if (assunto === '' || corpo === '') {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  await comEscopoDoPedido(sessao, (db) => abrirPedidoDeAjuda(
    db, sessao.contexto.organizationId,
    { assunto, corpo, abertoPor: sessao.actor.email }));

  return NextResponse.redirect(
    new URL(`/es-ES/app/${orgSlug}/ajuda/meus`, pedido.url), 303);
}

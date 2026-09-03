import { NextResponse } from 'next/server';
import { ligarAoProduto, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-014 · as fotos deste produto.
 *
 * `ligarAoProduto` baixa as outras antes de subir a escolhida. Não é
 * conveniência: com o índice parcial `media_principal_unica`, subir esta com
 * outra ainda a `true` violaria a restrição — e a violação chegava ao ecrã como
 * um erro de base, que não ajuda ninguém.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; productId: string }> },
) {
  const { orgSlug, productId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const principal = texto(dados, 'principal');
  const juntar = texto(dados, 'juntar');

  await comEscopoDoPedido(sessao, async (db) => {
    if (juntar) {
      await ligarAoProduto(db, sessao.contexto.organizationId, productId, juntar, false);
    }
    if (principal) {
      await ligarAoProduto(db, sessao.contexto.organizationId, productId, principal, true);
    }
    await registar(db, sessao.contexto.organizationId, {
      accao: 'produto.fotos.guardadas', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'product', alvoId: productId,
      detalhe: { juntou: juntar ?? null, principal: principal ?? null },
    });
  });

  return voltarPara(
    `/${idioma}/app/${orgSlug}/catalogo/produtos/${productId}/fotos`, { guardado: '1' },
  );
}

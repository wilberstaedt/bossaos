import { NextResponse } from 'next/server';
import { registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-011 · gravar variantes.
 *
 * `predefinida` é um rádio: chega **uma** ou nenhuma. Limpar todas antes de
 * marcar a escolhida é o que garante que não ficam duas — e duas predefinidas
 * fariam o TPV escolher a que a base devolvesse primeiro, que é a mesma família
 * de defeito que o empate de preços.
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
  const predefinida = texto(dados, 'predefinida');
  const nova = texto(dados, 'nova');

  await comEscopoDoPedido(sessao, async (db) => {
    const existentes = await db.productVariant.findMany({
      where: { productId, archivedAt: null }, select: { id: true },
    });

    for (const v of existentes) {
      const nome = texto(dados, `nome:${v.id}`);
      const ordem = Number(texto(dados, `ordem:${v.id}`));
      await db.productVariant.updateMany({
        where: { id: v.id },
        data: {
          ...(nome ? { nome } : {}),
          ...(Number.isInteger(ordem) ? { ordem } : {}),
          // Todas a falso primeiro; a escolhida sobe a seguir.
          predefinida: false,
        },
      });
    }
    if (predefinida) {
      await db.productVariant.updateMany({ where: { id: predefinida }, data: { predefinida: true } });
    }
    if (nova) {
      const ordem = Number(texto(dados, 'novaOrdem'));
      await db.productVariant.create({
        data: {
          organizationId: sessao.contexto.organizationId, productId, nome: nova,
          ordem: Number.isInteger(ordem) ? ordem : existentes.length + 1,
        },
      });
    }
    await registar(db, sessao.contexto.organizationId, {
      accao: 'produto.variantes.guardadas', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'product', alvoId: productId,
      detalhe: { existentes: existentes.length, nova: nova ?? null, predefinida: predefinida ?? null },
    });
  });

  return voltarPara(
    `/${idioma}/app/${orgSlug}/catalogo/produtos/${productId}/variantes`, { guardado: '1' },
  );
}

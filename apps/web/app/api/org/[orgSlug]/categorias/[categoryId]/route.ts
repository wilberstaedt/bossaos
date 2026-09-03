import { NextResponse } from 'next/server';
import { registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-006 · guardar categoria.
 *
 * `visivel: false` esconde da carta **sem apagar** — e sem tocar nos produtos.
 * Uma categoria sazonal volta com as fichas de alérgenos intactas; apagada,
 * voltaria vazia, e alguém teria de as declarar de memória.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; categoryId: string }> },
) {
  const { orgSlug, categoryId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const destino = `/${idioma}/app/${orgSlug}/catalogo/categorias/${categoryId}`;
  const versao = Number(texto(dados, 'versao'));
  if (!Number.isInteger(versao)) return voltarPara(destino, { erro: 'versao' });

  const nome = texto(dados, 'nome');
  const ordem = Number(texto(dados, 'ordem'));

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const afectadas = await db.category.updateMany({
      where: { id: categoryId, version: versao },
      data: {
        ...(nome ? { nome } : {}),
        descricao: texto(dados, 'descricao') ?? null,
        ...(Number.isInteger(ordem) && ordem > 0 ? { ordem } : {}),
        visivel: texto(dados, 'visivel') === '1',
        version: { increment: 1 },
      },
    });
    if (afectadas.count === 0) {
      const existe = await db.category.findFirst({ where: { id: categoryId }, select: { id: true } });
      return { ok: false as const, erro: existe ? 'conflito_de_versao' : 'nao_encontrado' };
    }
    await registar(db, sessao.contexto.organizationId, {
      accao: 'categoria.guardada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'category', alvoId: categoryId, detalhe: { versao },
    });
    return { ok: true as const };
  });

  if (!r.ok) return voltarPara(destino, { erro: r.erro });
  return voltarPara(destino, { guardado: '1' });
}

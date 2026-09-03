import { NextResponse } from 'next/server';
import { registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** CAT-005 · criar categoria. A ordem é a última, não a primeira. */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const lista = `/${idioma}/app/${orgSlug}/catalogo/categorias`;
  const nome = texto(dados, 'nome');
  const brandId = texto(dados, 'brandId');
  if (!nome || !brandId) return voltarPara(lista, { erro: 'campos' });

  const id = await comEscopoDoPedido(sessao, async (db) => {
    // No fim da carta, não no princípio. Uma categoria nova que aparecesse
    // primeiro reordenava a carta de quem a criou sem lho pedir.
    const quantas = await db.category.count({ where: { archivedAt: null } });
    const categoria = await db.category.create({
      data: {
        organizationId: sessao.contexto.organizationId, brandId, nome, ordem: quantas + 1,
      },
      select: { id: true },
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'categoria.criada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'category', alvoId: categoria.id, detalhe: { nome },
    });
    return categoria.id;
  });

  return voltarPara(`${lista}/${id}`, { guardado: '1' });
}

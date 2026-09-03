import { NextResponse } from 'next/server';
import { registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-002 · criar menu.
 *
 * Nasce em RASCUNHO e **sem período**, que é "todo o ano". Não nasce ACTIVO:
 * um menu criado a meio de um serviço não deve aparecer na carta antes de
 * alguém lhe pôr secções.
 */
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
  const lista = `/${idioma}/app/${orgSlug}/catalogo/menus`;
  const nome = texto(dados, 'nome');
  const brandId = texto(dados, 'brandId');
  if (!nome || !brandId) return voltarPara(lista, { erro: 'campos' });

  const id = await comEscopoDoPedido(sessao, async (db) => {
    const menu = await db.menu.create({
      data: { organizationId: sessao.contexto.organizationId, brandId, nome },
      select: { id: true },
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'menu.criado', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'menu', alvoId: menu.id, detalhe: { nome },
    });
    return menu.id;
  });

  return voltarPara(`${lista}/${id}`, { guardado: '1' });
}

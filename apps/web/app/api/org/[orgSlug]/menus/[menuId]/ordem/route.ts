import { NextResponse } from 'next/server';
import { registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** CAT-004 · a ordem das secções, e juntar categorias ao menu. */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; menuId: string }> },
) {
  const { orgSlug, menuId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const juntar = dados.getAll('juntar').filter((x): x is string => typeof x === 'string');

  await comEscopoDoPedido(sessao, async (db) => {
    const seccoes = await db.menuCategory.findMany({ where: { menuId }, select: { id: true } });
    for (const s of seccoes) {
      const ordem = Number(texto(dados, `ordem:${s.id}`));
      // Uma ordem ilegível deixa a linha como está. Escrever 0 ou NaN mandava a
      // secção para o topo da carta sem ninguém o ter pedido.
      if (Number.isInteger(ordem) && ordem > 0) {
        await db.menuCategory.updateMany({ where: { id: s.id }, data: { ordem } });
      }
    }
    for (const categoryId of juntar) {
      const ja = await db.menuCategory.findFirst({ where: { menuId, categoryId }, select: { id: true } });
      if (ja) continue;
      await db.menuCategory.create({
        data: {
          organizationId: sessao.contexto.organizationId, menuId, categoryId,
          ordem: seccoes.length + 1,
        },
      });
    }
    await registar(db, sessao.contexto.organizationId, {
      accao: 'menu.ordem.guardada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'menu', alvoId: menuId, detalhe: { seccoes: seccoes.length, juntadas: juntar.length },
    });
  });

  return voltarPara(`/${idioma}/app/${orgSlug}/catalogo/menus/${menuId}/ordem`, { guardado: '1' });
}

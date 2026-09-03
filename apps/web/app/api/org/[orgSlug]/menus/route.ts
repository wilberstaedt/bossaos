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

  // ONB-006 manda as categorias que entram. **Um menu nasce com secções**, e
  // essa é a diferença entre um passo cumprido e um que parece cumprido: um menu
  // vazio existe na lista, faz o item do arranque ficar verde, e não pode ser
  // publicado — e a pessoa só descobre isso três ecrãs depois.
  const juntar = dados.getAll('juntar').filter((x): x is string => typeof x === 'string');
  const noArranque = texto(dados, 'arranque') === '1';

  const id = await comEscopoDoPedido(sessao, async (db) => {
    const menu = await db.menu.create({
      data: { organizationId: sessao.contexto.organizationId, brandId, nome },
      select: { id: true },
    });
    for (const [i, categoryId] of juntar.entries()) {
      await db.menuCategory.create({
        data: {
          organizationId: sessao.contexto.organizationId,
          menuId: menu.id, categoryId, ordem: i + 1,
        },
      });
    }
    await registar(db, sessao.contexto.organizationId, {
      accao: 'menu.criado', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'menu', alvoId: menu.id, detalhe: { nome, seccoes: juntar.length },
    });
    return menu.id;
  });

  // No arranque segue-se em frente; fora dele abre-se o menu para o editar.
  if (noArranque) return voltarPara(`/${idioma}/onboarding/pronto`, { org: orgSlug });
  return voltarPara(`${lista}/${id}`, { guardado: '1' });
}

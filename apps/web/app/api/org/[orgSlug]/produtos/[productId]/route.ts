import { NextResponse } from 'next/server';
import { guardarProduto, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { texto, textoOuNulo, voltarPara } from '../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-009 · guardar a ficha, com concorrência optimista.
 *
 * A versão vem do formulário porque é a versão que aquele ecrã **leu**. O
 * `UPDATE` leva `WHERE id = ? AND version = ?`: se alguém gravou entretanto, não
 * afecta nenhuma linha, e a resposta distingue os dois casos —
 *
 *   nada afectado + a linha não existe   → ausência
 *   nada afectado + a linha existe       → **conflito**, e volta ao ecrã a dizê-lo
 *
 * Sem a distinção, quem chega tarde vê "não encontrado" para um produto que está
 * à frente dele, e volta a gravar por cima.
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
  const versao = Number(texto(dados, 'versao'));
  const destino = `/${idioma}/app/${orgSlug}/catalogo/produtos/${productId}`;
  if (!Number.isInteger(versao)) return voltarPara(destino, { erro: 'versao' });

  const estadoEscrito = texto(dados, 'estado');
  const r = await comEscopoDoPedido(sessao, async (db) => {
    const resultado = await guardarProduto(db, productId, versao, {
      ...(texto(dados, 'nome') ? { nome: texto(dados, 'nome') as string } : {}),
      descricao: textoOuNulo(dados, 'descricao') ?? null,
      sku: textoOuNulo(dados, 'sku') ?? null,
      categoryId: textoOuNulo(dados, 'categoryId') ?? null,
      ...(estadoEscrito === 'RASCUNHO' || estadoEscrito === 'ACTIVO' || estadoEscrito === 'ARQUIVADO'
        ? { estado: estadoEscrito } : {}),
    });
    if (resultado.ok) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'produto.guardado', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'product', alvoId: productId, detalhe: { versao },
      });
    }
    return resultado;
  });

  if (!r.ok) return voltarPara(destino, { erro: r.erro });
  return voltarPara(destino, { guardado: '1' });
}

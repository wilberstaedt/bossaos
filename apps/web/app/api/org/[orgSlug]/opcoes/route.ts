import { NextResponse } from 'next/server';
import { guardarGrupo, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-018 · criar grupo de opções.
 *
 * Exige **uma opção** de entrada, e é de propósito: um grupo vazio não pode ser
 * satisfeito por ninguém. Se além disso fosse obrigatório, tornava o produto
 * impossível de pedir — e nada no ecrã diria porquê. Por isso nasce opcional e
 * com mínimo zero, e é `validarGrupo` quem confirma a forma antes de escrever.
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
  const lista = `/${idioma}/app/${orgSlug}/catalogo/opcoes`;
  const nome = texto(dados, 'nome');
  const brandId = texto(dados, 'brandId');
  const opcao = texto(dados, 'opcao');
  if (!nome || !brandId || !opcao) return voltarPara(lista, { erro: 'campos' });

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const criado = await guardarGrupo(db, sessao.contexto.organizationId, {
      id: 'novo', nome, brandId,
      obrigatorio: false, minimo: 0,
      opcoes: [{ id: 'nova', nome: opcao }],
    });
    if (criado.ok) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'grupo.criado', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'modifier_group', alvoId: criado.id, detalhe: { nome },
      });
    }
    return criado;
  });

  if (!r.ok) return voltarPara(lista, { erro: r.detalhe });
  return voltarPara(`${lista}/${r.id}`, { guardado: '1' });
}

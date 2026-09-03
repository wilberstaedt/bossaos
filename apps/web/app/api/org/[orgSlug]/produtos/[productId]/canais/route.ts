import { NextResponse } from 'next/server';
import { CANAIS, estadoComercial, podeCapacidade, registar, type Canal } from '@bossaos/db';
import { type Capacidade, corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** O mesmo mapa do CAT-016 — e a razão de estar nos dois sítios é esta rota. */
const CAPACIDADE_DO_CANAL: Partial<Record<Canal, Capacidade>> = {
  CARTA: 'carta.digital', SITE: 'site.restaurante', SALA: 'sala', TPV: 'tpv', KIOSK: 'kiosk',
};

/**
 * CAT-016 · onde o produto se vende.
 *
 * **A verificação de plano está aqui, e não no ecrã.** O `disabled` do CAT-016 é
 * cortesia: quem mandar `canal=KIOSK` com `curl` chega a este ficheiro, e é aqui
 * que o canal sem plano é ignorado. Um botão escondido nunca foi uma protecção.
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
  const pedidos = new Set(
    dados.getAll('canal').filter((x): x is string => typeof x === 'string'),
  );

  const recusados = await comEscopoDoPedido(sessao, async (db) => {
    const comercial = await estadoComercial(db, sessao.contexto.organizationId);
    const fora: string[] = [];

    for (const canal of CANAIS) {
      const capacidade = CAPACIDADE_DO_CANAL[canal];
      const permitido = capacidade
        ? podeCapacidade(comercial, { capacidade, intencao: 'usar' }).permitido
        : true;
      // Sem plano, o canal fica invisível **independentemente do que o corpo
      // pediu**. Não é um erro que interrompe: os outros canais gravam-se.
      const visivel = permitido && pedidos.has(canal);
      if (!permitido && pedidos.has(canal)) fora.push(canal);

      const existente = await db.productChannel.findFirst({
        where: { productId, canal }, select: { id: true },
      });
      if (existente) {
        await db.productChannel.update({ where: { id: existente.id }, data: { visivel } });
      } else if (visivel) {
        await db.productChannel.create({
          data: { organizationId: sessao.contexto.organizationId, productId, canal, visivel },
        });
      }
    }

    await registar(db, sessao.contexto.organizationId, {
      accao: 'produto.canais.guardados', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'product', alvoId: productId,
      detalhe: { pedidos: [...pedidos], recusadosPorPlano: fora },
    });
    return fora;
  });

  return voltarPara(
    `/${idioma}/app/${orgSlug}/catalogo/produtos/${productId}/canais`,
    recusados.length > 0 ? { guardado: '1', semPlano: recusados.join(',') } : { guardado: '1' },
  );
}

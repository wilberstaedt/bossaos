import { NextResponse } from 'next/server';
import { guardarPoliticaDeRetencao, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A retenção — e o vazio continua a ser vazio.
 *
 * ── Porque é que um campo em branco não vira zero nem um valor por omissão ─
 *
 * `null` é «não decidido». Se esta rota escrevesse um número por omissão,
 * estaria a decidir por quem tem de decidir — e a decisão de quanto tempo se
 * guardam dados de clientes depende de conselho jurídico que este projecto não
 * tem.
 *
 * É a mesma distinção do E30 entre ausência e zero, com consequência legal.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  // **Sem verificação de plano.** Privacidade não fica atrás do plano, e a
  // ausência de portão aqui é a garantia.
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData().catch(() => null);
  const dias = (campo: string): number | null => {
    const cru = String(dados?.get(campo) ?? '').trim();
    if (cru === '') return null;              // vazio é «não decidido»
    const n = Number(cru);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  await comEscopoDoPedido(sessao, async (db) => {
    await guardarPoliticaDeRetencao(db, sessao.contexto.organizationId, {
      diasPedidos: dias('diasPedidos'),
      diasClientes: dias('diasClientes'),
      diasAuditoria: dias('diasAuditoria'),
      actualizadaPor: sessao.actor.email,
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'retencao.politica.guardada', actorId: sessao.actor.id,
      actorEmail: sessao.actor.email, alvoTipo: 'retention_policy', detalhe: {},
    });
  });

  return NextResponse.redirect(new URL(pedido.headers.get('referer') ?? '/', pedido.url), 303);
}

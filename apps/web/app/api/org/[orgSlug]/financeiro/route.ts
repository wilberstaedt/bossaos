import { NextResponse } from 'next/server';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { resolverPedido } from '../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "Host não lê financeiro" — aceite 2 do E04.
 *
 * A acção não depende de nenhum recurso concreto, por isso decide-se **antes de
 * consultar**: um `HOST` a pedir isto nem chega à base. Não é optimização — é o
 * que impede o tempo de resposta de dizer se há dados lá dentro.
 */
export async function GET(_pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), {
      status: estadoHttp(sessao.resultado),
    });
  }

  const recusa = exigirAccao(sessao.concessoes, 'financeiro.ler');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  // Não há números de facturação nesta etapa, e inventá-los seria preencher um
  // painel com dados falsos — o que o E02 proíbe em voz alta. O que esta rota
  // entrega é a DECISÃO, que é o que o E04 tem de provar.
  return NextResponse.json({ ok: true, seccao: 'financeiro', linhas: [] });
}

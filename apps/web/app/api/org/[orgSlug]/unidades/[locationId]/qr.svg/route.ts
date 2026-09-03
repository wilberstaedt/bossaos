import { NextResponse } from 'next/server';
import { codificar, corpoDaResposta, estadoHttp, exigirAccao, paraSvg } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { obterEnv } from '../../../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * QR-004 · o SVG para imprimir.
 *
 * Nível **Q** e não M: um código colado numa mesa apanha gordura, riscos e luz
 * de lado. O que sobra de margem de erro paga-se sozinho na primeira semana.
 *
 * Vai como **anexo**: um SVG servido em linha no nosso domínio é uma superfície
 * que não precisamos de ter — e é a mesma regra que o E08 aplica aos ficheiros
 * de terceiros, agora a um que somos nós a gerar.
 */
export async function GET(
  _pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; locationId: string }> },
) {
  const { orgSlug, locationId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.ler');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const unidade = await comEscopoDoPedido(sessao, (db) =>
    db.location.findFirst({ where: { id: locationId }, select: { publicSlug: true } }));
  // Sem endereço não há QR — e não se inventa um provisório: um código impresso
  // que aponta para um endereço que vai mudar é papel para deitar fora.
  if (!unidade?.publicSlug) {
    return NextResponse.json({ erro: 'sem_endereco_publico' }, { status: 409 });
  }

  const base = obterEnv().BETTER_AUTH_URL.replace(/\/$/, '');
  const svg = paraSvg(codificar(`${base}/r/${unidade.publicSlug}/es-ES/menu?de=qr`, 'Q'), {
    tamanho: 1024,
  });

  return new NextResponse(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'content-disposition': `attachment; filename="qr-${unidade.publicSlug}.svg"`,
      'cache-control': 'no-store, private',
    },
  });
}

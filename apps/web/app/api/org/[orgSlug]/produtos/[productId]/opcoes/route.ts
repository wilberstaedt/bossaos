import { NextResponse } from 'next/server';
import { validarEscolhasDoProduto } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-012 · validar escolhas de modificadores — **por chamada directa**.
 *
 * ── É esta rota que o aceite 2 do E07 mede ─────────────────────────────────
 *
 * > *"modificadores obrigatórios/opcionais e limites min/max validados também
 * > por chamada direta da API"*
 *
 * Aceita JSON e não `FormData` de propósito: quem lhe chama é um TPV, um quiosque
 * ou um `curl` — não um formulário. E os limites **não vêm no corpo**. O corpo
 * traz só as escolhas; o mínimo, o máximo e o "obrigatório" são lidos da base
 * dentro de `validarEscolhasDoProduto`.
 *
 * Se os limites viessem do cliente, esta rota validaria o pedido contra as regras
 * do próprio pedido — que é o mesmo que não validar nada. É a razão de a função
 * do domínio não ter sequer um parâmetro por onde os limites entrassem.
 *
 * Devolve **todos** os problemas, não o primeiro: quem está a montar um pedido
 * num quiosque não quer descobrir três erros em três viagens.
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
  // Validar escolhas é operar a carta, não editá-la: quem tira pedidos tem
  // `catalogo.ler` e mais nada, e é quem mais chama isto.
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.ler');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  let corpo: unknown;
  try {
    corpo = await pedido.json();
  } catch {
    return NextResponse.json({ erro: 'corpo_invalido' }, { status: 400 });
  }

  const escolhas = new Map<string, readonly string[]>();
  const bruto = (corpo as { escolhas?: unknown })?.escolhas;
  if (bruto && typeof bruto === 'object') {
    for (const [grupo, opcoes] of Object.entries(bruto as Record<string, unknown>)) {
      if (!Array.isArray(opcoes)) continue;
      escolhas.set(grupo, opcoes.filter((x): x is string => typeof x === 'string'));
    }
  }

  const problemas = await comEscopoDoPedido(sessao, (db) =>
    validarEscolhasDoProduto(db, productId, escolhas),
  );

  // 422 e não 400: o corpo é bem formado, o pedido é que não satisfaz os grupos.
  return NextResponse.json(
    { valido: problemas.length === 0, problemas },
    { status: problemas.length === 0 ? 200 : 422 },
  );
}

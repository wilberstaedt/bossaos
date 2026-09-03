import { NextResponse } from 'next/server';
import { obterMarca } from '@bossaos/db';
import { corpoDaResposta, decidirLeitura, estadoHttp } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A rota que o par (1)/(2) mede.
 *
 *   1. o identificador de B, com sessão de A → **ausência**
 *   2. o **mesmo** identificador, com sessão de B → **200**
 *
 * Só (1) passaria num sistema em que tudo devolve ausência. A prova é a
 * diferença entre os dois — a mesma armadilha do caso 3 da prova de isolamento.
 *
 * O escopo entra na CONSULTA (é a política de linha, dentro de `comEscopo`), e
 * não num `if` a seguir. Por isso a marca de B não chega aqui como "encontrada e
 * proibida": chega como `null`, indistinguível de não existir.
 */
export async function GET(
  _pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const { orgSlug, id } = await ctx.params;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), {
      status: estadoHttp(sessao.resultado),
    });
  }

  const marca = await comEscopoDoPedido(sessao, (db) => obterMarca(db, id));

  const r = decidirLeitura({
    encontrado: marca,
    concessoes: sessao.concessoes,
    accao: 'catalogo.ler',
    escopoDoRecurso: (m) => ({ brandId: m.id }),
  });

  if (r.tipo !== 'ok') {
    return NextResponse.json(corpoDaResposta(r), { status: estadoHttp(r) });
  }
  return NextResponse.json({ id: r.valor.id, nome: r.valor.nome, slug: r.valor.slug });
}

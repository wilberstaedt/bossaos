import { NextResponse } from 'next/server';
import {
  catalogoDePlanos, contarPessoas, contarUnidades, estadoComercial,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * O plano, o consumo e o catálogo (ORG-010 e ORG-013).
 *
 * O consumo é **contado**, não estimado: unidades e pessoas saem de `count()`
 * com escopo de inquilino. O E02 proíbe encher painéis com números inventados,
 * e um "8 activas" que não venha da base é exactamente isso.
 *
 * As quotas saem das concessões. Onde não há concessão não há número — e a
 * interface tem de mostrar "por contratar", não um infinito.
 */
export async function GET(_p: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'relatorios.ler');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const estado = await estadoComercial(db, sessao.contexto.organizationId);
    return {
      plano: { codigo: estado.planoCodigo, nome: estado.planoNome, estado: estado.estadoSubscricao },
      catalogo: await catalogoDePlanos(db),
      uso: { unidades: await contarUnidades(db), pessoas: await contarPessoas(db) },
      quotas: Object.fromEntries(
        estado.concessoes
          .filter((c) => c.quota !== null)
          .map((c) => [c.capacidade, c.quota]),
      ),
      capacidades: [...new Set(estado.concessoes.map((c) => c.capacidade))].sort(),
    };
  });

  return NextResponse.json(dados);
}

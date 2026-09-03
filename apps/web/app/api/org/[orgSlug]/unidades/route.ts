import { NextResponse } from 'next/server';
import {
  contarUnidades, criarUnidade, estadoComercial, listarUnidades, podeCapacidade, registar,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, estadoHttpDeCapacidade, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_p: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  return NextResponse.json({ unidades });
}

/**
 * Criar uma unidade — onde a quota morde.
 *
 * **Três verificações, e são independentes** (CT-02). A ordem não é
 * intercambiável e cada uma responde a uma pergunta diferente:
 *
 *   1. autorização — esta PESSOA pode? (403)
 *   2. plano       — esta ORGANIZAÇÃO comprou? (402)
 *   3. contar e criar
 *
 * A autorização primeiro porque é a mais barata e não precisa de contar nada.
 * E os dois "não" saem com códigos diferentes de propósito: um 403 a quem paga
 * mandava-o pedir permissões a si próprio; um 402 a quem não tem o papel
 * mandava-o comprar o que já tem.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }

  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as {
    brandId?: string; nome?: string; slug?: string; moeda?: string; fuso?: string;
  } | null;
  if (!corpo?.brandId || !corpo?.nome || !corpo?.slug || !corpo?.moeda || !corpo?.fuso) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const estado = await estadoComercial(db, sessao.contexto.organizationId);
    // Contar ANTES de criar. Passar zero por omissão faria a quota nunca
    // esgotar — que é a forma silenciosa de este portão não existir.
    const uso = await contarUnidades(db);

    const plano = podeCapacidade(estado, { capacidade: 'unidades', intencao: 'criar', usoActual: uso });
    if (!plano.permitido) return { tipo: 'plano' as const, plano };

    const unidade = await criarUnidade(db, sessao.contexto.organizationId, {
      brandId: corpo.brandId as string,
      nome: corpo.nome as string,
      slug: corpo.slug as string,
      moeda: corpo.moeda as string,
      fuso: corpo.fuso as string,
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'unidade.criada',
      actorId: sessao.actor.id,
      actorEmail: sessao.actor.email,
      alvoTipo: 'location',
      alvoId: unidade.id,
      detalhe: { nome: corpo.nome, quotaNoMomento: uso },
    });
    return { tipo: 'ok' as const, unidade };
  });

  if (r.tipo === 'plano') {
    return NextResponse.json(
      { erro: r.plano.permitido ? 'ok' : r.plano.motivo, capacidade: 'unidades' },
      { status: estadoHttpDeCapacidade(r.plano) },
    );
  }
  return NextResponse.json({ id: r.unidade.id, nome: r.unidade.nome }, { status: 201 });
}

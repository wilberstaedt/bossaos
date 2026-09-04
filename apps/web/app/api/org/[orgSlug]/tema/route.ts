import { NextResponse } from 'next/server';
import { estadoComercial, guardarTema, registar, temaActivo } from '@bossaos/db';
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
  const { tema, estado } = await comEscopoDoPedido(sessao, async (db) => ({
    tema: await temaActivo(db, sessao.contexto.organizationId),
    estado: await estadoComercial(db, sessao.contexto.organizationId),
  }));
  const podeEditar = estado.concessoes.some((c) => c.capacidade === 'tema.coresProprias');
  return NextResponse.json({ tema, podeEditar, plano: estado.planoCodigo });
}

/**
 * Gravar cores próprias (THEME-001).
 *
 * Critério de aceite 1: *"tentativa direta de alterar tema Starter (…) retorna
 * negação coerente **e não altera dados**"*. A rota chama `guardarTema`, que
 * verifica o plano antes de tocar na base — a verificação não está aqui, está
 * no serviço, para a próxima rota não nascer aberta.
 */
export async function PUT(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.publicar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as {
    primaria?: string; acento?: string; fundo?: string;
  } | null;
  if (!corpo) return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const estado = await estadoComercial(db, sessao.contexto.organizationId);
    const gravado = await guardarTema(db, sessao.contexto.organizationId, estado, {
      ...(corpo.primaria ? { primaria: corpo.primaria } : {}),
      ...(corpo.acento ? { acento: corpo.acento } : {}),
      ...(corpo.fundo ? { fundo: corpo.fundo } : {}),
    }, sessao.actor.email);
    if (gravado.ok) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'tema.publicado',
        actorId: sessao.actor.id,
        actorEmail: sessao.actor.email,
        alvoTipo: 'theme_revision',
        alvoId: gravado.revisaoId,
        detalhe: { ...corpo },
      });
    }
    return gravado;
  });

  if (r.ok) return NextResponse.json({ ok: true, revisaoId: r.revisaoId });

  if (r.motivo === 'plano') {
    return NextResponse.json(
      { erro: r.capacidade.permitido ? 'ok' : r.capacidade.motivo, capacidade: 'tema.coresProprias' },
      { status: estadoHttpDeCapacidade(r.capacidade) },
    );
  }
  // Contraste: 422. O pedido é legítimo e o plano permite — o que não serve são
  // as cores. Dizer 402 aqui mandava alguém comprar um plano para resolver um
  // problema de legibilidade.
  return NextResponse.json(
    { erro: 'contraste', reprovacoes: r.validacao.reprovacoes },
    { status: 422 },
  );
}

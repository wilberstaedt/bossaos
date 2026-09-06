import { NextResponse } from 'next/server';
import { RecusaDaIntegracao, criarEndpoint, enfileirarEntrega, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cria um destino de webhook — **e valida o endereço antes de guardar**.
 *
 * Guardar um destino interno e só verificar no envio era deixar a arma
 * carregada: bastava alguém, um dia, escrever um caminho de envio que não
 * revalidasse.
 *
 * ── O segredo entra e não fica ────────────────────────────────────────────
 *
 * Quem cria o destino escolhe o segredo com que assinamos o que lhe enviamos, e
 * o que guardamos é o resumo. Ele não é devolvido nesta resposta nem em
 * listagem nenhuma — quem o perdeu cria outro destino.
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
    url?: string; eventos?: string[]; segredo?: string;
  } | null;
  if (!corpo?.url || !corpo.segredo || !(corpo.eventos ?? []).length) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  try {
    const ponto = await comEscopoDoPedido(sessao, async (db) => {
      const p = await criarEndpoint(db, sessao.contexto.organizationId, {
        url: corpo.url as string, eventos: corpo.eventos as string[],
        segredo: corpo.segredo as string, criadoPor: sessao.actor.email,
      });
      await registar(db, sessao.contexto.organizationId, {
        accao: 'webhook.criado', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'webhook_endpoint', alvoId: p.id,
        // O endereço e os eventos. O segredo não — nem o resumo dele.
        detalhe: { url: p.url, eventos: p.eventos },
      });
      return p;
    });
    return NextResponse.json({ id: ponto.id, url: ponto.url }, { status: 201 });
  } catch (erro) {
    if (erro instanceof RecusaDaIntegracao) {
      // O motivo vai na resposta: quem escreveu o endereço tem direito a saber
      // que foi recusado por ser rede interna, e não por um erro qualquer.
      return NextResponse.json({ erro: erro.motivo }, { status: 422 });
    }
    throw erro;
  }
}

/** Põe uma entrega de teste na fila, já assinada. */
export async function PUT(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as {
    endpointId?: string; evento?: string; segredo?: string;
  } | null;
  if (!corpo?.endpointId || !corpo.evento || !corpo.segredo) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const entrega = await comEscopoDoPedido(sessao, (db) => enfileirarEntrega(
    db, sessao.contexto.organizationId, corpo.endpointId as string,
    corpo.evento as string, { teste: true }, corpo.segredo as string));

  return NextResponse.json({ id: entrega.id, entregaId: entrega.entregaId }, { status: 201 });
}

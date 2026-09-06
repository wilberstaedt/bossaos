import { NextResponse } from 'next/server';
import { declararIntegracao, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Declara uma integração **desligada**, com os requisitos por palavras.
 *
 * ── Não há rota para a LIGAR, e é de propósito ────────────────────────────
 *
 * Ligar uma integração exige credenciais reais, e credenciais reais entram pelo
 * **ambiente autorizado** — não por uma caixa de texto num ecrã. Uma rota que
 * aceitasse a chave do provedor no corpo criaria a coluna onde ela vive, e essa
 * coluna é a fuga.
 *
 * O que esta rota faz é registar que a integração existe e o que lhe falta. A
 * base recusa `DESLIGADA` sem requisitos: um beco sem indicação é silêncio.
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
    familia?: string; provedor?: string; requisitos?: string;
  } | null;
  // Os requisitos são obrigatórios aqui, e não só na base: quem declara uma
  // integração sem dizer o que lhe falta deixa um beco para o próximo.
  if (!corpo?.familia || !corpo.provedor || !corpo.requisitos) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const i = await comEscopoDoPedido(sessao, async (db) => {
    const criada = await declararIntegracao(db, sessao.contexto.organizationId,
      corpo.familia as string, corpo.provedor as string, corpo.requisitos as string);
    await registar(db, sessao.contexto.organizationId, {
      accao: 'integracao.declarada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'integration', alvoId: criada.id,
      detalhe: { familia: criada.familia, provedor: criada.provedor },
    });
    return criada;
  });

  return NextResponse.json({ id: i.id, estado: i.estado }, { status: 201 });
}

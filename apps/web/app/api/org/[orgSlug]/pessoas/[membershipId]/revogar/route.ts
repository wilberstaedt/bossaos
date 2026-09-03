import { NextResponse } from 'next/server';
import { registar, revogarPertenca } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { revogarSessoesDoUtilizador } from '@bossaos/auth';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { obterEnv } from '../../../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Revogar o acesso de alguém.
 *
 * Duas coisas, e falhar em qualquer delas deixa a porta aberta:
 *
 *  1. **a pertença fica REVOGADA** — não é apagada. O histórico de quem teve
 *     acesso é obrigação, e apagar tornaria impossível responder a "quem podia
 *     ver isto em Março";
 *  2. **as sessões que JÁ EXISTEM param.** Esta é a que se esquece. Uma pessoa
 *     removida da lista que continua com o separador aberto continua a
 *     trabalhar até a sessão expirar.
 *
 * A (2) tem duas metades aqui: apagam-se as sessões, e a resolução de contexto
 * do pedido seguinte já não encontra pertença activa. As duas medidas — a
 * segunda cobre o caso de a pessoa ter sessão noutra organização também.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; membershipId: string }> },
) {
  const { orgSlug, membershipId } = await ctx.params;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'equipa.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => ({}))) as { motivo?: string };

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const feito = await revogarPertenca(db, membershipId);
    if (feito.ok) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'acesso.revogado',
        actorId: sessao.actor.id,
        actorEmail: sessao.actor.email,
        alvoTipo: 'membership',
        alvoId: membershipId,
        // O motivo não é decorativo: uma auditoria que diz o quê e não diz
        // porquê obriga quem a lê meses depois a adivinhar.
        ...(corpo.motivo ? { motivo: corpo.motivo } : {}),
      });
    }
    return feito;
  });

  if (!r.ok) {
    return NextResponse.json({ erro: r.motivo }, { status: r.motivo === 'ultimo_owner' ? 409 : 404 });
  }

  const { sessoesFechadas } = await revogarSessoesDoUtilizador(obterEnv().AUTH_DATABASE_URL, r.userId);
  // Dizer o número importa: zero é suspeito e merece ser visto.
  return NextResponse.json({ ok: true, sessoesFechadas });
}

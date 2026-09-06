import { NextResponse } from 'next/server';
import { guardarPoliticaDeAcesso, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A política de acesso — **escrita pela casa**.
 *
 * ── E não há caminho para a plataforma a escrever ─────────────────────────
 *
 * Esta rota exige sessão do inquilino. Não existe rota equivalente do lado da
 * plataforma, e a ausência é a garantia: se nós pudéssemos afrouxar o tecto ou
 * desligar o consentimento de uma casa, a política deixava de ser dela.
 *
 * É a assimetria que decide a fronteira 1 — a mesma figura do E32, onde quem
 * entra por webhook não pode criar a ligação que o autoriza.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData().catch(() => null);
  const tecto = Number(String(dados?.get('duracaoMaximaMin') ?? '60').replace(',', '.'));
  if (!Number.isInteger(tecto) || tecto <= 0) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  await comEscopoDoPedido(sessao, async (db) => {
    await guardarPoliticaDeAcesso(db, sessao.contexto.organizationId, {
      exigeConsentimento: dados?.get('exigeConsentimento') === '1',
      duracaoMaximaMin: tecto,
      actualizadaPor: sessao.actor.email,
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'acesso.politica.guardada', actorId: sessao.actor.id,
      actorEmail: sessao.actor.email, alvoTipo: 'access_policy',
      detalhe: { exigeConsentimento: dados?.get('exigeConsentimento') === '1', tecto },
    });
  });

  return NextResponse.redirect(new URL(pedido.headers.get('referer') ?? '/', pedido.url), 303);
}

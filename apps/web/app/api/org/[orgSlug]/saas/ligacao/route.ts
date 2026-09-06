import { NextResponse } from 'next/server';
import { ligarClienteSaas, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A LIGAÇÃO entre um cliente do provedor e esta organização.
 *
 * ── Esta rota é a que autoriza tudo o que os webhooks fazem depois ────────
 *
 * E é por isso que ela exige sessão, permissão e deixa rasto com nome. Sem uma
 * linha criada aqui, um evento de cobrança fica em `SEM_VINCULO` e **não muda
 * nada**, por mais bem assinado que esteja.
 *
 * A assimetria é deliberada: quem entra por webhook não pode criar a ligação
 * que o autoriza. Se pudesse, a ligação deixava de ser uma autorização e
 * passava a ser um passo que o próprio atacante dá.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'plano.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as {
    provedor?: string; provedorClienteId?: string;
  } | null;
  if (!corpo?.provedor || !corpo.provedorClienteId) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  try {
    const ligacao = await comEscopoDoPedido(sessao, async (db) => {
      const l = await ligarClienteSaas(db, sessao.contexto.organizationId,
        corpo.provedor as string, corpo.provedorClienteId as string, sessao.actor.email);
      await registar(db, sessao.contexto.organizationId, {
        accao: 'saas.cliente.ligado', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'saas_customer', alvoId: l.id,
        detalhe: { provedor: l.provedor, cliente: l.provedorClienteId },
      });
      return l;
    });
    return NextResponse.json({ id: ligacao.id }, { status: 201 });
  } catch (erro) {
    // Um cliente do provedor pertence a UMA organização. Se já pertence a
    // outra, isto é 409 e não 500 — e a resposta não diz a QUEM pertence.
    if (String(erro).includes('um_cliente_por_provedor')) {
      return NextResponse.json({ erro: 'ja_ligado' }, { status: 409 });
    }
    throw erro;
  }
}

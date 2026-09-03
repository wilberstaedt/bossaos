import { NextResponse } from 'next/server';
import { criarConvite, listarConvites, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao, type Papel } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { obterEnv } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_p: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'equipa.ler');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const convites = await comEscopoDoPedido(sessao, (db) => listarConvites(db));
  return NextResponse.json({ convites });
}

/**
 * Criar um convite.
 *
 * O papel VAI no corpo — é aqui que quem convida escolhe. O que não pode
 * acontecer é ele voltar a ser lido na ACEITAÇÃO: aí vem da linha do convite.
 * São dois momentos diferentes e é a confusão entre eles que produz o defeito.
 *
 * E a concessão nunca passa o escopo de quem convida: `criarConvite` compara por
 * ACÇÕES, não por nome de papel — um `FINANCE` não é "maior" nem "menor" que um
 * `HOST`, é outra coisa.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'equipa.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as {
    email?: string;
    papel?: string;
    brandId?: string;
    locationId?: string;
  } | null;
  if (!corpo?.email || !corpo?.papel) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const env = obterEnv();
  const r = await comEscopoDoPedido(sessao, async (db) => {
    const criado = await criarConvite(db, {
      organizationId: sessao.contexto.organizationId,
      convidadoPorId: sessao.actor.id,
      concessoesDeQuemConvida: sessao.concessoes,
      dados: {
        email: corpo.email as string,
        papel: corpo.papel as Papel,
        ...(corpo.brandId ? { brandId: corpo.brandId } : {}),
        ...(corpo.locationId ? { locationId: corpo.locationId } : {}),
        validadeHoras: env.CONVITE_VALIDADE_HORAS,
      },
    });
    if (criado.ok) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'convite.criado',
        actorId: sessao.actor.id,
        actorEmail: sessao.actor.email,
        alvoTipo: 'invitation',
        alvoId: criado.conviteId,
        // O token NÃO entra aqui. É uma credencial, e o rasto é lido por gente.
        detalhe: { email: corpo.email, papel: corpo.papel },
      });
    }
    return criado;
  });

  if (!r.ok) {
    const estado = r.falha.tipo === 'escopo_acima_do_convidante' ? 403 : 409;
    return NextResponse.json({ erro: r.falha.tipo }, { status: estado });
  }
  // O token sai UMA vez, para quem convidou o poder enviar. Nunca fica no rasto
  // nem se pode voltar a pedir: a base só tem o resumo dele.
  return NextResponse.json({ conviteId: r.conviteId, token: r.token, expiraEm: r.expiraEm }, { status: 201 });
}

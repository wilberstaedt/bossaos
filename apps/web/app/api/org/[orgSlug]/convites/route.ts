import { NextResponse } from 'next/server';
import { criarConvite, listarConvites, registar, revogarConvite } from '@bossaos/db';
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

/**
 * Revogar um convite.
 *
 * ── Porque é que isto faltava, e o que custava ────────────────────────────
 *
 * A ORG-007 lista os convites pendentes e a rota só sabia criá-los. Um convite
 * enviado para o email errado **não se cancelava**: ficava válido até expirar, e
 * quem o recebesse entrava na organização.
 *
 * Foi a `validar-desfazer.sh` que o apanhou, e a regra dela é a certa: **se
 * quem cria tem chamador e quem desfaz não tem, o produto deixa fazer e não
 * deixa voltar atrás.**
 *
 * A revogação exige a mesma concessão que convidar — quem pode chamar alguém
 * tem de poder desconvidá-lo — e deixa rasto, como a criação.
 */
export async function DELETE(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'equipa.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as { conviteId?: string } | null;
  if (!corpo?.conviteId) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const revogado = await comEscopoDoPedido(sessao, async (db) => {
    const feito = await revogarConvite(db, corpo.conviteId as string);
    if (feito) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'convite.revogado',
        actorId: sessao.actor.id,
        actorEmail: sessao.actor.email,
        alvoTipo: 'invitation',
        alvoId: corpo.conviteId as string,
        detalhe: {},
      });
    }
    return feito;
  });

  // Um convite que já não estava pendente dá AUSÊNCIA, e não erro: pode ter
  // sido aceite, ter expirado, ou já ter sido revogado por outra pessoa — e
  // nenhuma dessas é uma falha de quem carregou no botão.
  if (!revogado) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
  return NextResponse.json({ revogado: true }, { status: 200 });
}


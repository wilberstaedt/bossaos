import { NextResponse } from 'next/server';
import {
  RecusaDaImpressao, desactivarImpressora, registarImpressora, registar,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * As impressoras de serviço: registar e retirar de serviço (DEV-005).
 *
 * ── Retirar não é apagar, e a base diz o mesmo mais alto ──────────────────
 *
 * Um envio já feito aponta para a impressora, e a pergunta «para onde é que
 * isto foi?» tem de continuar a ter resposta seis meses depois. O `DELETE`
 * desta rota **desactiva**; o `ON DELETE RESTRICT` da base recusaria o resto.
 */

const DESTINOS = ['SALA', 'COZINHA', 'BALCAO', 'GERENCIA'] as const;
const LIGACOES = ['REDE', 'USB', 'PONTE'] as const;

export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as {
    locationId?: string; nome?: string; destino?: string;
    modelo?: string; ligacao?: string; endereco?: string;
  } | null;

  const destino = DESTINOS.find((d) => d === corpo?.destino);
  const ligacao = LIGACOES.find((l) => l === corpo?.ligacao);
  if (!corpo?.locationId || !corpo.nome || !corpo.modelo || !destino || !ligacao) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const criada = await comEscopoDoPedido(sessao, async (db) => {
    const p = await registarImpressora(db, sessao.contexto.organizationId, corpo.locationId as string, {
      nome: corpo.nome as string, destino, modelo: corpo.modelo as string,
      ligacao, ...(corpo.endereco ? { endereco: corpo.endereco } : {}),
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'impressora.registada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'printer', alvoId: p.id, detalhe: { destino, ligacao },
    });
    return p;
  });

  // Nasce POR TESTAR, e a resposta di-lo. Nunca em branco: uma linha vazia
  // lê-se como uma linha aprovada.
  return NextResponse.json(
    { id: criada.id, homologada: false, porTestar: true }, { status: 201 });
}

export async function DELETE(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as { printerId?: string } | null;
  if (!corpo?.printerId) return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });

  try {
    await comEscopoDoPedido(sessao, async (db) => {
      await desactivarImpressora(db, corpo.printerId as string);
      await registar(db, sessao.contexto.organizationId, {
        accao: 'impressora.desactivada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'printer', alvoId: corpo.printerId as string, detalhe: {},
      });
    });
  } catch (erro) {
    if (erro instanceof RecusaDaImpressao) {
      return NextResponse.json({ erro: erro.motivo }, { status: 409 });
    }
    throw erro;
  }

  return NextResponse.json({ desactivada: true }, { status: 200 });
}

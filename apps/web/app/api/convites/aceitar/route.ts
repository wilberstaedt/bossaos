import { NextResponse } from 'next/server';
import { aceitarConvite, comEscopo, obterPrisma, organizacaoDoConvite, registar } from '@bossaos/db';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Aceitar um convite.
 *
 * **O corpo do pedido só traz o token.** Não traz papel, nem marca, nem unidade
 * — e mesmo que trouxesse, nada aqui os leria: `aceitarConvite` não tem por onde
 * os receber. Se a aceitação pudesse ler `role` do corpo, quem foi convidado
 * como `WAITER` aceitava-se como `OWNER`.
 *
 * Exige sessão: aceitar um convite é um acto de uma pessoa identificada, e é
 * isso que permite prender o convite ao email dela.
 */
export async function POST(pedido: Request) {
  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });

  const corpo = (await pedido.json().catch(() => null)) as { token?: string } | null;
  if (!corpo?.token) return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });

  const prisma = obterPrisma(obterEnv().DATABASE_URL);

  // Interface mínima: descobre a QUE organização o token pertence, e mais nada.
  // Com ela abre-se a transacção com escopo, e aí dentro tudo é lido pela via
  // normal, com a política de linha activa.
  const organizationId = await organizacaoDoConvite(prisma, corpo.token);
  if (!organizationId) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const r = await comEscopo(prisma, { organizationId, userId: actor.id }, async (db) => {
    const aceite = await aceitarConvite(db, {
      token: corpo.token as string,
      userId: actor.id,
      emailDoUtilizador: actor.email,
    });
    if (aceite.ok) {
      await registar(db, organizationId, {
        accao: 'convite.aceite',
        actorId: actor.id,
        actorEmail: actor.email,
        alvoTipo: 'membership',
        alvoId: aceite.membershipId,
        detalhe: { papel: aceite.papel },
      });
    }
    return aceite;
  });

  if (!r.ok) {
    const estado = r.falha.tipo === 'nao_encontrado' ? 404 : 409;
    return NextResponse.json({ erro: r.falha.tipo }, { status: estado });
  }
  return NextResponse.json({ ok: true, papel: r.papel });
}

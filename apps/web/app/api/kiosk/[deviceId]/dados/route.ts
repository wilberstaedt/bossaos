import { NextResponse } from 'next/server';
import {
  apagarPessoa, comEscopo, kioskDoAparelho, ligarPessoaAoPedido, sessaoViva,
} from '@bossaos/db';
import { obterBase } from '../../../../../src/servidor.ts';

/**
 * Os dados da pessoa: ligar, e desligar.
 *
 * ── As duas metades do aceite, no mesmo sítio ─────────────────────────────
 *
 * `POST` liga uma pessoa ao pedido — para o recibo, para os pontos. `DELETE`
 * apaga a pessoa **e o pedido fica**.
 *
 * A segunda não tem cuidado nenhum a proteger o pedido, e é essa a diferença
 * entre uma garantia e uma boa intenção: a ligação cai por `ON DELETE CASCADE`
 * e o `orders` nem sabe que ela existia. Se isto fosse uma coluna em `orders`,
 * nenhuma quantidade de cuidado nesta função salvava o pedido.
 *
 * ── O prazo vem de fora ───────────────────────────────────────────────────
 *
 * Quem decide quanto tempo se guarda é a finalidade (contrato do E27), não o
 * kiosk. Um prazo escolhido aqui era o produto a inventar retenção.
 */
const DIAS_DE_SERVICO = 90;

async function resolver(deviceId: string) {
  const prisma = obterBase();
  const kiosk = await kioskDoAparelho(prisma, deviceId);
  return kiosk ? { prisma, kiosk } : null;
}

export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await ctx.params;
  const alvo = await resolver(deviceId);
  if (!alvo) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const corpo = (await pedido.json().catch(() => null)) as { customerId?: string } | null;
  if (!corpo?.customerId) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const expiraEm = new Date(Date.now() + DIAS_DE_SERVICO * 24 * 3600 * 1000);
  const ligado = await comEscopo(alvo.prisma,
    { organizationId: alvo.kiosk.organizationId }, async (db) => {
      const sessao = await sessaoViva(db, deviceId);
      if (!sessao?.orderId) return null;
      return ligarPessoaAoPedido(db, alvo.kiosk.organizationId, sessao.orderId,
        corpo.customerId as string, 'SERVICO', expiraEm);
    });

  // Ausência: não há pedido a que ligar. Não é erro do cliente nem do servidor.
  if (!ligado) return NextResponse.json({ erro: 'sem_pedido' }, { status: 404 });
  return NextResponse.json({ ligado: true }, { status: 201 });
}

export async function DELETE(
  pedido: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await ctx.params;
  const alvo = await resolver(deviceId);
  if (!alvo) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  const corpo = (await pedido.json().catch(() => null)) as { customerId?: string } | null;
  if (!corpo?.customerId) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  await comEscopo(alvo.prisma, { organizationId: alvo.kiosk.organizationId },
    (db) => apagarPessoa(db, corpo.customerId as string));

  return NextResponse.json({ apagada: true }, { status: 200 });
}

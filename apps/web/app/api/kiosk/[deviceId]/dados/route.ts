import { NextResponse } from 'next/server';
import { apagarPessoaNoKiosk, ligarPessoaNoKiosk } from '@bossaos/db';
import { obterBase } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
 * nenhuma quantidade de cuidado nesta rota salvava o pedido.
 *
 * ── O prazo vem de fora ───────────────────────────────────────────────────
 *
 * Quem decide quanto tempo se guarda é a finalidade (contrato do E27), não o
 * kiosk. Um prazo escolhido dentro da porta era o produto a inventar retenção.
 */
const DIAS_DE_SERVICO = 90;

export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await ctx.params;
  const corpo = (await pedido.json().catch(() => null)) as { customerId?: string } | null;
  if (!corpo?.customerId) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const expiraEm = new Date(Date.now() + DIAS_DE_SERVICO * 24 * 3600 * 1000);
  const ligado = await ligarPessoaNoKiosk(
    obterBase(), deviceId, corpo.customerId, expiraEm);

  // Ausência: ou o aparelho não existe, ou não há pedido a que ligar. As duas
  // dão o mesmo, e é de propósito — a diferença só interessa a quem esteja a
  // sondar identificadores.
  if (!ligado) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
  return NextResponse.json({ ligado: true }, { status: 201 });
}

export async function DELETE(
  pedido: Request,
  ctx: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await ctx.params;
  const corpo = (await pedido.json().catch(() => null)) as { customerId?: string } | null;
  if (!corpo?.customerId) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const apagada = await apagarPessoaNoKiosk(obterBase(), deviceId, corpo.customerId);
  if (!apagada) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
  return NextResponse.json({ apagada: true }, { status: 200 });
}

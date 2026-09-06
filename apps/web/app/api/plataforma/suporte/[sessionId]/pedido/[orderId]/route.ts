import { NextResponse } from 'next/server';
import {
  RecusaDePlataforma, comIdentidade, obterPrisma, sessaoAutoriza,
} from '@bossaos/db';
import { actorDoPedido } from '../../../../../../../src/sessao.ts';
import { obterEnv } from '../../../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * O suporte lê UM pedido de uma casa, ao abrigo de uma sessão.
 *
 * ── É aqui que as quatro condições deixam de ser papel ────────────────────
 *
 * Todas as outras telas desta etapa mostram a sessão. Esta é a primeira que usa
 * a sessão para **fazer** alguma coisa — e por isso é a que prova que as
 * condições valem:
 *
 * - **Temporária:** o `sessaoAutoriza` recusa uma sessão expirada. Ninguém a
 *   fechou; deixou de valer na mesma.
 * - **Com âmbito:** exige `DADOS_OPERACIONAIS`. Uma sessão de `LEITURA` — a que
 *   se abre para ver a configuração — não chega aqui.
 * - **Com motivo e visível:** já estavam escritos quando a sessão abriu, e a
 *   casa vê-os na SET-010.
 *
 * ── E lê UM pedido, pelo identificador ────────────────────────────────────
 *
 * Não há aqui uma listagem. Quem entra numa casa para resolver um problema sabe
 * qual é o pedido; uma lista seria um convite a folhear — e folhear não é uma
 * das quatro condições.
 */
export async function GET(
  _pedido: Request,
  ctx: { params: Promise<{ sessionId: string; orderId: string }> },
) {
  const { sessionId, orderId } = await ctx.params;
  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 });

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  try {
    const dados = await comIdentidade(prisma, actor.id, async (db) => {
      // A sessão autoriza? As duas metades: viva **e** com âmbito.
      const sessao = await sessaoAutoriza(db as never, sessionId, 'DADOS_OPERACIONAIS');

      return db.order.findFirst({
        where: { id: orderId, organizationId: sessao.organizationId },
        // Lista de PERMISSÃO. O que o suporte precisa para perceber o problema,
        // e não a casa inteira: sem morada, sem contacto, sem nota do cliente.
        select: {
          id: true, numero: true, canal: true, estado: true, createdAt: true,
          linhas: { select: { id: true, nome: true, quantidade: true, estado: true } },
        },
      });
    });

    if (!dados) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
    return NextResponse.json({ pedido: dados }, { status: 200 });
  } catch (erro) {
    if (erro instanceof RecusaDePlataforma) {
      // Expirada, fechada, ou fora de âmbito. A resposta diz qual — quem opera
      // tem de saber se pede outra sessão ou se pede outro âmbito.
      return NextResponse.json({ erro: erro.motivo }, { status: 403 });
    }
    throw erro;
  }
}

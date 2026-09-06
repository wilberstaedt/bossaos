import { NextResponse } from 'next/server';
import {
  RecusaDePlataforma, comIdentidade, concederCapacidade, obterPrisma,
} from '@bossaos/db';
import { actorDoPedido } from '../../../../../src/sessao.ts';
import { obterEnv } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Conceder uma capacidade a uma casa — **a interface de escrita do E33**.
 *
 * ── E é aqui que a fronteira do E05 não se abre ───────────────────────────
 *
 * Esta rota corre com a credencial de runtime, que tem `SELECT` e mais nada em
 * `entitlement_grants` desde o E05. Ela **não escreve lá**: chama a
 * `conceder_capacidade`, que corre como dono e escreve a concessão e a auditoria
 * na mesma instrução.
 *
 * Se para esta rota funcionar fosse preciso dar `INSERT` ao runtime, a resposta
 * seria não — muda-se o caminho, não a permissão. O caminho é este.
 *
 * ── E não se concede o que já é de toda a gente ───────────────────────────
 *
 * Segurança, privacidade e exportação não ficam atrás do plano, logo também não
 * se concedem como adicional: uma concessão dessas passaria a ideia de que a
 * casa não as tinha antes.
 */
export async function POST(
  pedido: Request, ctx: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await ctx.params;
  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 });

  const corpo = (await pedido.json().catch(() => null)) as {
    capacidade?: string; quota?: number; validoAte?: string; motivo?: string;
  } | null;
  if (!corpo?.capacidade || !corpo.motivo) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  try {
    const id = await comIdentidade(prisma, actor.id, (db) =>
      concederCapacidade(db as never, orgId, {
        capacidade: corpo.capacidade as string,
        quota: corpo.quota ?? null,
        validoAte: corpo.validoAte ? new Date(corpo.validoAte) : null,
        // A pessoa. A função privilegiada recusa sem ela.
        staffUserId: actor.id, staffEmail: actor.email,
        motivo: corpo.motivo as string,
      }));
    return NextResponse.json({ id }, { status: 201 });
  } catch (erro) {
    if (erro instanceof RecusaDePlataforma) {
      return NextResponse.json({ erro: erro.motivo }, { status: 422 });
    }
    throw erro;
  }
}

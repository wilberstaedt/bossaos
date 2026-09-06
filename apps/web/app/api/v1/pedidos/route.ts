import { NextResponse } from 'next/server';
import { comOEscopoDaChave } from '@bossaos/db';
import { comChave, registarChamada } from '../../../../src/api-publica.ts';
import { obterBase } from '../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `GET /api/v1/pedidos` — a lista, para quem integra.
 *
 * Âmbito próprio: `PEDIDOS_LER`. Uma chave com `CATALOGO_LER` **não entra
 * aqui** — e é esse o par que a régua manda medir: a chave certa passa, a de
 * âmbito errado não.
 *
 * ── E o controlo tira a verificação de UMA rota ───────────────────────────
 *
 * É por isso que a declaração vive nesta linha e não numa tabela partilhada:
 * para o plante poder desligar ESTA e deixar a outra de pé. Se o plante
 * desligasse o portão central, media outra coisa.
 */
export async function GET(pedido: Request) {
  const autorizacao = await comChave(pedido, 'PEDIDOS_LER');
  if (!autorizacao.ok) return autorizacao.resposta;
  const { autorizado } = autorizacao;

  const prisma = obterBase();
  const pedidos = await comOEscopoDaChave(prisma, autorizado,
    (db) => db.order.findMany({
      // A projecção é uma lista de PERMISSÃO, e não uma exclusão: o que não
      // está aqui não sai, e não porque alguém se lembrou de o tirar.
      select: { id: true, numero: true, canal: true, estado: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }));

  await registarChamada(autorizado, 'api.pedidos.ler', 'ok', { quantos: pedidos.length });
  return NextResponse.json({ pedidos }, { status: 200 });
}

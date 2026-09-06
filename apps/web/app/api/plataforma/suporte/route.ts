import { NextResponse } from 'next/server';
import {
  RecusaDePlataforma, abrirSessaoDeSuporte, comIdentidade, obterPrisma,
} from '@bossaos/db';
import { AMBITOS, type AmbitoDeSuporte } from '@bossaos/domain';
import { actorDoPedido } from '../../../../src/sessao.ts';
import { obterEnv } from '../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Abrir uma sessão de suporte numa casa.
 *
 * ── A rota mais perigosa deste projecto ───────────────────────────────────
 *
 * É por aqui que nós entramos na casa de um cliente. Todas as outras rotas dão
 * poder a quem lá trabalha; esta dá-o a quem vende o sistema.
 *
 * ── Os quatro argumentos que não têm valor por omissão ────────────────────
 *
 * `motivo`, `ambito`, `duracaoMinutos` e a pessoa. Nenhum é opcional, e a rota
 * recusa o pedido a que falte um. Um valor por omissão aqui seria um campo que
 * quem tem pressa não escreve — e ter pressa é o estado normal de quem abre uma
 * sessão de suporte.
 *
 * O tecto e o consentimento não são verificados aqui: são do gatilho da base,
 * porque é o único sítio por onde todos os caminhos passam. Isto traduz a
 * recusa; não a decide.
 */
export async function POST(pedido: Request) {
  const actor = await actorDoPedido();
  if (!actor) return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 });

  const corpo = (await pedido.json().catch(() => null)) as {
    organizationId?: string; motivo?: string; ambito?: string[];
    duracaoMinutos?: number; consentidaPor?: string;
  } | null;

  const ambito = (corpo?.ambito ?? []).filter(
    (a): a is AmbitoDeSuporte => (AMBITOS as readonly string[]).includes(a));

  if (!corpo?.organizationId || !corpo.motivo || ambito.length === 0
      || !corpo.duracaoMinutos || corpo.duracaoMinutos <= 0) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const prisma = obterPrisma(obterEnv().DATABASE_URL);
  try {
    const sessao = await comIdentidade(prisma, actor.id, (db) =>
      abrirSessaoDeSuporte(db as never, corpo.organizationId as string, {
        // A PESSOA que está autenticada, e nunca um papel. O gatilho do rasto
        // recusa qualquer coisa que pareça um papel, e esta linha é a razão
        // pela qual ele nunca dispara em condições normais.
        staffUserId: actor.id, staffEmail: actor.email,
        motivo: corpo.motivo as string, ambito,
        duracaoMinutos: corpo.duracaoMinutos as number,
        ...(corpo.consentidaPor ? { consentidaPor: corpo.consentidaPor } : {}),
      }));
    return NextResponse.json(
      { id: sessao.id, expiraEm: sessao.expiraEm }, { status: 201 });
  } catch (erro) {
    if (erro instanceof RecusaDePlataforma) {
      // O motivo vai na resposta: quem pediu tem direito a saber que a casa
      // aceita menos tempo, ou que exige consentimento. São regras dela.
      return NextResponse.json({ erro: erro.motivo }, { status: 422 });
    }
    throw erro;
  }
}

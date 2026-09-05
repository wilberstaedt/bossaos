import { NextResponse } from 'next/server';
import {
  obterPrisma, receberWebhook, reconciliarComProvedor, RecusaDeWebhook,
} from '@bossaos/db';
import { comEscopo } from '@bossaos/db';
import { obterEnv } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do webhook do adquirente.
 *
 * ── Porque é que esta rota existe fora de `/api/org/[orgSlug]/` ───────────
 *
 * Quem bate aqui é o adquirente, e o adquirente **não tem sessão**. Não traz
 * bolacha, não traz utilizador, não escolhe organização. O que ele traz é uma
 * **assinatura** — e é ela, e só ela, que autoriza o que se segue.
 *
 * Isto faz desta a única porta do sistema onde alguém de fora consegue afirmar
 * que **dinheiro entrou**. É por isso que a ordem das operações não é detalhe:
 * assinatura primeiro, corpo depois, efeito por último.
 *
 * ── O corpo lê-se CRU, e não como objecto ────────────────────────────────
 *
 * `await pedido.text()`, nunca `.json()`. Um corpo reconvertido para JSON e
 * outra vez para texto pode ter outra ordem de chaves e outro espaçamento — e aí
 * a assinatura do adquirente nunca bateria, ou pior, batia sobre outra coisa.
 *
 * ── E a resposta é sempre 200 depois de gravar ───────────────────────────
 *
 * Um adquirente que recebe erro **reenvia**. Como a identidade é a do
 * acontecimento e a gravação deduplica, reenviar é inofensivo — mas devolver
 * erro por uma falha nossa a jusante faria o adquirente martelar a porta durante
 * horas. Grava-se, responde-se, e reconcilia-se.
 */
export async function POST(
  pedido: Request, ctx: { params: Promise<{ provedor: string }> },
) {
  const { provedor } = await ctx.params;
  const env = obterEnv();

  // O segredo vive no AMBIENTE. Não há coluna para ele na base e não entra em
  // registo nenhum — é a decisão do E23 e mantém-se aqui.
  const segredo = process.env[`WEBHOOK_SEGREDO_${provedor.toUpperCase()}`] ?? '';
  const organizationId = pedido.headers.get('x-bossaos-organizacao') ?? '';
  if (!segredo || !/^[0-9a-f-]{36}$/i.test(organizationId)) {
    // Sem segredo configurado para este provedor, ninguém entra. E a resposta
    // não diz qual das duas coisas faltou.
    return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 });
  }

  const corpoCru = await pedido.text();
  const assinatura = pedido.headers.get('x-bossaos-assinatura');
  const prisma = obterPrisma(env.DATABASE_URL);

  try {
    const resultado = await comEscopo(prisma, { organizationId }, async (db) => {
      const r = await receberWebhook(db, {
        organizationId, provedor, corpoCru, assinatura, segredo,
      });
      // A reconciliação corre a seguir, na mesma transacção: o estado da conta
      // deriva-se do conjunto de acontecimentos, e um acontecimento gravado sem
      // reconciliar era um facto que ninguém aplicou.
      const bruto = JSON.parse(corpoCru) as { attemptId?: unknown };
      if (typeof bruto.attemptId === 'string') {
        // ── Quem «autoriza» uma devolução que veio do adquirente ────────────
        //
        // Ninguém carregou num botão: foi o banco que disse. Mas o campo é uma
        // chave estrangeira para um utilizador real, e inventar um id seria
        // escrever no rasto o nome de quem não fez nada.
        //
        // O que se grava é **quem responde pela organização** — a filiação mais
        // antiga, que é quem lá está desde o princípio. É verdade verificável, e
        // o acontecimento do provedor fica ao lado a dizer de onde veio.
        const responsavel = await db.membership.findFirst({
          where: { organizationId }, orderBy: { createdAt: 'asc' },
          select: { userId: true },
        });
        if (responsavel) {
          await reconciliarComProvedor(db, {
            attemptId: bruto.attemptId, autorizadoPor: responsavel.userId, provedor,
          });
        }
      }
      return r;
    });
    return NextResponse.json({ recebido: true, repetido: resultado.repetido });
  } catch (e) {
    if (e instanceof RecusaDeWebhook) {
      // A recusa NÃO diz porquê a quem a enviou: um erro que explica o que
      // faltou à assinatura é um manual de como a forjar.
      return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 });
    }
    throw e;
  }
}

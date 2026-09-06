import { NextResponse } from 'next/server';
import {
  RecusaDaImpressao, enfileirarComanda, entregueAPonte, registar, respostaDoAparelho,
} from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * O CONTRATO DE DISPOSITIVO — as três mensagens, e nada mais.
 *
 * ── As três, e porque é que são exactamente três ──────────────────────────
 *
 * | quem fala | mensagem | o que passa a saber-se |
 * | --- | --- | --- |
 * | o produto | `POST` | há um documento na fila |
 * | a ponte | `PATCH entregue` | o software fez a sua parte |
 * | o aparelho | `PATCH respondeu` | houve resposta do dispositivo |
 *
 * **Não há uma quarta mensagem que diga «imprimiu».** Quem diz que imprimiu é o
 * aparelho, e diz-o pela terceira — com o texto do que respondeu. Uma ponte que
 * quisesse afirmar impressão teria de inventar uma resposta, e aí a mentira
 * fica escrita com o nome de quem a escreveu.
 *
 * ── E não se presume nada sobre o hardware ────────────────────────────────
 *
 * Não se presume que a impressora aceita chamada directa do navegador, nem que
 * o equipamento das fotografias é compatível. **Uma fotografia não é uma
 * especificação.** O que existe é este contrato; o que fala com o aparelho é a
 * ponte, e a ponte é de quem tiver o aparelho.
 *
 * O simulador (`scripts/ponte-de-impressao-simulada.mjs`) implementa este
 * contrato e serve para exercitar os três estados. **Simular não é homologar**,
 * e a matriz de homologação diz por palavras o que ficou por medir.
 */

const RESULTADOS = ['IMPRIMIU', 'RECUSOU'] as const;

export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; printerId: string }> },
) {
  const { orgSlug, printerId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'producao.operar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as {
    locationId?: string; orderId?: string; idioma?: string;
  } | null;
  if (!corpo?.locationId || !corpo.orderId) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  const s = mensagensDe((corpo.idioma ?? 'es-ES') as Idioma).kioskE31;

  try {
    const envio = await comEscopoDoPedido(sessao, async (db) => {
      const p = await db.order.findFirst({
        where: { id: corpo.orderId as string },
        include: { linhas: true },
      });
      if (!p) return null;

      const job = await enfileirarComanda(db, sessao.contexto.organizationId,
        corpo.locationId as string, printerId,
        {
          id: p.id, numero: p.numero, canal: p.canal,
          linhas: p.linhas.map((l: { nome: string; quantidade: number }) =>
            ({ texto: l.nome, quantidade: l.quantidade })),
        },
        { reimpressao: s.reimpressao, pedido: s.pedido });

      await registar(db, sessao.contexto.organizationId, {
        accao: 'impressao.enfileirada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'print_job', alvoId: job.id,
        // A via fica no registo: é a diferença entre um pedido novo e uma
        // segunda via, e daqui a seis meses ninguém se lembra qual foi.
        detalhe: { via: job.via, orderId: p.id },
      });
      return job;
    });

    if (!envio) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
    // A via vai na resposta: quem chamou tem de saber se acabou de mandar uma
    // segunda via, mesmo que tenha carregado sem querer.
    return NextResponse.json({ id: envio.id, via: envio.via }, { status: 201 });
  } catch (erro) {
    if (erro instanceof RecusaDaImpressao) {
      return NextResponse.json({ erro: erro.motivo }, { status: 409 });
    }
    throw erro;
  }
}

/**
 * A ponte e o aparelho falam por aqui.
 *
 * `entregue` é o software a dizer que entregou. `respondeu` é o **aparelho** a
 * responder, e leva sempre o que ele disse — a base recusa uma confirmação sem
 * texto, e por isso não há caminho que promova «entregue» a «imprimiu».
 */
export async function PATCH(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; printerId: string }> },
) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'producao.operar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as {
    jobId?: string; mensagem?: string; resultado?: string; resposta?: string;
  } | null;
  if (!corpo?.jobId) return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });

  if (corpo.mensagem === 'entregue') {
    const j = await comEscopoDoPedido(sessao, (db) => entregueAPonte(db, corpo.jobId as string));
    return NextResponse.json({ estado: j.estado }, { status: 200 });
  }

  if (corpo.mensagem === 'respondeu') {
    const resultado = RESULTADOS.find((r) => r === corpo.resultado);
    // A resposta do aparelho é OBRIGATÓRIA, e a recusa é aqui e não só na base:
    // uma ponte que a esquece tem de ver o erro no sítio onde o pode corrigir.
    if (!resultado || !corpo.resposta) {
      return NextResponse.json({ erro: 'sem_resposta_do_aparelho' }, { status: 400 });
    }
    const j = await comEscopoDoPedido(sessao, (db) =>
      respostaDoAparelho(db, corpo.jobId as string, resultado, corpo.resposta as string));
    return NextResponse.json({ estado: j.estado }, { status: 200 });
  }

  return NextResponse.json({ erro: 'mensagem_desconhecida' }, { status: 400 });
}

import { NextResponse } from 'next/server';
import { criarChave, registar } from '@bossaos/db';
import { ESCOPOS, corpoDaResposta, estadoHttp, exigirAccao, type Escopo } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cria uma chave de API — e devolve o valor **uma vez**.
 *
 * ── Esta é a única resposta do produto inteiro que leva um segredo ────────
 *
 * E leva-o porque não há alternativa: a chave tem de chegar a quem a pediu. O
 * que se garante é que é a última vez — não há função que a leia de volta, não
 * há coluna onde ela caiba, e a listagem nem o resumo devolve.
 *
 * Por isso o registo de auditoria guarda o **id** e o prefixo, e não o valor.
 * Um segredo que passa por um sítio uma vez é um risco; um que fica escrito
 * num registo é uma fuga.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const corpo = (await pedido.json().catch(() => null)) as {
    nome?: string; escopos?: string[]; diasDeValidade?: number;
  } | null;

  const escopos = (corpo?.escopos ?? []).filter(
    (e): e is Escopo => (ESCOPOS as readonly string[]).includes(e));
  // Sem âmbito não se cria. A base recusaria na mesma — isto só diz porquê a
  // quem chamou, em vez de lhe devolver uma violação de restrição.
  if (!corpo?.nome || escopos.length === 0) {
    return NextResponse.json({ erro: 'pedido_invalido' }, { status: 400 });
  }

  // O prazo é obrigatório e escolhido por quem cria. O valor por omissão é
  // curto de propósito: uma chave de noventa dias que ninguém renova é um
  // incómodo; uma de dez anos que ninguém revoga é um problema.
  const dias = corpo.diasDeValidade && corpo.diasDeValidade > 0 ? corpo.diasDeValidade : 90;
  const expiraEm = new Date(Date.now() + dias * 24 * 3600 * 1000);

  const criada = await comEscopoDoPedido(sessao, async (db) => {
    const c = await criarChave(db, sessao.contexto.organizationId, {
      nome: corpo.nome as string, escopos, expiraEm, criadaPor: sessao.actor.email,
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'chave.criada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'api_key', alvoId: c.id,
      // O prefixo e os âmbitos. **Nunca o valor.**
      detalhe: { prefixo: c.prefixo, escopos, expiraEm: expiraEm.toISOString() },
    });
    return c;
  });

  return NextResponse.json(
    { id: criada.id, prefixo: criada.prefixo, chave: criada.chave, umaVez: true },
    { status: 201 });
}

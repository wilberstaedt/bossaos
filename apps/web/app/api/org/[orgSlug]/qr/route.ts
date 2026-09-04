import { NextResponse } from 'next/server';
import { listarUnidades, revogarAcessoDaMesa, rodarQrDaMesa } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A porta do QR da mesa: **duas acções, nunca uma**.
 *
 * Juntá-las aqui por conveniência era refazer o colapso do lado do servidor,
 * depois de o ecrã as ter separado. `rodar` e `revogar` são dois `if`, e o
 * segredo novo só sai na resposta da rotação.
 *
 * ── O segredo viaja no ENDEREÇO, e é uma decisão consciente ───────────────
 *
 * Vai no `Location` do 303 para a página o poder mostrar uma vez — a base guarda
 * o resumo e não tem como o repetir. Fica no histórico do navegador de quem
 * roda, que é uma pessoa com sessão na organização, no painel de gestão. A
 * alternativa — guardá-lo em claro para o mostrar depois — deixava-o na base
 * para sempre, que é pior.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const locationSlug = texto(dados, 'locationSlug') ?? '';
  const tableId = texto(dados, 'tableId') ?? '';
  const accao = texto(dados, 'accao') ?? '';

  // A unidade resolvida DENTRO do escopo, como em todas as outras portas: um
  // identificador vindo do formulário e usado sem esta leitura deixava mexer na
  // unidade de outra organização.
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  if (!unidades.some((u: { slug: string }) => u.slug === locationSlug)) {
    return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
  }
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/channels/qr/mesa/${tableId}/renovar`;

  if (accao === 'rodar') {
    const r = await comEscopoDoPedido(sessao, (db) => rodarQrDaMesa(db, {
      tableId, actor: { email: sessao.actor.email },
    }));
    if (!r.ok) return voltarPara(base, { erro: r.motivo });
    return voltarPara(base, {
      segredo: r.segredo,
      // O número das que CONTINUARAM. É a prova, no ecrã, de que rodar não
      // revoga — e a resposta à pergunta de quem carregou no botão.
      continuaram: String(r.sessoesQueContinuam),
    });
  }

  if (accao === 'revogar') {
    const r = await comEscopoDoPedido(sessao, (db) => revogarAcessoDaMesa(db, {
      tableId, motivo: texto(dados, 'motivo') ?? '', actor: { email: sessao.actor.email },
    }));
    if (!r.ok) return voltarPara(base, { erro: r.motivo });
    return voltarPara(base, { revogadas: String(r.revogadas) });
  }

  return NextResponse.json({ erro: 'accao_desconhecida' }, { status: 400 });
}

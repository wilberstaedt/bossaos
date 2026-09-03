import { NextResponse } from 'next/server';
import { CANAIS, publicar, registar, type Canal } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-026 · restaurar uma revisão.
 *
 * **Restaurar CRIA uma revisão nova.** Não volta atrás no número nem reescreve
 * a linha antiga: a nova aponta para a que restaurou (`restauraDeId`), e o
 * histórico mostra as duas.
 *
 * Se restaurar apagasse ou reutilizasse números, "o que estava publicado no dia
 * 4" deixava de ter resposta — e é a pergunta que se faz depois de uma
 * reclamação, não antes.
 *
 * O conteúdo é remontado do catálogo ACTUAL, não copiado da revisão antiga: se
 * fosse copiado, restaurar reporia preços que já não valem e alérgenos que
 * entretanto foram declarados. Restaurar volta ao ESTADO DE PUBLICAÇÃO, não ao
 * catálogo de então — e a diferença aparece na comparação antes de acontecer.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; menuId: string }> },
) {
  const { orgSlug, menuId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.publicar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const escrito = texto(dados, 'canal');
  const canal: Canal = (CANAIS as readonly string[]).includes(escrito ?? '')
    ? (escrito as Canal) : 'CARTA';
  const locationId = texto(dados, 'locationId');
  const revisionId = texto(dados, 'revisionId');
  const destino = `/${idioma}/app/${orgSlug}/catalogo/menus/${menuId}/historico`;
  if (!locationId || !revisionId) return voltarPara(destino, { erro: 'campos' });

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const resultado = await publicar(db, sessao.contexto.organizationId, {
      menuId, locationId, canal, autor: sessao.actor.email, restauraDe: revisionId,
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: resultado.ok ? 'menu.restaurado' : 'menu.restauro.bloqueado',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'menu', alvoId: menuId,
      detalhe: { canal, restauraDe: revisionId, ok: resultado.ok },
    });
    return resultado;
  });

  if (!r.ok) return voltarPara(destino, { erro: 'bloqueado', canal });
  return voltarPara(destino, { restaurado: '1', canal });
}

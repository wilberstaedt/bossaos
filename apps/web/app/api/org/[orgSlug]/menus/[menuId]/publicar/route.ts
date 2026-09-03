import { NextResponse } from 'next/server';
import { CANAIS, publicar, registar, type Canal } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-025 · publicar.
 *
 * `catalogo.publicar` e não `catalogo.editar`: são acções separadas no
 * vocabulário do E04 desde o princípio, e é aqui que a separação paga. Quem
 * escreve a carta e quem decide que ela vai para a rua podem ser pessoas
 * diferentes num restaurante com equipa.
 *
 * A verificação de bloqueios corre **outra vez** aqui, e não confia no botão
 * desligado do ecrã: o `disabled` é cortesia; quem chamar esta rota com `curl`
 * encontra a mesma recusa. E `publicar` devolve os bloqueios sem escrever nada.
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
  const destino = `/${idioma}/app/${orgSlug}/catalogo/menus/${menuId}/publicar`;
  if (!locationId) return voltarPara(destino, { erro: 'sem_unidade' });

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const resultado = await publicar(db, sessao.contexto.organizationId, {
      menuId, locationId, canal, autor: sessao.actor.email,
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: resultado.ok ? 'menu.publicado' : 'menu.publicacao.bloqueada',
      actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'menu', alvoId: menuId,
      detalhe: resultado.ok
        ? { canal, revisao: resultado.numero, mudancas: resultado.mudancas.length }
        : { canal, bloqueios: resultado.bloqueios.map((b) => `${b.nome}:${b.motivo}`) },
    });
    return resultado;
  });

  if (!r.ok) return voltarPara(destino, { erro: 'bloqueado', canal, unidade: locationId });
  return voltarPara(destino, { publicado: '1', canal, unidade: locationId });
}

import { NextResponse } from 'next/server';
import { arquivarUnidade, desarquivarUnidade, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * STATE-013 · arquivar e reactivar uma unidade.
 *
 * *"Arquivamento não apaga histórico e deve impedir novos serviços de forma
 * controlada."* O `archivedAt` faz as duas coisas: o que já aconteceu continua
 * legível, e a unidade sai das listas de onde se opera.
 *
 * Recusa arquivar a última unidade activa — uma organização sem unidade nenhuma
 * não se opera nem se desarquiva por um caminho normal, e sair desse estado
 * exigiria a credencial de migração.
 */
export async function POST(
  pedido: Request,
  ctx: { params: Promise<{ orgSlug: string; locationId: string }> },
) {
  const { orgSlug, locationId } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'organizacao.gerir');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const destino = `/${idioma}/app/${orgSlug}/organization/unidades`;
  const reactivar = texto(dados, 'reactivar') === '1';

  const r = await comEscopoDoPedido(sessao, async (db) => {
    if (reactivar) {
      await desarquivarUnidade(db, locationId);
      await registar(db, sessao.contexto.organizationId, {
        accao: 'unidade.reactivada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'location', alvoId: locationId,
      });
      return { ok: true as const, dependencias: [] };
    }
    const resultado = await arquivarUnidade(db, locationId);
    if (resultado.ok) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'unidade.arquivada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'location', alvoId: locationId,
        // As dependências ficam no rasto: é o que responde a "porque é que estas
        // pessoas deixaram de ter acesso" daqui a três meses.
        detalhe: { dependencias: resultado.dependencias },
      });
    }
    return resultado;
  });

  if (!r.ok) return voltarPara(destino, { erro: r.motivo });
  return voltarPara(destino, { arquivada: '1' });
}

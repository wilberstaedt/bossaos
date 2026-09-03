import { NextResponse } from 'next/server';
import { catalogoParaCsv, pedirExportacao, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';
import { obterMedia } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SET-012 · pedir uma exportação.
 *
 * A acção exigida é `catalogo.editar` e **não** `catalogo.ler`: ver a carta num
 * ecrã de cozinha e levar o ficheiro inteiro para fora são coisas diferentes. A
 * primeira é operação, a segunda é extracção — e a cozinha tem a primeira.
 *
 * A acção fica GUARDADA na linha, e é ela que o descarregamento volta a
 * verificar. Se o vocabulário mudar amanhã, esta exportação continua a saber o
 * que era preciso para a pedir.
 *
 * O CSV sai por `catalogoParaCsv`, que neutraliza. O parâmetro que desliga a
 * neutralização existe só para o controlo negativo, e não há caminho que lhe
 * chegue a partir daqui.
 */
export async function POST(pedido: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) {
    return NextResponse.json(corpoDaResposta(sessao.resultado), { status: estadoHttp(sessao.resultado) });
  }
  const recusa = exigirAccao(sessao.concessoes, 'catalogo.editar');
  if (recusa) return NextResponse.json(corpoDaResposta(recusa), { status: estadoHttp(recusa) });

  const dados = await pedido.formData();
  const idioma = texto(dados, 'idioma') ?? 'es-ES';
  const brandId = texto(dados, 'brandId');
  const destino = `/${idioma}/app/${orgSlug}/organization/exportar`;

  await comEscopoDoPedido(sessao, async (db) => {
    const csv = await catalogoParaCsv(db, brandId);
    const conteudo = new TextEncoder().encode(csv);
    // A chave é gerada por quem guarda, como qualquer outro ficheiro.
    const guardado = await obterMedia().guardar({
      nome: 'catalogo.csv', tipoMime: 'text/csv', conteudo,
    });
    const e = await pedirExportacao(db, sessao.contexto.organizationId, {
      actorId: sessao.actor.id, accaoExigida: 'catalogo.editar',
      formato: 'csv', chave: guardado.chave, bytes: conteudo.length,
    });
    await registar(db, sessao.contexto.organizationId, {
      accao: 'exportacao.pedida', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'export_job', alvoId: e.id,
      detalhe: { bytes: conteudo.length, expiraEm: e.expiraEm.toISOString() },
    });
  });

  return voltarPara(destino, { pedido: '1' });
}

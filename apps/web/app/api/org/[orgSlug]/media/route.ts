import { NextResponse } from 'next/server';
import { guardarMedia, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';
import { obterMedia } from '../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-023 · carregar uma imagem.
 *
 * **Nada é escrito no armazenamento antes de o tipo estar confirmado pelos
 * bytes.** É a ordem que importa: um SVG gravado e só depois recusado ficava lá,
 * e o que fica no disco acaba servido. Quem decide é `aceitarFicheiro`, no
 * domínio, e `guardarMedia` chama-a antes de tocar na porta.
 *
 * O `Content-Type` do pedido e a extensão do ficheiro entram como METADADO. Os
 * dois vêm do cliente; nenhum decide nada.
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
  const destino = `/${idioma}/app/${orgSlug}/catalogo/media`;
  const brandId = texto(dados, 'brandId');
  const ficheiro = dados.get('ficheiro');
  if (!brandId || !(ficheiro instanceof File)) return voltarPara(destino, { erro: 'campos' });

  const conteudo = new Uint8Array(await ficheiro.arrayBuffer());
  const alternativo = texto(dados, 'textoAlternativo');

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const guardado = await guardarMedia(db, sessao.contexto.organizationId, obterMedia(), {
      brandId, conteudo,
      // Guardados para o rasto — e para detectar a mentira. Não para decidir.
      ...(ficheiro.type ? { tipoDeclarado: ficheiro.type } : {}),
      ...(ficheiro.name ? { nomeOriginal: ficheiro.name } : {}),
      ...(alternativo ? { textoAlternativo: alternativo } : {}),
      autor: sessao.actor.email,
      exigirTextoAlternativo: true,
    });
    if (guardado.ok) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'media.carregada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'media_asset', alvoId: guardado.mediaId,
        // O rasto guarda o que foi RECUSADO tanto como o que entrou: um SVG
        // rejeitado é a informação mais interessante desta tabela.
        detalhe: { bytes: conteudo.length, repetido: guardado.repetido, nome: ficheiro.name },
      });
    } else {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'media.recusada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'media_asset', alvoId: 'nenhum',
        detalhe: { erro: guardado.erro, detalhe: guardado.detalhe ?? null, nome: ficheiro.name },
      });
    }
    return guardado;
  });

  if (!r.ok) {
    return voltarPara(destino, { erro: r.erro, ...(r.detalhe ? { detalhe: r.detalhe } : {}) });
  }
  return voltarPara(destino, { guardado: '1' });
}

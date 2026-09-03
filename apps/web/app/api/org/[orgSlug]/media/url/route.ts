import { lookup } from 'node:dns/promises';
import { NextResponse } from 'next/server';
import { buscarPorUrl, guardarMedia, registar } from '@bossaos/db';
import { corpoDaResposta, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../../src/formulario.ts';
import { obterMedia } from '../../../../../../src/servidor.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-023 · trazer uma imagem por URL.
 *
 * ── É o NOSSO servidor que faz este pedido ─────────────────────────────────
 *
 * Sem restrição de destino, isto é um proxy para a rede interna: o cliente
 * escreve um endereço interno e nós vamos lá buscar e devolvemos.
 *
 * O resolvedor é injectado — `lookup` com `all: true`, para virem **todos** os
 * endereços e não só o primeiro. Um nome que resolve para um endereço público e
 * um interno pode dar qualquer um dos dois ao `connect()`, e um proxy que
 * funciona metade das vezes é um proxy.
 *
 * Fica declarado o que isto **não** resolve: entre a nossa resolução e a que o
 * `fetch` faz há uma janela em que o DNS pode mudar de resposta (*rebinding*).
 * Fechá-la exige ligar ao endereço já resolvido com o `Host` original, o que o
 * `fetch` não permite — entra com o condutor remoto de média, e está no E08.md.
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
  const url = texto(dados, 'url');
  const alternativo = texto(dados, 'textoAlternativo');
  if (!brandId || !url) return voltarPara(destino, { erro: 'campos' });

  const resolver = async (nome: string): Promise<readonly string[]> => {
    try {
      // `all: true` — todos, não o primeiro. Basta um interno para recusar.
      return (await lookup(nome, { all: true })).map((e) => e.address);
    } catch {
      return [];
    }
  };

  const buscado = await buscarPorUrl(url, resolver);
  if (!buscado.ok) {
    await comEscopoDoPedido(sessao, (db) => registar(db, sessao.contexto.organizationId, {
      accao: 'media.url.recusada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'media_asset', alvoId: 'nenhum',
      // O endereço fica no rasto: uma tentativa de alcançar a rede interna é
      // precisamente o que se quer poder ver depois.
      detalhe: { erro: buscado.erro, detalhe: buscado.detalhe ?? null, url },
    }));
    return voltarPara(destino, { erro: buscado.erro });
  }

  const r = await comEscopoDoPedido(sessao, async (db) => {
    const guardado = await guardarMedia(db, sessao.contexto.organizationId, obterMedia(), {
      brandId, conteudo: buscado.conteudo,
      ...(buscado.tipoDeclarado ? { tipoDeclarado: buscado.tipoDeclarado } : {}),
      ...(alternativo ? { textoAlternativo: alternativo } : {}),
      autor: sessao.actor.email,
      exigirTextoAlternativo: true,
    });
    if (guardado.ok) {
      await registar(db, sessao.contexto.organizationId, {
        accao: 'media.url.carregada', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
        alvoTipo: 'media_asset', alvoId: guardado.mediaId, detalhe: { url },
      });
    }
    return guardado;
  });

  if (!r.ok) {
    return voltarPara(destino, { erro: r.erro, ...(r.detalhe ? { detalhe: r.detalhe } : {}) });
  }
  return voltarPara(destino, { guardado: '1' });
}

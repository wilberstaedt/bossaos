import { NextResponse } from 'next/server';
import {
  contarProdutos, estadoComercial, podeCapacidade, registar,
} from '@bossaos/db';
import { corpoDaResposta, deTextoParaMenor, estadoHttp, exigirAccao } from '@bossaos/domain';
import { comEscopoDoPedido, resolverPedido } from '../../../../../src/sessao.ts';
import { texto, voltarPara } from '../../../../../src/formulario.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * CAT-008 · criar produto.
 *
 * ── As três verificações do CT-02, pela ordem certa ────────────────────────
 *
 *   1. AUTORIZAÇÃO — esta pessoa pode editar o catálogo?   `exigirAccao`
 *   2. PLANO       — esta organização comprou produtos?    `podeCapacidade`
 *   3. QUOTA       — ainda cabe mais um?                   `usoActual`
 *
 * A (2) e a (3) são a mesma chamada porque o motor as trata como a mesma
 * pergunta com um número. E `usoActual` é **contado agora**, não estimado nem
 * lido de um contador em cache: um contador que se dessincroniza deixa criar
 * para lá da quota, e ninguém repara enquanto a factura não chega.
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
  const nome = texto(dados, 'nome');
  const brandId = texto(dados, 'brandId');
  if (!nome || !brandId) return voltarPara(`/${idioma}/app/${orgSlug}/catalogo/produtos/novo`, { erro: 'campos' });

  const montanteEscrito = texto(dados, 'montante');
  const moeda = texto(dados, 'moeda')?.toUpperCase();
  // Ligados a constantes antes do espalhamento: com `exactOptionalPropertyTypes`
  // uma chave PRESENTE com `undefined` não é a mesma coisa que uma chave ausente,
  // e o Prisma recusa a primeira. É a distinção que o E03 já tinha ensinado.
  const descricao = texto(dados, 'descricao');
  const sku = texto(dados, 'sku');
  const categoryId = texto(dados, 'categoryId');

  const resultado = await comEscopoDoPedido(sessao, async (db) => {
    const permissao = podeCapacidade(
      await estadoComercial(db, sessao.contexto.organizationId),
      { capacidade: 'produtos', intencao: 'criar', usoActual: await contarProdutos(db) },
    );
    if (!permissao.permitido) return { erro: permissao.motivo };

    const produto = await db.product.create({
      data: {
        organizationId: sessao.contexto.organizationId, brandId, nome,
        ...(descricao ? { descricao } : {}),
        ...(sku ? { sku } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      select: { id: true },
    });

    // O preço só se cria se vierem OS DOIS. Um montante sem moeda não é um
    // preço — é um número —, e a moeda por omissão que alguém escolhesse aqui
    // seria a do servidor, que não tem nada a ver com o restaurante.
    if (montanteEscrito && moeda) {
      const menor = deTextoParaMenor(montanteEscrito, moeda);
      // `null` é entrada inválida (separador de milhares, casas a mais). Não se
      // arredonda nem se assume zero: fica sem preço, e a lista di-lo.
      if (menor !== null) {
        await db.priceRule.create({
          data: {
            organizationId: sessao.contexto.organizationId,
            productId: produto.id, montanteMenor: menor, moeda,
          },
        });
      }
    }

    await registar(db, sessao.contexto.organizationId, {
      accao: 'produto.criado', actorId: sessao.actor.id, actorEmail: sessao.actor.email,
      alvoTipo: 'product', alvoId: produto.id, detalhe: { nome },
    });
    return { id: produto.id };
  });

  if ('erro' in resultado) {
    return voltarPara(`/${idioma}/app/${orgSlug}/catalogo/produtos/novo`, { erro: resultado.erro });
  }
  return voltarPara(`/${idioma}/app/${orgSlug}/catalogo/produtos/${resultado.id}`, { guardado: '1' });
}

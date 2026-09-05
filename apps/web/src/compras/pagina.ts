import { notFound } from 'next/navigation';
import {
  artigosDoFornecedor, conferirEncomenda, custoDoInsumo, encomendasDaUnidade,
  fornecedoresDaUnidade,
} from '@bossaos/db';
import { comEscopoDoPedido } from '../sessao.ts';
import { carregarSala } from '../sala-da-pagina.ts';

/**
 * O que as telas de compras precisam, e precisam igual.
 *
 * ── Os três números viajam juntos ─────────────────────────────────────────
 *
 * A conferência de uma encomenda não se pede só na tela que a mostra: é a
 * informação por que esta etapa existe, e uma tela que a esqueça mostra uma
 * encomenda como se estivesse fechada quando faltam duas caixas.
 */
export async function carregarCompras(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarSala(idioma, orgSlug, locationSlug);
  const { fornecedores, encomendas } = await comEscopoDoPedido(base.sessao, async (db) => ({
    fornecedores: await fornecedoresDaUnidade(db, base.unidade.id),
    encomendas: await encomendasDaUnidade(db, base.unidade.id),
  }));
  return { ...base, orgSlug, fornecedores, encomendas };
}

/** Um fornecedor e os seus artigos — com a embalagem e o factor. */
export async function carregarFornecedor(
  idioma: string, orgSlug: string, locationSlug: string, supplierId: string,
) {
  const base = await carregarCompras(idioma, orgSlug, locationSlug);
  const fornecedor = base.fornecedores.find((f) => f.id === supplierId);
  // Um fornecedor de outra unidade dá AUSÊNCIA, e não «proibido»: a mesma
  // decisão do insumo no E25.
  if (!fornecedor) notFound();
  const artigos = await comEscopoDoPedido(base.sessao,
    (db) => artigosDoFornecedor(db, supplierId));
  return { ...base, fornecedor, artigos };
}

/** Uma encomenda, com os TRÊS números por linha e as diferenças derivadas. */
export async function carregarEncomenda(
  idioma: string, orgSlug: string, locationSlug: string, purchaseOrderId: string,
) {
  const base = await carregarCompras(idioma, orgSlug, locationSlug);
  const encomenda = base.encomendas.find((e) => e.id === purchaseOrderId);
  if (!encomenda) notFound();
  const conferencia = await comEscopoDoPedido(base.sessao,
    (db) => conferirEncomenda(db, purchaseOrderId));
  return { ...base, encomenda, conferencia };
}

/** O custo de cada insumo que já teve entradas de compra. */
export async function carregarCustos(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarCompras(idioma, orgSlug, locationSlug);
  const custos = await comEscopoDoPedido(base.sessao, async (db) => {
    const artigos = await db.supplierItem.findMany({
      where: { fornecedor: { locationId: base.unidade.id } },
      select: { itemId: true, insumo: { select: { nome: true, unidade: true } } },
    });
    const vistos = new Map<string, { nome: string; unidade: string }>();
    for (const a of artigos) vistos.set(a.itemId, a.insumo);
    return Promise.all([...vistos].map(async ([itemId, i]) => ({
      itemId, nome: i.nome, unidade: i.unidade,
      custo: await custoDoInsumo(db, itemId),
    })));
  });
  return { ...base, custos };
}

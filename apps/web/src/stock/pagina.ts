import { notFound } from 'next/navigation';
import {
  dividaDeStock, fichasDaUnidade, insumosDaUnidade, movimentosDoInsumo,
} from '@bossaos/db';
import { comEscopoDoPedido } from '../sessao.ts';
import { carregarSala } from '../sala-da-pagina.ts';

/**
 * O que as telas do stock precisam, e precisam igual.
 *
 * ── A dívida vem SEMPRE, e não só no ecrã que a mostra ────────────────────
 *
 * O contrato escolheu «negativo visível» em vez de «impossível», e essa escolha
 * só vale se o negativo aparecer onde a pessoa está a olhar. Por isso a lista de
 * saldos abaixo de zero é carregada com o resto — e cada tela decide onde a põe,
 * mas nenhuma tem de se lembrar de a ir buscar.
 */
export async function carregarStock(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarSala(idioma, orgSlug, locationSlug);
  const { insumos, divida } = await comEscopoDoPedido(base.sessao, async (db) => ({
    insumos: await insumosDaUnidade(db, base.unidade.id),
    divida: await dividaDeStock(db, base.unidade.id),
  }));
  return { ...base, orgSlug, insumos, divida };
}

/** As fichas, com as linhas — a árvore como ela está guardada. */
export async function carregarFichas(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const base = await carregarStock(idioma, orgSlug, locationSlug);
  const fichas = await comEscopoDoPedido(base.sessao,
    (db) => fichasDaUnidade(db, base.unidade.id));
  return { ...base, fichas };
}

/** Um insumo e o que explica o seu saldo. */
export async function carregarInsumo(
  idioma: string, orgSlug: string, locationSlug: string, itemId: string,
) {
  const base = await carregarStock(idioma, orgSlug, locationSlug);
  const insumo = base.insumos.find((i) => i.id === itemId);
  // Um insumo de outra unidade dá AUSÊNCIA, e não «proibido»: a diferença entre
  // 404 e 403 é um oráculo de existência. Mesma regra do E04.
  if (!insumo) notFound();
  const movimentos = await comEscopoDoPedido(base.sessao,
    (db) => movimentosDoInsumo(db, itemId));
  return { ...base, insumo, movimentos };
}

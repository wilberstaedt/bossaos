import { notFound, redirect } from 'next/navigation';
import { listarUnidades, listarProdutos } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido, actorDoPedido, organizacoesDoActor } from '../sessao.ts';

/**
 * O que a casca do Staff precisa, e precisa igual em todas as telas.
 *
 * ── A unidade vem por IDENTIFICADOR, e não por slug ──────────────────────
 *
 * O atlas põe o Staff em `/staff/[locationId]`, e é a escolha certa: o endereço
 * fica num atalho no telemóvel de quem trabalha lá, e um `slug` que mude — porque
 * o dono renomeou a unidade — deixava o atalho a apontar para nada. O
 * identificador não muda.
 *
 * ── E resolve a organização a partir do actor ────────────────────────────
 *
 * O endereço não a traz, de propósito: quem está na sala não escolhe organização,
 * está numa. A unidade de outra organização dá **ausência** — a mesma regra do
 * E04, porque a diferença entre 404 e «proibido» é um oráculo de existência.
 */
export async function carregarStaff(idioma: string, locationId: string) {
  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);

  const organizacoes = await organizacoesDoActor(actor.id);
  for (const org of organizacoes) {
    const sessao = await resolverPedido(org.slug);
    if (!sessao.ok) continue;
    const achado = await comEscopoDoPedido(sessao, async (db) => {
      const unidades = await listarUnidades(db);
      return unidades.find((u: { id: string }) => u.id === locationId) ?? null;
    });
    if (achado) {
      return {
        sessao, actor, orgSlug: org.slug, unidade: achado,
        particao: {
          organizationId: sessao.contexto.organizationId,
          locationId: achado.id,
          utilizadorId: actor.id,
        },
      };
    }
  }
  notFound();
}

/** Um produto para compor, quando a tela oferece isso. Sem catálogo, `null`. */
export async function primeiroProduto(
  sessao: Awaited<ReturnType<typeof carregarStaff>>['sessao'],
): Promise<{ id: string; nome: string } | null> {
  const produtos = await comEscopoDoPedido(sessao, (db) => listarProdutos(db, {}));
  const p = produtos[0];
  return p ? { id: p.id, nome: p.nome } : null;
}

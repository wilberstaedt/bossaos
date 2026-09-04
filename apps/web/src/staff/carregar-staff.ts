import { notFound, redirect } from 'next/navigation';
import {
  listarUnidades, listarProdutos, obterProduto, precoEfectivo, estaDisponivel,
} from '@bossaos/db';
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

/**
 * Um produto para compor, quando a tela oferece isso. Sem catálogo, `null`.
 *
 * Traz o **preço da carta agora**, porque é ele que vai no rascunho como
 * proposta. Sem preço aqui, o servidor nunca teria contra o que comparar e a
 * divergência do E14 não podia acontecer — passaria a estar bem implementada e
 * mal entregue, que é o que a régua do E15 reprova pelo nome.
 */
export async function primeiroProduto(
  sessao: Awaited<ReturnType<typeof carregarStaff>>['sessao'],
  locationId: string,
): Promise<ProdutoParaCompor | null> {
  const produtos = await produtosParaCompor(sessao, locationId);
  return produtos[0] ?? null;
}

/** O que o Staff precisa de um produto para o poder compor. */
export interface ProdutoParaCompor {
  id: string;
  nome: string;
  /** O preço da carta AGORA. É o que o aparelho vai propor, e pode envelhecer. */
  precoMenor: number | null;
  moeda: string | null;
  disponivel: boolean;
  motivo?: string;
}

/**
 * O catálogo desta unidade, com o preço efectivo de cada prato.
 *
 * ── Porque é que o preço vem daqui e não do aparelho ──────────────────────
 *
 * O preço que o telemóvel guarda num rascunho é uma **proposta**: é o que a
 * carta dizia no momento em que alguém escreveu o pedido. Sai daqui porque é o
 * servidor que o sabe — e volta ao servidor no envio, para ele conferir contra a
 * carta do momento em que aceita. Se divergirem, a linha é rejeitada com o
 * motivo e os dois números aparecem no ecrã. É a decisão do
 * `preco-de-um-pedido-escrito-offline.md`, e é o E14 a aterrar aqui.
 *
 * **Sem preço é `null`, nunca zero.** Um prato sem preço na carta não custa
 * nada: é um prato que não se pode cobrar, e são coisas diferentes.
 */
export async function produtosParaCompor(
  sessao: Awaited<ReturnType<typeof carregarStaff>>['sessao'],
  locationId: string,
): Promise<ProdutoParaCompor[]> {
  return comEscopoDoPedido(sessao, async (db) => {
    const produtos = await listarProdutos(db, { estado: 'ACTIVO' });
    return Promise.all(produtos.map(async (p: { id: string; nome: string }) => {
      const preco = await precoEfectivo(db, p.id, locationId, 'SALA');
      const disp = await estaDisponivel(db, p.id, locationId);
      return {
        id: p.id,
        nome: p.nome,
        precoMenor: preco.ok ? preco.preco.montanteMenor : null,
        moeda: preco.ok ? preco.preco.moeda : null,
        disponivel: disp.disponivel,
        ...(disp.motivo ? { motivo: disp.motivo } : {}),
      };
    }));
  });
}

/** Um prato, com tudo o que o STAFF-007 mostra. Ausência dá `null`. */
export async function produtoParaCompor(
  sessao: Awaited<ReturnType<typeof carregarStaff>>['sessao'],
  produtoId: string,
  locationId: string,
): Promise<(ProdutoParaCompor & { descricao: string | null }) | null> {
  return comEscopoDoPedido(sessao, async (db) => {
    const p = await obterProduto(db, produtoId);
    if (!p) return null;
    const preco = await precoEfectivo(db, p.id, locationId, 'SALA');
    const disp = await estaDisponivel(db, p.id, locationId);
    return {
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? null,
      precoMenor: preco.ok ? preco.preco.montanteMenor : null,
      moeda: preco.ok ? preco.preco.moeda : null,
      disponivel: disp.disponivel,
      ...(disp.motivo ? { motivo: disp.motivo } : {}),
    };
  });
}

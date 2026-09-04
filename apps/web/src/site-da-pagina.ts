import { notFound, redirect } from 'next/navigation';
import { listarUnidades, rascunhoDoSite } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from './sessao.ts';

/**
 * O que os doze ecrãs do site precisam de carregar, e carregam igual.
 *
 * ── A unidade de outra organização e uma que não existe saem IGUAIS ───────
 *
 * Ambas dão 404. É a regra do E04 e vale aqui pela mesma razão: a diferença
 * entre as duas respostas é um oráculo de existência — quem tem sessão em A
 * descobria, uma a uma, as unidades de B.
 */
export async function carregarSite(
  idioma: string, orgSlug: string, locationSlug: string,
) {
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    const unidade = unidades.find((u: { slug: string }) => u.slug === locationSlug) ?? null;
    return {
      unidade,
      // O rascunho pode não existir ainda: o site nasce na primeira gravação, e
      // não ao abrir o ecrã. Abrir uma página não é uma intenção de criar.
      rascunho: unidade ? await rascunhoDoSite(db, unidade.id) : null,
    };
  });

  if (!dados.unidade) notFound();
  return { sessao, unidade: dados.unidade, rascunho: dados.rascunho };
}

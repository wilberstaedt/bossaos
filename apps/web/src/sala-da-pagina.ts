import { notFound, redirect } from 'next/navigation';
import { listarUnidades } from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from './sessao.ts';

/**
 * O que os ecrãs da sala carregam, e carregam igual.
 *
 * Mesma decisão que o `site-da-pagina.ts` do E10, e pela mesma razão: são doze
 * ecrãs, e a unidade de outra organização tem de dar **ausência** — a diferença
 * entre 404 e «proibido» é um oráculo de existência.
 */
export async function carregarSala(idioma: string, orgSlug: string, locationSlug: string) {
  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const unidade = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    return unidades.find((u: { slug: string }) => u.slug === locationSlug) ?? null;
  });

  if (!unidade) notFound();
  return { sessao, unidade };
}

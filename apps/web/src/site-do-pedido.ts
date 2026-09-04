import { listarUnidades } from '@bossaos/db';
import { comEscopoDoPedido } from './sessao.ts';

/**
 * A sessão **já resolvida com sucesso**, e não a união com o caso de falha.
 *
 * Derivado do que o `comEscopoDoPedido` aceita em vez de escrito à mão: assim
 * não há uma segunda definição para envelhecer quando aquela mudar.
 */
type SessaoAberta = Parameters<typeof comEscopoDoPedido>[0];

/**
 * Resolve a unidade do `locationSlug` que o formulário mandou.
 *
 * ── Porque é que isto é uma função e não três linhas em cada rota ─────────
 *
 * São cinco rotas a fazer exactamente a mesma coisa, e a coisa tem uma
 * armadilha: **a unidade tem de ser lida com o escopo do pedido**. Uma versão
 * que aceitasse um `locationId` vindo do corpo do formulário deixava editar o
 * site de outra unidade — e a política de linha só apanharia isso se a unidade
 * fosse de outra organização. Dentro da mesma organização, não apanharia.
 *
 * Resolver por `slug` **dentro do escopo** fecha as duas: a unidade sai de uma
 * consulta que já está limitada à organização da sessão.
 */
export async function unidadeDoPedido(
  sessao: SessaoAberta,
  locationSlug: string,
): Promise<{ id: string; slug: string } | null> {
  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));
  const u = unidades.find((x) => x.slug === locationSlug);
  return u ? { id: u.id, slug: u.slug } : null;
}

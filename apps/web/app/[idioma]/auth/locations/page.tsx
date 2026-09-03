import { redirect } from 'next/navigation';
import { Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarUnidades } from '@bossaos/db';
import { actorDoPedido, comEscopoDoPedido, resolverPedido } from '../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * AUTH-008 · Elige dónde vas a trabajar
 *
 * As unidades vêm com escopo de inquilino. Trocar de unidade **revalida**: o que
 * a sessão podia numa não atravessa para a outra, e é o pedido seguinte que
 * volta a perguntar.
 */
export default async function Unidades({
  params,
  searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { idioma } = await params;
  const { org } = await searchParams;
  const m = mensagensDe(idioma);

  const actor = await actorDoPedido();
  if (!actor) redirect(`/${idioma}/auth/login`);
  if (!org) redirect(`/${idioma}/auth/organizations`);

  const sessao = await resolverPedido(org);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const unidades = await comEscopoDoPedido(sessao, (db) => listarUnidades(db));

  return (
    <>
      <p className="bo-estado__sobrancelha">{m.unidades.titulo}</p>
      <h1>{m.unidades.titulo}</h1>
      <div className="bo-escolhas">
        {unidades.map((u, i) => (
          <button key={u.id} type="button" className="bo-escolha" aria-current={i === 0 ? 'true' : undefined}>
            <span>
              <span className="bo-escolha__titulo">{u.nome}</span>
              <span className="bo-escolha__detalhe">{u.moeda} · {u.fuso}</span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
        <Cartao variante="contornado" titulo={m.unidades.contexto}>
          <p className="bo-campo__ajuda">{m.unidades.soAutorizados}</p>
        </Cartao>
      </div>
    </>
  );
}

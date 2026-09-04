import { notFound } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { obterPedido, salaAgora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../../src/pedido-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * ORD-008 · «Mueve el pedido» (atlas p. 144)
 *
 * Mover um pedido de mesa é **uma escrita**: o pedido muda de sessão. As linhas
 * não se copiam — copiá-las criaria duas contas para a mesma comida, e a segunda
 * ficaria a envelhecer sem ninguém saber qual valia.
 *
 * É a mesma forma da transferência de sessão do E13, e pela mesma razão: onde há
 * duas linhas a ter de concordar, é entre elas que a coerência se perde.
 */
export default async function MoverPedido({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; orderId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, orderId } = await params;
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const s = m.salaE13;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const { pedido, mesas } = await comEscopoDoPedido(sessao, async (db) => ({
    pedido: await obterPedido(db, orderId),
    mesas: await salaAgora(db, unidade.id, sessao.contexto.organizationId),
  }));
  if (!pedido || pedido.locationId !== unidade.id) notFound();

  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/orders`;
  const comSessao = mesas.filter((x) => x.sessao);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{pedido.numero}</p>
          <h1>{p.mover}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/${orderId}`}>{m.comum.voltar}</a>
      </div>

      {comSessao.length === 0 ? (
        <Aviso titulo={p.mesa}>{s.semSessao}</Aviso>
      ) : (
        <Cartao titulo={p.mover}>
          <form method="post" action={`/api/org/${orgSlug}/pedidos`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="guardar" />
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="versao" value={pedido.versao} />
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="tableSessionId">{p.mesa}</label>
              <select className="bo-campo__controlo" id="tableSessionId" name="tableSessionId"
                      defaultValue={pedido.tableSessionId ?? comSessao[0]?.sessao?.id}>
                {comSessao.map((x) => (
                  <option key={x.sessao!.id} value={x.sessao!.id}>{x.codigo} · {x.area.nome}</option>
                ))}
              </select>
            </span>
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--primario" type="submit">{p.accaoMover}</button>
            </div>
          </form>
        </Cartao>
      )}
    </div>
  );
}

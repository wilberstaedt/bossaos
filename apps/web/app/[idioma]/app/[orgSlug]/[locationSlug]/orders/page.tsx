import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarDinheiro, formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarPedidos, totalDoPedido } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../src/pedido-da-pagina.ts';
import { NavegacaoDePedidos } from '../../../../../../src/componentes/NavegacaoDePedidos.tsx';

export const dynamic = 'force-dynamic';

/**
 * ORD-001 · «Todos los pedidos» (atlas p. 137)
 *
 * O total de cada pedido é a soma dos **instantâneos** das linhas aceites, e não
 * uma leitura do catálogo. É o aceite 3 a aparecer na lista: a conta de quem está
 * sentado não muda porque a cozinha actualizou a carta a meio do serviço.
 */
export default async function PedidosDaUnidade({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const pedidos = await comEscopoDoPedido(sessao, (db) => listarPedidos(db, unidade.id));
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/orders`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{p.pedidos}</h1>
        </div>
        <a className="bo-botao bo-botao--primario" href={`${base}/novo`}>{p.novo}</a>
      </div>

      <NavegacaoDePedidos idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="" />

      {pedidos.length === 0 ? (
        <Aviso titulo={p.pedidos}>{p.semPedidos}</Aviso>
      ) : (
        <ul className="bo-publico__lista">
          {pedidos.map((pedido) => {
            const total = totalDoPedido(pedido.linhas.map((l) => ({
              estado: String(l.estado), precoMenor: l.precoMenor,
              quantidade: l.quantidade, moeda: l.moeda,
            })));
            return (
              <li key={pedido.id} className="bo-publico__produto">
                <a href={`${base}/${pedido.id}`}>
                  <span className="bo-publico__nome">{pedido.numero}</span>
                  <span className="bo-publico__preco">
                    {/* Sem linhas aceites não há total — e diz-se por palavras.
                        Um «0,00 €» seria um total, e não a ausência de conta. */}
                    {total ? formatarDinheiro(total, idioma) : p.semTotal}
                  </span>
                </a>
                <p className="bo-publico__descricao">
                  <Etiqueta tom={pedido.estado === 'CANCELADO' ? 'perigo' : 'neutro'}>
                    {pedido.estado}
                  </Etiqueta>
                  {' · '}{p.canalDoPedido}: {pedido.canal}
                  {' · '}{formatarHora(pedido.createdAt, idioma)}
                  {' · '}{pedido.linhas.length} {p.linhas.toLowerCase()}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

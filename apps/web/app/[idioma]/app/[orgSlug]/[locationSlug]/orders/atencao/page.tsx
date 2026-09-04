import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarPedidos } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../src/pedido-da-pagina.ts';
import { NavegacaoDePedidos } from '../../../../../../../src/componentes/NavegacaoDePedidos.tsx';

export const dynamic = 'force-dynamic';

/**
 * ORD-010 · «Pedidos que necesitan atención» (atlas p. 146)
 *
 * ── O que conta como «precisa de atenção», e porque não é um estado ──────
 *
 * Não há coluna `precisa_de_atencao`. Um sinalizador guardado envelhece: alguém
 * resolve o problema e a bandeira fica, ou o problema muda e a bandeira não.
 *
 * Aqui a lista é **derivada** do que se vê: pedidos com linhas rejeitadas — o
 * esgotado e o preço divergente, que são as duas coisas que alguém tem de decidir
 * — e pedidos aceites que ninguém moveu. Deriva-se a cada leitura, e por isso não
 * pode mentir.
 */
export default async function PedidosComProblema({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const todos = await comEscopoDoPedido(sessao, (db) => listarPedidos(db, unidade.id));
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/orders`;

  const precisam = todos.filter((o) =>
    o.linhas.some((l) => l.estado === 'REJEITADA') || o.estado === 'ACEITE');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{p.atencao}</h1>
        </div>
      </div>

      <NavegacaoDePedidos idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/atencao" />

      {precisam.length === 0 ? (
        <Aviso tom="sucesso" titulo={p.atencao}>{p.semAtencao}</Aviso>
      ) : (
        <ul className="bo-publico__lista">
          {precisam.map((o) => {
            const rejeitadas = o.linhas.filter((l) => l.estado === 'REJEITADA');
            return (
              <li key={o.id} className="bo-publico__produto">
                <a href={`${base}/${o.id}`}>
                  <span className="bo-publico__nome">{o.numero}</span>
                  <span className="bo-publico__preco">
                    <Etiqueta tom={rejeitadas.length > 0 ? 'perigo' : 'aviso'}>
                      {rejeitadas.length > 0 ? p.rejeitada : o.estado}
                    </Etiqueta>
                  </span>
                </a>
                <p className="bo-publico__descricao">
                  {formatarHora(o.createdAt, idioma)}
                  {rejeitadas.length > 0
                    ? ` · ${rejeitadas.length} ${p.linhas.toLowerCase()} · ${p.motivo}: ${
                        [...new Set(rejeitadas.map((l) => String(l.motivoRejeicao)))].join(', ')}`
                    : ''}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

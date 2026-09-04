import { notFound } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { obterPedido, totalDoPedido } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../src/pedido-da-pagina.ts';
import { LinhasDoPedido } from '../../../../../../../src/componentes/LinhasDoPedido.tsx';

export const dynamic = 'force-dynamic';

/**
 * ORD-002 · «Pedido #A104» (atlas p. 138)
 *
 * ── O reenvio aparece como REPETIDO, e não como um pedido novo ────────────
 *
 * Quando o cliente reenvia depois do commit, a rota devolve a mesma resposta e
 * traz `repetido=1`. O ecrã diz isso: sem essa palavra, quem enviou duas vezes
 * ficava sem saber se cobrou duas vezes — e é essa dúvida que faz alguém cancelar
 * um pedido bom.
 */
export default async function FichaDoPedido({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; orderId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, orderId } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const pedido = await comEscopoDoPedido(sessao, (db) => obterPedido(db, orderId));
  if (!pedido || pedido.locationId !== unidade.id) notFound();

  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/orders`;
  const total = totalDoPedido(pedido.linhas.map((l) => ({
    estado: String(l.estado), precoMenor: l.precoMenor,
    quantidade: l.quantidade, moeda: l.moeda,
  })));
  const rejeitadas = pedido.linhas.filter((l) => l.estado === 'REJEITADA');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{pedido.canal} · {pedido.estado}</p>
          <h1>{pedido.numero}</h1>
        </div>
        <div className="bo-estado__accoes">
          <a className="bo-botao bo-botao--secundario" href={`${base}/${orderId}/ronda`}>{p.ronda}</a>
          <a className="bo-botao bo-botao--secundario" href={`${base}/${orderId}/editar`}>{p.editar}</a>
          <a className="bo-botao bo-botao--secundario" href={`${base}/${orderId}/historia`}>{p.historia}</a>
        </div>
      </div>

      {busca.repetido === '1' ? (
        <Aviso tom="info" titulo={p.repetido}>
          {/* Dizer «repetido» é o que impede alguém de cancelar um pedido bom por
              julgar que cobrou duas vezes. */}
          {p.comandoId}
        </Aviso>
      ) : null}
      {rejeitadas.length > 0 ? (
        <Aviso tom="aviso" titulo={p.rejeitada}>
          <p>{p.avisoCarrinho}</p>
          {rejeitadas.some((l) => l.motivoRejeicao === 'PRECO_DIVERGENTE')
            ? <p>{p.avisoDivergente}</p> : null}
        </Aviso>
      ) : null}

      <Cartao titulo={p.linhas}>
        <dl className="bo-estado__factos">
          <dt>{p.total}</dt>
          <dd>{total ? formatarDinheiro(total, idioma) : p.semTotal}</dd>
          <dt>{p.mesa}</dt>
          <dd>{pedido.tableSessionId ?? p.semMesa}</dd>
          <dt>{p.versao}</dt>
          <dd>{pedido.versao}</dd>
          <dt>{p.envios}</dt>
          <dd>{pedido.envios.length}</dd>
        </dl>

        <LinhasDoPedido idioma={idioma} linhas={pedido.linhas.map((l) => ({
          id: l.id, nome: l.nome, quantidade: l.quantidade,
          precoMenor: l.precoMenor, precoPropostoMenor: l.precoPropostoMenor,
          moeda: l.moeda, estado: String(l.estado),
          motivoRejeicao: l.motivoRejeicao ? String(l.motivoRejeicao) : null,
        }))} />

        <div className="bo-estado__accoes">
          <a className="bo-botao bo-botao--secundario" href={`${base}/${orderId}/mover`}>{p.mover}</a>
          <a className="bo-botao bo-botao--secundario" href={`${base}/${orderId}/cancelar`}>{p.cancelar}</a>
        </div>
      </Cartao>
    </div>
  );
}

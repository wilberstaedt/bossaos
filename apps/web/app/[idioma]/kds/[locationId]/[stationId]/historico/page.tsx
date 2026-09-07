import { CabecalhoDePagina } from '@bossaos/ui';
import { notFound } from 'next/navigation';
import { tarefasDaEstacao } from '@bossaos/db';
import { formatarHora, type Idioma } from '@bossaos/i18n';
import {
  carregarKds, estacaoDaUnidade,
} from '../../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { porChaveDoKds, textosDoKds } from '../../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../../src/kds/NavegacaoDoKds.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-011 · «Historial de cocina» (atlas p. 194)
 *
 * O que esta estação já resolveu — **incluindo o que foi cancelado, e porquê**.
 * Esconder os cancelados fazia desaparecer o tempo e os ingredientes que já
 * foram gastos, que é precisamente o que o contrato manda registar.
 */
export default async function HistoricoDoKds({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; stationId: string }>;
}) {
  const { idioma, locationId, stationId } = await params;
  const s = textosDoKds(idioma);
  const { sessao, unidade, estacoes } = await carregarKds(idioma, locationId);
  const estacao = estacaoDaUnidade(estacoes, stationId);
  if (!estacao) notFound();

  const tarefas = await comEscopoDoPedido(sessao,
    (db) => tarefasDaEstacao(db, unidade.id, estacao.id, { incluirResolvidas: true }));
  const resolvidas = tarefas.filter((t: { estado: string }) =>
    t.estado === 'ENTREGUE' || t.estado === 'CANCELADA');

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.historico} tela="KDS-011" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/historico" />

      <p data-teste="quantos">{resolvidas.length}</p>
      {resolvidas.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="nada">{s.semHistorico}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="historico">
          {resolvidas.map((t) => (
            <li key={t.id} className="bo-publico__produto" data-teste="resolvida"
                data-estado={t.estado}>
              <span className="bo-publico__nome">
                {t.linha.quantidade}× {t.linha.nome}
              </span>
              <span className="bo-publico__preco">
                {porChaveDoKds(s, `tarefa${t.estado}`) ?? t.estado}
              </span>
              <p className="bo-publico__descricao">
                {t.pedido.numero}
                {t.entregueEm ? ` · ${formatarHora(t.entregueEm, idioma)}` : ''}
                {/* O motivo do cancelamento aparece. Um cancelamento sem razão
                    visível é uma decisão que ninguém consegue rever. */}
                {t.motivoCancelamento ? ` · ${s.motivo}: ${t.motivoCancelamento}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

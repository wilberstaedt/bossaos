import { CabecalhoDePagina } from '@bossaos/ui';
import { notFound } from 'next/navigation';
import { repartirBacklog } from '@bossaos/domain';
import { tarefasDaEstacao } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import {
  agoraNoServidor, carregarKds, estacaoDaUnidade,
} from '../../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { Bilhete, textosDoKds, type TarefaNoEcra } from '../../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../../src/kds/NavegacaoDoKds.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-010 · «Pedidos en espera» (atlas p. 193) — o backlog inteiro e alcançável.
 *
 * ── Esta tela é a razão de o limite ser VISUAL ────────────────────────────
 *
 * *«Nunca descartar um pedido por falta de espaço. O ecrã mostra um conjunto
 * principal; o backlog continua inteiro e alcançável.»* O erro concreto: o KDS
 * mostra doze, chegam vinte, e os oito de baixo desaparecem em vez de ficarem
 * numa segunda página. Parece limpo, e é comida que nunca é feita.
 *
 * Aqui estão os que não couberam — **e os dois números**: quantos existem e
 * quantos cabem no primeiro ecrã. «O backlog tem itens» não é uma resposta.
 */
export default async function EsperaNoKds({
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
    (db) => tarefasDaEstacao(db, unidade.id, estacao.id));
  const agora = await agoraNoServidor(sessao);
  const { visiveis, emEspera, total } = repartirBacklog(tarefas, estacao.limiteVisivel);

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.emEspera} tela="KDS-010" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/espera" />

      {/* Os dois números, ditos em voz alta. É o que a régua exige. */}
      <p className="bo-kds__contagem">
        <span>{s.noEcra}: <strong data-teste="no-ecra">{visiveis.length}</strong></span>
        <span>{s.noTotal}: <strong data-teste="no-total">{total}</strong></span>
      </p>

      {emEspera.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-espera">{s.semEspera}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="em-espera">
          {emEspera.map((t) => (
            <Bilhete key={t.id} tarefa={t as unknown as TarefaNoEcra}
                     agoraNoServidorMs={agora} s={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

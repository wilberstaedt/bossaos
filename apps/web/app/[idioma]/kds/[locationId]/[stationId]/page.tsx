import { notFound } from 'next/navigation';
import { Aviso, CabecalhoDePagina } from '@bossaos/ui';
import { repartirBacklog } from '@bossaos/domain';
import { tarefasDaEstacao } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import {
  agoraNoServidor, carregarKds, estacaoDaUnidade,
} from '../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { Bilhete, textosDoKds, type TarefaNoEcra } from '../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../src/kds/NavegacaoDoKds.tsx';
import { AccoesDoBilhete } from '../../../../../src/kds/AccoesDoBilhete.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-002 · «Cocina caliente» (atlas p. 185) — o quadro de bilhetes da estação.
 *
 * ── Os dois números dizem-se os dois ──────────────────────────────────────
 *
 * *«Nunca descartar um pedido por falta de espaço. O ecrã mostra um conjunto
 * principal; o backlog continua inteiro e alcançável.»* O erro concreto: o KDS
 * mostra doze, chegam vinte, e os oito de baixo desaparecem em vez de ficarem
 * numa segunda página. Parece limpo, e é comida que nunca é feita.
 *
 * Por isso esta tela escreve **quantos estão no ecrã** e **quantos existem** —
 * dois números, não «o backlog tem itens». E o que não cabe está no KDS-010, com
 * ligação a partir daqui.
 */
export default async function BilhetesDaEstacao({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; stationId: string }>;
}) {
  const { idioma, locationId, stationId } = await params;
  const s = textosDoKds(idioma);
  const { sessao, unidade, estacoes, orgSlug } = await carregarKds(idioma, locationId);
  const estacao = estacaoDaUnidade(estacoes, stationId);
  if (!estacao) notFound();

  const tarefas = await comEscopoDoPedido(sessao,
    (db) => tarefasDaEstacao(db, unidade.id, estacao.id));
  const agora = await agoraNoServidor(sessao);
  // O limite é de APRESENTAÇÃO. A consulta trouxe tudo, e o que não cabe fica
  // contado e alcançável — nunca fora de existência.
  const { visiveis, emEspera, total } = repartirBacklog(tarefas, estacao.limiteVisivel);
  const base = `/${idioma}/kds/${locationId}/${stationId}`;

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={estacao.nome} tela="KDS-002" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId} actual="" />

      <p className="bo-kds__contagem">
        <span>{s.noEcra}: <strong data-teste="no-ecra">{visiveis.length}</strong></span>
        <span>{s.noTotal}: <strong data-teste="no-total">{total}</strong></span>
      </p>
      <p className="bo-campo__ajuda">{s.tempoDoServidor}</p>

      {total === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-bilhetes">{s.semBilhetes}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="bilhetes">
          {visiveis.map((t) => (
            <Bilhete key={t.id} tarefa={t as unknown as TarefaNoEcra}
                     agoraNoServidorMs={agora} s={s}>
              <AccoesDoBilhete idioma={idioma} locationId={locationId} stationId={stationId}
                               orgSlug={orgSlug} taskId={t.id} estado={t.estado} seccao=""
                               m={{ comecar: s.accaoComecar, pronta: s.accaoPronta,
                                    entregar: s.accaoEntregar }} />
            </Bilhete>
          ))}
        </ul>
      )}

      {emEspera.length > 0 ? (
        <div data-teste="ha-espera">
          <Aviso tom="info" titulo={s.emEspera}>
            {emEspera.length} · <a href={`${base}/espera`} data-seccao="KDS-010">{s.emEspera}</a>
          </Aviso>
        </div>
      ) : null}
    </div>
  );
}

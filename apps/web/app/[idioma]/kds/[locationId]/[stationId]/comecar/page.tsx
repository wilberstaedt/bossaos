import { CabecalhoDePagina } from '@bossaos/ui';
import { notFound } from 'next/navigation';
import { tarefasDaEstacao } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import {
  agoraNoServidor, carregarKds, estacaoDaUnidade,
} from '../../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { Bilhete, textosDoKds, type TarefaNoEcra } from '../../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../../src/kds/NavegacaoDoKds.tsx';
import { AccoesDoBilhete } from '../../../../../../src/kds/AccoesDoBilhete.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-004 · «Empieza la preparación» (atlas p. 187)
 *
 * O que ainda ninguém agarrou. A ordem é prioridade primeiro e chegada depois —
 * um bilhete priorizado no fim da lista é uma prioridade que não serve de nada.
 */
export default async function ComecarNoKds({
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
  const porComecar = tarefas.filter((t: { estado: string }) => t.estado === 'POR_INICIAR');
  const agora = await agoraNoServidor(sessao);

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.comecar} tela="KDS-004" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/comecar" />

      <p data-teste="quantos">{porComecar.length}</p>
      {porComecar.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="nada">{s.semBilhetes}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="bilhetes">
          {porComecar.map((t) => (
            <Bilhete key={t.id} tarefa={t as unknown as TarefaNoEcra}
                     agoraNoServidorMs={agora} s={s}>
              <AccoesDoBilhete idioma={idioma} locationId={locationId} stationId={stationId}
                               orgSlug={orgSlug} taskId={t.id} estado={t.estado} seccao="/comecar"
                               m={{ comecar: s.accaoComecar, pronta: s.accaoPronta,
                                    entregar: s.accaoEntregar }} />
            </Bilhete>
          ))}
        </ul>
      )}
    </div>
  );
}

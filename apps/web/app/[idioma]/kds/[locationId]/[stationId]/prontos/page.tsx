import { notFound } from 'next/navigation';
import { tarefasDaEstacao } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import {
  agoraNoServidor, carregarKds, estacaoDaUnidade,
} from '../../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import {
  Bilhete, CabecalhoDoKds, textosDoKds, type TarefaNoEcra,
} from '../../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../../src/kds/NavegacaoDoKds.tsx';
import { AccoesDoBilhete } from '../../../../../../src/kds/AccoesDoBilhete.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-005 · «Todo listo en cocina» (atlas p. 188)
 *
 * ── O que esta estação já acabou, e ainda não saiu ────────────────────────
 *
 * «Pronto» aqui é da **tarefa**, não do pedido. Um bilhete pronto nesta estação
 * pode pertencer a um pedido que ainda espera pela fritadeira — e é por isso que
 * esta tela não diz «pronto para sair»: dizê-lo faria alguém levar comida a uma
 * mesa que ainda não tem tudo. Quem sabe se o pedido inteiro está é o passe
 * (KDS-012), que conta as tarefas todas.
 */
export default async function ProntosNoKds({
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
    (db) => tarefasDaEstacao(db, unidade.id, estacao.id, { incluirResolvidas: true }));
  const prontas = tarefas.filter((t: { estado: string }) => t.estado === 'PRONTA');
  const agora = await agoraNoServidor(sessao);

  return (
    <div className="bo-pagina">
      <CabecalhoDoKds sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.tudoPronto} tela="KDS-005" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/prontos" />

      {/* Um número sozinho não diz nada. As duas telas irmãs escrevem
          `{s.noEcra}: <strong>…</strong>`; esta imprimia «0» e mais nada, e no
          estado vazio era literalmente um zero a meio de um ecrã escuro. */}
      <p><span>{s.noEcra}: <strong data-teste="quantos">{prontas.length}</strong></span></p>
      {prontas.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="nada">{s.semBilhetes}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="bilhetes">
          {prontas.map((t) => (
            <Bilhete key={t.id} tarefa={t as unknown as TarefaNoEcra}
                     agoraNoServidorMs={agora} s={s}>
              <AccoesDoBilhete idioma={idioma} locationId={locationId} stationId={stationId}
                               orgSlug={orgSlug} taskId={t.id} estado={t.estado} seccao="/prontos"
                               m={{ comecar: s.accaoComecar, pronta: s.accaoPronta,
                                    entregar: s.accaoEntregar }} />
            </Bilhete>
          ))}
        </ul>
      )}
    </div>
  );
}

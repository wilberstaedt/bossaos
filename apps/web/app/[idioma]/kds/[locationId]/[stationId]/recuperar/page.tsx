import { notFound } from 'next/navigation';
import { Aviso } from '@bossaos/ui';
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

export const dynamic = 'force-dynamic';

/**
 * KDS-007 · «Recupera un ticket» (atlas p. 190)
 *
 * ── O recall NÃO cria venda nova ──────────────────────────────────────────
 *
 * *«Recall reabre uma tarefa permitida sem criar venda nova nem consumo novo. Um
 * recall que gera uma segunda venda transforma um engano da cozinha numa
 * cobrança ao cliente.»*
 *
 * Por isso isto é uma **transição de estado da tarefa** — `PRONTA` ou `ENTREGUE`
 * de volta a `EM_PREPARO` — e não um pedido novo. A linha do pedido não é
 * tocada, e o total da conta não mexe.
 */
export default async function RecuperarNoKds({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; stationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, locationId, stationId } = await params;
  const busca = (await searchParams) ?? {};
  const s = textosDoKds(idioma);
  const { sessao, unidade, estacoes, orgSlug } = await carregarKds(idioma, locationId);
  const estacao = estacaoDaUnidade(estacoes, stationId);
  if (!estacao) notFound();

  const tarefas = await comEscopoDoPedido(sessao,
    (db) => tarefasDaEstacao(db, unidade.id, estacao.id, { incluirResolvidas: true }));
  const recuperaveis = tarefas.filter(
    (t: { estado: string }) => t.estado === 'PRONTA' || t.estado === 'ENTREGUE');
  const agora = await agoraNoServidor(sessao);

  return (
    <div className="bo-pagina">
      <CabecalhoDoKds sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.recuperar} tela="KDS-007" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/recuperar" />

      {busca.feito === 'EM_PREPARO' ? (
        <div data-teste="recuperado">
          <Aviso tom="sucesso" titulo={s.recuperar}>{s.tarefaEM_PREPARO}</Aviso>
        </div>
      ) : null}

      <p data-teste="quantos">{recuperaveis.length}</p>
      {recuperaveis.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="nada">{s.semHistorico}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="recuperaveis">
          {recuperaveis.map((t) => (
            <Bilhete key={t.id} tarefa={t as unknown as TarefaNoEcra}
                     agoraNoServidorMs={agora} s={s}>
              <form method="post" action={`/api/org/${orgSlug}/kds`}>
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="locationId" value={locationId} />
                <input type="hidden" name="stationId" value={stationId} />
                <input type="hidden" name="seccao" value="/recuperar" />
                <input type="hidden" name="accao" value="transitar" />
                <input type="hidden" name="taskId" value={t.id} />
                <input type="hidden" name="para" value="EM_PREPARO" />
                <button className="bo-botao bo-botao--secundario bo-botao--operacao" type="submit"
                        data-teste="recuperar">
                  {s.accaoRecuperar}
                </button>
              </form>
            </Bilhete>
          ))}
        </ul>
      )}
    </div>
  );
}

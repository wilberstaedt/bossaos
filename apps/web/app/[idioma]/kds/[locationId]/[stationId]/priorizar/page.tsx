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
 * KDS-008 · «Prioriza con un motivo» (atlas p. 191)
 *
 * ── O motivo é obrigatório, e o título da tela di-lo ──────────────────────
 *
 * Uma prioridade sem razão é uma decisão que ninguém consegue rever depois do
 * turno. A fila do KDS é onde as decisões de quem grita mais alto se disfarçam
 * de decisões do sistema — e a única defesa é a razão ficar escrita ao lado do
 * bilhete que passou à frente.
 *
 * O servidor recusa sem motivo. Este ecrã torna o campo obrigatório também no
 * navegador, mas a garantia é a de trás: as duas falham por motivos diferentes.
 */
export default async function PriorizarNoKds({
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
    (db) => tarefasDaEstacao(db, unidade.id, estacao.id));
  const agora = await agoraNoServidor(sessao);

  return (
    <div className="bo-pagina">
      <CabecalhoDoKds sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.priorizar} tela="KDS-008" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/priorizar" />

      {busca.erro === 'sem_motivo' ? (
        <div data-teste="sem-motivo">
          <Aviso tom="perigo" titulo={s.motivo}>{s.motivoDaPrioridade}</Aviso>
        </div>
      ) : null}

      <p className="bo-campo__ajuda">{s.motivoDaPrioridade}</p>
      <p data-teste="quantos">{tarefas.length}</p>

      {tarefas.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="nada">{s.semBilhetes}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="bilhetes">
          {tarefas.map((t) => (
            <Bilhete key={t.id} tarefa={t as unknown as TarefaNoEcra}
                     agoraNoServidorMs={agora} s={s}>
              <form method="post" action={`/api/org/${orgSlug}/kds`} data-teste="priorizar">
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="locationId" value={locationId} />
                <input type="hidden" name="stationId" value={stationId} />
                <input type="hidden" name="seccao" value="/priorizar" />
                <input type="hidden" name="accao" value="priorizar" />
                <input type="hidden" name="taskId" value={t.id} />
                <input type="hidden" name="prioridade" value="1" />
                <span className="bo-campo">
                  <label className="bo-campo__rotulo" htmlFor={`motivo-${t.id}`}>{s.motivo}</label>
                  <input className="bo-campo__controlo" id={`motivo-${t.id}`} name="motivo"
                         required />
                </span>
                <button className="bo-botao bo-botao--secundario bo-botao--operacao" type="submit">
                  {s.accaoPriorizar}
                </button>
              </form>
            </Bilhete>
          ))}
        </ul>
      )}
    </div>
  );
}

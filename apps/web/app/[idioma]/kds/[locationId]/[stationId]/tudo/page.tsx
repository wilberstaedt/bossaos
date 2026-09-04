import { notFound } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
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
 * KDS-009 · «Todo lo que hay que preparar» (atlas p. 192)
 *
 * ── Inclui o que NÃO está encaminhado, e é esse o ponto ───────────────────
 *
 * Uma tarefa sem estação não aparece em ecrã de estação nenhum — por desenho,
 * porque ninguém decidiu quem a faz. Se não aparecesse **também** aqui, ficava
 * invisível em todo o produto, e o trabalho desaparecia em silêncio: o defeito
 * que esta etapa inteira existe para impedir.
 *
 * Esta tela é onde alguém repara que falta uma regra, e por isso a ligação para
 * a configuração está ao lado do aviso.
 */
export default async function TudoNoKds({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; stationId: string }>;
}) {
  const { idioma, locationId, stationId } = await params;
  const s = textosDoKds(idioma);
  const { sessao, unidade, estacoes, orgSlug } = await carregarKds(idioma, locationId);
  const estacao = estacaoDaUnidade(estacoes, stationId);
  if (!estacao) notFound();

  const { daEstacao, semEstacao } = await comEscopoDoPedido(sessao, async (db) => ({
    daEstacao: await tarefasDaEstacao(db, unidade.id, estacao.id),
    semEstacao: await tarefasDaEstacao(db, unidade.id, null),
  }));
  const agora = await agoraNoServidor(sessao);

  return (
    <div className="bo-pagina">
      <CabecalhoDoKds sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.tudoAPreparar} tela="KDS-009" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/tudo" />

      <p data-teste="quantos">{daEstacao.length + semEstacao.length}</p>

      {semEstacao.length > 0 ? (
        <div data-teste="nao-encaminhado">
          <Aviso tom="perigo" urgente titulo={`${s.naoEncaminhado}: ${semEstacao.length}`}>
            <p>{s.naoEncaminhadoAjuda}</p>
            <ul className="bo-lista">
              {semEstacao.map((t) => (
                <li key={t.id} data-teste="orfa">
                  {t.linha.quantidade}× {t.linha.nome} · {t.pedido.numero}
                </li>
              ))}
            </ul>
            <a href={`/${idioma}/app/${orgSlug}/${unidade.slug}/settings/estacoes`}
               data-seccao="SET-005">{s.cadaProdutoASuaEstacao}</a>
          </Aviso>
        </div>
      ) : null}

      {daEstacao.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="nada">{s.semBilhetes}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="bilhetes">
          {daEstacao.map((t) => (
            <Bilhete key={t.id} tarefa={t as unknown as TarefaNoEcra}
                     agoraNoServidorMs={agora} s={s} />
          ))}
        </ul>
      )}

      <p className="bo-kds__contagem">
        <Etiqueta tom="neutro">{estacao.nome}: {daEstacao.length}</Etiqueta>
        <Etiqueta tom={semEstacao.length > 0 ? 'perigo' : 'neutro'}>
          {s.naoEncaminhado}: {semEstacao.length}
        </Etiqueta>
      </p>
    </div>
  );
}

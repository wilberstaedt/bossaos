import { notFound } from 'next/navigation';
import { Aviso, CabecalhoDePagina } from '@bossaos/ui';
import { estadoDerivado } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarKds, estacaoDaUnidade } from '../../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { textosDoKds } from '../../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../../src/kds/NavegacaoDoKds.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-013 · «Confirma la salida» (atlas p. 196)
 *
 * ── Só aparece aqui o que está pronto POR INTEIRO ─────────────────────────
 *
 * É a metade prática de «pronto parcial não é pronto»: se um pedido meio pronto
 * aparecesse nesta lista, alguém confirmava a saída dele — e a comida saía
 * incompleta. O filtro é o `estadoDerivado`, e não uma condição escrita à mão
 * aqui: duas cópias da regra é como se descobre um dia que discordam.
 */
export default async function SaidaDoKds({
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

  const tarefas = await comEscopoDoPedido(sessao, (db) => db.productionTask.findMany({
    where: { locationId: unidade.id, estado: { notIn: ['CANCELADA'] } },
    include: { pedido: { select: { numero: true } } },
    orderBy: { criadaEm: 'asc' },
  }));

  const porPedido = new Map<string, typeof tarefas>();
  for (const t of tarefas) porPedido.set(t.orderId, [...(porPedido.get(t.orderId) ?? []), t]);
  const prontos = [...porPedido.entries()]
    .filter(([, ts]) => estadoDerivado(ts)?.estado === 'PRONTO');

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.confirmarSaida} tela="KDS-013" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/saida" />

      {busca.feito === 'ENTREGUE' ? (
        <div data-teste="saiu"><Aviso tom="sucesso" titulo={s.confirmarSaida}>
          {s.tarefaENTREGUE}</Aviso></div>
      ) : null}

      <p data-teste="quantos">{prontos.length}</p>
      {prontos.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="nada">{s.semBilhetes}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="prontos">
          {prontos.map(([orderId, ts]) => (
            <li key={orderId} className="bo-publico__produto" data-teste="pedido-pronto">
              <span className="bo-publico__nome">{ts[0]!.pedido.numero}</span>
              <span className="bo-publico__preco">{ts.length}</span>
              {/* Uma confirmação por TAREFA: o expo confirma que cada peça saiu.
                  Um botão só que marcasse tudo escondia a peça que ficou para
                  trás — e é essa que o cliente descobre. */}
              {ts.map((t) => (
                <form key={t.id} method="post" action={`/api/org/${orgSlug}/kds`}>
                  <input type="hidden" name="idioma" value={idioma} />
                  <input type="hidden" name="locationId" value={locationId} />
                  <input type="hidden" name="stationId" value={stationId} />
                  <input type="hidden" name="seccao" value="/saida" />
                  <input type="hidden" name="accao" value="transitar" />
                  <input type="hidden" name="taskId" value={t.id} />
                  <input type="hidden" name="para" value="ENTREGUE" />
                  <button className="bo-botao bo-botao--primario bo-botao--operacao" type="submit"
                          data-teste="confirmar-saida">
                    {s.accaoEntregar}
                  </button>
                </form>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

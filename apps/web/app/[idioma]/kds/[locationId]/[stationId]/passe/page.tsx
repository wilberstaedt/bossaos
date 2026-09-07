import { notFound } from 'next/navigation';
import { CabecalhoDePagina, Etiqueta } from '@bossaos/ui';
import { estadoDerivado } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import {
  agoraNoServidor, carregarKds, estacaoDaUnidade,
} from '../../../../../../src/kds/carregar-kds.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { TempoDoBilhete, porChaveDoKds, textosDoKds } from '../../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../../src/kds/NavegacaoDoKds.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-012 · «Pase y coordinación» (atlas p. 195) — o expo.
 *
 * ── É aqui que «pronto parcial não é pronto» tem de se VER ────────────────
 *
 * *«No expo, o estado só passa a completo quando todas as tarefas necessárias
 * estiverem resolvidas. Uma mesa com três pratos em que dois estão prontos é uma
 * mesa que ainda não sai — e mostrar "pronto" ali faz sair comida fria.»*
 *
 * Por isso esta tela mostra a **contagem** ao lado do estado: `2/3` não é um
 * estado novo, é a informação que falta para a pessoa decidir. E o estado vem do
 * `estadoDerivado`, que é o único sítio onde a regra vive — a tela não a
 * reimplementa, senão passavam a existir duas.
 *
 * ── E o expo vê TODAS as estações, de propósito ───────────────────────────
 *
 * É a única tela onde isso é verdade, e é o que ele faz: coordenar a saída. O
 * invariante «uma estação só vê as suas tarefas» é sobre estações de preparação;
 * o expo não prepara nada, e sem ver tudo não pode dizer o que sai.
 */
export default async function PasseDoKds({
  params,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; stationId: string }>;
}) {
  const { idioma, locationId, stationId } = await params;
  const s = textosDoKds(idioma);
  const { sessao, unidade, estacoes } = await carregarKds(idioma, locationId);
  const estacao = estacaoDaUnidade(estacoes, stationId);
  if (!estacao) notFound();

  const tarefas = await comEscopoDoPedido(sessao, (db) => db.productionTask.findMany({
    where: { locationId: unidade.id, estado: { notIn: ['CANCELADA', 'ENTREGUE'] } },
    include: {
      pedido: { select: { id: true, numero: true, canal: true } },
      estacao: { select: { nome: true } },
      linha: { select: { nome: true, quantidade: true } },
    },
    orderBy: { criadaEm: 'asc' },
  }));
  const agora = await agoraNoServidor(sessao);

  // Agrupadas por pedido: o expo raciocina em mesas, não em tarefas soltas.
  const porPedido = new Map<string, typeof tarefas>();
  for (const t of tarefas) {
    porPedido.set(t.orderId, [...(porPedido.get(t.orderId) ?? []), t]);
  }

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.passe} tela="KDS-012" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/passe" />

      <p data-teste="quantos">{porPedido.size}</p>
      {porPedido.size === 0 ? (
        <p className="bo-campo__ajuda" data-teste="nada">{s.semBilhetes}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="pedidos">
          {[...porPedido.entries()].map(([orderId, doPedido]) => {
            const derivado = estadoDerivado(doPedido);
            const primeiro = doPedido[0]!;
            return (
              <li key={orderId} className="bo-publico__produto" data-teste="pedido"
                  data-estado={derivado?.estado ?? ''}
                  data-prontas={derivado?.prontas ?? ''} data-total={derivado?.total ?? ''}>
                <span className="bo-publico__nome">{primeiro.pedido.numero}</span>
                <span className="bo-publico__preco">
                  <Etiqueta tom={derivado?.estado === 'PRONTO' ? 'sucesso' : 'aviso'}>
                    {porChaveDoKds(s, `pedido${derivado?.estado ?? ''}`) ?? ''}
                  </Etiqueta>
                </span>
                <p className="bo-publico__descricao">
                  {/* A contagem, sempre. `2/3` não é um estado novo — é o que
                      falta para alguém decidir se a mesa sai. */}
                  <span data-teste="contagem">
                    {derivado?.prontas ?? 0}/{derivado?.total ?? 0}
                  </span>
                  {' · '}
                  <TempoDoBilhete criadaEmMs={primeiro.criadaEm.getTime()}
                                  agoraNoServidorMs={agora} s={s} />
                  {' · '}
                  {doPedido.map((t) => `${t.estacao?.nome ?? s.naoEncaminhado}`).join(', ')}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

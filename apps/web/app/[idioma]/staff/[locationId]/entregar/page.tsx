import { Aviso, Etiqueta } from '@bossaos/ui';
import { estadoDerivado, listarPedidos } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import {
  CabecalhoDoStaff, motivoDaRecusa, textosDoStaff,
} from '../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-012 · «Listo para llevar a la mesa» (atlas p. 171)
 *
 * ── A versão do pedido viaja no formulário ───────────────────────────────
 *
 * Marcar como entregue é uma gravação com concorrência optimista: leva a versão
 * que este ecrã leu. Se outra pessoa mexeu entretanto, o servidor recusa e
 * devolve o STATE-008 com a versão actual — em vez de a última escrita ganhar em
 * silêncio, que é como um pedido é dado por entregue sem ter saído da cozinha.
 */
export default async function EntregarDoStaff({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, locationId } = await params;
  const busca = (await searchParams) ?? {};
  const s = textosDoStaff(idioma);
  const { sessao, unidade, orgSlug } = await carregarStaff(idioma, locationId);
  // ── «Pronto» passou a ser DERIVADO das tarefas (E16) ──────────────────
  //
  // Era `listarPedidos(..., { estado: 'PRONTO' })`, e `orders.estado` já não
  // recebe esse valor: o contrato de produção diz que ele deriva das tarefas, e
  // a base recusa-o por escrita directa. Deixar o filtro como estava dava uma
  // lista **sempre vazia** — e uma lista vazia lê-se como «não há nada pronto»,
  // que é a mentira que esta família de ecrãs existe para não contar.
  //
  // «Pronto» é TODAS as tarefas prontas. Com a penúltima pronta, o pedido ainda
  // não está — e é `estadoDerivado` que sabe isso, num sítio só.
  const pedidos = await comEscopoDoPedido(sessao, async (db) => {
    const todos = await listarPedidos(db, unidade.id);
    const tarefas = await db.productionTask.findMany({
      where: { locationId: unidade.id },
      select: { orderId: true, estado: true },
    });
    const porPedido = new Map<string, { estado: string }[]>();
    for (const t of tarefas) {
      const lista = porPedido.get(t.orderId) ?? [];
      lista.push({ estado: t.estado });
      porPedido.set(t.orderId, lista);
    }
    return todos.filter((p: { id: string }) =>
      estadoDerivado(porPedido.get(p.id) ?? [])?.estado === 'PRONTO');
  });

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.entregar} tela="STAFF-012" actual="/entregar" />

      {busca.entregue === '1' ? (
        <div data-teste="entregue">
          <Aviso tom="sucesso" titulo={s.entregar}>{s.pedidoENTREGUE}</Aviso>
        </div>
      ) : null}
      {motivoDaRecusa(idioma, busca.erro) ? (
        <div data-teste="recusa">
          <Aviso tom="perigo" titulo={s.entregar}>{motivoDaRecusa(idioma, busca.erro)}</Aviso>
        </div>
      ) : null}

      <p data-teste="quantos">{pedidos.length}</p>

      {pedidos.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-para-entregar">{s.semParaEntregar}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="para-entregar">
          {pedidos.map((pedido) => (
            <li key={pedido.id} className="bo-publico__produto" data-teste="pedido">
              <span className="bo-publico__nome">{pedido.numero}</span>
              <span className="bo-publico__preco">
                <Etiqueta tom="sucesso">{s.pedidoPRONTO}</Etiqueta>
              </span>
              <form method="post" action={`/api/org/${orgSlug}/staff`}>
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="locationId" value={locationId} />
                <input type="hidden" name="accao" value="entregar" />
                <input type="hidden" name="orderId" value={pedido.id} />
                <input type="hidden" name="versao" value={pedido.versao} />
                <button className="bo-botao bo-botao--primario" type="submit"
                        data-teste="marcar-entregue">
                  {s.pedidoENTREGUE}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

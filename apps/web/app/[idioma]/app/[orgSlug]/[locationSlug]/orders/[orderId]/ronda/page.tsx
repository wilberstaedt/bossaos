import { notFound } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarProdutos, obterPedido } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../../src/pedido-da-pagina.ts';
import { LinhasDoPedido } from '../../../../../../../../src/componentes/LinhasDoPedido.tsx';

export const dynamic = 'force-dynamic';

/**
 * ORD-005 · «Añade una nueva ronda» (atlas p. 141)
 *
 * ── Acrescenta. Nunca reescreve ──────────────────────────────────────────
 *
 * *«Novas rodadas adicionam linhas; não reescrevem envios anteriores»* (E14,
 * entregar 4). É o aceite 2 visto do lado da pessoa: dois empregados a juntar
 * rondas à mesma mesa ao mesmo tempo não se apagam, porque cada linha é uma linha
 * nova e nunca se grava o pedido inteiro.
 *
 * Por isso este formulário **não pede versão nenhuma**. Pedir versão aqui
 * obrigaria dois operadores a disputar um número para escreverem em sítios
 * diferentes — inventava uma corrida que não existe.
 */
export default async function NovaRonda({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; orderId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, orderId } = await params;
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const { pedido, produtos } = await comEscopoDoPedido(sessao, async (db) => ({
    pedido: await obterPedido(db, orderId),
    produtos: await listarProdutos(db, {}),
  }));
  if (!pedido || pedido.locationId !== unidade.id) notFound();
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/orders`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{pedido.numero}</p>
          <h1>{p.ronda}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/${orderId}`}>{m.comum.voltar}</a>
      </div>

      <Cartao titulo={p.linhas}>
        <LinhasDoPedido idioma={idioma} linhas={pedido.linhas.map((l) => ({
          id: l.id, nome: l.nome, quantidade: l.quantidade,
          precoMenor: l.precoMenor, precoPropostoMenor: l.precoPropostoMenor,
          moeda: l.moeda, estado: String(l.estado),
          motivoRejeicao: l.motivoRejeicao ? String(l.motivoRejeicao) : null,
        }))} />
      </Cartao>

      {produtos.length === 0 ? (
        <Aviso titulo={p.produto}>{p.semDados}</Aviso>
      ) : (
        <Cartao titulo={p.ronda}>
          <form method="post" action={`/api/org/${orgSlug}/pedidos`} className="bo-forma">
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="acrescentar" />
            <input type="hidden" name="orderId" value={orderId} />
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="productId">{p.produto}</label>
              <select className="bo-campo__controlo" id="productId" name="productId" required>
                {produtos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
            </span>
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="quantidade">{p.quantidade}</label>
              <input className="bo-campo__controlo" id="quantidade" name="quantidade"
                     type="text" inputMode="numeric" defaultValue="1" />
            </span>
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--primario" type="submit">{p.accaoAcrescentar}</button>
            </div>
          </form>
        </Cartao>
      )}
    </div>
  );
}

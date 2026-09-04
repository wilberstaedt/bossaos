import { notFound } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { obterPedido } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../../src/pedido-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * ORD-006 · «Cancela con contexto» (atlas p. 142)
 *
 * ── Cancelar preparo NÃO devolve dinheiro ────────────────────────────────
 *
 * O E14 manda respeitá-lo pelo nome: *«pedido e preparo têm estados diferentes de
 * saldo, pagamento e documento fiscal. Cancelar preparo não efectua refund»*. Esta
 * página cancela **linhas**, e diz por palavras que não mexe em dinheiro — porque
 * quem carrega no botão a meio de um serviço assume o contrário se ninguém lho
 * disser.
 *
 * E cancelar muda o ESTADO da linha; nunca o preço. O gatilho da base recusa a
 * segunda coisa, e é essa a diferença entre «esta linha não vai» e «esta linha
 * custava outra coisa».
 */
export default async function CancelarLinhas({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; orderId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, orderId } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const pedido = await comEscopoDoPedido(sessao, (db) => obterPedido(db, orderId));
  if (!pedido || pedido.locationId !== unidade.id) notFound();

  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/orders`;
  const canceláveis = pedido.linhas.filter((l) => l.estado !== 'CANCELADA');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{pedido.numero}</p>
          <h1>{p.cancelar}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/${orderId}`}>{m.comum.voltar}</a>
      </div>

      {busca.cancelada === '1' ? <Aviso tom="sucesso" titulo={p.cancelada}>{p.avisoCarrinho}</Aviso> : null}

      <Aviso tom="aviso" titulo={p.cancelar}>{m.comum.asinatura ?? p.naoEReceita}</Aviso>

      {canceláveis.length === 0 ? (
        <Aviso titulo={p.linhas}>{p.semTotal}</Aviso>
      ) : (
        <Cartao titulo={p.linhas}>
          <ul className="bo-publico__lista">
            {canceláveis.map((l) => (
              <li key={l.id} className="bo-publico__produto">
                <form method="post" action={`/api/org/${orgSlug}/pedidos`}>
                  <input type="hidden" name="idioma" value={idioma} />
                  <input type="hidden" name="locationSlug" value={locationSlug} />
                  <input type="hidden" name="accao" value="cancelar_linha" />
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="linhaId" value={l.id} />
                  <span className="bo-publico__nome">{l.quantidade}× {l.nome}</span>
                  <button className="bo-botao bo-botao--secundario" type="submit">
                    {p.accaoCancelar}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}

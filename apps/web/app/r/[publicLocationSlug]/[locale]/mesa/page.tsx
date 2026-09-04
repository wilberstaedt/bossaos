import { formatarHora, type Idioma } from '@bossaos/i18n';
import {
  carregarVisita, pedidosDaMesa,
} from '../../../../../src/visitante/carregar-visita.ts';
import {
  CabecalhoDaVisita, NavegacaoDaVisita, textosDoVisitante,
} from '../../../../../src/visitante/PecasDoVisitante.tsx';
import { lerCarrinho } from '../../../../../src/visitante/carrinho.ts';

export const dynamic = 'force-dynamic';

/**
 * MENU-011 · «Esta visita» (atlas p. 91)
 *
 * O que esta mesa já pediu e o que está no carrinho, num sítio só. É a tela a
 * que se volta — e por isso é a que tem de responder à pergunta que quem está
 * sentado faz mais vezes: «já pedimos isto?»
 */
export default async function EstaVisita({
  params,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
}) {
  const { publicLocationSlug, locale } = await params;
  const idioma = locale as Idioma;
  const s = textosDoVisitante(idioma);
  const visitante = await carregarVisita(publicLocationSlug, locale);
  const [pedidos, carrinho] = await Promise.all([pedidosDaMesa(), lerCarrinho()]);
  const base = `/r/${publicLocationSlug}/${locale}`;

  return (
    <div className="bo-pagina">
      <CabecalhoDaVisita sobrancelha={`${s.naMesa} ${visitante.mesaCodigo}`}
                         titulo={s.estaVisita} tela="MENU-011" />
      <NavegacaoDaVisita idioma={idioma} base={base} actual="" />

      {/* Contado antes de afirmar seja o que for. */}
      <p className="bo-kds__contagem">
        <span>{s.oTeuPedido}: <strong data-teste="no-carrinho">{carrinho.length}</strong></span>
        <span>{s.assimVai}: <strong data-teste="enviados">{pedidos.length}</strong></span>
      </p>

      {pedidos.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-pedidos">{s.semPedidos}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="pedidos">
          {pedidos.map((p) => (
            <li key={p.id} className="bo-publico__produto" data-teste="pedido"
                data-canal={p.canal}>
              <span className="bo-publico__nome">{p.numero}</span>
              <span className="bo-publico__preco">{formatarHora(p.createdAt, idioma)}</span>
              <p className="bo-publico__descricao">
                {p.linhas.map((l: { nome: string; quantidade: number }) =>
                  `${l.quantidade}× ${l.nome}`).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

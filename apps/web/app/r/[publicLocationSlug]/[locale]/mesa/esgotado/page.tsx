import { Aviso } from '@bossaos/ui';
import { type Idioma } from '@bossaos/i18n';
import {
  carregarVisita, pedidosDaMesa,
} from '../../../../../../src/visitante/carregar-visita.ts';
import {
  CabecalhoDaVisita, NavegacaoDaVisita, textosDoVisitante,
} from '../../../../../../src/visitante/PecasDoVisitante.tsx';

export const dynamic = 'force-dynamic';

/**
 * MENU-020 · «Un plato se ha agotado» (atlas p. 97) — e a casa do STATE-010.
 *
 * ── O carrinho FICA, e é isso que a tela existe para dizer ────────────────
 *
 * É o aceite 3 do E14 visto do lado do cliente: a linha esgotada é rejeitada
 * **com o resto do pedido de pé**. Um ecrã que dissesse só «algo correu mal»
 * fazia a pessoa recomeçar do zero um pedido que já está na cozinha.
 *
 * E não foi cobrado. Dizê-lo por palavras não é conforto: é a informação que
 * evita a conversa de dez minutos com quem serve.
 */
export default async function UmPratoEsgotou({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const busca = (await searchParams) ?? {};
  const idioma = locale as Idioma;
  const s = textosDoVisitante(idioma);
  const visitante = await carregarVisita(publicLocationSlug, locale);
  const pedidos = await pedidosDaMesa();
  const base = `/r/${publicLocationSlug}/${locale}`;

  const esteId = typeof busca.pedido === 'string' ? busca.pedido : null;
  const este = pedidos.find((p: { id: string }) => p.id === esteId) ?? pedidos[0] ?? null;
  const rejeitadas = (este?.linhas ?? []).filter(
    (l: { estado: string }) => l.estado === 'REJEITADA');
  const aceites = (este?.linhas ?? []).filter((l: { estado: string }) => l.estado === 'ACEITE');

  return (
    <div className="bo-pagina">
      <CabecalhoDaVisita sobrancelha={`${s.naMesa} ${visitante.mesaCodigo}`}
                         titulo={s.pratoEsgotado} tela="MENU-020" />
      <NavegacaoDaVisita idioma={idioma} base={base} actual="/andamento" />

      <p data-teste="quantas-rejeitadas">{rejeitadas.length}</p>

      {/* STATE-010 · «Revisa el artículo agotado». É um estado deste fluxo e não
          uma tela à parte: o que se revê é o que acabou de acontecer, aqui. */}
      <section data-tela="STATE-010" aria-labelledby="rever">
        <h2 id="rever">{s.revejaEsgotado}</h2>
        <div data-teste="nao-cobrado">
          <Aviso tom="aviso" titulo={s.pratoEsgotado}>{s.esgotadoAjuda}</Aviso>
        </div>
        {rejeitadas.length === 0 ? (
          <p className="bo-campo__ajuda" data-teste="nada-rejeitado">{s.semPedidos}</p>
        ) : (
          <ul className="bo-publico__lista" data-teste="rejeitadas">
            {rejeitadas.map((l: { id: string; nome: string; quantidade: number }) => (
              <li key={l.id} className="bo-publico__produto" data-teste="rejeitada">
                <span className="bo-publico__nome">{l.quantidade}× {l.nome}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* O RESTO DO PEDIDO, que continua de pé. Sem isto, a tela dizia o que se
          perdeu e calava o que ficou — e é o que ficou que já está a ser feito. */}
      <h2>{s.oTeuPedido}</h2>
      <p data-teste="quantas-aceites">{aceites.length}</p>
      <ul className="bo-publico__lista" data-teste="aceites">
        {aceites.map((l: { id: string; nome: string; quantidade: number }) => (
          <li key={l.id} className="bo-publico__produto" data-teste="aceite">
            <span className="bo-publico__nome">{l.quantidade}× {l.nome}</span>
          </li>
        ))}
      </ul>

      <div className="bo-estado__accoes">
        <a className="bo-botao bo-botao--secundario" href={`${base}/menu`}>{s.acrescentar}</a>
        <a className="bo-botao bo-botao--secundario" href={`${base}/mesa/ajuda`}
           data-seccao="MENU-012">{s.chamarEquipa}</a>
      </div>
    </div>
  );
}

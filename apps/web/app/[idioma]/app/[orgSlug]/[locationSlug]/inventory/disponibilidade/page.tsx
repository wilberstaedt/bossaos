import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarStock } from '../../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INV-012 · «t.disponibilidade» (atlas)
 *
 * ── O que esta tela NÃO faz ──────────────────────────────────────────────
 *
 * Não bloqueia a venda por saldo. O contrato escolheu «negativo visível», e
 * bloquear aqui seria a mesma coisa que «impossível» pela porta das traseiras —
 * com o agravante de a decisão ficar escrita num sítio e desmentida noutro.
 *
 * O que ela mostra é quem está abaixo do mínimo, para alguém decidir.
 */
export default async function TelaINV012({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).stockE25;
  const { unidade, insumos, divida } = await carregarStock(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INV-012">{t.disponibilidade}</h1>
        </div>
      </div>
      <p data-teste="negativo-visivel">{t.negativoVisivel}</p>
      <p data-teste="quantos-negativos">{divida.length}</p>
      <ul className="bo-lista" data-teste="abaixo">
        {insumos.filter((i) => i.minimoMili !== null && i.saldoMili < i.minimoMili).map((i) => (
          <li key={i.id}>
            <span>{i.nome}</span>
            <span data-teste="minimo">{String(i.minimoMili)}</span>
            <span data-teste="saldo">{String(i.saldoMili)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

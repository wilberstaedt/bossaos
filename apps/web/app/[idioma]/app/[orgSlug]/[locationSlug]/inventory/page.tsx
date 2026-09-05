import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarStock } from '../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INV-001 · «Dashboard de estoque» (atlas)
 *
 * ── A dívida está em cima, e não numa aba ─────────────────────────────────
 *
 * O contrato escolheu «negativo visível» em vez de «impossível». Essa escolha
 * **só vale se o negativo estiver onde a pessoa olha primeiro** — num separador
 * secundário, «visível» seria só outro nome para silencioso.
 */
export default async function PainelDoStock({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).stockE25;
  const { unidade, insumos, divida } = await carregarStock(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/inventory`;
  const abaixoDoMinimo = insumos.filter(
    (i) => i.minimoMili !== null && i.saldoMili < i.minimoMili);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INV-001">{t.stock}</h1>
        </div>
      </div>

      <p data-teste="quantos-insumos">{insumos.length}</p>
      <p data-teste="quantos-negativos">{divida.length}</p>
      {divida.length === 0 ? <p data-teste="sem-divida">{t.semDivida}</p> : (
        <ul className="bo-lista" data-teste="divida">
          {divida.map((d) => (
            <li key={d.id}>
              <span>{d.nome}</span>
              <span data-teste="saldo-negativo">{String(d.saldoMili)}</span>
            </li>
          ))}
        </ul>
      )}
      <p data-teste="negativo-visivel">{t.negativoVisivel}</p>
      <p data-teste="saldo-derivado">{t.saldoDerivado}</p>
      <p data-teste="abaixo-do-minimo">{abaixoDoMinimo.length}</p>

      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="itens" href={`${base}/itens`}>{t.itens}</a>
        <a className="bo-botao" data-seccao="fichas" href={`${base}/fichas`}>{t.fichas}</a>
        <a className="bo-botao" data-seccao="movimentos" href={`${base}/movimentos`}>{t.movimentos}</a>
        <a className="bo-botao" data-seccao="contagem" href={`${base}/contagem`}>{t.contagem}</a>
        <a className="bo-botao" data-seccao="perda" href={`${base}/perda`}>{t.perda}</a>
        <a className="bo-botao" data-seccao="unidades" href={`${base}/unidades`}>{t.porUnidade}</a>
        <a className="bo-botao" data-seccao="transferencia" href={`${base}/transferencia`}>{t.transferencia}</a>
        <a className="bo-botao" data-seccao="disponibilidade" href={`${base}/disponibilidade`}>{t.disponibilidade}</a>
      </nav>
    </div>
  );
}

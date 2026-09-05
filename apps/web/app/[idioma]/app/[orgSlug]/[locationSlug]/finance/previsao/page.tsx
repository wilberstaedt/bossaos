import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarFinanceiro } from '../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FIN-009 · «Previsión de caja» (atlas)
 *
 * A previsão é o que já está lançado com **data-valor futura** — não é uma
 * projecção inventada. O produto não sabe o que vai vender; sabe o que já se
 * comprometeu a pagar e a receber, e é isso que mostra.
 */
export default async function Previsao({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarFinanceiro(idioma, orgSlug, locationSlug);
  const hoje = new Date().toISOString().slice(0, 10);
  const futuros = b.caixa.filter((l) => l.data.toISOString().slice(0, 10) > hoje);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{hoje}</p>
          <h1 data-tela="FIN-009">{t.previsao}</h1>
        </div>
      </div>
      <p data-teste="tres-datas">{t.tresDatas}</p>
      <p data-teste="quantos-futuros">{futuros.length}</p>
      {futuros.length === 0 ? <p data-teste="sem-movimentos">{t.semMovimentos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="previsao">
          {futuros.map((l) => (
            <li key={l.movimentoId}>
              <span data-teste="conceito">{l.conceito}</span>
              <span data-teste="montante">{String(l.montanteMenor)}</span>
              <span data-teste="moeda">{l.moeda}</span>
              <span data-teste="data">{l.data.toISOString().slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

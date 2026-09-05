import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarFinanceiro } from '../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/** FIN-005 · «Gastos del restaurante» (atlas) */
export default async function Despesas({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarFinanceiro(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/finance`;
  const despesas = b.resultado.filter((l) => l.tipo === 'DESPESA' || l.tipo === 'TAXA');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.periodo.de} — {b.periodo.ate}</p>
          <h1 data-tela="FIN-005">{t.despesas}</h1>
        </div>
      </div>
      <p data-teste="tres-datas">{t.tresDatas}</p>
      <p data-teste="quantas-linhas">{despesas.length}</p>
      {despesas.length === 0 ? <p data-teste="sem-movimentos">{t.semMovimentos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="despesas">
          {despesas.map((l) => (
            <li key={l.movimentoId}>
              <span data-teste="conceito">{l.conceito}</span>
              <span data-teste="montante">{String(l.montanteMenor)}</span>
              <span data-teste="moeda">{l.moeda}</span>
              <span data-teste="data">{l.data.toISOString().slice(0, 10)}</span>
              <span data-teste="origem">{l.origemTipo ?? '—'}</span>
            </li>
          ))}
        </ul>
      )}
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="nova-despesa" href={`${base}/despesas/nova`}>
          {t.novaDespesa}
        </a>
      </nav>
    </div>
  );
}

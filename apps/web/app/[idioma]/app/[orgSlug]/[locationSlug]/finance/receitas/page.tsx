import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarFinanceiro } from '../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/** FIN-002 · «Ingresos por canal» (atlas) — e da linha desce-se à origem. */
export default async function Receitas({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarFinanceiro(idioma, orgSlug, locationSlug);
  const receitas = b.resultado.filter((l) => l.tipo === 'RECEITA' || l.tipo === 'DEVOLUCAO');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.periodo.de} — {b.periodo.ate}</p>
          <h1 data-tela="FIN-002">{t.receitas}</h1>
        </div>
      </div>
      <p data-teste="tres-datas">{t.tresDatas}</p>
      <p data-teste="quantas-linhas">{receitas.length}</p>
      {receitas.length === 0 ? <p data-teste="sem-movimentos">{t.semMovimentos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="receitas">
          {receitas.map((l) => (
            <li key={l.movimentoId}>
              <span data-teste="conceito">{l.conceito}</span>
              <span data-teste="tipo">{l.tipo}</span>
              <span data-teste="montante">{String(l.montanteMenor)}</span>
              <span data-teste="moeda">{l.moeda}</span>
              <span data-teste="data">{l.data.toISOString().slice(0, 10)}</span>
              {/* Um total que não desce à origem é uma opinião. */}
              <span data-teste="origem">{l.origemTipo ?? '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

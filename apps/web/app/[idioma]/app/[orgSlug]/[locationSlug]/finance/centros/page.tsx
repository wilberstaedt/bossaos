import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarCentros } from '../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/** FIN-007 · «Centros de coste» (atlas) */
export default async function Centros({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarCentros(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.periodo.de} — {b.periodo.ate}</p>
          <h1 data-tela="FIN-007">{t.centros}</h1>
        </div>
      </div>
      <p data-teste="moedas-nao-somam">{t.moedasNaoSomam}</p>
      <p data-teste="quantos-centros">{b.centros.length}</p>
      {b.centros.length === 0 ? <p data-teste="sem-movimentos">{t.semMovimentos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="centros">
          {b.centros.map((c) => (
            <li key={`${c.centro}-${c.moeda}`}>
              <span data-teste="centro">{c.centro}</span>
              {/* Cada linha traz a sua moeda: nunca se somam entre si. */}
              <span data-teste="moeda">{c.moeda}</span>
              <span data-teste="total">{String(c.totalMenor)}</span>
              <span data-teste="linhas">{c.linhas}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

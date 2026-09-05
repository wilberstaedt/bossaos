import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarFinanceiro } from '../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FIN-010 · «Exporta la información» (atlas)
 *
 * ── A exportação leva as TRÊS datas, e diz qual é qual ────────────────────
 *
 * Uma exportação com uma data só obriga quem a recebe a adivinhar de qual se
 * trata — e quem a recebe é um contabilista que vai somar por ela.
 */
export default async function Exportar({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarFinanceiro(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.periodo.de} — {b.periodo.ate}</p>
          <h1 data-tela="FIN-010">{t.exportar}</h1>
        </div>
      </div>
      <p data-teste="tres-datas">{t.tresDatas}</p>
      <p data-teste="quantas-linhas">{b.resultado.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="colunas">
        <li><span data-teste="coluna">{t.conceito}</span></li>
        <li><span data-teste="coluna">{t.montante}</span></li>
        <li><span data-teste="coluna">{t.moeda}</span></li>
        <li><span data-teste="coluna">{t.ocorrencia}</span></li>
        <li><span data-teste="coluna">{t.valor}</span></li>
        <li><span data-teste="coluna">{t.registo}</span></li>
        <li><span data-teste="coluna">{t.origem}</span></li>
      </ul>
    </div>
  );
}

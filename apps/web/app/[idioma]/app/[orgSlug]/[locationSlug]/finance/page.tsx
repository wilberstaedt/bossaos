import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarFinanceiro } from '../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FIN-001 · «Tu gestión económica» (atlas)
 *
 * ── As duas leituras aparecem LADO A LADO, e é de propósito ───────────────
 *
 * Caixa e resultado do mesmo mês dão números diferentes, e os dois estão
 * certos. Mostrar só um convida quem lê a tomá-lo pela resposta às duas
 * perguntas — e é assim que um sistema financeiro passa a mentir com todos os
 * totais certos.
 */
export default async function Financeiro({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarFinanceiro(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/finance`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.periodo.de} — {b.periodo.ate}</p>
          <h1 data-tela="FIN-001">{t.financeiro}</h1>
        </div>
      </div>
      <p data-teste="tres-datas">{t.tresDatas}</p>

      <h2>{t.caixa}</h2>
      <p data-teste="quantos-caixa">{b.caixa.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="total-caixa">
        {b.totalCaixa.map((x) => (
          <li key={`c-${x.moeda}`}>
            <span data-teste="moeda">{x.moeda}</span>
            <span data-teste="total">{String(x.totalMenor)}</span>
          </li>
        ))}
      </ul>

      <h2>{t.resultado}</h2>
      <p data-teste="quantos-resultado">{b.resultado.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="total-resultado">
        {b.totalResultado.map((x) => (
          <li key={`r-${x.moeda}`}>
            <span data-teste="moeda">{x.moeda}</span>
            <span data-teste="total">{String(x.totalMenor)}</span>
          </li>
        ))}
      </ul>
      <p data-teste="moedas-nao-somam">{t.moedasNaoSomam}</p>

      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="receitas" href={`${base}/receitas`}>{t.receitas}</a>
        <a className="bo-botao" data-seccao="contas" href={`${base}/contas`}>{t.contas}</a>
        <a className="bo-botao" data-seccao="despesas" href={`${base}/despesas`}>{t.despesas}</a>
        <a className="bo-botao" data-seccao="centros" href={`${base}/centros`}>{t.centros}</a>
        <a className="bo-botao" data-seccao="margem" href={`${base}/margem`}>{t.margem}</a>
        <a className="bo-botao" data-seccao="previsao" href={`${base}/previsao`}>{t.previsao}</a>
        <a className="bo-botao" data-seccao="exportar" href={`${base}/exportar`}>{t.exportar}</a>
        <a className="bo-botao" data-seccao="documentos" href={`${base}/documentos`}>{t.documentos}</a>
      </nav>
    </div>
  );
}

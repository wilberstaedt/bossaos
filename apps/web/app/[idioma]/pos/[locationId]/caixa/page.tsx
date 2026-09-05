import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { caixasDoTpv } from '../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-019 · «Historial de cajas» (atlas)
 *
 * Cada linha é reproduzida da ledger: o esperado sai dos movimentos e a
 * diferença é a subtracção. Não há número guardado que possa discordar — e uma
 * caixa por contar mostra **nada** no contado, e não um zero, porque zero é uma
 * afirmação e nada é a verdade.
 */
export default async function HistoricoDeCaixas({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { unidade, caixas, aberta } = await caixasDoTpv(idioma, locationId);

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="POS-019">{t.historico}</h1>
        </div>
      </div>
      <p data-teste="quantas-caixas">{caixas.length}</p>
      {!aberta && (
        <a data-seccao="abrir-caixa" href={`/${idioma}/pos/${locationId}/caixa/abrir`}>{t.abrirCaixa}</a>
      )}
      {caixas.length === 0 ? <p data-teste="sem-caixas">{t.semCaixas}</p> : (
        <ul className="bo-lista" data-teste="caixas">
          {caixas.map((c) => (
            <li key={c.id}>
              <a href={`/${idioma}/pos/${locationId}/caixa/${c.id}/contagem`}>{c.nome}</a>
              <span data-teste="estado-caixa">{c.estado}</span>
              <span>{formatarDinheiro({ montanteMenor: c.esperadoMenor, moeda: c.moeda }, idioma)}</span>
              <span data-teste="contado">
                {c.contadoMenor === null ? '—'
                  : formatarDinheiro({ montanteMenor: c.contadoMenor, moeda: c.moeda }, idioma)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p data-teste="esperado-ajuda">{t.esperadoAjuda}</p>
    </div>
  );
}

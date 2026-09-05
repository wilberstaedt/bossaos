import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarRelatorio } from '../../../../../../../src/analitica/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * REP-013 · «Compras y evolución de costes» (atlas)
 *
 * ── Ausência e zero escrevem-se DIFERENTE ─────────────────────────────────
 *
 * Sem dados diz «ninguém mediu»; uma lista vazia com dados diz «medi, e não há
 * nada». As duas escrevem-se iguais se ninguém as separar, e significam o
 * contrário uma da outra.
 */
export default async function EvolucaoDeCustos({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).analiticaE30;
  const b = await carregarRelatorio(idioma, orgSlug, locationSlug);
  const r = b.custos;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.unidade.nome}</p>
          <h1 data-tela="REP-013">{t.custos}</h1>
        </div>
      </div>
      <p data-teste="ausencia-nao-e-zero">{t.ausenciaNaoEZero}</p>
      <p data-teste="definicao">{t.definicao}: {t.entradas}</p>
      <p data-teste="filtros">{t.periodo}: {b.periodo.de} — {b.periodo.ate}</p>
      {r.medido ? (
        <>
          <p data-teste="quantas-linhas">{r.valor.length}</p>
          {r.valor.length === 0
            ? <p data-teste="zero-medido">{t.zeroMedido}</p> : null}
          <ul className="bo-lista bo-lista--colunas" data-teste="linhas">
            {r.valor.map((l, i) => (
              <li key={i}>
                <span data-teste="insumo">{l.insumo}</span>
                <span data-teste="entradas">{l.entradas}</span>
                <span data-teste="total">{String(l.custoMenor)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p data-teste="sem-dados">{t.semDados}</p>
          <p data-teste="sem-dados-explica">{t.semDadosExplica}</p>
        </>
      )}
      <p data-teste="exporta-o-que-ve">{t.exportaOQueVe}</p>
    </div>
  );
}

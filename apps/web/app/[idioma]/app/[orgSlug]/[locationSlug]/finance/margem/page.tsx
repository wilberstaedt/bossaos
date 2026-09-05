import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { custoDoInsumo, fichasDaUnidade, folhasDaFicha } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarFinanceiro } from '../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FIN-008 · «Margen estimado por plato» (atlas)
 *
 * ── Diz-se ESTIMADO, e diz-se porquê ──────────────────────────────────────
 *
 * A margem sai do custo médio ponderado das entradas de compra (E26) descendo a
 * árvore da ficha técnica (E25). É uma estimativa porque o custo médio muda a
 * cada entrada — e um número que se chama exacto sem o ser é pior do que um que
 * se assume estimado.
 *
 * Uma ficha sem custo conhecido aparece **sem margem**, e não com margem zero:
 * zero é uma afirmação, e ausência é ausência.
 */
export default async function Margem({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarFinanceiro(idioma, orgSlug, locationSlug);
  const fichas = await comEscopoDoPedido(b.sessao, async (db) => {
    const todas = await fichasDaUnidade(db, b.unidade.id);
    return Promise.all(todas.map(async (f) => {
      const folhas = await folhasDaFicha(db, f.id);
      let custoMenor = 0n;
      let completo = folhas.size > 0;
      for (const [itemId, quantidadeMili] of folhas) {
        const c = await custoDoInsumo(db, itemId);
        if (c.medioPorUnidadeMenor === null) { completo = false; continue; }
        custoMenor += (BigInt(Math.round(quantidadeMili)) * c.medioPorUnidadeMenor) / 1_000_000n;
      }
      return { id: f.id, nome: f.nome, custoMenor, completo, insumos: folhas.size };
    }));
  });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.unidade.nome}</p>
          <h1 data-tela="FIN-008">{t.margem}</h1>
        </div>
      </div>
      <p data-teste="quantas-fichas">{fichas.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="margens">
        {fichas.map((f) => (
          <li key={f.id}>
            <span data-teste="ficha">{f.nome}</span>
            <span data-teste="insumos">{f.insumos}</span>
            {f.completo
              ? <span data-teste="custo">{String(f.custoMenor)}</span>
              : <span data-teste="sem-custo">—</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

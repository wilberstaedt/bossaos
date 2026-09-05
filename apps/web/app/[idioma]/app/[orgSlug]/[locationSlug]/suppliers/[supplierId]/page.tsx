import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { insumosDaUnidade } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarFornecedor } from '../../../../../../../src/compras/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SUP-002 · «Distribuidor Demo» (atlas) — o fornecedor e os seus artigos.
 *
 * ── É aqui que a unidade de compra deixa de ser adivinhada ────────────────
 *
 * Um saco de 25 kg lido como uma unidade dá stock de 1 onde há 25 000 g, e o
 * inventário só o revela ao fim do mês. Por isso o factor é um campo
 * obrigatório com a sua explicação ao lado — e a base recusa-o a zero.
 */
export default async function Fornecedor({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; supplierId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, supplierId } = await params;
  const t = mensagensDe(idioma).comprasE26;
  const base = await carregarFornecedor(idioma, orgSlug, locationSlug, supplierId);
  const insumos = await comEscopoDoPedido(base.sessao,
    (db) => insumosDaUnidade(db, base.unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{t.fornecedor}</p>
          <h1 data-tela="SUP-002">{base.fornecedor.nome}</h1>
        </div>
      </div>
      <p data-teste="nif">{base.fornecedor.nif ?? '—'}</p>
      <p data-teste="quantos-artigos">{base.artigos.length}</p>
      <p data-teste="factor-ajuda">{t.factorAjuda}</p>
      {base.artigos.length === 0 ? <p data-teste="sem-artigos">{t.semArtigos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="artigos">
          {base.artigos.map((a) => (
            <li key={a.id}>
              <span data-teste="insumo">{a.insumo.nome}</span>
              <span data-teste="unidade-de-compra">{a.unidadeDeCompra}</span>
              <span data-teste="factor">{String(a.factorMili)}</span>
              <span data-teste="uso">{a.insumo.unidade}</span>
            </li>
          ))}
        </ul>
      )}
      <form method="post" action={`/api/org/${orgSlug}/compras`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="ligar_artigo" />
        <input type="hidden" name="supplierId" value={base.fornecedor.id} />
        <input type="hidden" name="locationId" value={base.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.insumo} name="itemId" required>
          {insumos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
        </Seletor>
        <Campo rotulo={t.unidadeDeCompra} name="unidadeDeCompra" required maxLength={60} />
        {/* Texto e não `number`: o `step` do HTML5 recusa valores pela restrição
            nativa antes de o JS os ver, e o erro aparece sem explicação. */}
        <Campo rotulo={t.factor} name="factor" type="text" inputMode="numeric" required />
        <Campo rotulo={t.preco} name="preco" type="text" inputMode="numeric" />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}

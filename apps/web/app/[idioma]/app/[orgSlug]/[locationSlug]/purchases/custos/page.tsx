import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarCustos } from '../../../../../../../src/compras/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * PUR-004 · «Cómo cambia el coste» (atlas)
 *
 * O método está ESCRITO, e não implícito: média ponderada móvel, derivada das
 * entradas. Um custeio implícito é um número que ninguém consegue reproduzir —
 * e a tela di-lo por palavras, não só o contrato.
 */
export default async function Custos({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).comprasE26;
  const { unidade, custos } = await carregarCustos(idioma, orgSlug, locationSlug);
  const comEntradas = custos.filter((c) => c.custo.entradas > 0);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="PUR-004">{t.comoMuda}</h1>
        </div>
      </div>
      <p data-teste="metodo">{t.metodo}</p>
      <p data-teste="quantos-insumos">{comEntradas.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="custos">
        {comEntradas.map((c) => (
          <li key={c.itemId}>
            <span data-teste="insumo">{c.nome}</span>
            <span data-teste="entradas">{c.custo.entradas}</span>
            <span data-teste="quantidade">{String(c.custo.quantidadeMili)}</span>
            <span data-teste="custo-total">{String(c.custo.custoTotalMenor)}</span>
            <span data-teste="custo-medio">
              {c.custo.medioPorUnidadeMenor === null ? '—' : String(c.custo.medioPorUnidadeMenor)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

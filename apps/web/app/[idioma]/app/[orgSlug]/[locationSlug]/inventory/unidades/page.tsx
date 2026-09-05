import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarStock } from '../../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INV-006 · «t.porUnidade» (atlas)
 *
 * O mesmo insumo pode existir em várias unidades, e o saldo é de CADA uma: a
 * mercadoria em trânsito não está disponível nos dois sítios ao mesmo tempo.
 */
export default async function TelaINV006({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).stockE25;
  const { unidade, insumos } = await carregarStock(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INV-006">{t.porUnidade}</h1>
        </div>
      </div>
      <p data-teste="quantos-insumos">{insumos.length}</p>
      <p data-teste="unidade-actual">{unidade.nome}</p>
      <ul className="bo-lista" data-teste="insumos">
        {insumos.map((i) => (
          <li key={i.id}><span>{i.nome}</span><span data-teste="saldo">{String(i.saldoMili)}</span></li>
        ))}
      </ul>
    </div>
  );
}

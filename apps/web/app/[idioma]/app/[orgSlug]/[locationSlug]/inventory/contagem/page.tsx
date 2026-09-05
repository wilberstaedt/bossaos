import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo } from '@bossaos/ui';
import { carregarStock } from '../../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INV-009 · «t.contagem» (atlas)
 *
 * ── A contagem NÃO escreve o saldo ───────────────────────────────────────
 *
 * Escreve um AJUSTE, com a diferença e a razão. Um campo que pusesse o saldo
 * directamente era exactamente o defeito que a etapa existe para impedir — e o
 * gatilho da base reporia o valor de qualquer maneira.
 */
export default async function TelaINV009({
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
          <h1 data-tela="INV-009">{t.contagem}</h1>
        </div>
      </div>
      <p data-teste="saldo-derivado">{t.saldoDerivado}</p>
      <p data-teste="quantos-insumos">{insumos.length}</p>
      <ul className="bo-lista" data-teste="insumos">
        {insumos.map((i) => (
          <li key={i.id}>
            <span>{i.nome}</span>
            <span data-teste="esperado">{String(i.saldoMili)}</span>
            <form method="post" action={`/api/org/${orgSlug}/stock`} className="bo-forma">
              <input type="hidden" name="idioma" value={idioma} />
              <input type="hidden" name="accao" value="contar" />
              <input type="hidden" name="itemId" value={i.id} />
              <input type="hidden" name="locationId" value={unidade.id} />
              <input type="hidden" name="locationSlug" value={locationSlug} />
              <Campo rotulo={t.contado} name="contado" type="text" inputMode="numeric" required />
              <Botao type="submit">{t.guardar}</Botao>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

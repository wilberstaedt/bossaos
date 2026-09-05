import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-006 · «Cobro en efectivo» (atlas)
 *
 * ── O troco é uma subtracção, e não um campo ──────────────────────────────
 *
 * Guarda-se o recebido; o troco calcula-se. E o que entra na gaveta é o
 * **cobrado**: os 6,55 € de troco saíram outra vez pela mesma gaveta e nunca
 * foram receita. Somá-los era o erro que faz a contagem nunca bater.
 */
export default async function DinheiroNoTpv({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; billId: string }> }) {
  const { idioma, locationId, billId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { conta, somas, orgSlug } = await contaDoTpv(idioma, locationId, billId);
  const falta = somas.devidoMenor - somas.pagoMenor;

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{conta.numero}</p>
          <h1 data-tela="POS-006">{t.dinheiro}</h1>
        </div>
      </div>
      <p data-teste="falta">{t.porPagar} {formatarDinheiro({ montanteMenor: falta, moeda: conta.moeda }, idioma)}</p>
      <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="pagar_dinheiro" />
        <input type="hidden" name="billId" value={conta.id} />
        <input type="hidden" name="locationId" value={locationId} />
        <Campo rotulo={t.devido} name="cobrar" type="text" inputMode="decimal" required  />
        <Campo rotulo={t.recebido} name="recebido" type="text" inputMode="decimal" required  />
        <Botao type="submit">{t.aplicar}</Botao>
      </form>
      {/* Fora do slot de vazio, de propósito: a frase é precisa exactamente
          quando há números no ecrã. Lição do E20. */}
      <p data-teste="troco-ajuda">{t.trocoAjuda}</p>
      <p data-teste="so-dinheiro">{t.apenasDinheiro}</p>
      {somas.pagoMenor > 0 && (
        <ul className="bo-lista" data-teste="pagamentos">
          {conta.pagamentos.map((p) => (
            <li key={p.id}>
              <span>{p.meio}</span>
              <span>{formatarDinheiro({ montanteMenor: p.montanteMenor, moeda: conta.moeda }, idioma)}</span>
              {p.recebidoMenor !== null && (
                <span data-teste="troco">
                  {t.troco} {formatarDinheiro(
                    { montanteMenor: p.recebidoMenor - p.montanteMenor, moeda: conta.moeda }, idioma)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

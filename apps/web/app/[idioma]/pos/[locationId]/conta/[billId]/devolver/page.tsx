import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { Botao, Campo } from '@bossaos/ui';
import { contaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-013 · «Devuelve un importe» (atlas)
 *
 * ── O reembolso não é uma venda negativa ──────────────────────────────────
 *
 * Tem origem, motivo, autor e **limite**. O ecrã mostra o que ainda falta
 * devolver de cada pagamento — porque um campo vazio com um limite invisível é
 * um campo onde se escreve o número errado e se descobre pelo erro.
 */
export default async function DevolverImporte({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; billId: string }> }) {
  const { idioma, locationId, billId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { conta, orgSlug } = await contaDoTpv(idioma, locationId, billId);
  const d = (m: number) => formatarDinheiro({ montanteMenor: m, moeda: conta.moeda }, idioma);

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{conta.numero}</p>
          <h1 data-tela="POS-013">{t.devolver}</h1>
        </div>
      </div>
      <p data-teste="anular-ajuda">{t.anularAjuda}</p>
      {conta.pagamentos.length === 0 ? <p data-teste="sem-pagamentos">{t.nada}</p> : (
        <ul className="bo-lista" data-teste="pagamentos">
          {conta.pagamentos.map((p) => (
            <li key={p.id}>
              <span>{p.meio}</span>
              <span data-teste="capturado">{d(p.montanteMenor)}</span>
              <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="accao" value="devolver" />
                <input type="hidden" name="paymentId" value={p.id} />
                <input type="hidden" name="billId" value={conta.id} />
                <input type="hidden" name="locationId" value={locationId} />
                <Campo rotulo={t.devolver} name="valor" type="text" inputMode="decimal" required />
                <Campo rotulo={t.motivo} name="motivo" required minLength={3} maxLength={140} />
                <Botao type="submit">{t.devolver}</Botao>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

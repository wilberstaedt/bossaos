import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-014 · «Anula una operación» (atlas)
 *
 * ── Anular e devolver são coisas diferentes, e o ecrã di-lo ───────────────
 *
 * «Void (não capturado): desfaz sem movimento de dinheiro. Refund (capturado):
 * movimento real.» Um ecrã que chama às duas «cancelar» é um ecrã onde alguém
 * carrega em cancelar a pensar que não move dinheiro.
 *
 * Por isso a tentativa por capturar aparece com **anular**, e o pagamento já
 * confirmado aparece com **devolver** — e cada um só oferece o que é possível.
 */
export default async function AnularNoTpv({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; billId: string }> }) {
  const { idioma, locationId, billId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { conta, orgSlug } = await contaDoTpv(idioma, locationId, billId);
  const d = (m: number) => formatarDinheiro({ montanteMenor: m, moeda: conta.moeda }, idioma);
  const porReverter = conta.ajustes.filter((a) => !a.reverteId
    && !conta.ajustes.some((r) => r.reverteId === a.id));

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{conta.numero}</p>
          <h1 data-tela="POS-014">{t.anular}</h1>
        </div>
      </div>
      <p data-teste="anular-ajuda">{t.anularAjuda}</p>

      <h2>{t.anular}</h2>
      {conta.tentativas.length === 0 ? <p data-teste="sem-tentativas">{t.nada}</p> : (
        <ul className="bo-lista" data-teste="tentativas">
          {conta.tentativas.map((a) => (
            <li key={a.id}>
              <span>{d(a.montanteMenor)}</span>
              <span>{a.estado}</span>
              <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="accao" value="anular" />
                <input type="hidden" name="attemptId" value={a.id} />
                <input type="hidden" name="billId" value={conta.id} />
                <input type="hidden" name="locationId" value={locationId} />
                <Botao type="submit">{t.anular}</Botao>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2>{t.devolver}</h2>
      {conta.pagamentos.length === 0 ? <p data-teste="sem-pagamentos">{t.nada}</p> : (
        <ul className="bo-lista" data-teste="pagamentos">
          {conta.pagamentos.map((p) => (
            <li key={p.id}>
              <span>{d(p.montanteMenor)}</span>
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

      <h2>{t.reverter}</h2>
      <p data-teste="reverte-ajuda">{t.reverteAjuda}</p>
      {porReverter.length === 0 ? <p data-teste="sem-ajustes">{t.nada}</p> : (
        <ul className="bo-lista" data-teste="por-reverter">
          {porReverter.map((a) => (
            <li key={a.id}>
              <span>−{d(a.montanteMenor)}</span>
              <span>{a.motivo}</span>
              <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="accao" value="reverter_ajuste" />
                <input type="hidden" name="ajusteId" value={a.id} />
                <input type="hidden" name="billId" value={conta.id} />
                <input type="hidden" name="locationId" value={locationId} />
                <Campo rotulo={t.motivo} name="motivo" required minLength={3} maxLength={140} />
                <Botao type="submit">{t.reverter}</Botao>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

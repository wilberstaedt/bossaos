import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-010 · a alçada, o motivo e o que NÃO se reescreve.
 *
 * ── O motivo é obrigatório, e a base é que o garante ──────────────────────
 *
 * «Um desconto sem motivo é indistinguível de um erro de dedo.» O campo não é
 * opcional aqui porque não é opcional lá em baixo: há um `CHECK` que recusa o
 * vazio e o espaço em branco.
 *
 * E o ajuste é uma linha ao lado, nunca um `UPDATE` no preço: a venda fica como
 * foi, e o que se tirou vê-se com quem autorizou.
 */
export default async function AjusteDESCONTO({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; billId: string }> }) {
  const { idioma, locationId, billId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { conta, somas, orgSlug, actor } = await contaDoTpv(idioma, locationId, billId);

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{conta.numero}</p>
          <h1 data-tela="POS-010">{t.desconto}</h1>
        </div>
      </div>
      <p data-teste="devido">{t.devido} {formatarDinheiro({ montanteMenor: somas.devidoMenor, moeda: conta.moeda }, idioma)}</p>
      <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="ajustar" />
        <input type="hidden" name="tipo" value="DESCONTO" />
        <input type="hidden" name="billId" value={conta.id} />
        <input type="hidden" name="locationId" value={locationId} />
        <Campo rotulo={t.aplicar} name="valor" type="text" inputMode="decimal" required  />
        <Campo rotulo={t.motivo} name="motivo" required minLength={3} maxLength={140}  />
        <Botao type="submit">{t.aplicar}</Botao>
      </form>
      <p data-teste="motivo-ajuda">{t.motivoAjuda}</p>
      <p data-teste="autoriza">{t.autoriza}: {actor.nome ?? actor.email}</p>
    </div>
  );
}

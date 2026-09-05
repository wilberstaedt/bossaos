import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contasAbertas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';

export const dynamic = 'force-dynamic';

/**
 * STAFF-016 · «Solicita un descuento» (atlas)
 *
 * ── Quem pede não é quem autoriza ─────────────────────────────────────────
 *
 * Na sala pede-se; a alçada é de quem a tem. O que fica gravado é **quem
 * autorizou**, e não quem pediu — porque é a assinatura que responde pelo
 * dinheiro. O motivo é obrigatório na base, e não só neste formulário.
 */
export default async function DescontoNoStaff({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { sessao, unidade, orgSlug, actor } = await carregarStaff(idioma, locationId);
  const contas = await comEscopoDoPedido(sessao, (db) => contasAbertas(db, unidade.id));

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="STAFF-016">{t.desconto}</h1>
        </div>
      </div>
      <p data-teste="motivo-ajuda">{t.motivoAjuda}</p>
      <p data-teste="autoriza">{t.autoriza}: {actor.nome ?? actor.email}</p>
      {contas.length === 0 ? <p data-teste="sem-contas">{t.semContas}</p> : (
        <ul className="bo-lista" data-teste="contas">
          {contas.map((c) => (
            <li key={c.id}>
              <span>{c.numero}</span>
              <span>{formatarDinheiro({ montanteMenor: c.devidoMenor, moeda: c.moeda }, idioma)}</span>
              <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="accao" value="ajustar" />
                <input type="hidden" name="tipo" value="DESCONTO" />
                <input type="hidden" name="billId" value={c.id} />
                <input type="hidden" name="locationId" value={locationId} />
                <Campo rotulo={t.desconto} name="valor" type="text" inputMode="decimal" required  />
                <Campo rotulo={t.motivo} name="motivo" required minLength={3} maxLength={140}  />
                <Botao type="submit">{t.aplicar}</Botao>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { Botao } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contasAbertas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';

export const dynamic = 'force-dynamic';

/**
 * STAFF-020 · «Mesa cobrada» (atlas)
 *
 * ── Fechar exige saldo E nada por reconciliar ─────────────────────────────
 *
 * «Encerrar mesa somente quando a regra de saldo e serviço permitir.» Fechar com
 * uma tentativa em aberto seria fechar sem saber se o cliente foi cobrado — a
 * versão silenciosa do pior caso desta etapa.
 *
 * O botão só aparece onde a regra deixa. Onde não deixa, o ecrã diz o que falta,
 * em vez de oferecer um botão que vai recusar.
 */
export default async function FecharMesa({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { sessao, unidade, orgSlug } = await carregarStaff(idioma, locationId);
  const contas = await comEscopoDoPedido(sessao, async (db) => {
    const abertas = await contasAbertas(db, unidade.id);
    const saida = [];
    for (const c of abertas) {
      const porReconciliar = await db.paymentAttempt.count({
        where: { billId: c.id, estado: { in: ['CRIADA', 'PROCESSANDO', 'INDETERMINADA'] } },
      });
      saida.push({ ...c, porReconciliar });
    }
    return saida;
  });

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="STAFF-020">{t.fecharMesa}</h1>
        </div>
      </div>
      {contas.length === 0 ? <p data-teste="sem-contas">{t.semContas}</p> : (
        <ul className="bo-lista" data-teste="contas">
          {contas.map((c) => (
            <li key={c.id}>
              <span>{c.numero}</span>
              <span>{formatarDinheiro({ montanteMenor: c.devidoMenor, moeda: c.moeda }, idioma)}</span>
              {c.porReconciliar > 0 ? (
                <span data-teste="por-reconciliar">{t.porReconciliar}</span>
              ) : c.estado !== 'LIQUIDADA' ? (
                <span data-teste="por-liquidar">{t.porPagar}</span>
              ) : (
                <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
                  <input type="hidden" name="accao" value="fechar_conta" />
                  <input type="hidden" name="billId" value={c.id} />
                  <input type="hidden" name="locationId" value={locationId} />
                  <Botao type="submit">{t.fecharMesa}</Botao>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <p data-teste="reconciliar-ajuda">{t.reconciliarAjuda}</p>
    </div>
  );
}

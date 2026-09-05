import { Botao, Seletor } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contasAbertas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';

export const dynamic = 'force-dynamic';

/**
 * STAFF-015 · «Mueve artículos de cuenta» (atlas)
 *
 * ── Transferir é MOVER, e nunca copiar ────────────────────────────────────
 *
 * Há um índice único sobre a linha de pedido: a mesma linha não pode estar em
 * duas contas. Sem ele, transferir era copiar, e a soma das duas contas passava a
 * ser maior do que o pedido — sem ninguém dar por isso até ao fecho de caixa.
 *
 * E «o que já está cobrado não se move». O ecrã não oferece as contas com
 * pagamento: a recusa existe por baixo na mesma, mas oferecer e depois recusar é
 * ensinar a ignorar o aviso.
 */
export default async function TransferirItens({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { sessao, unidade, orgSlug } = await carregarStaff(idioma, locationId);
  const contas = await comEscopoDoPedido(sessao, (db) => contasAbertas(db, unidade.id));
  const movíveis = contas.filter((c) => c.pagoMenor === 0);
  const linhas = await comEscopoDoPedido(sessao, (db) => db.billLine.findMany({
    where: { billId: { in: movíveis.map((c) => c.id) } },
    select: { id: true, nome: true, quantidade: true, unitarioMenor: true, billId: true },
  }));

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="STAFF-015">{t.transferir}</h1>
        </div>
      </div>
      <p data-teste="transferir-ajuda">{t.transferirAjuda}</p>
      <p data-teste="quantas">{movíveis.length}</p>
      {linhas.length === 0 ? <p data-teste="sem-linhas">{t.nada}</p> : (
        <ul className="bo-lista" data-teste="linhas">
          {linhas.map((l) => (
            <li key={l.id}>
              <span>{l.quantidade} × {l.nome}</span>
              <span>{formatarDinheiro(
                { montanteMenor: l.quantidade * l.unitarioMenor, moeda: 'EUR' }, idioma)}</span>
              <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="accao" value="transferir" />
                <input type="hidden" name="billLineId" value={l.id} />
                <input type="hidden" name="locationId" value={locationId} />
                <Seletor rotulo={t.para} name="paraBillId">
                  {movíveis.filter((c) => c.id !== l.billId).map((c) => (
                    <option key={c.id} value={c.id}>{c.numero}</option>
                  ))}
                </Seletor>
                <Botao type="submit">{t.transferir}</Botao>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { conectorDePagamento } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { contaDoTpv } from '../../../../../../../src/tpv/pagina.ts';
import { PagamentoEmComprovacao } from '../../../../../../../src/pagamento/PagamentoEmComprovacao.tsx';

export const dynamic = 'force-dynamic';

/**
 * POS-007 · «Cobro con tarjeta» (atlas)
 *
 * ── Quem confirma é o webhook, não este ecrã ──────────────────────────────
 *
 * «Retorno do navegador não prova pagamento.» Este ecrã abre a tentativa e passa
 * a mostrar o estado; a confirmação chega pela porta assinada. Um ecrã que diga
 * «pago» porque voltou é um ecrã que mente em cada rede lenta — e a mentira sai
 * cara porque a pessoa vai-se embora sem ter pago.
 *
 * Enquanto a tentativa estiver por reconciliar, o que se vê é a STATE-011, que
 * diz **não tentes outra vez**.
 */
export default async function CobrarComCartao({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; billId: string }> }) {
  const { idioma, locationId, billId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const p = mensagensDe(idioma).pagamentoE23;
  const { conta, somas, sessao, orgSlug } = await contaDoTpv(idioma, locationId, billId);
  const conector = await comEscopoDoPedido(sessao, (db) => conectorDePagamento(db, locationId));

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{conta.numero}</p>
          <h1 data-tela="POS-007">{t.conta}</h1>
        </div>
      </div>
      <p data-teste="falta">{t.porPagar} {formatarDinheiro(
        { montanteMenor: somas.devidoMenor - somas.pagoMenor, moeda: conta.moeda }, idioma)}</p>

      {conta.tentativas.length > 0 ? <PagamentoEmComprovacao idioma={idioma} /> : null}

      {conector?.activo ? (
        <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="accao" value="cobrar_cartao" />
          <input type="hidden" name="billId" value={conta.id} />
          <input type="hidden" name="locationId" value={locationId} />
          <button type="submit" className="bo-botao">{t.aplicar}</button>
        </form>
      ) : (
        // Sem adquirente, não há botão. Um botão que falha ao ser carregado é
        // pior do que a sua ausência explicada.
        <p data-teste="sem-adquirente">{p.semAdquirente}</p>
      )}
      <p data-teste="nao-prova">{p.retornoNaoProva}</p>
    </div>
  );
}

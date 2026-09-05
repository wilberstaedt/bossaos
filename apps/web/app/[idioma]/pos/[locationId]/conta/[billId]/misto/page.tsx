import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-008 · «Combina métodos de pago» (atlas)
 *
 * ── O misto não é um meio novo: são vários pagamentos ─────────────────────
 *
 * Metade em dinheiro e metade em cartão são **dois** pagamentos sobre a mesma
 * conta, cada um com o seu meio e o seu rasto. Um «meio = misto» perdia a
 * informação que a caixa precisa: quanto entrou na gaveta em notas.
 *
 * E o limite continua a ser o do E22: a soma dos pagamentos não passa do devido,
 * e a recusa é de negócio.
 */
export default async function PagamentoMisto({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; billId: string }> }) {
  const { idioma, locationId, billId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { conta, somas } = await contaDoTpv(idioma, locationId, billId);
  const d = (m: number) => formatarDinheiro({ montanteMenor: m, moeda: conta.moeda }, idioma);
  const base = `/${idioma}/pos/${locationId}/conta/${billId}`;

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{conta.numero}</p>
          <h1 data-tela="POS-008">{t.dividir}</h1>
        </div>
      </div>
      <p data-teste="devido">{t.devido} {d(somas.devidoMenor)}</p>
      <p data-teste="pago">{t.pago} {d(somas.pagoMenor)}</p>
      <p data-teste="falta">{t.porPagar} {d(somas.devidoMenor - somas.pagoMenor)}</p>
      <ul className="bo-lista" data-teste="pagamentos">
        {conta.pagamentos.map((p) => (
          <li key={p.id}><span>{p.meio}</span><span>{d(p.montanteMenor)}</span></li>
        ))}
      </ul>
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="dinheiro" href={`${base}/dinheiro`}>{t.dinheiro}</a>
        <a className="bo-botao" data-seccao="cartao" href={`${base}/cartao`}>{t.conta}</a>
      </nav>
    </div>
  );
}

import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { conectorDePagamento } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { contaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-005 · «Elige cómo cobrar» (atlas)
 *
 * Os meios que aparecem são os que **funcionam**. Sem adquirente ligado, o
 * cartão não é uma opção esbatida: é uma opção que não está — e o ecrã diz
 * porquê. Uma escolha que falha ao ser escolhida ensina a equipa a evitar o
 * ecrã inteiro.
 */
export default async function EscolherComoCobrar({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; billId: string }> }) {
  const { idioma, locationId, billId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const p = mensagensDe(idioma).pagamentoE23;
  const { conta, somas, sessao } = await contaDoTpv(idioma, locationId, billId);
  const conector = await comEscopoDoPedido(sessao, (db) => conectorDePagamento(db, locationId));
  const base = `/${idioma}/pos/${locationId}/conta/${billId}`;

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{conta.numero}</p>
          <h1 data-tela="POS-005">{t.dinheiro}</h1>
        </div>
      </div>
      <p data-teste="falta">{t.porPagar} {formatarDinheiro(
        { montanteMenor: somas.devidoMenor - somas.pagoMenor, moeda: conta.moeda }, idioma)}</p>
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="dinheiro" href={`${base}/dinheiro`}>{t.dinheiro}</a>
        {conector?.activo ? (
          <a className="bo-botao" data-seccao="cartao" href={`${base}/cartao`}>{t.conta}</a>
        ) : null}
        <a className="bo-botao" data-seccao="misto" href={`${base}/misto`}>{t.conta}</a>
      </nav>
      {!conector?.activo && <p data-teste="sem-adquirente">{p.semAdquirente}</p>}
      <p data-teste="nao-prova">{p.retornoNaoProva}</p>
    </div>
  );
}

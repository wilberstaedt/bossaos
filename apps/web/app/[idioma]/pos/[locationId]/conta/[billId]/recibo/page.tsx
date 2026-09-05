import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { eDocumentoFiscal, filaFiscal } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { contaDoTpv } from '../../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-012 · «Recibo/ticket» (atlas)
 *
 * ── Este papel NÃO é um documento fiscal, e o ecrã di-lo antes de imprimir ─
 *
 * «Se o produto emite o PDF e a integração falha, o PDF não pode aparecer como
 * se fosse válido.» O recibo existe e serve — é o que o cliente leva — mas o que
 * o torna fiscal é o **registo aceite**, e isso mostra-se aqui ao lado, com o
 * número do fornecedor quando existe.
 *
 * A frase aparece **sempre** que não há documento aceite. Não é um aviso que
 * some quando há dados: é o estado do papel que se está a imprimir.
 */
export default async function ReciboDaConta({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; billId: string }> }) {
  const { idioma, locationId, billId } = await params;
  const t = mensagensDe(idioma).fiscalE24;
  const tpv = mensagensDe(idioma).tpvE22;
  const { conta, somas, sessao } = await contaDoTpv(idioma, locationId, billId);
  const documentos = await comEscopoDoPedido(sessao, (db) => filaFiscal(db, locationId));
  const daConta = documentos.filter((d) => d.billId === conta.id);
  const aceite = daConta.find(eDocumentoFiscal);
  const d = (m: number) => formatarDinheiro({ montanteMenor: m, moeda: conta.moeda }, idioma);

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{conta.numero}</p>
          <h1 data-tela="POS-012">{t.recibo}</h1>
        </div>
      </div>
      <ul className="bo-lista" data-teste="linhas">
        {conta.linhas.map((l) => (
          <li key={l.id}>
            <span>{l.quantidade} × {l.nome}</span>
            <span>{d(l.quantidade * l.unitarioMenor)}</span>
          </li>
        ))}
      </ul>
      <p data-teste="devido">{tpv.devido} {d(somas.devidoMenor)}</p>
      <p data-teste="pago">{tpv.pago} {d(somas.pagoMenor)}</p>

      {aceite ? (
        <>
          <p data-teste="e-documento">{t.eDocumento}</p>
          <p data-teste="numero">{t.numero} {aceite.numeroProvedor}</p>
        </>
      ) : (
        <p data-teste="nao-e-documento">{t.naoEDocumento}</p>
      )}
      <a className="bo-botao" data-seccao="fiscal"
         href={`/${idioma}/pos/${locationId}/fiscal`}>{t.fiscal}</a>
    </div>
  );
}

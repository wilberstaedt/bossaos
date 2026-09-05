import { Botao, Campo, Seletor } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contaDoTpv } from '../../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-004 · «Mesa 07 en el TPV» (atlas)
 *
 * ── O que se tirou vê-se, e vê-se com o motivo ────────────────────────────
 *
 * O desconto não reescreve a venda: é uma linha ao lado. Esconder o ajuste era
 * mostrar um total sem dizer como lá chegou — e é isso que o gerente procura
 * quando a caixa não bate.
 *
 * A tentativa por reconciliar aparece **em cima**: enquanto ela existir, não se
 * cobra outra vez, e quem está ao balcão tem de saber porquê.
 */
export default async function ContaNoTpv({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string; billId: string }> }) {
  const { idioma, locationId, billId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { conta, somas, estado, orgSlug } = await contaDoTpv(idioma, locationId, billId);
  const d = (menor: number) => formatarDinheiro({ montanteMenor: menor, moeda: conta.moeda }, idioma);
  const anulados = new Set(conta.ajustes.map((a) => a.reverteId).filter(Boolean));
  const rotulo = { ABERTA: t.estadoAberta, PARCIALMENTE_LIQUIDADA: t.estadoParcial, LIQUIDADA: t.estadoLiquidada };
  const base = `/${idioma}/pos/${locationId}/conta/${billId}`;

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{conta.numero}</p>
          <h1 data-tela="POS-004">{t.conta}</h1>
        </div>
      </div>

      {conta.tentativas.length > 0 && (
        <div className="bo-aviso bo-aviso--aviso">
          <p data-teste="por-reconciliar">{t.porReconciliar}</p>
          <p data-teste="reconciliar-ajuda">{t.reconciliarAjuda}</p>
          {/* A saída do indeterminado é um ACTO com resultado dito. Sem esta
              porta, a única forma de sair era cobrar outra vez — que é a forma
              de cobrar duas vezes. */}
          {conta.tentativas.map((a) => (
            <form key={a.id} method="post" action={`/api/org/${orgSlug}/tpv`}>
              <input type="hidden" name="accao" value="reconciliar" />
              <input type="hidden" name="attemptId" value={a.id} />
              <input type="hidden" name="billId" value={conta.id} />
              <input type="hidden" name="locationId" value={locationId} />
              <Seletor rotulo={t.reconciliar} name="resultado">
                <option value="CONFIRMADA">{t.pago}</option>
                <option value="FALHOU">{t.nada}</option>
                <option value="CANCELADA">{t.anular}</option>
              </Seletor>
              <Botao type="submit">{t.reconciliar}</Botao>
            </form>
          ))}
        </div>
      )}

      {/* Consolidação controlada: as linhas do pedido entram na conta com o
          preço que valem agora, e a mesma linha não pode estar em duas contas —
          há um índice único que o garante. */}
      <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="juntar_pedido" />
        <input type="hidden" name="billId" value={conta.id} />
        <input type="hidden" name="locationId" value={locationId} />
        <Campo rotulo={t.juntar} name="orderId" required  />
        <Botao type="submit">{t.juntar}</Botao>
      </form>

      <p data-teste="devido">{t.devido} {d(somas.devidoMenor)}</p>
      <p data-teste="pago">{t.pago} {d(somas.pagoMenor)}</p>
      <p data-teste="falta">{t.porPagar} {d(somas.devidoMenor - somas.pagoMenor)}</p>
      <p data-teste="estado-conta">{rotulo[estado]}</p>

      <ul className="bo-lista" data-teste="linhas">
        {conta.linhas.map((l) => (
          <li key={l.id}>
            <span>{l.quantidade} × {l.nome}</span>
            <span>{d(l.quantidade * l.unitarioMenor)}</span>
          </li>
        ))}
      </ul>

      {conta.ajustes.length > 0 && (
        <ul className="bo-lista" data-teste="ajustes">
          {conta.ajustes.map((a) => (
            <li key={a.id}>
              <span>{a.tipo === 'CORTESIA' ? t.cortesia : t.desconto}</span>
              <span>−{d(a.montanteMenor)}</span>
              <span data-teste="ajuste-motivo">{a.motivo}</span>
              {(a.reverteId || anulados.has(a.id)) && <span data-teste="ajuste-anulado">✕</span>}
            </li>
          ))}
        </ul>
      )}

      <nav className="bo-lista">
        <a data-seccao="cobrar" href={`${base}/cobrar`}>{t.aplicar}</a>
        <a data-seccao="dinheiro" href={`${base}/dinheiro`}>{t.dinheiro}</a>
        <a data-seccao="devolver" href={`${base}/devolver`}>{t.devolver}</a>
        <a data-seccao="dividir" href={`${base}/dividir`}>{t.dividir}</a>
        <a data-seccao="desconto" href={`${base}/desconto`}>{t.desconto}</a>
        <a data-seccao="cortesia" href={`${base}/cortesia`}>{t.cortesia}</a>
        <a data-seccao="anular" href={`${base}/anular`}>{t.anular}</a>
      </nav>
    </div>
  );
}

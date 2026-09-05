import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contasDoTpv } from '../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-002 · «Tu TPV» (atlas)
 *
 * ── O que se mostra é o que a base derivou ────────────────────────────────
 *
 * O estado de cada conta não vem de uma coluna: vem de somar os pagamentos
 * confirmados e comparar com o devido. É por isso que esta lista não pode
 * mostrar uma conta «paga» sem existir um pagamento — não há onde alguém o
 * escrever.
 */
export default async function HomeDoTpv({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { unidade, contas } = await contasDoTpv(idioma, locationId);
  const rotulo = { ABERTA: t.estadoAberta, PARCIALMENTE_LIQUIDADA: t.estadoParcial, LIQUIDADA: t.estadoLiquidada };

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="POS-002">{t.tpv}</h1>
        </div>
      </div>
      <nav className="bo-lista">
        <a data-seccao="operador" href={`/${idioma}/pos/${locationId}/operador`}>{t.operador}</a>
        <a data-seccao="balcao" href={`/${idioma}/pos/${locationId}/balcao`}>{t.balcao}</a>
        <a data-seccao="caixa" href={`/${idioma}/pos/${locationId}/caixa`}>{t.historico}</a>
        {/* As telas do E23 têm porta a partir daqui: sem isto seriam telas
            provadas a que ninguém chega, que é o que o marco já reprovou. */}
        <a data-seccao="pagamentos" href={`/${idioma}/pos/${locationId}/pagamentos`}>{t.caixa}</a>
        <a data-seccao="terminais" href={`/${idioma}/pos/${locationId}/terminais`}>{t.operador}</a>
      </nav>
      <h2>{t.contasAbertas}</h2>
      <p data-teste="quantas">{contas.length}</p>
      {contas.length === 0 ? <p data-teste="sem-contas">{t.semContas}</p> : (
        <ul className="bo-lista">
          {contas.map((c) => (
            <li key={c.id}>
              <a href={`/${idioma}/pos/${locationId}/conta/${c.id}`}>{c.numero}</a>
              <span>{formatarDinheiro({ montanteMenor: c.devidoMenor, moeda: c.moeda }, idioma)}</span>
              <span data-teste="estado-conta">{rotulo[c.estado]}</span>
            </li>
          ))}
        </ul>
      )}
      {/* A régua manda dizer o que NÃO está ligado, e dizer sempre. */}
      <p data-teste="sem-provedor">{t.semProvedor}</p>
    </div>
  );
}

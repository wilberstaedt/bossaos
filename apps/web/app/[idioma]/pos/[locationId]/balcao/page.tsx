import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarTpv } from '../../../../../src/tpv/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * POS-003 · «Venta de barra» (atlas)
 *
 * A venda de balcão abre uma conta **sem sessão de mesa**: é o mesmo objecto, e
 * é por isso que o resto do TPV não precisa de saber a diferença. Uma tabela de
 * vendas rápidas ao lado era a decisão que se paga depois — a mesma que o E20
 * recusou para o canal.
 */
export default async function BalcaoDoTpv({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { unidade, orgSlug } = await carregarTpv(idioma, locationId);

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="POS-003">{t.balcao}</h1>
        </div>
      </div>
      <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="abrir_conta" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <Campo rotulo={t.conta} name="nome" required maxLength={80}  />
                {/* type=text com parser próprio: o step do HTML5 rejeita valores por
            constraint nativa antes de o JS os ver, e dinheiro não se escreve com
            as regras de um contador. */}
<Campo rotulo={t.devido} name="valor" type="text" inputMode="decimal" required />
        <Botao type="submit">{t.novaConta}</Botao>
      </form>
      <p data-teste="sem-fiscal">{t.semFiscal}</p>
      <a className="bo-botao bo-botao--fantasma" data-seccao="tpv" href={`/${idioma}/pos/${locationId}`}>{t.voltar}</a>
    </div>
  );
}

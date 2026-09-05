import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { carregarStock } from '../../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INV-008 · «t.perda» (atlas)
 *
 * ── A perda é um movimento com RAZÃO, e não um acerto ────────────────────
 *
 * «Se a comida foi para o lixo, isso é uma quebra — outro movimento, com a sua
 * razão.» Registá-la como ajuste apagaria a diferença entre o que se estragou e
 * o que se contou mal, e são duas conversas diferentes com o fornecedor.
 */
export default async function TelaINV008({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).stockE25;
  const { unidade, insumos } = await carregarStock(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INV-008">{t.perda}</h1>
        </div>
      </div>
      <p data-teste="quantos-insumos">{insumos.length}</p>
      <form method="post" action={`/api/org/${orgSlug}/stock`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="movimentar" />
        <input type="hidden" name="tipo" value="QUEBRA" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.insumo} name="itemId" required>
          {insumos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
        </Seletor>
        <Campo rotulo={t.quantidade} name="quantidade" type="text" inputMode="numeric" required />
        <Campo rotulo={t.motivo} name="motivo" required minLength={3} maxLength={140} />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}

import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { carregarCrm } from '../../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * CRM-005 · «Define tu segmento» (atlas)
 *
 * ── Não há campo para colar contactos, e é de propósito ───────────────────
 *
 * Uma lista exportada e reimportada perde a origem do consentimento; uma lista
 * colada não tem origem nenhuma. O segmento guarda **critérios**, e quem entra
 * decide-se por consulta no momento do envio.
 */
export default async function NovoSegmento({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).crmE27;
  const { unidade } = await carregarCrm(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="CRM-005">{t.novoSegmento}</h1>
        </div>
      </div>
      <p data-teste="audiencia-por-regra">{t.audienciaPorRegra}</p>
      <form method="post" action={`/api/org/${orgSlug}/crm`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_segmento" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.nome} name="nome" required maxLength={80} />
        <Seletor rotulo={t.exigeConsentimento} name="canal" required>
          <option value="EMAIL">EMAIL</option>
          <option value="SMS">SMS</option>
        </Seletor>
        <Campo rotulo={t.pontosMinimos} name="pontosMinimos" type="text" inputMode="numeric" />
        <Campo rotulo={t.origem} name="origem" maxLength={60} />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}

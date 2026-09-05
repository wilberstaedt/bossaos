import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { modelosDaUnidade } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarCrm } from '../../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * CRM-009 · «Prepara una campaña» (atlas)
 *
 * A campanha escolhe um **segmento** — nunca pessoas. E não há aqui nenhum
 * campo onde se cole uma lista de contactos: esse é o caminho por onde entra a
 * lista sem origem de consentimento.
 */
export default async function NovaCampanha({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).crmE27;
  const base = await carregarCrm(idioma, orgSlug, locationSlug);
  const modelos = await comEscopoDoPedido(base.sessao,
    (db) => modelosDaUnidade(db, base.unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{base.unidade.nome}</p>
          <h1 data-tela="CRM-009">{t.novaCampanha}</h1>
        </div>
      </div>
      <p data-teste="audiencia-por-regra">{t.audienciaPorRegra}</p>
      <p data-teste="quantos-segmentos">{base.segmentos.length}</p>
      <form method="post" action={`/api/org/${orgSlug}/crm`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_campanha" />
        <input type="hidden" name="locationId" value={base.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.nome} name="nome" required maxLength={80} />
        <Seletor rotulo={t.canal} name="canal" required>
          <option value="EMAIL">EMAIL</option>
          <option value="SMS">SMS</option>
        </Seletor>
        <Seletor rotulo={t.segmento} name="segmentId" required>
          {base.segmentos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </Seletor>
        <Seletor rotulo={t.modelo} name="templateId" required>
          {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </Seletor>
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}

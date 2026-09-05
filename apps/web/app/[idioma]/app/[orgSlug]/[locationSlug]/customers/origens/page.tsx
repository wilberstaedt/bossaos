import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarOrigens } from '../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/** CRM-012 · «De dónde llegan» (atlas) — origem é informação, não permissão. */
export default async function Origens({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).crmE27;
  const { unidade, origens } = await carregarOrigens(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="CRM-012">{t.origens}</h1>
        </div>
      </div>
      {/* Saber de onde veio alguém não é ter permissão para lhe escrever. */}
      <p data-teste="servico-nao-da-campanha">{t.servicoNaoDaCampanha}</p>
      <p data-teste="quantas-origens">{origens.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="origens">
        {origens.map((o) => (
          <li key={o.origem}>
            <span data-teste="origem">{o.origem}</span>
            <span data-teste="quantos">{o.quantos}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

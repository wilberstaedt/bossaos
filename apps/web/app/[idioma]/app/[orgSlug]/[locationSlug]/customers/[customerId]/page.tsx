import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarCliente } from '../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * CRM-002 · «María López» (atlas)
 *
 * ── O que esta tela NÃO mostra ────────────────────────────────────────────
 *
 * Não há aqui um interruptor «aceita campanhas». Não existe porque não há
 * coluna nenhuma que o guarde: as quatro respostas vivem na CRM-013, separadas
 * por finalidade e por canal, e cada uma com a sua origem.
 */
export default async function Cliente({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; customerId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, customerId } = await params;
  const t = mensagensDe(idioma).crmE27;
  const base = await carregarCliente(idioma, orgSlug, locationSlug, customerId);
  const raiz = `/${idioma}/app/${orgSlug}/${locationSlug}/customers/${customerId}`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{t.cliente}</p>
          <h1 data-tela="CRM-002">{base.cliente.nome}</h1>
        </div>
      </div>
      <p data-teste="email">{base.cliente.email ?? '—'}</p>
      <p data-teste="telefone">{base.cliente.telefone ?? '—'}</p>
      <p data-teste="origem">{base.cliente.origem ?? t.semOrigem}</p>
      <p data-teste="saldo">{t.saldo}: {String(base.cliente.saldoPontos)}</p>
      <p data-teste="saldo-derivado">{t.saldoDerivado}</p>
      <p data-teste="quantos-consentimentos">
        {base.consentimentos.estado.filter((e) => e.vivo).length}
      </p>
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="preferencias" href={`${raiz}/preferencias`}>
          {t.preferencias}
        </a>
        <a className="bo-botao" data-seccao="recompensas" href={`${raiz}/recompensas`}>
          {t.recompensas}
        </a>
      </nav>
    </div>
  );
}

import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Seletor } from '@bossaos/ui';
import { carregarCliente } from '../../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * CRM-013 · «Preferencias de contacto» (atlas)
 *
 * ── Quatro respostas, e nunca uma ─────────────────────────────────────────
 *
 * Aceitar ser avisado de que a mesa está pronta não é aceitar promoções.
 * Aceitar email não é aceitar SMS. São quatro consentimentos independentes, e
 * cada um mostra-se com a sua origem e o seu momento — porque um consentimento
 * sem origem não se consegue defender a ninguém.
 */
export default async function Preferencias({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; customerId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, customerId } = await params;
  const t = mensagensDe(idioma).crmE27;
  const base = await carregarCliente(idioma, orgSlug, locationSlug, customerId);
  const rotuloDaFinalidade = (f: string) => (f === 'SERVICO' ? t.servico : t.campanhaFinalidade);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{base.cliente.nome}</p>
          <h1 data-tela="CRM-013">{t.preferencias}</h1>
        </div>
      </div>
      <p data-teste="servico-nao-da-campanha">{t.servicoNaoDaCampanha}</p>
      <p data-teste="retirada-vale">{t.retiradaVale}</p>
      <p data-teste="quantas-respostas">{base.consentimentos.estado.length}</p>

      <ul className="bo-lista bo-lista--colunas" data-teste="consentimentos">
        {base.consentimentos.estado.map((e) => (
          <li key={`${e.finalidade}-${e.canal}`}>
            <span data-teste="finalidade">{rotuloDaFinalidade(e.finalidade)}</span>
            <span data-teste="canal">{e.canal}</span>
            <span data-teste={e.vivo ? 'vivo' : 'nao-vivo'}>{e.vivo ? t.dado : t.retirado}</span>
          </li>
        ))}
      </ul>

      <h2>{t.historico}</h2>
      <p data-teste="quantos-acontecimentos">{base.consentimentos.historico.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="historico">
        {base.consentimentos.historico.map((h) => (
          <li key={h.id}>
            <span data-teste="finalidade">{rotuloDaFinalidade(h.finalidade)}</span>
            <span data-teste="canal">{h.canal}</span>
            <span data-teste="accao">{h.accao === 'DADO' ? t.dado : t.retirado}</span>
            <span data-teste="origem">{h.origem}</span>
            <span data-teste="momento">{h.momento.toISOString().slice(0, 10)}</span>
          </li>
        ))}
      </ul>

      <form method="post" action={`/api/org/${orgSlug}/crm`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="consentimento" />
        <input type="hidden" name="customerId" value={base.cliente.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.finalidade} name="finalidade" required>
          <option value="SERVICO">{t.servico}</option>
          <option value="CAMPANHA">{t.campanhaFinalidade}</option>
        </Seletor>
        <Seletor rotulo={t.canal} name="canal" required>
          <option value="EMAIL">EMAIL</option>
          <option value="SMS">SMS</option>
        </Seletor>
        <Seletor rotulo={t.preferencias} name="valor" required>
          <option value="DADO">{t.dado}</option>
          <option value="RETIRADO">{t.retirado}</option>
        </Seletor>
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}

import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao } from '@bossaos/ui';
import { enviosDaCampanha } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarCrm } from '../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/** CRM-008 · «Tus campañas» (atlas) */
export default async function Campanhas({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).crmE27;
  const base = await carregarCrm(idioma, orgSlug, locationSlug);
  const raiz = `/${idioma}/app/${orgSlug}/${locationSlug}/customers/campanhas`;
  const comEnvios = await comEscopoDoPedido(base.sessao, async (db) => Promise.all(
    base.campanhas.map(async (c) => ({ ...c, lista: await enviosDaCampanha(db, c.id) })),
  ));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{base.unidade.nome}</p>
          <h1 data-tela="CRM-008">{t.campanhas}</h1>
        </div>
      </div>
      <p data-teste="retirada-vale">{t.retiradaVale}</p>
      <p data-teste="sem-envio-real">{t.semEnvioReal}</p>
      <p data-teste="quantas-campanhas">{base.campanhas.length}</p>
      {base.campanhas.length === 0 ? <p data-teste="sem-campanhas">{t.semCampanhas}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="campanhas">
          {comEnvios.map((c) => (
            <li key={c.id}>
              <span data-teste="nome">{c.nome}</span>
              <span data-teste="canal">{c.canal}</span>
              <span data-teste="estado">{c.estado}</span>
              <span data-teste="quantos-envios">{c.lista.length}</span>
              <form method="post" action={`/api/org/${orgSlug}/crm`} className="bo-forma">
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="accao" value="enviar" />
                <input type="hidden" name="campaignId" value={c.id} />
                <input type="hidden" name="locationSlug" value={locationSlug} />
                <Botao type="submit">{t.enviar}</Botao>
              </form>
            </li>
          ))}
        </ul>
      )}
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="nova-campanha" href={`${raiz}/nova`}>
          {t.novaCampanha}
        </a>
      </nav>
    </div>
  );
}

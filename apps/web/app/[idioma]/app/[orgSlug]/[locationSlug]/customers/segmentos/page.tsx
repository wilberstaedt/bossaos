import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarCrm } from '../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/** CRM-004 · «Segmentos de clientes» (atlas) — critérios, nunca pessoas. */
export default async function Segmentos({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).crmE27;
  const { unidade, segmentos } = await carregarCrm(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/customers/segmentos`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="CRM-004">{t.segmentos}</h1>
        </div>
      </div>
      <p data-teste="audiencia-por-regra">{t.audienciaPorRegra}</p>
      <p data-teste="quantos-segmentos">{segmentos.length}</p>
      {segmentos.length === 0 ? <p data-teste="sem-segmentos">{t.semSegmentos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="segmentos">
          {segmentos.map((s) => {
            // ── A regra mostra-se em palavras, e não como JSON ────────────
            //
            // O JSON cru é um bloco sem sítio onde quebrar: a 360 px empurrava
            // a página inteira para o lado. E, mesmo que coubesse, quem lê o
            // ecrã precisa de saber o que a regra FAZ — «só quem consentiu
            // promoções por email» — e não a forma como está guardada.
            const r = s.regra as {
              exigeConsentimento?: { finalidade: string; canal: string };
              pontosMinimos?: number;
              origem?: string;
            } | null;
            return (
              <li key={s.id}>
                <span>{s.nome}</span>
                {r?.exigeConsentimento ? (
                  <span data-teste="regra-consentimento">
                    {t.exigeConsentimento} · {r.exigeConsentimento.canal}
                  </span>
                ) : null}
                {r?.pontosMinimos === undefined ? null : (
                  <span data-teste="regra-pontos">{t.pontosMinimos}: {r.pontosMinimos}</span>
                )}
                {r?.origem ? (
                  <span data-teste="regra-origem">{t.origem}: {r.origem}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="novo-segmento" href={`${base}/novo`}>
          {t.novoSegmento}
        </a>
      </nav>
    </div>
  );
}

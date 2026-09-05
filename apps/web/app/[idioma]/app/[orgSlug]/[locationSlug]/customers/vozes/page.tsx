import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarVozes } from '../../../../../../../src/crm/pagina.ts';

export const dynamic = 'force-dynamic';

/** CRM-011 · «La voz de tus clientes» (atlas) */
export default async function Vozes({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).crmE27;
  const { unidade, respostas } = await carregarVozes(idioma, orgSlug, locationSlug);
  // A média calcula-se em inteiros e mostra-se com uma casa: somar notas em
  // vírgula flutuante daria 4.199999999 num ecrã de gestão.
  const soma = respostas.reduce((s, r) => s + r.nota, 0);
  const media = respostas.length === 0 ? null : Math.round((soma * 10) / respostas.length);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="CRM-011">{t.voz}</h1>
        </div>
      </div>
      <p data-teste="quantas-respostas">{respostas.length}</p>
      <p data-teste="media">{media === null ? '—' : `${Math.floor(media / 10)},${media % 10}`}</p>
      {respostas.length === 0 ? <p data-teste="sem-respostas">{t.semRespostas}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="respostas">
          {respostas.map((r) => (
            <li key={r.id}>
              <span data-teste="nota">{r.nota}</span>
              <span data-teste="comentario">{r.comentario ?? '—'}</span>
              <span data-teste="quem">{r.cliente?.nome ?? '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

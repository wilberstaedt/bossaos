import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { carregarCorreccoes } from '../../../../../../../src/ponto/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * HR-010 · «Revisa un ajuste de jornada» (atlas)
 *
 * ── Quem corrigiu vê-se, e a autocorrecção distingue-se ───────────────────
 *
 * Não se proíbe corrigir a própria marcação — há casas onde o único que lá está
 * às 2h é quem se esqueceu de picar. O que se exige é que a diferença apareça,
 * porque uma marcação corrigida pela própria pessoa sem segundo par de olhos é
 * um convite, e quem revê tem de a poder ver como tal.
 */
export default async function Correccoes({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).pontoE28;
  const b = await carregarCorreccoes(idioma, orgSlug, locationSlug);
  const auto = b.correccoes.filter((c) => c.autorMembershipId === c.membershipId);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.unidade.nome}</p>
          <h1 data-tela="HR-010">{t.correccoes}</h1>
        </div>
      </div>
      <p data-teste="quem-corrige">{t.quemCorrige}</p>
      <p data-teste="quantas-correccoes">{b.correccoes.length}</p>
      <p data-teste="quantas-autocorreccoes">{auto.length}</p>
      {b.correccoes.length === 0 ? <p data-teste="sem-correccoes">{t.semCorreccoes}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="correccoes">
          {b.correccoes.map((c) => (
            <li key={c.id}>
              <span data-teste="quem">{b.nomeDe(c.membershipId)}</span>
              <span data-teste="autor">{b.nomeDe(c.autorMembershipId)}</span>
              <span data-teste={c.autorMembershipId === c.membershipId
                ? 'autocorreccao' : 'por-terceiro'}>
                {c.autorMembershipId === c.membershipId ? t.autocorreccao : t.porTerceiro}
              </span>
              <span data-teste="de">{c.corrige?.momento.toISOString().slice(11, 16) ?? '—'}</span>
              <span data-teste="para">{c.momento.toISOString().slice(11, 16)}</span>
              <span data-teste="motivo">{c.motivo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

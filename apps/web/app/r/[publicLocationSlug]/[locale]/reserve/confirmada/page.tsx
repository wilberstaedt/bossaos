import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { unidadeDoEndereco } from '../../../../../../src/reserva/publica.ts';

export const dynamic = 'force-dynamic';

/**
 * RES-C-006 · «¡Mesa reservada!» (atlas)
 *
 * ── Isto é um FACTO, e diz-se como facto ──────────────────────────────────
 *
 * É o par da estimativa: a mesa está reservada, e a frase não tem «cerca de»,
 * «calculamos» nem «pode mudar». A régua exige que a diferença seja legível
 * **sem ver as duas ao lado uma da outra**, porque na vida real nunca se vêem as
 * duas ao lado uma da outra.
 *
 * O link de gestão vai no endereço e é o segredo, não o identificador: «um token
 * sequencial deixa ver a reserva do vizinho».
 */
export default async function ReservaConfirmada({
  params, searchParams,
}: {
  params: Promise<{ publicLocationSlug: string; locale: Idioma }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicLocationSlug, locale } = await params;
  const busca = (await searchParams) ?? {};
  const p = mensagensDe(locale).reservaE19;
  const unidade = await unidadeDoEndereco(publicLocationSlug);
  const segredo = typeof busca.t === 'string' ? busca.t : '';
  const base = `/r/${publicLocationSlug}/${locale}/reserve`;

  return (
    <div className="bo-publico__conteudo">
      <h1 data-tela="RES-C-006">{p.confirmada}</h1>
      <p data-teste="facto">{p.confirmadaTexto}</p>
      <p className="bo-campo__ajuda">{unidade.nome}</p>
      {segredo ? (
        <a className="bo-botao bo-botao--secundario" data-teste="gerir"
           href={`${base}/gerir?t=${encodeURIComponent(segredo)}`}>{p.gerir}</a>
      ) : null}
    </div>
  );
}

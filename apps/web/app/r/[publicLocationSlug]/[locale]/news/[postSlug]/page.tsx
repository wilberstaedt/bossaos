import { notFound } from 'next/navigation';
import { sitePublico } from '@bossaos/db';
import { novidadeDoSite } from '@bossaos/domain';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraDoSite } from '../../../../../../src/componentes/SitePublico.tsx';
import { obterBase } from '../../../../../../src/servidor.ts';

/**
 * PUB-006 · «Una noche para compartir» — a ficha de uma novidade (atlas p. 13)
 *
 * ── `novidadeDoSite` devolve a pedida, ou nada ────────────────────────────
 *
 * Nunca a primeira da lista. Um endereço que devolve conteúdo diferente do que
 * pede é a mesma família de defeito da carta que servia o menu de outra unidade:
 * a página responde 200, parece certa, e mostra outra coisa.
 *
 * E uma novidade oculta não está na revisão publicada, portanto dá 404 pela
 * mesma porta por onde uma que não existe dá — sem um `if (visivel)` aqui, que
 * seria uma segunda oportunidade de enganar.
 */
export const dynamic = 'force-dynamic';

const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;

export default async function NovidadePublica({
  params,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string; postSlug: string }>;
}) {
  const { publicLocationSlug, locale, postSlug } = await params;
  const idioma: Idioma = (IDIOMAS as readonly string[]).includes(locale)
    ? (locale as Idioma) : 'es-ES';
  const s = mensagensDe(idioma).sitioE10;

  const servida = await sitePublico(obterBase(), publicLocationSlug);
  if (!servida) notFound();

  const novidade = novidadeDoSite(servida.site, postSlug);
  if (!novidade) notFound();

  return (
    <MolduraDoSite
      slug={publicLocationSlug} idioma={idioma} unidade={servida.unidade}
      marca={servida.marca} site={servida.site} actual="NOVIDADES"
      caminho={`/news/${postSlug}`}
    >
      <article>
        <div className="bo-publico__heroi">
          <h1>{novidade.titulo}</h1>
          <p className="bo-publico__data">
            {novidade.publicadoEm
              ? `${s.publicadoEm} ${novidade.publicadoEm.slice(0, 10)}`
              : s.semData}
          </p>
        </div>
        <div className="bo-publico__texto">
          {novidade.resumo ? <p><strong>{novidade.resumo}</strong></p> : null}
          {novidade.corpo
            ? novidade.corpo.split('\n\n').map((p, i) => <p key={i}>{p}</p>)
            : null}
        </div>
      </article>
      <p style={{ marginTop: 'var(--bo-espaco-xl)' }}>
        <a href={`/r/${publicLocationSlug}/${idioma}`}>{s.voltarAoInicio}</a>
      </p>
    </MolduraDoSite>
  );
}

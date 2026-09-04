import { notFound } from 'next/navigation';
import { sitePublico } from '@bossaos/db';
import { paginaDoSite } from '@bossaos/domain';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraDoSite } from '../../../../src/componentes/SitePublico.tsx';
import { obterBase } from '../../../../src/servidor.ts';

/**
 * PUB-001 · a home pública do restaurante (atlas p. 9)
 *
 * ── Lê a REVISÃO PUBLICADA, e não tem por onde ler outra coisa ────────────
 *
 * `sitePublico` chama a função `publico_site`, que junta `site_publications` a
 * `site_revisions`. Um rascunho não tem linha em `site_publications`; um site
 * retirado deixou de a ter. **Não há caminho** por onde o rascunho chegue aqui —
 * o aceite 1 é uma consequência da forma, não de uma verificação que alguém
 * tenha de se lembrar de escrever.
 *
 * E as quatro ausências — endereço que não existe, unidade arquivada, nunca
 * publicado, retirado — dão a **mesma** resposta. Dizer "existe mas está
 * retirado" a um estranho é contar que o restaurante existe.
 */
export const dynamic = 'force-dynamic';

const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;

export default async function HomePublica({
  params,
}: {
  params: Promise<{ publicLocationSlug: string; locale: string }>;
}) {
  const { publicLocationSlug, locale } = await params;
  const idioma: Idioma = (IDIOMAS as readonly string[]).includes(locale)
    ? (locale as Idioma) : 'es-ES';
  const m = mensagensDe(idioma);
  const s = m.sitioE10;

  const servida = await sitePublico(obterBase(), publicLocationSlug);
  if (!servida) notFound();

  const inicio = paginaDoSite(servida.site, 'INICIO');
  const base = `/r/${publicLocationSlug}/${idioma}`;

  return (
    <MolduraDoSite
      slug={publicLocationSlug} idioma={idioma} unidade={servida.unidade}
      marca={servida.marca} site={servida.site} actual="INICIO" caminho=""
    >
      <section className="bo-publico__heroi">
        <h1>{inicio?.titulo ?? servida.unidade}</h1>
        {inicio?.corpo ? (
          <div className="bo-publico__texto">
            {inicio.corpo.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        ) : null}
        <p>
          <a className="bo-botao bo-botao--primario" href={`${base}/menu`}>{s.verCarta}</a>
        </p>
      </section>

      {/* As novidades aparecem na home porque é onde alguém repara nelas. A lista
          já vem ordenada pela projecção — a ordem não pode depender da consulta,
          senão duas visitas à mesma página vêem coisas diferentes. */}
      {servida.site.novidades.length > 0 ? (
        <section aria-labelledby="novidades">
          <h2 id="novidades">{s.novidades}</h2>
          <div className="bo-publico__novidades">
            {servida.site.novidades.slice(0, 4).map((n) => (
              <article key={n.slug} className="bo-publico__novidade">
                <h3>{n.titulo}</h3>
                <p className="bo-publico__data">
                  {n.publicadoEm ? `${s.publicadoEm} ${n.publicadoEm.slice(0, 10)}` : s.semData}
                </p>
                {n.resumo ? <p>{n.resumo}</p> : null}
                <a href={`${base}/news/${n.slug}`}>{s.verNovidade}</a>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </MolduraDoSite>
  );
}

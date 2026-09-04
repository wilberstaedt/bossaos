import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { NavegacaoDoSite } from '../../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../../src/site-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * WEB-008 · «Cómo aparece en buscadores» (atlas p. 252)
 *
 * ── Sem valor por omissão, e é deliberado ─────────────────────────────────
 *
 * Nem o título nem a descrição nascem preenchidos com o nome da unidade. É a
 * mesma decisão que o E06 tomou para a moeda e o fuso: com um valor por
 * omissão, quem cria nunca é obrigado a escolher — e o que se arranja quando não
 * se sabe é o da unidade anterior.
 *
 * Vazio é vazio, e a página pública mostra o que o navegador faz sem estes
 * campos, que é honesto. Uma descrição inventada a partir do primeiro parágrafo
 * seria texto que ninguém escreveu a aparecer nos resultados de pesquisa com o
 * nome do cliente por cima.
 */
export default async function SeoDoSite({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const { guardado } = await searchParams;
  const m = mensagensDe(idioma);
  const g = m.gestaoSiteE10;
  const { unidade, rascunho } = await carregarSite(idioma, orgSlug, locationSlug);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.seo}</h1>
        </div>
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/seo" />
      <Aviso tom="info" titulo={g.estado}>{g.avisoRascunho}</Aviso>
      {guardado === '1' ? <Aviso tom="sucesso" titulo={m.comum.guardado}>{g.avisoRascunho}</Aviso> : null}

      <form method="post" action={`/api/org/${orgSlug}/site`} className="bo-publico__formulario">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="seccao" value="/seo" />

        <div className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="seoTitulo">{g.seoTitulo}</label>
          <input className="bo-campo__controlo" id="seoTitulo" name="seoTitulo"
                 defaultValue={rascunho?.seoTitulo ?? ''} maxLength={70} />
        </div>
        <div className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="seoDescricao">{g.seoDescricao}</label>
          <textarea id="seoDescricao" name="seoDescricao"
                    defaultValue={rascunho?.seoDescricao ?? ''} maxLength={160} />
        </div>

        <p><button type="submit" className="bo-botao bo-botao--primario">{g.guardar}</button></p>
      </form>
    </div>
  );
}

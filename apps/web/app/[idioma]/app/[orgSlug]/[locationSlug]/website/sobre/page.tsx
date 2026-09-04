import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { NavegacaoDoSite } from '../../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../../src/site-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * WEB-004 · «La historia del restaurante» (atlas p. 248)
 */
export default async function ConteudoDaPagina({
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
  const guardada = rascunho?.paginas.find((p) => p.tipo === 'SOBRE');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.sobre}</h1>
        </div>
        <Etiqueta tom={guardada?.visivel ? 'sucesso' : 'neutro'}>
          {guardada?.visivel ? g.visivel : g.oculta}
        </Etiqueta>
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/sobre" />
      <Aviso tom="info" titulo={g.estado}>{g.avisoRascunho}</Aviso>
      {guardado === '1' ? <Aviso tom="sucesso" titulo={m.comum.guardado}>{g.avisoRascunho}</Aviso> : null}

      <form method="post" action={`/api/org/${orgSlug}/site/pagina`} className="bo-publico__formulario">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="tipo" value="SOBRE" />
        <input type="hidden" name="seccao" value="/sobre" />

        <div className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="titulo">{g.titutloPagina}</label>
          <input className="bo-campo__controlo" id="titulo" name="titulo"
                 defaultValue={guardada?.titulo ?? ''} maxLength={200} />
        </div>
        <div className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="corpo">{g.corpo}</label>
          <textarea id="corpo" name="corpo" defaultValue={guardada?.corpo ?? ''} maxLength={8000} />
        </div>

        <div className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="visivel">
            <input id="visivel" name="visivel" type="checkbox" defaultChecked={guardada?.visivel ?? false} />
            {' '}{g.visivel}
          </label>
        </div>

        <p><button type="submit" className="bo-botao bo-botao--primario">{g.guardar}</button></p>
      </form>
    </div>
  );
}

import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { NavegacaoDoSite } from '../../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../../src/site-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * WEB-005 · «Cómo encontrarnos» (atlas p. 249)\n *\n * Os três campos de contacto vivem nesta página e não na configuração geral:\n * são o conteúdo DELA, e quem os edita está a escrever a página, não a\n * configurar o site. Um contacto guardado noutro sítio acabaria por ficar\n * diferente do que a página mostra.
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
  const guardada = rascunho?.paginas.find((p) => p.tipo === 'CONTACTO');

  const bruto = (guardada?.contacto ?? null) as
    { morada?: string; telefone?: string; email?: string } | null;
  const c = { morada: bruto?.morada ?? null, telefone: bruto?.telefone ?? null, email: bruto?.email ?? null };

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.contacto}</h1>
        </div>
        <Etiqueta tom={guardada?.visivel ? 'sucesso' : 'neutro'}>
          {guardada?.visivel ? g.visivel : g.oculta}
        </Etiqueta>
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/contacto" />
      <Aviso tom="info" titulo={g.estado}>{g.avisoRascunho}</Aviso>
      {guardado === '1' ? <Aviso tom="sucesso" titulo={m.comum.guardado}>{g.avisoRascunho}</Aviso> : null}

      <form method="post" action={`/api/org/${orgSlug}/site/pagina`} className="bo-publico__formulario">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="tipo" value="CONTACTO" />
        <input type="hidden" name="seccao" value="/contacto" />

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
              <label className="bo-campo__rotulo" htmlFor="morada">{g.moradaCampo}</label>
              <input className="bo-campo__controlo" id="morada" name="morada"
                     defaultValue={c.morada ?? ''} maxLength={300} />
            </div>
            <div className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="telefone">{g.telefoneCampo}</label>
              <input className="bo-campo__controlo" id="telefone" name="telefone"
                     defaultValue={c.telefone ?? ''} inputMode="tel" maxLength={40} />
            </div>
            <div className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="email">{g.emailCampo}</label>
              <input className="bo-campo__controlo" id="email" name="email" type="email"
                     defaultValue={c.email ?? ''} maxLength={320} />
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

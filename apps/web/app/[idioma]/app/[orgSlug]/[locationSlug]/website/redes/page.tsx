import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { REDES } from '@bossaos/domain';
import { NavegacaoDoSite } from '../../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../../src/site-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * WEB-007 · «Tus enlaces sociales» (atlas p. 251)
 *
 * ── A lista de redes é fechada, e isso é a defesa ─────────────────────────
 *
 * Um campo de "rede" livre torna-se um campo de URL livre, e um campo de URL
 * livre acaba com `javascript:` lá dentro no dia em que alguém escreve um `<a
 * href>` com ele. `javascript:alert(1)` é um URL válido para o navegador — só
 * `https:` é que não o é.
 *
 * A verificação acontece na rota que grava **e** outra vez na projecção. Duas
 * vezes de propósito: a base já pode ter linhas guardadas antes desta regra
 * existir, e a projecção é o último sítio antes da internet aberta.
 */
export default async function RedesDoSite({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const { guardado, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const g = m.gestaoSiteE10;
  const { unidade, rascunho } = await carregarSite(idioma, orgSlug, locationSlug);

  const guardadas = new Map<string, string>();
  for (const r of (Array.isArray(rascunho?.redes) ? rascunho.redes : []) as unknown[]) {
    if (r && typeof r === 'object') {
      const o = r as { rede?: unknown; url?: unknown };
      if (typeof o.rede === 'string' && typeof o.url === 'string') guardadas.set(o.rede, o.url);
    }
  }

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.redes}</h1>
        </div>
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/redes" />
      <Aviso tom="info" titulo={g.estado}>{g.avisoRascunho}</Aviso>
      {guardado === '1' ? <Aviso tom="sucesso" titulo={m.comum.guardado}>{g.avisoRascunho}</Aviso> : null}
      {erro === 'rede' ? <Aviso tom="aviso" titulo={g.redes}>{g.dominioInvalido}</Aviso> : null}

      <form method="post" action={`/api/org/${orgSlug}/site`} className="bo-publico__formulario">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="seccao" value="/redes" />

        {REDES.map((rede) => (
          <div className="bo-campo" key={rede}>
            <label className="bo-campo__rotulo" htmlFor={`rede_${rede}`}>{rede}</label>
            <input className="bo-campo__controlo" id={`rede_${rede}`} name={`rede_${rede}`}
                   type="url" inputMode="url" placeholder="https://"
                   defaultValue={guardadas.get(rede) ?? ''} maxLength={500} />
          </div>
        ))}

        <p><button type="submit" className="bo-botao bo-botao--primario">{g.guardar}</button></p>
      </form>
    </div>
  );
}

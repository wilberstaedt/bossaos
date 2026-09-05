import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo } from '@bossaos/ui';
import { carregarFichas } from '../../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INV-004 · «Ficha tecnica/receita» (atlas)
 *
 * A lista diz quantas linhas cada ficha tem **e quantas são sub-receitas**,
 * porque é essa a diferença que decide se vender o prato desconta o que está no
 * frigorífico ou uma coisa que ninguém comprou.
 */
export default async function FichasTecnicas({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).stockE25;
  const { unidade, fichas } = await carregarFichas(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/inventory`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INV-004">{t.fichas}</h1>
        </div>
      </div>
      <p data-teste="quantas-fichas">{fichas.length}</p>
      <p data-teste="arvore">{t.arvore}</p>
      {fichas.length === 0 ? <p data-teste="sem-fichas">{t.semFichas}</p> : (
        <ul className="bo-lista" data-teste="fichas">
          {fichas.map((f) => (
            <li key={f.id}>
              <a className="bo-lista__ligacao" href={`${base}/fichas/${f.id}`}>{f.nome}</a>
              <span data-teste="linhas">{f.linhas.length}</span>
              <span data-teste="subreceitas">
                {f.linhas.filter((l) => l.subRecipeId !== null).length}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form method="post" action={`/api/org/${orgSlug}/stock`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_ficha" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.nome} name="nome" required maxLength={80} />
        <Campo rotulo={t.rende} name="rende" type="text" inputMode="numeric" />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}

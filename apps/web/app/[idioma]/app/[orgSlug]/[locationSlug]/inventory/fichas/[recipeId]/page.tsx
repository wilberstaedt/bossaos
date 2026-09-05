import { notFound } from 'next/navigation';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { folhasDaFicha } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarFichas } from '../../../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * INV-005 · «Subreceitas» (atlas)
 *
 * ── A tela mostra as LINHAS e as FOLHAS, lado a lado ──────────────────────
 *
 * As linhas são o que está escrito na ficha; as folhas são o que sai do
 * frigorífico quando o prato é vendido. Numa ficha de um nível são a mesma
 * coisa — e é exactamente por isso que mostrar só as linhas esconde o erro:
 * quem escreve uma sub-receita não vê o que ela desconta até alguém contar.
 *
 * E o ciclo é recusado **na escrita**: se esta tela aceitar a linha, é porque a
 * base a deixou passar. Em serviço, um ciclo não se veria como ciclo — via-se
 * como o sistema a parar.
 */
export default async function Subreceitas({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; recipeId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, recipeId } = await params;
  const t = mensagensDe(idioma).stockE25;
  const base = await carregarFichas(idioma, orgSlug, locationSlug);
  const ficha = base.fichas.find((f) => f.id === recipeId);
  if (!ficha) notFound();
  const folhas = await comEscopoDoPedido(base.sessao, (db) => folhasDaFicha(db, recipeId));
  const nomeDoInsumo = (id: string) => base.insumos.find((i) => i.id === id)?.nome ?? id;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{base.unidade.nome}</p>
          <h1 data-tela="INV-005">{ficha.nome}</h1>
        </div>
      </div>
      <p data-teste="rende">{t.rende}: {String(ficha.rendeMili)}</p>

      <h2>{t.ficha}</h2>
      <ul className="bo-lista" data-teste="linhas">
        {ficha.linhas.map((l) => (
          <li key={l.id}>
            <span>{l.itemId ? nomeDoInsumo(l.itemId) : t.subreceitas}</span>
            <span>{String(l.quantidadeMili)}</span>
          </li>
        ))}
      </ul>

      <h2>{t.folhas}</h2>
      <p data-teste="arvore">{t.arvore}</p>
      <ul className="bo-lista" data-teste="folhas">
        {[...folhas.entries()].map(([itemId, q]) => (
          <li key={itemId}>
            <span>{nomeDoInsumo(itemId)}</span>
            <span data-teste="folha-quantidade">{Math.round(q)}</span>
          </li>
        ))}
      </ul>

      <form method="post" action={`/api/org/${orgSlug}/stock`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="juntar_linha" />
        <input type="hidden" name="recipeId" value={ficha.id} />
        <input type="hidden" name="locationId" value={base.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Seletor rotulo={t.insumo} name="itemId">
          <option value="">—</option>
          {base.insumos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
        </Seletor>
        <Seletor rotulo={t.subreceitas} name="subRecipeId">
          <option value="">—</option>
          {base.fichas.filter((f) => f.id !== ficha.id)
            .map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </Seletor>
        <Campo rotulo={t.quantidade} name="quantidade" type="text" inputMode="numeric" required />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}

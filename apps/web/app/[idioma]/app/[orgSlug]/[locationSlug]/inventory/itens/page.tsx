import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo, Seletor } from '@bossaos/ui';
import { carregarStock } from '../../../../../../../src/stock/pagina.ts';

export const dynamic = 'force-dynamic';

/** INV-002 · «Itens de estoque» (atlas) */
export default async function InsumosDoStock({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).stockE25;
  const { unidade, insumos } = await carregarStock(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/inventory`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="INV-002">{t.itens}</h1>
        </div>
      </div>
      <p data-teste="quantos-insumos">{insumos.length}</p>
      <p data-teste="saldo-derivado">{t.saldoDerivado}</p>
      {insumos.length === 0 ? <p data-teste="sem-insumos">{t.semInsumos}</p> : (
        <ul className="bo-lista" data-teste="insumos">
          {insumos.map((i) => (
            <li key={i.id}>
              <a className="bo-lista__ligacao" href={`${base}/itens/${i.id}`}>{i.nome}</a>
              <span>{i.unidade}</span>
              {/* O saldo mostra-se e NÃO se edita: não há campo nenhum aqui que
                  o escreva, porque a única maneira de o mudar é um movimento. */}
              <span data-teste="saldo">{String(i.saldoMili)}</span>
            </li>
          ))}
        </ul>
      )}
      <form method="post" action={`/api/org/${orgSlug}/stock`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_insumo" />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.nome} name="nome" required maxLength={80} />
        <Seletor rotulo={t.unidade} name="unidade">
          <option value="KG">KG</option>
          <option value="L">L</option>
          <option value="UN">UN</option>
        </Seletor>
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}

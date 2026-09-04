import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';

/**
 * MKT-004 · «El producto BossaOS» (atlas p. 10)
 *
 * A página inteira do que a `?section=product` da landing resume. Existe
 * separada porque é para onde uma pesquisa por "sistema para restaurante" cai, e
 * uma âncora a meio de outra página não é um resultado de pesquisa.
 */
export const dynamic = 'force-static';

export default async function Produto({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/product">
      <section className="bo-mkt__heroi">
        <h1>{k.produtoPagina}</h1>
        <p className="bo-publico__texto">{k.produtoTexto}</p>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="pecas">
        <h2 id="pecas">{k.produtoTitulo}</h2>
        <div className="bo-mkt__grelha">
          <article className="bo-mkt__cartao"><h3>{k.cartaoCarta}</h3><p>{k.cartaoCartaTexto}</p></article>
          <article className="bo-mkt__cartao"><h3>{k.cartaoSala}</h3><p>{k.cartaoSalaTexto}</p></article>
          <article className="bo-mkt__cartao"><h3>{k.cartaoWeb}</h3><p>{k.cartaoWebTexto}</p></article>
        </div>
        <p className="bo-mkt__chamada" style={{ marginTop: 'var(--bo-espaco-xl)' }}>
          <a className="bo-botao bo-botao--primario" href={`/${idioma}/demo`}>{k.pedirDemo}</a>
          <a className="bo-botao bo-botao--secundario" href={`/${idioma}/plans`}>{k.verPlanos}</a>
        </p>
      </section>
    </MolduraMkt>
  );
}

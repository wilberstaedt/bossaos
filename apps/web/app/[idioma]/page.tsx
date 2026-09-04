import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../src/componentes/Marketing.tsx';

/**
 * MKT-001 · «Todo tu restaurante. Un solo ritmo.» (atlas p. 1)
 * MKT-002 · «Una base para cada parte del servicio» — `?section=product`
 * MKT-003 · «Un plan para tu restaurante» — `?section=plans`
 *
 * ── Três IDs, um endereço ──────────────────────────────────────────────────
 *
 * O atlas desenha as três como telas. São **secções da mesma landing**, e o
 * parâmetro escolhe qual fica sozinha no ecrã — a mesma decisão que a carta do
 * E09 tomou para os seus cinco estados, e pela mesma razão: um endereço que se
 * partilha não pode mudar consoante o que o visitante rolou.
 *
 * Sem parâmetro aparecem as três. O parâmetro serve para ligar directamente a
 * uma delas de fora — de um anúncio, de um email — e para as poder medir uma a
 * uma no navegador, que é o que a régua do E10 exige de cada ID.
 *
 * ── O que esta página substituiu ──────────────────────────────────────────
 *
 * Havia aqui um marcador do E02 que dizia, por escrito, que a landing comercial
 * era do E10. Era verdade e deixou de ser.
 */
export const dynamic = 'force-static';

export default async function Landing({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { idioma } = await params;
  const { section } = await searchParams;
  const m = mensagensDe(idioma);
  const k = m.mktE10;

  const mostrar = (qual: string) => section === undefined || section === qual;

  return (
    <MolduraMkt idioma={idioma} actual="">
      {section === undefined ? (
        <section className="bo-mkt__heroi">
          <h1>{k.heroiTitulo}</h1>
          <p className="bo-publico__texto">{k.heroiTexto}</p>
          <p className="bo-mkt__chamada">
            <a className="bo-botao bo-botao--primario" href={`/${idioma}/demo`}>{k.pedirDemo}</a>
            <a className="bo-botao bo-botao--secundario" href={`/${idioma}/product`}>{k.verProduto}</a>
          </p>
        </section>
      ) : null}

      {/* MKT-002 */}
      {mostrar('product') ? (
        <section className="bo-mkt__seccao" id="product" aria-labelledby="t-product">
          <h2 id="t-product">{k.produtoTitulo}</h2>
          <p className="bo-publico__texto">{k.produtoTexto}</p>
          <div className="bo-mkt__grelha">
            <article className="bo-mkt__cartao">
              <h3>{k.cartaoCarta}</h3><p>{k.cartaoCartaTexto}</p>
            </article>
            <article className="bo-mkt__cartao">
              <h3>{k.cartaoSala}</h3><p>{k.cartaoSalaTexto}</p>
            </article>
            <article className="bo-mkt__cartao">
              <h3>{k.cartaoWeb}</h3><p>{k.cartaoWebTexto}</p>
            </article>
          </div>
          <p style={{ marginTop: 'var(--bo-espaco-lg)' }}>
            <a className="bo-botao bo-botao--secundario" href={`/${idioma}/product`}>{k.saberMais}</a>
          </p>
        </section>
      ) : null}

      {/* MKT-003 */}
      {mostrar('plans') ? (
        <section className="bo-mkt__seccao" id="plans" aria-labelledby="t-plans">
          <h2 id="t-plans">{k.planosTitulo}</h2>
          <p className="bo-publico__texto">{k.planosTexto}</p>
          <p className="bo-mkt__chamada">
            <a className="bo-botao bo-botao--primario" href={`/${idioma}/plans`}>{k.verPlanos}</a>
          </p>
        </section>
      ) : null}
    </MolduraMkt>
  );
}

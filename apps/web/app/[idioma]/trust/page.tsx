import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';

/**
 * MKT-008 · «Una base para trabajar con confianza» (atlas p. 16)
 *
 * As três afirmações desta página são todas verificáveis no produto, e é por
 * isso que estão aqui e não outras: o isolamento entre restaurantes tem prova
 * própria desde o E03, a exportação existe desde o E08, e o alérgeno por
 * declarar vale DESCONHECIDO por tipo desde o E07 — não por convenção.
 *
 * Uma página de confiança com promessas que o código não cumpre é a primeira a
 * ser desmentida, e é desmentida pelo cliente.
 */
export const dynamic = 'force-static';

const PILARES = ['confianca1', 'confianca2', 'confianca3'] as const;

export default async function Confianca({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/trust">
      <section className="bo-mkt__heroi">
        <h1>{k.confiancaTitulo}</h1>
        <p className="bo-publico__texto">{k.confiancaTexto}</p>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="pilares">
        <h2 id="pilares">{k.confiancaTitulo}</h2>
        <div className="bo-mkt__grelha">
          {PILARES.map((p) => (
            <article key={p} className="bo-mkt__cartao">
              <h3>{k[p]}</h3>
              <p>{k[`${p}Texto` as keyof typeof k] as string}</p>
            </article>
          ))}
        </div>
      </section>
    </MolduraMkt>
  );
}

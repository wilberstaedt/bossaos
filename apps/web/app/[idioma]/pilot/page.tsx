import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';

/**
 * MKT-010 · «Aprende con la operación real» (atlas p. 17)
 */
export const dynamic = 'force-static';

export default async function Piloto({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/pilot">
      <section className="bo-mkt__heroi">
        <h1>{k.pilotoTitulo}</h1>
        <p className="bo-publico__texto">{k.pilotoTexto}</p>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="como">
        <h2 id="como">{k.comecamosTitulo}</h2>
        <ol className="bo-mkt__passos">
          <li className="bo-mkt__passo"><h3>{k.passo3}</h3><p>{k.passo3Texto}</p></li>
          <li className="bo-mkt__passo"><h3>{k.passo4}</h3><p>{k.passo4Texto}</p></li>
        </ol>
        <p className="bo-mkt__chamada" style={{ marginTop: 'var(--bo-espaco-xl)' }}>
          <a className="bo-botao bo-botao--primario" href={`/${idioma}/demo`}>{k.pedirDemo}</a>
        </p>
      </section>
    </MolduraMkt>
  );
}

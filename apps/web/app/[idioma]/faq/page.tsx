import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';
import type { Metadata } from 'next';
import { metadadosDaRota } from '../../../src/seo/metadados.ts';

/**
 * MKT-009 · «Resolvemos tus dudas» (atlas p. 15)
 *
 * Perguntas e respostas em `<h3>` + `<p>`, e não num acordeão fechado. Um
 * acordeão esconde o texto de quem procura com o `Ctrl+F` do navegador e de
 * quem lê com um leitor de ecrã sem carregar em cada cabeçalho — e não há aqui
 * conteúdo suficiente para justificar esconder o que quer que seja.
 */
export const dynamic = 'force-static';

export async function generateMetadata(
  { params }: { params: Promise<{ idioma: Idioma }> },
): Promise<Metadata> {
  const { idioma } = await params;
  return metadadosDaRota(idioma, '/faq');
}

const PERGUNTAS = ['faq1', 'faq2', 'faq3', 'faq4'] as const;

export default async function Faq({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/faq">
      <section className="bo-mkt__heroi">
        <h1>{k.faqTitulo}</h1>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="duvidas">
        <h2 id="duvidas">{k.faqTitulo}</h2>
        <div className="bo-mkt__faq">
          {PERGUNTAS.map((p) => (
            <div key={p}>
              <h3>{k[p]}</h3>
              <p>{k[`${p}Texto` as keyof typeof k] as string}</p>
            </div>
          ))}
        </div>
        <p className="bo-mkt__chamada" style={{ marginTop: 'var(--bo-espaco-xl)' }}>
          <a className="bo-botao bo-botao--secundario" href={`/${idioma}/demo`}>{k.contactar}</a>
        </p>
      </section>
    </MolduraMkt>
  );
}

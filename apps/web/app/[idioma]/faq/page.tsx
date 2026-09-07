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

/**
 * As perguntas, por grupo. O §6.3.12 pede «objecções comerciais, técnicas **e de
 * equipamento**», e o §6.5 pede «FAQ de cobrança e mudança de plano».
 *
 * ── Porque é que estas perguntas só existem agora ─────────────────────────
 *
 * Uma FAQ escrita antes das páginas responde a perguntas que ninguém fez. As
 * quatro primeiras nasceram com a landing e são gerais; estas seis respondem ao
 * que a `/getting-started` e a `/plans` passaram a dizer — a linguagem
 * condicional dos equipamentos e a comparação derivada dos planos.
 *
 * ── E porque é que NÃO reutilizam as chaves `cobranca*` da /plans ─────────
 *
 * A `/plans` já tem uma FAQ de cobrança, com cinco perguntas. Trazer essas
 * chaves para aqui era a `/faq` ser a `/plans` outra vez — o defeito que a
 * `/product` teve e que se mede cruzando chaves. Estas são **objecções**, que é
 * outra pergunta: a da `/plans` explica como funciona a cobrança a quem já está
 * a comparar planos; esta responde a quem ainda está a decidir se avança.
 */
const GRUPOS = [
  { titulo: null, perguntas: ['faq1', 'faq2', 'faq3', 'faq4'] },
  { titulo: 'faqGrupoEquipamento', perguntas: ['faq5', 'faq6', 'faq7'] },
  { titulo: 'faqGrupoCobranca', perguntas: ['faq8', 'faq9', 'faq10'] },
] as const;

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
        {GRUPOS.map((grupo, i) => (
          <div key={grupo.titulo ?? 'geral'}>
            {/* O primeiro grupo não leva cabeçalho: são as perguntas gerais, e
                um título «Geral» acima delas não acrescenta nada a quem lê. */}
            {grupo.titulo ? (
              <h3
                className="bo-mkt__faq-grupo"
                style={{ marginTop: i > 0 ? 'var(--bo-espaco-xl)' : undefined }}
              >
                {k[grupo.titulo]}
              </h3>
            ) : null}
            <div className="bo-mkt__faq">
              {grupo.perguntas.map((p) => (
                <div key={p}>
                  {/* `h4` dentro de um grupo com `h3`: a hierarquia acompanha o
                      aninhamento em vez de saltar um nível, que é o que um
                      leitor de ecrã usa para navegar por cabeçalhos. */}
                  {grupo.titulo ? <h4>{k[p]}</h4> : <h3>{k[p]}</h3>}
                  <p>{k[`${p}Texto` as keyof typeof k] as string}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="bo-mkt__chamada" style={{ marginTop: 'var(--bo-espaco-xl)' }}>
          <a className="bo-botao bo-botao--secundario" href={`/${idioma}/demo`}>{k.contactar}</a>
        </p>
      </section>
    </MolduraMkt>
  );
}

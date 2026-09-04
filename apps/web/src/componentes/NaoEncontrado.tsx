import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from './Marketing.tsx';

/**
 * MKT-012 · «No encontramos esta página» (atlas p. 18)
 *
 * ── Um componente, e depois DOIS sítios a usá-lo ──────────────────────────
 *
 * O Next desenha o `not-found.tsx`, que é o que um visitante perdido vê de
 * verdade — e responde **404**, como tem de ser.
 *
 * Mas a régua do E10 manda que cada ID seja medido no navegador, e toda a visita
 * tem de **afirmar que chegou onde queria**: uma prova que aceite 404 aceita
 * também o caso em que a rota desapareceu, e passa a medir a ausência. Por isso
 * existe também `/[idioma]/404`, um endereço que responde 200 com este mesmo
 * conteúdo — é o que o atlas dá a este ID, e é o que se pode medir.
 *
 * Esse endereço leva `noindex`: uma página de "não encontrado" que responde 200 é
 * exactamente a que não pode ir parar aos motores de busca.
 */
export function NaoEncontrado({ idioma }: { idioma: Idioma }) {
  const k = mensagensDe(idioma).mktE10;
  return (
    <MolduraMkt idioma={idioma} actual="">
      <section className="bo-mkt__heroi">
        <h1>{k.naoEncontradoTitulo}</h1>
        <p className="bo-publico__texto">{k.naoEncontradoTexto}</p>
        <p className="bo-mkt__chamada">
          <a className="bo-botao bo-botao--primario" href={`/${idioma}`}>{k.verProduto}</a>
          <a className="bo-botao bo-botao--secundario" href={`/${idioma}/faq`}>{k.faqTitulo}</a>
        </p>
      </section>
    </MolduraMkt>
  );
}

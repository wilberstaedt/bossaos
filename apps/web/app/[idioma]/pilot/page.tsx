import { MOEDA_COMERCIAL, precoDoPlano } from '@bossaos/domain';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';

/**
 * MKT-010 · «Aprende con la operación real» (atlas p. 17)
 *
 * ── O que esta página era, medido antes de lhe tocar ──────────────────────
 *
 * Duas secções, e os «dois passos» do piloto eram as chaves `passo3` e `passo4`
 * — **as mesmas do `/getting-started`**, palavra por palavra. Zero factos de
 * piloto. É o RV100-013.
 *
 * ── E a restrição que decide a página inteira ─────────────────────────────
 *
 * Não há aqui nome de restaurante, depoimento nem logótipo, e não é por não
 * haver piloto: é porque **publicar o nome de um terceiro é consentimento
 * dessa pessoa e não é uma pendência do Matheus**. A autorização escrita dele
 * destrava decisões dele; o `11_OPEN_FINDINGS.md` marca este achado como
 * `fora-do-alcance-da-autorizacao` por essa razão exacta.
 *
 * A diferença não é formalidade. É a diferença entre uma página que ele pode
 * publicar amanhã e uma que precisa de uma assinatura que ninguém pediu.
 *
 * ── Então o que é que uma página de piloto diz sem cliente nenhum? ────────
 *
 * O que o piloto **é**: o que acontece, por que ordem, o que cada lado
 * compromete, e o que o restaurante leva se correr mal. **Factos de processo,
 * não de prova social.** Nenhum número de clientes, nenhuma percentagem,
 * nenhuma média — a superfície comercial inteira tem zero prova social e isso é
 * decisão, não esquecimento. Não se estreia aqui.
 *
 * E um facto comercial que é verdadeiro e verificável: o Starter tem
 * `implantacao_sozinho = 0` na fonte, e os outros dois têm `null`. Sai de
 * `precoDoPlano()` e não está escrito à mão, como em todas as outras páginas.
 *
 * ── A saída também é um facto, e é o mais importante ──────────────────────
 *
 * «Se correr mal, levas os teus dados» apoia-se no primeiro pilar da `/trust`,
 * que tem guarda própria (`provar-publicacao.sh`) desde o E08. Não é uma
 * promessa nova: é a mesma, dita onde importa — antes de alguém entrar.
 */
export const dynamic = 'force-static';

/** Os dois lados do compromisso, e a saída. Factos de processo. */
const BLOCOS = [
  ['pilotoOQueE', 'pilotoOQueETexto'],
  ['pilotoNos', 'pilotoNosTexto'],
  ['pilotoTu', 'pilotoTuTexto'],
  ['pilotoSaida', 'pilotoSaidaTexto'],
] as const;

export default async function Piloto({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;
  const starter = precoDoPlano('STARTER');

  return (
    <MolduraMkt idioma={idioma} actual="/pilot">
      <section className="bo-mkt__heroi">
        <h1>{k.pilotoPagina}</h1>
        <p className="bo-publico__texto">{k.pilotoPaginaTexto}</p>
      </section>

      <section className="bo-mkt__seccao" aria-labelledby="t-piloto">
        <h2 id="t-piloto">{k.pilotoTitulo}</h2>
        <p className="bo-publico__texto">{k.pilotoTexto}</p>
        <div className="bo-mkt__grelha">
          {BLOCOS.map(([titulo, texto]) => (
            <article className="bo-mkt__cartao" key={titulo}>
              <h3>{k[titulo]}</h3>
              <p>{k[texto]}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── O escalão que não depende da nossa agenda ────────────────────────
          O valor sai da fonte. Zero é um VALOR comercial e não uma ausência —
          e é por isso que se lê `implantacaoSozinho === 0` em vez de se
          escrever «grátis»: nos outros dois planos o campo é `null`, que
          significa POR DEFINIR e nunca «de borla». */}
      {starter !== null && starter.implantacaoSozinho !== null ? (
        <section className="bo-mkt__seccao" aria-labelledby="t-starter">
          <h2 id="t-starter">{k.pilotoStarter}</h2>
          <p className="bo-publico__texto">{k.pilotoStarterTexto}</p>
          <p className="bo-mkt__preco">
            <strong>
              {formatarDinheiro(
                { montanteMenor: starter.implantacaoSozinho, moeda: MOEDA_COMERCIAL },
                idioma,
              )}
            </strong>
          </p>
          <p className="bo-mkt__preco-nota">{k.precoImplantacaoSozinho}</p>
          <p className="bo-mkt__preco-nota">{k.precoImposto}</p>
          <p className="bo-mkt__chamada">
            <a className="bo-botao bo-botao--secundario" href={`/${idioma}/plans`}>{k.verPlanos}</a>
          </p>
        </section>
      ) : null}

      {/* ── Porque é que não há nomes, dito na própria página ────────────────
          A ausência de prova social lê-se como falta de clientes se ninguém a
          explicar. Explicada, lê-se como o que é: uma decisão sobre o
          consentimento de outra pessoa. Dizê-lo é mais honesto do que deixar o
          espaço vazio — e impede que alguém "resolva" o vazio mais tarde com um
          logótipo que ninguém autorizou. */}
      <section className="bo-mkt__seccao bo-mkt__fecho" aria-labelledby="t-sem-nomes">
        <h2 id="t-sem-nomes">{k.pilotoSemNomes}</h2>
        <p className="bo-mkt__destaque">{k.pilotoSemNomesTexto}</p>
        <p className="bo-mkt__chamada">
          <a className="bo-botao bo-botao--primario" href={`/${idioma}/demo`}>{k.pedirDemo}</a>
        </p>
      </section>
    </MolduraMkt>
  );
}

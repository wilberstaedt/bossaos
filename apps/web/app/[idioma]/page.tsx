import { MENSALIDADES_NUM_ANO, MOEDA_COMERCIAL, precoDoPlano } from '@bossaos/domain';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../src/componentes/Marketing.tsx';

/**
 * MKT-001 · «Todo tu restaurante. Un solo ritmo.» (atlas p. 1)
 * MKT-002 · «Una base para cada parte del servicio» — `?section=product`
 * MKT-003 · «Un plan para tu restaurante» — `?section=plans`
 *
 * ── Três IDs, um endereço ──────────────────────────────────────────────────
 *
 * O atlas desenha as três como telas. São **secções da mesma landing** — e
 * continuam a ser, porque o §12.5 rastreia 396 IDs e um bloco que nascesse rota
 * própria fazia o total deixar de ser 396.
 *
 * ── O `?section=` NÃO isola nada, e isto está MEDIDO ──────────────────────
 *
 * O comentário que aqui estava dizia que o parâmetro escondia tudo o resto e que
 * era assim que o MKT-002 e o MKT-003 se mediam um a um. **Na aplicação
 * construída isso é falso.** Medido a 07/09, com o md5 do HTML servido:
 *
 *   /es-ES                  e703360c9ffb6d5947b32a13be389b7d
 *   /es-ES?section=product  e703360c9ffb6d5947b32a13be389b7d
 *   /es-ES?section=plans    e703360c9ffb6d5947b32a13be389b7d
 *
 * Byte a byte igual. A causa é o `dynamic = 'force-static'` logo abaixo: numa
 * página forçada a estática o Next entrega `searchParams` **vazio** na
 * pré-renderização, o `section` é sempre `undefined`, e os ramos do `mostrar()`
 * dão sempre verdadeiro.
 *
 * Consequência: **MKT-001, 002 e 003 não são três medições — são a mesma página
 * medida três vezes.** É literalmente o defeito que o comentário da
 * `marketing.spec.ts` diz que este mecanismo existe para impedir.
 *
 * **Porque é que o deixo assim mesmo assim:** as duas saídas custam mais do que
 * o defeito. Tirar o `force-static` torna a landing dinâmica a cada pedido, o
 * que numa página comercial troca SEO e velocidade por uma afordância de
 * medição. Dar endereço próprio aos blocos parte os 396 IDs. A escolha não é
 * minha para fazer sozinho: fica medida e escrita, e o `rv100-home.spec.ts`
 * grava em cada corrida o que o parâmetro faz **mesmo**. O que eu não faço é
 * continuar a escrever no código que ele funciona.
 *
 * O mecanismo fica intacto e correcto para o dia em que a página deixar de ser
 * estática.
 *
 * ── E faltam dois dos catorze blocos, de propósito ────────────────────────
 *
 * O §6.3 pede catorze. Estão onze aqui, mais o rodapé da moldura, que é o
 * catorze. Faltam o **4 (produto em movimento)** e o **5 (módulos com telas
 * reais)** — os dois que são mídia. Escrevê-los como texto era acrescentar
 * «página comercial que apenas enumera títulos e parágrafos sem prova do
 * produto», que o §10 reprova pelo nome. Esperam pelo motor de prova.
 */
export const dynamic = 'force-static';

/** Os três planos, na ordem de progressão que o §6.5 pede. */
const PLANOS = [
  { codigo: 'STARTER', nome: 'planoStarter', quem: 'planoStarterQuem' },
  { codigo: 'RESTAURANT', nome: 'planoRestaurant', quem: 'planoRestaurantQuem' },
  { codigo: 'PRO', nome: 'planoPro', quem: 'planoProQuem' },
] as const;

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
  /** Os blocos que não são o MKT-002 nem o MKT-003 só aparecem na página inteira. */
  const inteira = section === undefined;

  const euros = (centimos: number) =>
    formatarDinheiro({ montanteMenor: centimos, moeda: MOEDA_COMERCIAL }, idioma);

  return (
    <MolduraMkt idioma={idioma} actual="">
      {/* ── 1 · herói ─────────────────────────────────────────────────────
          Uma coluna, e é uma decisão declarada e não um esquecimento: o §6.2
          pede «imagem criada com telas reais do produto» e essa imagem ainda
          não existe. Reservar aqui metade da largura para mídia que não existe
          seria construir de propósito o defeito que o §10 reprova — «metade do
          herói vazia por falta de mídia». Fica de uma coluna até o motor de
          prova dar as telas. */}
      {inteira ? (
        <section className="bo-mkt__heroi">
          <h1>{k.heroiTitulo}</h1>
          <p className="bo-publico__texto">{k.heroiTexto}</p>
          <p className="bo-mkt__chamada">
            <a className="bo-botao bo-botao--primario" href={`/${idioma}/demo`}>{k.pedirDemo}</a>
            <a className="bo-botao bo-botao--secundario" href={`/${idioma}/product`}>{k.verProduto}</a>
          </p>
        </section>
      ) : null}

      {/* ── 2 · o problema reconhecível (§6.3.2) ────────────────────────── */}
      {inteira ? (
        <section className="bo-mkt__seccao" id="problema" aria-labelledby="t-problema">
          <h2 id="t-problema">{k.problemaTitulo}</h2>
          <p className="bo-publico__texto">{k.problemaTexto}</p>
          <div className="bo-mkt__grelha">
            <article className="bo-mkt__cartao"><h3>{k.problema1}</h3><p>{k.problema1Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.problema2}</h3><p>{k.problema2Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.problema3}</h3><p>{k.problema3Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.problema4}</h3><p>{k.problema4Texto}</p></article>
          </div>
        </section>
      ) : null}

      {/* ── 3 · uma única base · MKT-002 ────────────────────────────────── */}
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
          <p className="bo-mkt__chamada">
            <a className="bo-botao bo-botao--secundario" href={`/${idioma}/product`}>{k.saberMais}</a>
          </p>
        </section>
      ) : null}

      {/* ── 6 · experiência por papel (§6.3.6) ──────────────────────────── */}
      {inteira ? (
        <section className="bo-mkt__seccao" id="papeis" aria-labelledby="t-papeis">
          <h2 id="t-papeis">{k.papeisTitulo}</h2>
          <p className="bo-publico__texto">{k.papeisTexto}</p>
          <div className="bo-mkt__grelha">
            <article className="bo-mkt__cartao"><h3>{k.papel1}</h3><p>{k.papel1Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.papel2}</h3><p>{k.papel2Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.papel3}</h3><p>{k.papel3Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.papel4}</h3><p>{k.papel4Texto}</p></article>
          </div>
        </section>
      ) : null}

      {/* ── 7 · planos com preço real · MKT-003 ─────────────────────────
          Os valores saem de `precoDoPlano()`, que importa a `PRECIFICACAO.json`.
          Não há um único número escrito à mão aqui, e a `validar-precos.sh`
          reprova se houver.

          **O ano custa dez mensalidades, e isso tem de se ver.** O §6.5 avisa
          para não induzir que o equivalente mensal é a cobrança real; a
          armadilha simétrica é deixar o desconto numa divisão que o leitor faz
          de cabeça. Por isso aparecem os três números: o mensal, o anual
          integral, e o equivalente identificado como equivalente. */}
      {mostrar('plans') ? (
        <section className="bo-mkt__seccao" id="plans" aria-labelledby="t-plans">
          <h2 id="t-plans">{k.planosTitulo}</h2>
          <p className="bo-publico__texto">{k.planosTexto}</p>

          <div className="bo-mkt__grelha">
            {PLANOS.map((plano) => {
              const preco = precoDoPlano(plano.codigo);
              return (
                <article className="bo-mkt__cartao bo-mkt__plano" key={plano.codigo}>
                  <h3>{k[plano.nome]}</h3>
                  <p className="bo-mkt__plano-quem">{k[plano.quem]}</p>
                  {/* `null` da fonte é «por definir», nunca «grátis» — e o ecrã
                      tem de o dizer com essas palavras. */}
                  {preco === null ? (
                    <p className="bo-mkt__preco">{k.precoAOrcar}</p>
                  ) : (
                    <>
                      <p className="bo-mkt__preco">
                        <strong>{euros(preco.mensal)}</strong> {k.precoMes}
                      </p>
                      <p className="bo-mkt__preco-ano">
                        {euros(preco.anual)} {k.precoAno}
                        {' — '}
                        {k.precoEquivalente.replace('{valor}', euros(preco.equivalenteMensal))}
                      </p>
                      <p className="bo-mkt__preco-nota">{k.precoImposto}</p>
                      <p className="bo-mkt__preco-nota">
                        {k.precoImplantacao}
                        {': '}
                        {preco.implantacaoAssistida === null
                          ? k.precoAOrcar
                          : euros(preco.implantacaoAssistida)}
                        {preco.implantacaoSozinho !== null
                          ? ` · ${k.precoImplantacaoSozinho}: ${euros(preco.implantacaoSozinho)}`
                          : ''}
                      </p>
                    </>
                  )}
                </article>
              );
            })}
          </div>

          {/* A regra do ano, escrita e não deixada a uma divisão de cabeça. O
              número de mensalidades vem da fonte; não se assume doze. */}
          <p className="bo-mkt__destaque" data-mensalidades={MENSALIDADES_NUM_ANO}>
            {k.precoAnualExplicado}
          </p>
          <p className="bo-publico__texto">{k.precoImplantacaoAparte}</p>

          <p className="bo-mkt__chamada">
            <a className="bo-botao bo-botao--primario" href={`/${idioma}/plans`}>{k.verPlanos}</a>
          </p>
        </section>
      ) : null}

      {/* ── 8 · equipamentos (§6.6, na forma condicional que ele próprio usa) */}
      {inteira ? (
        <section className="bo-mkt__seccao" id="equipamentos" aria-labelledby="t-equipamentos">
          <h2 id="t-equipamentos">{k.equipamentosTitulo}</h2>
          <p className="bo-publico__texto">{k.equipamentosTexto}</p>
          <div className="bo-mkt__grelha">
            <article className="bo-mkt__cartao"><h3>{k.equipamento1}</h3><p>{k.equipamento1Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.equipamento2}</h3><p>{k.equipamento2Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.equipamento3}</h3><p>{k.equipamento3Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.equipamento4}</h3><p>{k.equipamento4Texto}</p></article>
          </div>
        </section>
      ) : null}

      {/* ── 9 · implantação (§6.3.9) — os quatro passos que já existem ──── */}
      {inteira ? (
        <section className="bo-mkt__seccao" id="implantacion" aria-labelledby="t-implantacion">
          <h2 id="t-implantacion">{k.comecamosTitulo}</h2>
          <p className="bo-publico__texto">{k.comecamosTexto}</p>
          <ol className="bo-mkt__passos">
            <li className="bo-mkt__passo"><h3>{k.passo1}</h3><p>{k.passo1Texto}</p></li>
            <li className="bo-mkt__passo"><h3>{k.passo2}</h3><p>{k.passo2Texto}</p></li>
            <li className="bo-mkt__passo"><h3>{k.passo3}</h3><p>{k.passo3Texto}</p></li>
            <li className="bo-mkt__passo"><h3>{k.passo4}</h3><p>{k.passo4Texto}</p></li>
          </ol>
        </section>
      ) : null}

      {/* ── 10 · confiança (§6.3.10) ─────────────────────────────────────
          Três pilares, e não quatro. O quarto que o §6.3.10 pede é «operação
          degradada realmente implementada» — e foi medido contra o código neste
          lote: a fila local grava no aparelho e não perde o que está escrito,
          mas **não sincroniza sozinha** quando a ligação volta (o evento
          `online` só troca o rótulo; o envio é um toque no botão), e o service
          worker recusa guardar telas com dados de inquilino. A afirmação que a
          evidência sustenta é a da FAQ, corrigida neste lote — e é lá que fica,
          em vez de subir para aqui como pilar. Mover uma afirmação de sítio não
          é verificá-la. */}
      {inteira ? (
        <section className="bo-mkt__seccao" id="confianza" aria-labelledby="t-confianza">
          <h2 id="t-confianza">{k.confiancaTitulo}</h2>
          <p className="bo-publico__texto">{k.confiancaTexto}</p>
          <div className="bo-mkt__grelha">
            <article className="bo-mkt__cartao"><h3>{k.confianca1}</h3><p>{k.confianca1Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.confianca2}</h3><p>{k.confianca2Texto}</p></article>
            <article className="bo-mkt__cartao"><h3>{k.confianca3}</h3><p>{k.confianca3Texto}</p></article>
          </div>
          <p className="bo-mkt__chamada">
            <a className="bo-botao bo-botao--secundario" href={`/${idioma}/trust`}>{k.saberMais}</a>
          </p>
        </section>
      ) : null}

      {/* ── 11 · piloto (§6.3.11) — sem nome de terceiro, sem depoimento ── */}
      {inteira ? (
        <section className="bo-mkt__seccao" id="piloto" aria-labelledby="t-piloto">
          <h2 id="t-piloto">{k.pilotoTitulo}</h2>
          <p className="bo-publico__texto">{k.pilotoTexto}</p>
          <p className="bo-publico__texto">{k.pilotoAcordo}</p>
        </section>
      ) : null}

      {/* ── 12 · FAQ (§6.3.12) ───────────────────────────────────────────── */}
      {inteira ? (
        <section className="bo-mkt__seccao" id="preguntas" aria-labelledby="t-preguntas">
          <h2 id="t-preguntas">{k.faqTitulo}</h2>
          <div className="bo-mkt__faq">
            <article><h3>{k.faq1}</h3><p>{k.faq1Texto}</p></article>
            <article><h3>{k.faq2}</h3><p>{k.faq2Texto}</p></article>
            <article><h3>{k.faq3}</h3><p>{k.faq3Texto}</p></article>
            <article><h3>{k.faq4}</h3><p>{k.faq4Texto}</p></article>
          </div>
          <p className="bo-mkt__chamada">
            <a className="bo-botao bo-botao--secundario" href={`/${idioma}/faq`}>{k.saberMais}</a>
          </p>
        </section>
      ) : null}

      {/* ── 13 · CTA final (§6.3.13) ─────────────────────────────────────── */}
      {inteira ? (
        <section className="bo-mkt__seccao bo-mkt__fecho" id="empezar" aria-labelledby="t-empezar">
          <h2 id="t-empezar">{k.ctaFinalTitulo}</h2>
          <p className="bo-publico__texto">{k.ctaFinalTexto}</p>
          <p className="bo-mkt__chamada">
            <a className="bo-botao bo-botao--primario" href={`/${idioma}/demo`}>{k.pedirDemo}</a>
            <a className="bo-botao bo-botao--secundario" href={`/${idioma}/plans`}>{k.verPlanos}</a>
          </p>
        </section>
      ) : null}
    </MolduraMkt>
  );
}

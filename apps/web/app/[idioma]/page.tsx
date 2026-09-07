import { Botao } from '@bossaos/ui';
import { MENSALIDADES_NUM_ANO, MOEDA_COMERCIAL, precoDoPlano } from '@bossaos/domain';
import { formatarDinheiro, mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../src/componentes/Marketing.tsx';
import { AvisoDeDemonstracao, Composicao } from '../../src/componentes/Demonstracao.tsx';
import type { Metadata } from 'next';
import { metadadosDaRota } from '../../src/seo/metadados.ts';

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

export async function generateMetadata(
  { params }: { params: Promise<{ idioma: Idioma }> },
): Promise<Metadata> {
  const { idioma } = await params;
  return metadadosDaRota(idioma, '');
}

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
  /**
   * Duas vistas do MESMO catálogo, e as duas são precisas — a landing antiga
   * já fazia isto. `k` é o tipado: uma chave que não exista não compila. `kx` é
   * a vista por índice, que serve os grupos numerados (`movimento1..4`,
   * `papel1..4`, `passo1..4`, `faq1..6`) — e com `noUncheckedIndexedAccess`
   * devolve `string | undefined`, que é o que a torna honesta.
   */
  const kx = k as unknown as Record<string, string>;

  const mostrar = (qual: string) => section === undefined || section === qual;
  /** Os blocos que não são o MKT-002 nem o MKT-003 só aparecem na página inteira. */
  const inteira = section === undefined;

  const euros = (centimos: number) =>
    formatarDinheiro({ montanteMenor: centimos, moeda: MOEDA_COMERCIAL }, idioma);

  return (
    <MolduraMkt idioma={idioma} actual="">
      {/* ══════════════════════════════════════════════════════════════════
          NORTH STAR v2 — Fase 2. SETE blocos, não treze.

          O §4 do norte manda reduzir de 13 para 7 e a régua dos catorze números
          diz porquê em vez de o adjectivar: os H2 estavam a **26 px** contra
          44–56, ou seja **menos de metade**, e por isso nenhum título mandava
          em nada. A página tinha 7103 px contra um alvo de 4500–5500.

          O que morre aqui são os 19 `bo-mkt__cartao` inline e as 7 grelhas de
          três colunas que produziam os cartões órfãos. O que fica é o mesmo
          CONTEÚDO, nas mesmas chaves — não se inventou uma frase.

          O `?section=` fica intacto: quem cá esteve mediu que ele não isola
          nada com `force-static` e **decidiu mantê-lo**, com a razão escrita.
          Um redesenho visual não é sítio para derrubar essa decisão.
          ══════════════════════════════════════════════════════════════════ */}

      {/* ── 1 · HERÓI ESCURO ──────────────────────────────────────────────
          A primeira viewport tem marca, promessa, produto e CTA. O fundo é
          verde profundo — o primeiro ponto da lista de reprovação era «areia
          em todas as secções», e o herói era areia. */}
      {inteira ? (
        <section className="ns-seccao ns-seccao--verde ns-heroi" data-ns="heroi">
          <div className="ns-heroi__grelha">
            <div>
              <h1 className="ns-display">{k.heroiTitulo}</h1>
              <p className="ns-lead">{k.heroiTexto}</p>
              <p className="ns-chamada">
                <Botao tom="primario" className="ns-accao-heroi" href={`/${idioma}/demo`}>
                  {k.pedirDemo}
                </Botao>
                <Botao tom="secundario" className="ns-accao-heroi" href={`/${idioma}/product`}>
                  {k.verProduto}
                </Botao>
              </p>
              {/* O estado em lima: o norte pede um sinal de continuidade, e a
                  lima é isso — nunca perigo nem dinheiro. */}
              <p className="ns-sinal">{k.heroiLegenda}</p>
            </div>
            {/* A captura principal ocupa a coluna larga: eram 588 px contra um
                mínimo de 650. As duas são a MESMA comanda A128 — a sala onde foi
                aberta e a cozinha onde apareceu. */}
            <figure className="ns-heroi__media">
              <div className="ns-moldura">
                <Composicao qual="sala" idioma={idioma} prioritaria
                            tamanhos="(min-width: 1024px) 720px, 100vw" />
              </div>
              <div className="ns-moldura ns-moldura--sobreposta ns-heroi__segunda">
                <Composicao qual="kds" idioma={idioma}
                            tamanhos="(min-width: 1024px) 380px, 60vw" />
              </div>
            </figure>
          </div>
        </section>
      ) : null}

      {/* ── 2 · UMA COMANDA ATRAVESSA O SISTEMA ───────────────────────────
          Quatro passos ligados por uma linha de ritmo, e não quatro cartões
          iguais com parágrafos — que é o que o §4.3 proíbe pelo nome. */}
      {inteira ? (
        <section className="ns-seccao ns-seccao--areia" id="movimento" data-ns="comanda"
                 aria-labelledby="t-movimento">
          <div>
            <h2 className="ns-titulo" id="t-movimento">{k.movimentoTitulo}</h2>
            <ol className="ns-fluxo">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="ns-fluxo__passo">
                  <span className="ns-fluxo__marca" aria-hidden="true">{n}</span>
                  <h3 className="ns-fluxo__nome">{kx[`movimento${n}`]}</h3>
                  <p className="ns-corpo">{kx[`movimento${n}Texto`]}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* ── 3 · BENTO DE PRODUTO ──────────────────────────────────────────
          Quatro capacidades em tamanhos DIFERENTES: um módulo grande, dois
          médios e um horizontal. «Não faça uma grade de quatro caixas
          idênticas» é textual no §4.4. */}
      {mostrar('product') ? (
        <section className="ns-seccao ns-seccao--verde" id="product" data-ns="bento"
                 aria-labelledby="t-product">
          <div>
            <h2 className="ns-titulo" id="t-product">{k.produtoTitulo}</h2>
            <p className="ns-lead">{k.modulosTexto}</p>
            <div className="ns-bento">
              <article className="ns-bento__area ns-bento__area--principal">
                <div className="ns-moldura">
                  <Composicao qual="catalogo" idioma={idioma}
                              tamanhos="(min-width: 1024px) 640px, 100vw" />
                </div>
                <h3 className="ns-bento__nome">{k.modulo1}</h3>
                <p className="ns-corpo">{k.modulo1Texto}</p>
              </article>
              <article className="ns-bento__area ns-bento__area--media">
                <h3 className="ns-bento__nome">{k.modulo2}</h3>
                <p className="ns-corpo">{k.modulo2Texto}</p>
              </article>
              <article className="ns-bento__area ns-bento__area--media">
                <h3 className="ns-bento__nome">{k.modulo3}</h3>
                <p className="ns-corpo">{k.modulo3Texto}</p>
              </article>
              <article className="ns-bento__area ns-bento__area--larga">
                <div className="ns-bento__lado">
                  <div>
                    <h3 className="ns-bento__nome">{k.modulo4}</h3>
                    <p className="ns-corpo">{k.modulo4Texto}</p>
                  </div>
                  <div className="ns-moldura ns-moldura--sobreposta">
                    <Composicao qual="tablet" idioma={idioma}
                                tamanhos="(min-width: 1024px) 420px, 100vw" />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── 4 · PARA CADA PESSOA, A TELA CERTA ────────────────────────────
          Quatro papéis, cada um com a sua superfície. A carta é a única que o
          cliente vê, e por isso leva a captura. */}
      {inteira ? (
        <section className="ns-seccao ns-seccao--branca" id="papeis" data-ns="papeis"
                 aria-labelledby="t-papeis">
          <div>
            <h2 className="ns-titulo" id="t-papeis">{k.papeisTitulo}</h2>
            <p className="ns-lead">{k.papeisTexto}</p>
            <div className="ns-papeis">
              <ul className="ns-papeis__lista">
                {[1, 2, 3, 4].map((n) => (
                  <li key={n}>
                    <h3 className="ns-papeis__nome">{kx[`papel${n}`]}</h3>
                    <p className="ns-corpo">{kx[`papel${n}Texto`]}</p>
                  </li>
                ))}
              </ul>
              <div className="ns-moldura">
                <Composicao qual="carta" idioma={idioma}
                            tamanhos="(min-width: 1024px) 390px, 80vw" />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── 5 · PLANOS ────────────────────────────────────────────────────
          Os valores vêm do `precoDoPlano`, que é a fonte aprovada e tem guarda
          própria. O destaque do Restaurant é editorial — borda coral e
          elevação — e não um crachá «popular» sem justificação. */}
      {mostrar('plans') ? (
        <section className="ns-seccao ns-seccao--coral" id="plans" data-ns="planos"
                 aria-labelledby="t-plans">
          <div>
            <h2 className="ns-titulo" id="t-plans">{k.planosTitulo}</h2>
            <div className="ns-precos">
              {PLANOS.map((plano) => (
                <article
                  key={plano.codigo}
                  className={`ns-preco${plano.codigo === 'RESTAURANT' ? ' ns-preco--destaque' : ''}`}
                >
                  <h3 className="ns-preco__nome">{kx[plano.nome]}</h3>
                  {(() => {
                    const preco = precoDoPlano(plano.codigo);
                    /* `null` da fonte é «por definir», nunca «grátis». */
                    return preco === null ? (
                      <p className="ns-preco__valor">{k.precoAOrcar}</p>
                    ) : (
                      <>
                        <p className="ns-preco__valor">{euros(preco.mensal)}</p>
                        <p className="ns-corpo">
                          {euros(preco.anual)} {k.precoAno} · {k.precoImposto}
                        </p>
                      </>
                    );
                  })()}
                  <p className="ns-corpo">{kx[plano.quem]}</p>
                  <p>
                    <Botao tom={plano.codigo === 'RESTAURANT' ? 'primario' : 'secundario'}
                           href={`/${idioma}/demo`}>
                      {k.pedirDemo}
                    </Botao>
                  </p>
                </article>
              ))}
            </div>
            <p className="ns-corpo">
              {k.cobrancaTitulo} · {MENSALIDADES_NUM_ANO}× · <a href={`/${idioma}/plans`}>{k.comparar}</a>
            </p>
          </div>
        </section>
      ) : null}

      {/* ── 6 · COMEÇAR SEM SURPRESAS ─────────────────────────────────────
          O §4.7 manda juntar implantação, equipamentos, suporte e propriedade
          dos dados NUMA secção. Eram quatro. */}
      {inteira ? (
        <section className="ns-seccao ns-seccao--areia" id="implantacion" data-ns="comecar"
                 aria-labelledby="t-comecar">
          <div>
            <h2 className="ns-titulo" id="t-comecar">{k.comecamosTitulo}</h2>
            <div className="ns-comecar">
              <ol className="ns-linha-do-tempo">
                {[1, 2, 3, 4].map((n) => (
                  <li key={n}>
                    <h3 className="ns-linha-do-tempo__nome">{kx[`passo${n}`]}</h3>
                    <p className="ns-corpo">{kx[`passo${n}Texto`]}</p>
                  </li>
                ))}
              </ol>
              <aside className="ns-transparencia">
                <h3 className="ns-titulo-pequeno">{k.equipamentosTitulo}</h3>
                <p className="ns-corpo">{k.equipamentosTexto}</p>
                <h3 className="ns-titulo-pequeno">{k.confiancaTitulo}</h3>
                <p className="ns-corpo">{k.confiancaTexto}</p>
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── 7 · FAQ CURTO + CTA FINAL ─────────────────────────────────────
          Seis perguntas no máximo, e o fecho em verde com o CTA coral. */}
      {inteira ? (
        <section className="ns-seccao ns-seccao--verde" id="faq" data-ns="fecho"
                 aria-labelledby="t-faq">
          <div>
            <h2 className="ns-titulo" id="t-faq">{k.faqIndice}</h2>
            <div className="ns-faq">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <details key={n} className="ns-faq__item">
                  <summary className="ns-faq__pergunta">{kx[`faq${n}`]}</summary>
                  <p className="ns-corpo">{kx[`faq${n}Texto`]}</p>
                </details>
              ))}
            </div>
            <div className="ns-fecho ns-fecho--coral">
              <h3 className="ns-titulo">{k.ctaFinalTitulo}</h3>
              <p className="ns-lead">{k.ctaFinalTexto}</p>
              <p className="ns-chamada">
                <Botao tom="primario" className="ns-accao-heroi" href={`/${idioma}/demo`}>
                  {k.pedirDemo}
                </Botao>
              </p>
            </div>
            <AvisoDeDemonstracao idioma={idioma} />
          </div>
        </section>
      ) : null}
    </MolduraMkt>
  );
}

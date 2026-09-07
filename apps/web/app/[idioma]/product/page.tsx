import { Botao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MolduraMkt } from '../../../src/componentes/Marketing.tsx';
import { AvisoDeDemonstracao, Composicao, RANHURA_LARGA } from '../../../src/componentes/Demonstracao.tsx';
import type { Metadata } from 'next';
import { metadadosDaRota } from '../../../src/seo/metadados.ts';

/**
 * MKT-004 · «El producto BossaOS» (atlas p. 10)
 *
 * ── Era 91% a home, e isso estava medido ─────────────────────────────────
 *
 * Antes deste lote esta página usava **11 chaves de i18n, 10 delas partilhadas
 * com a landing** — repetia os três cartões palavra por palavra e acrescentava
 * um título. Não era «parecida com a home»: era a home com uma chave a mais.
 *
 * ── E o §6.4 não pede texto ──────────────────────────────────────────────
 *
 * A secção que governa esta página é **inteiramente sobre demonstração**:
 * capturas reais e determinísticas do build, desktop/tablet/telemóvel/KDS
 * compostos de maneira coerente, «mostrar uma acção e o seu resultado», alt
 * contextual, carregamento responsivo, e nada de esconder interface má em blur,
 * perspectiva ou miniatura.
 *
 * Por isso esta página deixou de ser uma lista de virtudes e passou a ser **uma
 * comanda seguida do princípio ao fim**: abre-se a mesa, a cozinha vê, o
 * catálogo é a origem dos dois, e o cliente lê a carta que sai dali. As cinco
 * composições são do inquilino «Bossa Demo», capturadas do mesmo build que se
 * publica, e o aviso diz que os dados são inventados — o §10 reprova «dado de
 * demonstração apresentado como cliente real», e dizê-lo por extenso é a
 * diferença entre não mentir e não deixar ninguém enganar-se sozinho.
 *
 * Nenhuma imagem leva blur, moldura de aparelho nem perspectiva: se uma
 * composição não aguentar ser vista, corrige-se a composição.
 */
export const dynamic = 'force-static';

export async function generateMetadata(
  { params }: { params: Promise<{ idioma: Idioma }> },
): Promise<Metadata> {
  const { idioma } = await params;
  return metadadosDaRota(idioma, '/product');
}

export default async function Produto({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const k = mensagensDe(idioma).mktE10;

  return (
    <MolduraMkt idioma={idioma} actual="/product">
      {/* Divisão editorial: o título à esquerda, o corpo à direita.
          O vazio à direita não era composição — era o `max-width: 68ch`
          do lead a decidir sozinho o desenho (184 + 544 = 728, o mesmo
          número em cinco páginas). As duas medidas de leitura ficam
          intactas; o que muda é elas ocuparem o contentor. */}
      <section className="bo-mkt__heroi bo-mkt__heroi--editorial">
        <h1>{k.produtoPagina}</h1>
        <div>
          <p className="bo-publico__texto">{k.produtoPaginaTexto}</p>
          <AvisoDeDemonstracao idioma={idioma} />
        </div>
      </section>

      {/* ── A acção e o seu resultado (§6.4) ─────────────────────────────
          As duas capturas são a MESMA comanda A128. É a única coisa que uma
          imagem de software consegue provar sozinha: que o que se escreve num
          sítio aparece no outro. */}
      <section className="bo-mkt__seccao" aria-labelledby="t-comanda">
        <h2 id="t-comanda">{k.prodComandaTitulo}</h2>
        <p className="bo-publico__texto">{k.prodComandaTexto}</p>
        <div className="bo-mkt__par">
          <figure className="bo-mkt__figura">
            <Composicao qual="sala" idioma={idioma} prioritaria tamanhos={RANHURA_LARGA} />
          </figure>
          <figure className="bo-mkt__figura">
            <Composicao qual="kds" idioma={idioma} tamanhos={RANHURA_LARGA} />
          </figure>
        </div>
        <p className="bo-mkt__legenda">{k.heroiLegenda}</p>
      </section>

      {/* ── A base única, com a tela que a mostra ─────────────────────── */}
      <section className="bo-mkt__seccao" aria-labelledby="t-catalogo">
        <h2 id="t-catalogo">{k.prodCatalogoTitulo}</h2>
        <p className="bo-publico__texto">{k.prodCatalogoTexto}</p>
        <figure className="bo-mkt__figura">
          <Composicao qual="catalogo" idioma={idioma} tamanhos={RANHURA_LARGA} />
        </figure>
      </section>

      {/* ── O lado do cliente ───────────────────────────────────────────
          A carta é a única destas telas que não precisa de sessão, e é a que
          mais gente vai ver: entra a 390 px, que é a largura em que se usa. */}
      <section className="bo-mkt__seccao" aria-labelledby="t-carta">
        <h2 id="t-carta">{k.prodCartaTitulo}</h2>
        <p className="bo-publico__texto">{k.prodCartaTexto}</p>
        <figure className="bo-mkt__figura bo-mkt__figura--estreita">
          <Composicao qual="carta" idioma={idioma} tamanhos="390px" />
        </figure>
      </section>

      {/* ── E a largura de tablet, que o §6.4 nomeia ────────────────────── */}
      <section className="bo-mkt__seccao" aria-labelledby="t-tablet">
        <h2 id="t-tablet">{k.prodTabletTitulo}</h2>
        <p className="bo-publico__texto">{k.prodTabletTexto}</p>
        <figure className="bo-mkt__figura bo-mkt__figura--media">
          <Composicao qual="tablet" idioma={idioma} tamanhos="(min-width: 768px) 640px, 100vw" />
        </figure>
      </section>

      <section className="bo-mkt__seccao bo-mkt__fecho" aria-labelledby="t-produto-fecho">
        {/* Fecho PRÓPRIO, e não o da home: quem chega aqui já viu as telas, e
            o convite muda com isso — «viste um restaurante inventado, a demo é
            com o teu». Partilhar o fecho da landing era repetir o momento
            errado. */}
        <h2 id="t-produto-fecho">{k.prodFechoTitulo}</h2>
        <p className="bo-publico__texto">{k.prodFechoTexto}</p>
        <p className="bo-mkt__chamada">
          <Botao tom="primario" href={`/${idioma}/demo`}>{k.pedirDemo}</Botao>
          <Botao tom="secundario" href={`/${idioma}/plans`}>{k.verPlanos}</Botao>
        </p>
      </section>
    </MolduraMkt>
  );
}

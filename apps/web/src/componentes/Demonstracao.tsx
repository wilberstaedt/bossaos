import Image, { type StaticImageData } from 'next/image';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import salaServicoEs from '../demonstracao/es-ES/sala-servico-1440.png';
import kdsCozinhaEs from '../demonstracao/es-ES/kds-cozinha-1280.png';
import catalogoEs from '../demonstracao/es-ES/catalogo-1440.png';
import catalogoRecorteEs from '../demonstracao/es-ES/catalogo-recorte-560.png';
import salaRecorteEs from '../demonstracao/es-ES/sala-recorte-560.png';
import cartaRecorteEs from '../demonstracao/es-ES/carta-recorte-560.png';
import tabletEstreitoEs from '../demonstracao/es-ES/tablet-estreito-390.png';
import kdsRecorteEs from '../demonstracao/es-ES/kds-recorte-560.png';
import tabletRecorteEs from '../demonstracao/es-ES/sala-tablet-recorte-560.png';
import salaTabletEs from '../demonstracao/es-ES/sala-tablet-834.png';
import cartaMovelEs from '../demonstracao/es-ES/carta-movel-390.png';
import salaServicoPt from '../demonstracao/pt-BR/sala-servico-1440.png';
import kdsCozinhaPt from '../demonstracao/pt-BR/kds-cozinha-1280.png';
import catalogoPt from '../demonstracao/pt-BR/catalogo-1440.png';
import catalogoRecortePt from '../demonstracao/pt-BR/catalogo-recorte-560.png';
import salaRecortePt from '../demonstracao/pt-BR/sala-recorte-560.png';
import cartaRecortePt from '../demonstracao/pt-BR/carta-recorte-560.png';
import tabletEstreitoPt from '../demonstracao/pt-BR/tablet-estreito-390.png';
import kdsRecortePt from '../demonstracao/pt-BR/kds-recorte-560.png';
import tabletRecortePt from '../demonstracao/pt-BR/sala-tablet-recorte-560.png';
import salaTabletPt from '../demonstracao/pt-BR/sala-tablet-834.png';
import cartaMovelPt from '../demonstracao/pt-BR/carta-movel-390.png';
import salaServicoEn from '../demonstracao/en/sala-servico-1440.png';
import kdsCozinhaEn from '../demonstracao/en/kds-cozinha-1280.png';
import catalogoEn from '../demonstracao/en/catalogo-1440.png';
import catalogoRecorteEn from '../demonstracao/en/catalogo-recorte-560.png';
import salaRecorteEn from '../demonstracao/en/sala-recorte-560.png';
import cartaRecorteEn from '../demonstracao/en/carta-recorte-560.png';
import tabletEstreitoEn from '../demonstracao/en/tablet-estreito-390.png';
import kdsRecorteEn from '../demonstracao/en/kds-recorte-560.png';
import tabletRecorteEn from '../demonstracao/en/sala-tablet-recorte-560.png';
import salaTabletEn from '../demonstracao/en/sala-tablet-834.png';
import cartaMovelEn from '../demonstracao/en/carta-movel-390.png';
import catalogoEstreitoEs from '../demonstracao/es-ES/catalogo-estreito-390.png';
import salaEstreitaEs from '../demonstracao/es-ES/sala-estreita-390.png';
import kdsEstreitoEs from '../demonstracao/es-ES/kds-estreito-390.png';
import catalogoEstreitoPt from '../demonstracao/pt-BR/catalogo-estreito-390.png';
import salaEstreitaPt from '../demonstracao/pt-BR/sala-estreita-390.png';
import kdsEstreitoPt from '../demonstracao/pt-BR/kds-estreito-390.png';
import catalogoEstreitoEn from '../demonstracao/en/catalogo-estreito-390.png';
import salaEstreitaEn from '../demonstracao/en/sala-estreita-390.png';
import kdsEstreitoEn from '../demonstracao/en/kds-estreito-390.png';

/**
 * As composições do produto — as capturas reais, num sítio só.
 *
 * ── Porque é que isto é um componente e não cinco `<img>` espalhados ──────
 *
 * O §6.4 pede **alt contextual** e **carregamento responsivo**, e as duas coisas
 * são fáceis de escrever uma vez e impossíveis de manter em cinco. Com o alt a
 * viver ao lado da imagem, uma composição nova não pode nascer sem ele: o tipo
 * obriga.
 *
 * ── O alt diz o que SE VÊ, não o que a imagem é ───────────────────────────
 *
 * «Captura do KDS» descreve o ficheiro. Quem ouve fica a saber que ali está uma
 * imagem e não fica a saber nada do produto — que é precisamente a informação
 * que a imagem carrega para toda a gente menos para ele. Os textos estão nos
 * três catálogos e falam de mesas, comandas e pratos.
 *
 * ── E são estáticas, o que não é detalhe ──────────────────────────────────
 *
 * O `import` estático dá ao `next/image` a largura e a altura reais, e com elas
 * o `srcset` e a reserva de espaço. Sem isso a landing salta enquanto carrega —
 * e um salto no herói é o defeito que o §6.1 proíbe no sticky, pela mesma razão.
 */

/**
 * ── Os RECORTES têm nome PRÓPRIO, e não substituem os mestres ─────────────
 *
 * Um mestre de 1440 numa ranhura de 477 põe um texto de 14 px a **4,6** —
 * ilegível por aritmética e não por CSS: para lá chegar seriam precisos 1131 px
 * de ranhura, e num telemóvel a ranhura útil são ~350. A cura é a FONTE, e é o
 * que o critério 6 sempre pediu ao dizer «crops»: um **recorte** de 560 de uma
 * região com sentido — a lista de artigos, a coluna de comandas, o salão.
 *
 * Ficam com nome próprio em vez de substituírem o `catalogo`/`kds`/`tablet`
 * porque o mestre continua **certo** onde a ranhura é larga. Trocar a fonte
 * partilhada curava um bloco e ampliava os outros.
 */
export type NomeDaComposicao =
  | 'sala' | 'kds' | 'catalogo' | 'tablet' | 'carta'
  | 'catalogoRecorte' | 'kdsRecorte' | 'tabletRecorte'
  | 'salaRecorte' | 'cartaRecorte' | 'tabletEstreito';

/**
 * ── A fonte segue o IDIOMA, e antes não seguia ────────────────────────────
 *
 * Isto era um conjunto só, de cinco ficheiros. O componente já recebia o
 * `Idioma` e usava-o para o `alt` — mas a imagem era a mesma em todas as
 * línguas, portanto `/pt-BR/product` e `/es-ES/product` serviam **exactamente
 * os mesmos bytes**. Medido a 07/09: somas de verificação iguais.
 *
 * Um visitante brasileiro lia «com o seu cardápio» em português por cima de
 * `Mesas en tiempo real`, `Servicios abiertos` e `Caja`. Não era o idioma a
 * não propagar — **não existia mecanismo para propagar**.
 *
 * Agora há três conjuntos e o índice é o idioma. A prova não é esta linha: é a
 * soma de verificação das imagens, que passou de igual a **3 distintas em 3**
 * nas cinco composições. Nenhuma leitura deste ficheiro o diria.
 */
const FONTES: Record<Idioma, Record<NomeDaComposicao, StaticImageData>> = {
  'es-ES': {
    sala: salaServicoEs, kds: kdsCozinhaEs, catalogo: catalogoEs,
    catalogoRecorte: catalogoRecorteEs, kdsRecorte: kdsRecorteEs,
    salaRecorte: salaRecorteEs, cartaRecorte: cartaRecorteEs,
    tabletEstreito: tabletEstreitoEs,
    tabletRecorte: tabletRecorteEs,
    tablet: salaTabletEs, carta: cartaMovelEs,
  },
  'pt-BR': {
    sala: salaServicoPt, kds: kdsCozinhaPt, catalogo: catalogoPt,
    catalogoRecorte: catalogoRecortePt, kdsRecorte: kdsRecortePt,
    salaRecorte: salaRecortePt, cartaRecorte: cartaRecortePt,
    tabletEstreito: tabletEstreitoPt,
    tabletRecorte: tabletRecortePt,
    tablet: salaTabletPt, carta: cartaMovelPt,
  },
  en: {
    sala: salaServicoEn, kds: kdsCozinhaEn, catalogo: catalogoEn,
    catalogoRecorte: catalogoRecorteEn, kdsRecorte: kdsRecorteEn,
    salaRecorte: salaRecorteEn, cartaRecorte: cartaRecorteEn,
    tabletEstreito: tabletEstreitoEn,
    tabletRecorte: tabletRecorteEn,
    tablet: salaTabletEn, carta: cartaMovelEn,
  },
};

/**
 * ── AS ESTREITAS: no telemóvel não se encolhe, tira-se outra ─────────────
 *
 * Quatro destas cinco eram de secretária e chegavam ao telemóvel a um quarto do
 * tamanho. Medido na terceira fotografia do dono do produto: o catálogo e a sala
 * têm 1440 px e são mostrados a **342** — escala 0,24, e texto que no produto
 * tem 14 px chega a **3,3 px**. O KDS a 3,7, o tablet a 5,7. Só a carta, tirada
 * a 390, chegava legível a 12,3.
 *
 * A página dizia «olha o produto» e mostrava-o num tamanho em que não se lê
 * nada. Encolher uma captura de secretária não é a versão móvel dela.
 *
 * ── A `tablet` partilha a estreita da `sala`, e isso é uma decisão ────────
 *
 * Num telemóvel **não há layout de tablet para mostrar**: a composição existe
 * para mostrar os 834 px na mão de quem serve, e essa largura não cabe. Entre
 * mostrar o mesmo ecrã legível e um layout de tablet ilegível, escolhi o
 * primeiro — mas em `/product` as duas aparecem, e no telemóvel passam a ser a
 * mesma imagem duas vezes. **Escolher outro ecrã para ali é editorial**, e o
 * texto de marketing não é meu para mexer. Fica levantado.
 */
const ESTREITAS: Record<Idioma, Partial<Record<NomeDaComposicao, StaticImageData>>> = {
  'es-ES': {
    sala: salaEstreitaEs, kds: kdsEstreitoEs, catalogo: catalogoEstreitoEs,
    catalogoRecorte: catalogoEstreitoEs, kdsRecorte: kdsEstreitoEs,
    tabletRecorte: tabletEstreitoEs,
    salaRecorte: salaEstreitaEs, cartaRecorte: cartaMovelEs,
    tabletEstreito: tabletEstreitoEs,
    tablet: salaEstreitaEs,
  },
  'pt-BR': {
    sala: salaEstreitaPt, kds: kdsEstreitoPt, catalogo: catalogoEstreitoPt,
    catalogoRecorte: catalogoEstreitoPt, kdsRecorte: kdsEstreitoPt,
    tabletRecorte: tabletEstreitoPt,
    salaRecorte: salaEstreitaPt, cartaRecorte: cartaMovelPt,
    tabletEstreito: tabletEstreitoPt,
    tablet: salaEstreitaPt,
  },
  en: {
    sala: salaEstreitaEn, kds: kdsEstreitoEn, catalogo: catalogoEstreitoEn,
    catalogoRecorte: catalogoEstreitoEn, kdsRecorte: kdsEstreitoEn,
    tabletRecorte: tabletEstreitoEn,
    salaRecorte: salaEstreitaEn, cartaRecorte: cartaMovelEn,
    tabletEstreito: tabletEstreitoEn,
    tablet: salaEstreitaEn,
  },
};

/** A chave do texto que descreve cada composição — não varia com a língua: o
 *  que varia é o texto, e disso trata o `mensagensDe`. Um facto, um sítio. */
const ALT: Record<NomeDaComposicao, string> = {
  sala: 'altSala', kds: 'altKds', catalogo: 'altCatalogo',
  // O recorte é do MESMO ecrã: o texto alternativo continua verdadeiro, e é por
  // isso que o `tabletRecorte` é o SALÃO e não uma comanda — o `altTablet` diz
  // «o mesmo salão num tablet», e trocar a imagem tornaria o texto falso.
  catalogoRecorte: 'altCatalogo', kdsRecorte: 'altKds', tabletRecorte: 'altTablet',
  salaRecorte: 'altSala', cartaRecorte: 'altCarta', tabletEstreito: 'altTablet',
  tablet: 'altTablet', carta: 'altCarta',
};

/**
 * ── As ranhuras REAIS, medidas no navegador ──────────────────────────────
 *
 * O `sizes` é uma promessa ao navegador: «esta imagem vai ocupar tanto». Ele
 * escolhe o ficheiro por essa promessa **antes** de saber o tamanho real, e se
 * a promessa for pequena de mais busca um ficheiro pequeno e depois estica-o.
 *
 * A promessa era `(min-width: 1024px) 50vw, 100vw` para todas — e em `/product`
 * a ranhura é **74vw**. Medido a 07/09 no `currentSrc`, a 1440 px:
 *
 *   /product  sala e kds   ranhura 1072, ficheiro de 720   escala **1,49**
 *   /product  a 1024 px    ranhura  976, ficheiro de 512   escala **1,91**
 *   /product  catálogo     0,99 a 1440, mas **1,27** a 1024
 *   /product  carta        **1,65** — e **1,44 até no telemóvel**
 *   landing   sala e kds   0,82 a 1440, mas **1,04** a 1024
 *
 * Ampliar uma captura é o mesmo defeito que encolhê-la, do outro lado: molha o
 * texto em vez de o apequenar. E não nasceu com as estreitas — o revisor foi
 * medir a versão no ar e é idêntica.
 *
 * Os números abaixo são a ranhura medida, com folga para o degrau seguinte do
 * `srcset`. Ficam como constantes e não como cadeias soltas em cada chamador:
 * a ranhura é um facto da COMPOSIÇÃO da página, e um facto vive num sítio.
 */

/** Duas colunas: 588 px a partir de 1280, 532 a 1024, quase toda a largura abaixo. */
export const RANHURA_METADE = '(min-width: 1200px) 600px, (min-width: 1024px) 60vw, 95vw';

/** Uma coluna larga: 74vw a partir de 1200, e praticamente tudo abaixo disso. */
export const RANHURA_LARGA = '(min-width: 1200px) 75vw, 100vw';

/**
 * ── As larguras ABENÇOADAS, e porque é que são só duas ────────────────────
 *
 * Uma fonte só serve uma ranhura se cair na banda `[r, 1,273r]`: a nitidez pede
 * `fonte ≥ ranhura` (ampliar não inventa detalhe) e a legibilidade pede
 * `fonte ≤ 1,273 × ranhura` (senão o texto de 14 px cai abaixo dos 11).
 *
 * Das **sete** ranhuras que este produto declarava, só três tinham alguma
 * variante na banda, e mesmo essas só para alguns ecrãs. **A inversão é não
 * escolher a variante para a ranhura que o desenho calhou de querer, mas
 * escolher um conjunto pequeno de ranhuras e o desenho só poder usar essas.**
 *
 * Duas chegam, e são as que têm conjunto completo de fontes: **380** ao
 * telemóvel (servida pelas de 390: 13,6 px) e **477** no ecrã largo (servida
 * pelas de 560: 11,9 px).
 *
 * ── E é um TIPO, não um número ───────────────────────────────────────────
 *
 * Enquanto isto era texto livre — `"(min-width: 1024px) 640px, 100vw"` — aceitava
 * qualquer número, incluindo os quatro que não têm variante nenhuma. Quem
 * escrevesse o sítio seguinte escolhia outro número razoável, ficava errado da
 * mesma maneira, e o build passava. **A guarda não é a variante certa: é não se
 * conseguir declarar a errada.** É o princípio do aceite 1 do E01 — o build
 * falha se os tipos falharem.
 */
export const RANHURAS = { estreita: 380, larga: 477 } as const;
export type Ranhura = keyof typeof RANHURAS;

/**
 * O `sizes` deriva da constante, e a folha de estilos também.
 *
 * Abaixo de 1024 a ranhura larga **cai na estreita** de propósito: é aí que as
 * fontes de 390 servem, e prometer 477 a um telemóvel de 390 é a mesma mentira
 * ao contrário.
 */
const PROMESSA: Record<Ranhura, string> = {
  estreita: `${RANHURAS.estreita}px`,
  larga: `(min-width: 1024px) ${RANHURAS.larga}px, ${RANHURAS.estreita}px`,
};

/**
 * A saída declarada, e é para ficar visível.
 *
 * O herói da landing e as ranhuras largas da `/product` **não cabem nas duas
 * abençoadas**: encolher o herói de 720 para 477 tira-lhe a imagem grande, e
 * mantê-lo exige capturar `sala` a 834. As duas opções são legíveis, portanto a
 * régua não decide — é desenho, e é do Matheus e da Nathalia.
 *
 * Fica com nome próprio em vez de um `tamanhos?: string` opcional: assim
 * `grep ranhuraPorDecidir` dá a lista exacta do que está por decidir, e ninguém
 * a usa por distracção achando que é o caminho normal.
 */
type Ranhuras =
  | { ranhura: Ranhura; ranhuraPorDecidir?: undefined }
  | { ranhuraPorDecidir: string; ranhura?: undefined };

export function Composicao({
  qual, idioma, prioritaria = false, ...ranhuras
}: Ranhuras & {
  qual: NomeDaComposicao;
  idioma: Idioma;
  /**
   * Só a primeira do herói. `priority` desliga o carregamento preguiçoso e
   * pré-carrega — o que é certo para a imagem que decide o LCP e **errado para
   * todas as outras**, porque marcá-las todas como prioritárias é o mesmo que
   * não marcar nenhuma.
   */
  prioritaria?: boolean;
}) {
  const tamanhos = ranhuras.ranhura !== undefined
    ? PROMESSA[ranhuras.ranhura]
    : ranhuras.ranhuraPorDecidir;
  // A largura REAL sai da MESMA constante que a promessa. Era esta a distância
  // que o bloco 4 mediu: o `sizes` dizia 390 e a caixa tinha 477, e a imagem
  // vinha ampliada sem ninguém dar por isso. Com a variável, a declaração e a
  // caixa deixam de poder discordar.
  const larguraReal = ranhuras.ranhura !== undefined
    ? { '--bo-ranhura': `${RANHURAS[ranhuras.ranhura]}px` } as Record<string, string>
    : undefined;
  const k = mensagensDe(idioma).mktE10 as unknown as Record<string, string>;
  const estreita = ESTREITAS[idioma][qual];
  const larga = (
    <Image
      className="bo-mkt__composicao"
      {...(larguraReal ? { style: larguraReal } : {})}
      src={FONTES[idioma][qual]}
      alt={k[ALT[qual]] ?? ''}
      sizes={tamanhos}
      priority={prioritaria}
      placeholder="blur"
    />
  );
  if (!estreita) return larga;
  /**
   * `<picture>` e não duas `<Image>` escondidas por CSS: o navegador **descarrega
   * as duas** mesmo com `display:none`, e pagar dois ficheiros para mostrar um é
   * um defeito de desempenho a curar outro de legibilidade.
   *
   * A estreita entra por `<source>` — é a original de 390 px, e a 390 px isso
   * são dezenas de KB, não os centenas que uma de 1440 custaria sem optimizador.
   * A larga continua a passar pelo `next/image` com o `srcset` dele, que é onde
   * o peso realmente importa.
   */
  return (
    <picture>
      <source
        media="(max-width: 767px)"
        srcSet={estreita.src}
        width={estreita.width}
        height={estreita.height}
      />
      {larga}
    </picture>
  );
}

/**
 * O aviso de que os dados são de demonstração.
 *
 * O §10 reprova «dado de demonstração apresentado como cliente ou resultado
 * real», e o §6.4 pede dados «claramente artificiais». O nome do inquilino já o
 * diz — mas dizê-lo por extenso, ao lado das imagens, é a diferença entre não
 * mentir e não deixar ninguém enganar-se sozinho.
 */
export function AvisoDeDemonstracao({ idioma }: { idioma: Idioma }) {
  return (
    <p className="bo-mkt__aviso-demo">{mensagensDe(idioma).mktE10.demoAviso}</p>
  );
}

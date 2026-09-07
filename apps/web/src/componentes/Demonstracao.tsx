import Image, { type StaticImageData } from 'next/image';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import salaServicoEs from '../demonstracao/es-ES/sala-servico-1440.png';
import kdsCozinhaEs from '../demonstracao/es-ES/kds-cozinha-1280.png';
import catalogoEs from '../demonstracao/es-ES/catalogo-1440.png';
import salaTabletEs from '../demonstracao/es-ES/sala-tablet-834.png';
import cartaMovelEs from '../demonstracao/es-ES/carta-movel-390.png';
import salaServicoPt from '../demonstracao/pt-BR/sala-servico-1440.png';
import kdsCozinhaPt from '../demonstracao/pt-BR/kds-cozinha-1280.png';
import catalogoPt from '../demonstracao/pt-BR/catalogo-1440.png';
import salaTabletPt from '../demonstracao/pt-BR/sala-tablet-834.png';
import cartaMovelPt from '../demonstracao/pt-BR/carta-movel-390.png';
import salaServicoEn from '../demonstracao/en/sala-servico-1440.png';
import kdsCozinhaEn from '../demonstracao/en/kds-cozinha-1280.png';
import catalogoEn from '../demonstracao/en/catalogo-1440.png';
import salaTabletEn from '../demonstracao/en/sala-tablet-834.png';
import cartaMovelEn from '../demonstracao/en/carta-movel-390.png';

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

export type NomeDaComposicao = 'sala' | 'kds' | 'catalogo' | 'tablet' | 'carta';

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
    tablet: salaTabletEs, carta: cartaMovelEs,
  },
  'pt-BR': {
    sala: salaServicoPt, kds: kdsCozinhaPt, catalogo: catalogoPt,
    tablet: salaTabletPt, carta: cartaMovelPt,
  },
  en: {
    sala: salaServicoEn, kds: kdsCozinhaEn, catalogo: catalogoEn,
    tablet: salaTabletEn, carta: cartaMovelEn,
  },
};

/** A chave do texto que descreve cada composição — não varia com a língua: o
 *  que varia é o texto, e disso trata o `mensagensDe`. Um facto, um sítio. */
const ALT: Record<NomeDaComposicao, string> = {
  sala: 'altSala', kds: 'altKds', catalogo: 'altCatalogo',
  tablet: 'altTablet', carta: 'altCarta',
};

export function Composicao({
  qual, idioma, prioritaria = false, tamanhos = '(min-width: 1024px) 50vw, 100vw',
}: {
  qual: NomeDaComposicao;
  idioma: Idioma;
  /**
   * Só a primeira do herói. `priority` desliga o carregamento preguiçoso e
   * pré-carrega — o que é certo para a imagem que decide o LCP e **errado para
   * todas as outras**, porque marcá-las todas como prioritárias é o mesmo que
   * não marcar nenhuma.
   */
  prioritaria?: boolean;
  tamanhos?: string;
}) {
  const k = mensagensDe(idioma).mktE10 as unknown as Record<string, string>;
  return (
    <Image
      className="bo-mkt__composicao"
      src={FONTES[idioma][qual]}
      alt={k[ALT[qual]] ?? ''}
      sizes={tamanhos}
      priority={prioritaria}
      placeholder="blur"
    />
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

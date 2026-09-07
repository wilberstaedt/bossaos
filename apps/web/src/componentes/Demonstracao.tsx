import Image, { type StaticImageData } from 'next/image';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import salaServico from '../demonstracao/sala-servico-1440.png';
import kdsCozinha from '../demonstracao/kds-cozinha-1280.png';
import catalogo from '../demonstracao/catalogo-1440.png';
import salaTablet from '../demonstracao/sala-tablet-834.png';
import cartaMovel from '../demonstracao/carta-movel-390.png';

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

/** Cada composição, com a sua fonte e a chave do texto que a descreve. */
const COMPOSICOES: Record<NomeDaComposicao, { fonte: StaticImageData; alt: string }> = {
  sala: { fonte: salaServico, alt: 'altSala' },
  kds: { fonte: kdsCozinha, alt: 'altKds' },
  catalogo: { fonte: catalogo, alt: 'altCatalogo' },
  tablet: { fonte: salaTablet, alt: 'altTablet' },
  carta: { fonte: cartaMovel, alt: 'altCarta' },
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
  const c = COMPOSICOES[qual];
  return (
    <Image
      className="bo-mkt__composicao"
      src={c.fonte}
      alt={k[c.alt] ?? ''}
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

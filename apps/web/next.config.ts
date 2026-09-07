import type { NextConfig } from 'next';

const config: NextConfig = {
  // Os pacotes do workspace são TypeScript por compilar: o Next transpila-os.
  transpilePackages: [
    '@bossaos/auth',
    '@bossaos/config',
    '@bossaos/db',
    '@bossaos/domain',
    '@bossaos/i18n',
    '@bossaos/storage',
    '@bossaos/ui',
  ],
  // O build falha se os tipos falharem. O lint corre em comando SEPARADO
  // (`pnpm lint`, na raiz) — o Next 16 já não o configura aqui, e mantê-los
  // separados é o que o aceite 1 do E01 pede.
  typescript: { ignoreBuildErrors: false },
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  /**
   * A pasta do build vem do ambiente, com `.next` por omissão.
   *
   * ── Isto é a segunda metade de um problema que a porta já resolvia ────────
   *
   * A `playwright.config.ts` parametrizou a PORTA com este motivo escrito:
   *
   *   «Fixa, o revisor e o executor não podem medir ao mesmo tempo […] uma disse
   *   "porta já em uso", outra deu um vermelho que não era o esperado, e a
   *   terceira apanhou um `.next` a meio de dois builds a colidir.»
   *
   * A porta resolveu o primeiro caso. **O terceiro ficou por resolver**, porque
   * a pasta do build continuou fixa: dois processos com portas diferentes
   * continuam a escrever no MESMO `.next`, e o servidor de um lê os ficheiros
   * enquanto o build do outro os substitui.
   *
   * Aconteceu a 07/09 e o sintoma foi este: `/es-ES/getting-started` respondeu
   * **200 a um pedido e 500 ao seguinte**, com o código da página igual nos
   * dois. O 500 não era defeito da página — era o build de outro processo a
   * passar por baixo do servidor deste. É a classe de leitura que a nota da
   * porta descreve como «não distingue o produto do arnês».
   *
   * `NEXT_DIST_DIR=.next-revisao pnpm build` dá a quem mede uma pasta só sua. A
   * omissão continua `.next`, portanto nada muda para quem não a define.
   */
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default config;

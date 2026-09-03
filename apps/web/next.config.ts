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
};

export default config;

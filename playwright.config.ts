import { defineConfig, devices } from '@playwright/test';

/**
 * Inspecção do E02.
 *
 * O aceite 1 manda inspeccionar 360, 390, 768, 1280 e 1440 px; o aceite 2 manda
 * validar contraste, foco em diálogo e regresso ao accionador; o aceite 3 manda
 * registar capturas. Nada disso se prova a olho: um `pnpm build` verde não sabe
 * se um botão saiu do ecrã a 360 px.
 *
 * Corre contra a aplicação CONSTRUÍDA, não contra o servidor de desenvolvimento:
 * é a versão que vai para a rua que interessa medir.
 */
const PORTA = 3010;

export default defineConfig({
  testDir: './inspeccao',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list']] : [['list']],
  outputDir: './inspeccao/.resultados',

  use: {
    baseURL: `http://127.0.0.1:${PORTA}`,
    // O produto vive em espanhol; o browser da inspecção também, senão o
    // redireccionamento de idioma levava tudo para inglês sem se dar por isso.
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  /**
   * A base é semeada ANTES de o navegador arrancar.
   *
   * Sem isto não havia carta pública persistente para visitar — a prova do E09
   * cria e destrói o seu próprio endereço —, e as onze telas mais dependentes de
   * telemóvel do produto ficavam sem medição de móvel. Está escrito em
   * `docs/progress/DIVIDA-MOVEL.txt`, e é o mesmo trabalho que o E10 precisa
   * para os sites públicos.
   */
  globalSetup: './inspeccao/semear.ts',

  webServer: {
    command: `pnpm build && pnpm --filter @bossaos/web exec next start -p ${PORTA}`,
    url: `http://127.0.0.1:${PORTA}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

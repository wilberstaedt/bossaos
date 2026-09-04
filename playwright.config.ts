import { defineConfig, devices } from '@playwright/test';
import { FICHEIRO_DE_SESSAO } from './inspeccao/caminhos.ts';

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
/**
 * A porta vem do ambiente, com 3010 por omissão.
 *
 * Fixa, o revisor e o executor não podem medir ao mesmo tempo: a 04/09 tentei
 * três vezes correr a prova do tema enquanto o executor a corria também, e as
 * três leituras foram inúteis — uma disse «porta já em uso», outra deu um
 * vermelho que não era o esperado, e a terceira apanhou um `.next` a meio de dois
 * builds a colidir.
 *
 * Nenhuma dessas era um defeito do produto, e a pior parte é que a primeira
 * PARECIA um. Duas pessoas a medir a mesma coisa no mesmo sítio produzem
 * resultados que não distinguem o produto do arnês.
 *
 * `PORTA_INSPECCAO=3012 npx playwright test` dá a quem revê um sítio só seu. O
 * `BETTER_AUTH_URL` acompanha, senão a biblioteca recusa a origem e devolve 403
 * ao registar — sem dizer uma palavra sobre portas.
 */
const PORTA = Number(process.env.PORTA_INSPECCAO ?? 3010);

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

  /**
   * Três projectos, e a razão de não ser um só.
   *
   * `preparar` entra na aplicação e guarda a sessão em ficheiro. Corre PRIMEIRO,
   * e os outros dois dependem dele — a dependência é o que garante que o
   * servidor já está de pé quando se tenta entrar, coisa que um `globalSetup`
   * não garante.
   *
   * `chromium` corre **sem sessão**, que é como um estranho chega às páginas
   * públicas. Se corresse com sessão, uma rota pública que exigisse entrada por
   * engano passava despercebida — mediria um ecrã que o cliente do restaurante
   * nunca vê.
   *
   * `painel` corre **com** a sessão, e é o que destranca as telas de gestão do
   * E10 e as cinco telas internas que o E09 deixou por medir.
   */
  projects: [
    { name: 'preparar', testMatch: /autenticar\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/autenticar\.setup\.ts/, /painel\.spec\.ts/, /isolamento\.spec\.ts/, /tema\.spec\.ts/, /sala\.spec\.ts/, /pedidos\.spec\.ts/, /staff\.spec\.ts/, /staff-telas\.spec\.ts/, /kds\.spec\.ts/, /visitante\.spec\.ts/],
      dependencies: ['preparar'],
    },
    {
      name: 'painel',
      // O isolamento entra aqui porque precisa das MESMAS sessões — a de A para
      // pedir, e a de B para o par que dá sentido à recusa.
      // E o tema do E12 pela mesma razão: precisa da sessão de A para a recusa
      // e da de B para o par — e é em B, que é Pro, que existem cores próprias.
      testMatch: [/painel\.spec\.ts/, /isolamento\.spec\.ts/, /tema\.spec\.ts/, /sala\.spec\.ts/, /pedidos\.spec\.ts/, /staff\.spec\.ts/, /staff-telas\.spec\.ts/, /kds\.spec\.ts/, /visitante\.spec\.ts/],
      use: { ...devices['Desktop Chrome'], storageState: FICHEIRO_DE_SESSAO },
      dependencies: ['preparar'],
    },
  ],

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

  /**
   * E apaga-a no fim. A semeadura limpava só a passagem anterior, e o cenário
   * que ficava na base punha `provar-publico.sh` a correr sobre uma carta
   * publicada que ele não espera. Quem faz a sujidade apanha-a.
   */
  globalTeardown: './inspeccao/limpar.ts',

  webServer: {
    /**
     * `BETTER_AUTH_URL` tem de bater certo com a PORTA desta inspecção.
     *
     * O `.env` aponta ao 3000, que é o servidor de desenvolvimento; a inspecção
     * corre no 3010. Com os dois em desacordo, a biblioteca de autenticação
     * recusa a origem e devolve **403 ao registar** — que foi exactamente o que
     * aconteceu à primeira, e o erro não diz uma palavra sobre portas.
     *
     * A prova de acesso do E04 já resolvia isto do mesmo modo, no shell. Aqui
     * fica no arnês, para quem correr a inspecção não ter de saber.
     */
    env: { BETTER_AUTH_URL: `http://127.0.0.1:${PORTA}` },
    command: `pnpm build && pnpm --filter @bossaos/web exec next start -p ${PORTA}`,
    url: `http://127.0.0.1:${PORTA}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

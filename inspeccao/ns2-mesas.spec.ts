import { test } from '@playwright/test';

/**
 * As duas capturas de «Mesas en tiempo real» que a tabela do §9 exige.
 *
 * Vive no projecto `painel` porque a tela é autenticada: sem sessão a rota
 * redirecciona para o `login` e a captura seria do ecrã errado — foi assim que
 * uma medição do Staff se perdeu hoje, num `x` que não era identificador.
 *
 * **Está declarada no `playwright.config.ts` à mão**, e não por o nome casar
 * com um padrão existente. Casar por acaso foi o que fez o `ns2-sistema.spec.ts`
 * desaparecer em silêncio: `/tema\.spec\.ts/` sem âncora apanha
 * «ns2-sis*tema.spec.ts*».
 */

const ROTA = '/es-ES/app/marina-oropesa/puerto/floor';
const DESTINO = 'docs/visual/ns2/2026-09-08_a3935ea';

test.describe('North Star v2 — as capturas das Mesas', () => {
  test('secretária e telemóvel, com a tela carregada', async ({ page }) => {
    test.setTimeout(600_000);

    for (const [nome, w, h] of [
      ['Mesas-1440x900', 1440, 900],
      ['Mesas-390x844', 390, 844],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      const r = await page.goto(ROTA, { waitUntil: 'networkidle' });
      // O endereço FINAL, e não o pedido: uma rota que redireccionasse para o
      // login dava uma captura nítida da página errada.
      const caminho = new URL(page.url()).pathname;
      console.log(`MESAS ${nome} estado=${r?.status()} caminho=${caminho}`);
      if (caminho !== ROTA) throw new Error(`POPULACAO-ZERO: desviou para ${caminho}`);

      const mapa = page.locator('[data-teste="mapa-de-mesas"]');
      const quantas = await mapa.locator('.ns-mesa').count();
      console.log(`MESAS ${nome} mesas=${quantas}`);
      if (quantas === 0) throw new Error('POPULACAO-ZERO: o mapa não desenhou mesas');

      await page.screenshot({ path: `${DESTINO}/${nome}.png`, animations: 'disabled' });
      console.log(`MESAS ${nome} capturada`);
    }
  });
});

import { expect, test } from '@playwright/test';

/**
 * As quatro capturas da landing que a tabela do §9 exige.
 *
 * ── Porque é que isto existe como ficheiro ────────────────────────────────
 *
 * As primeiras quatro foram tiradas à mão, num guião de uma vez. Nítidas,
 * corretas, e **irreproduzíveis**: quando a landing mudou — o disco do passo,
 * a nota da secção coral, o lead do fecho — não havia como refazê-las senão
 * reconstruindo o guião de memória. Uma prova que não se sabe repetir não é
 * prova, é uma fotografia com sorte.
 *
 * Corre no projecto `chromium`, SEM sessão, de propósito: com sessão iniciada
 * o cabeçalho público troca a chamada de «entrar» pela de «ir para o painel»,
 * e a captura passava a mostrar uma landing que nenhum visitante vê.
 */

const DESTINO = 'docs/visual/ns2/2026-09-08_a3935ea';

test.describe('North Star v2 — as capturas da landing', () => {
  test('primeira viewport e página inteira, a 1440 e a 390', async ({ page }) => {
    test.setTimeout(900_000);

    for (const [rotulo, w, h] of [['1440', 1440, 900], ['390', 390, 844]] as const) {
      await page.setViewportSize({ width: w, height: h });
      const r = await page.goto('/es-ES', { waitUntil: 'networkidle' });
      const caminho = new URL(page.url()).pathname;
      const blocos = await page.locator('.ns-seccao').count();
      console.log(`LP ${rotulo} estado=${r?.status()} caminho=${caminho} blocos=${blocos}`);

      expect(r?.status(), 'POPULACAO-ZERO: a landing não abriu').toBe(200);
      expect(caminho, 'POPULACAO-ZERO: a landing desviou').toBe('/es-ES');
      // Sete blocos é o número do norte. Se vierem treze, a captura seria da
      // interpretação anterior — a que foi rejeitada — e sairia igualmente
      // nítida.
      expect(blocos, `POPULACAO-ZERO: ${blocos} blocos e não os 7 do norte`).toBe(7);

      const nome = rotulo === '1440'
        ? 'LP-1440x900-primeira-viewport' : 'LP-390x844-primeira-viewport';
      await page.screenshot({ path: `${DESTINO}/${nome}.png`, animations: 'disabled' });
      await page.screenshot({
        path: `${DESTINO}/LP-${rotulo}-pagina-inteira.png`, fullPage: true, animations: 'disabled',
      });
      console.log(`LP ${rotulo} capturada (viewport + inteira)`);
    }
  });
});

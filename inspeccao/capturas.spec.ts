import { test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { PAGINAS } from './ajudas.ts';

/**
 * Aceite 3 do E02: registar capturas de secretária e telemóvel.
 *
 * Etiquetadas `@capturas` e fora da corrida por omissão: escrevem ficheiros, e
 * uma verificação que altera o repositório não devia correr a cada `pnpm
 * inspeccionar`. Corre-se de propósito, com `pnpm capturas`.
 *
 * 390 e 1440 px: os dois extremos úteis dos cinco pontos. O atlas desenha em
 * 360×780 e 1100×740; capturamos um pouco acima para as capturas mostrarem o
 * comportamento nas larguras reais dos aparelhos, não só nas do desenho.
 */
const DESTINO = 'docs/progress/capturas/E02';

const MEDIDAS = [
  { nome: 'movel', largura: 390, altura: 844 },
  { nome: 'secretaria', largura: 1440, altura: 900 },
] as const;

for (const medida of MEDIDAS) {
  test.describe(`@capturas ${medida.nome}`, () => {
    test.use({ viewport: { width: medida.largura, height: medida.altura } });

    for (const pagina of PAGINAS) {
      test(`${pagina.nome}`, async ({ page }) => {
        await mkdir(DESTINO, { recursive: true });
        await page.goto(`/es-ES${pagina.caminho}`);
        await page.waitForLoadState('networkidle');
        // `animations: 'disabled'` para o esqueleto de carga não sair a meio de
        // um pulso e a captura ser comparável entre corridas.
        await page.screenshot({
          path: `${DESTINO}/${pagina.nome}-${medida.nome}-${medida.largura}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      });
    }
  });
}

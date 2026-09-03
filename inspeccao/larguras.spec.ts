import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, PAGINAS,
  alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * Aceite 1 do E02: 360, 390, 768, 1280 e 1440 px, sem conteúdo nem acção
 * inacessível. Seis páginas × cinco larguras, em espanhol; os outros dois
 * idiomas correm à parte, com o conteúdo longo.
 */
for (const largura of LARGURAS) {
  test.describe(`${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    for (const pagina of PAGINAS) {
      test(`${pagina.nome} não transborda nem esconde acções`, async ({ page }) => {
        await page.goto(`/es-ES${pagina.caminho}`);
        await page.waitForLoadState('networkidle');

        expect(await transbordaNaHorizontal(page), 'a página rola na horizontal').toBe(0);

        const fora = await elementosForaDoEcra(page);
        expect(fora, `elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      });
    }

    test(`catálogo: alvos de toque de 44 px`, async ({ page }) => {
      await page.goto('/es-ES/interno/catalogo');
      await page.waitForLoadState('networkidle');
      const maus = await alvosPequenos(page, 44);
      expect(maus, `alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    });

    test(`KDS: alvos de operação de 48 px`, async ({ page }) => {
      await page.goto('/es-ES/interno/estruturas/kds');
      await page.waitForLoadState('networkidle');
      const maus = await alvosPequenos(page, 48);
      expect(maus, `alvos pequenos na operação:\n${maus.join('\n')}`).toEqual([]);
    });
  });
}

/**
 * Aceite 1, parte dos idiomas: o alemão e o finlandês não existem aqui, mas o
 * espanhol e o português são mais longos que o inglês e é neles que a régua
 * parte. Corre-se o catálogo inteiro nos três.
 */
test.describe('conteúdo nos três idiomas', () => {
  test.use({ viewport: { width: 360, height: 900 } });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      await page.goto(`/${idioma}/interno/catalogo`);
      await page.waitForLoadState('networkidle');
      expect(await transbordaNaHorizontal(page)).toBe(0);
      const fora = await elementosForaDoEcra(page);
      expect(fora, fora.join('\n')).toEqual([]);
    });
  }
});

/**
 * Zoom a 200 % (WCAG 1.4.4). O browser sem cabeça não tem gesto de zoom, mas
 * ampliar duas vezes num ecrã de 1280 é, para efeitos de composição, o mesmo que
 * mostrar 640 px de conteúdo — é assim que a régua se aplica.
 */
test.describe('zoom a 200 %', () => {
  test.use({ viewport: { width: 640, height: 512 } });

  for (const pagina of PAGINAS) {
    test(`${pagina.nome} continua utilizável`, async ({ page }) => {
      await page.goto(`/es-ES${pagina.caminho}`);
      await page.waitForLoadState('networkidle');
      expect(await transbordaNaHorizontal(page)).toBe(0);
    });
  }
});

/** Aceite 2, primeira parte: contraste medido no DOM, não afirmado. */
test.describe('contraste', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  for (const pagina of PAGINAS) {
    test(`${pagina.nome} cumpre a WCAG`, async ({ page }) => {
      await page.goto(`/es-ES${pagina.caminho}`);
      await page.waitForLoadState('networkidle');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `texto com pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    });
  }
});

/**
 * A acção repetida no topo segue o atlas: existe em secretária, não existe no
 * telemóvel. Escrito como teste e não verificado numa captura, porque uma
 * captura prova um dia e um teste prova todos.
 */
test.describe('acção repetida no topo', () => {
  test('não aparece a 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/es-ES/interno/estruturas/admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.bo-estado__accao-topo')).toBeHidden();
    // E a acção continua alcançável — uma vez.
    await expect(page.getByRole('button', { name: 'Crear primer producto' })).toHaveCount(1);
  });

  test('aparece a 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/es-ES/interno/estruturas/admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.bo-estado__accao-topo')).toBeVisible();
  });
});

import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { SLUG_DE_INSPECCAO } from '../packages/db/prisma/inspeccao-comum.ts';

/**
 * A MENU-017, medida **sem sessão** — que é como um cliente do restaurante lá
 * chega.
 *
 * ── Porque é que não vive no `crm.spec.ts` ────────────────────────────────
 *
 * Aquele corre no projecto `painel`, com a sessão aberta. Uma tela pública
 * medida com sessão passa mesmo que exija entrada por engano, e o cliente que a
 * abre no telemóvel vê um ecrã de login. É o defeito que o E23 apanhou tarde:
 * três telas públicas contadas na população e nunca visitadas como um estranho
 * as vê.
 */

const CAMINHO = `/r/${SLUG_DE_INSPECCAO}/es-ES/menu/feedback`;
const TOQUE = 44;

async function visitar(pagina: import('@playwright/test').Page, idioma: string) {
  const caminho = CAMINHO.replace('/es-ES/', `/${idioma}/`);
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `MENU-017 · ${caminho} respondeu ${resposta?.status()}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  await expect(pagina.locator('[data-tela="MENU-017"]'),
    'MENU-017 · o marcador não apareceu').toBeVisible();
}

test('abre SEM sessão, e não desvia para entrar', async ({ page }) => {
  await visitar(page, 'es-ES');
  expect(page.url(), 'a tela pública desviou para o login').not.toContain('/entrar');
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · MENU-017`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('não transborda nem esconde acções', async ({ page }) => {
      await visitar(page, 'es-ES');
      expect(await transbordaNaHorizontal(page), 'MENU-017 rola na horizontal').toBe(0);
      const fora = await elementosForaDoEcra(page);
      expect(fora, `MENU-017 · fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
    });
  });
}

test.describe('MENU-017 a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('alvos de toque e contraste', async ({ page }) => {
    await visitar(page, 'es-ES');
    const pequenos = await alvosPequenos(page, TOQUE);
    expect(pequenos, `alvos pequenos:\n${pequenos.join('\n')}`).toEqual([]);
    const fracos = await textosComPoucoContraste(page);
    expect(fracos, `pouco contraste:\n${fracos.join('\n')}`).toEqual([]);
  });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      await visitar(page, idioma);
      expect(await transbordaNaHorizontal(page), `MENU-017 · ${idioma} transborda`).toBe(0);
    });
  }
});

test.describe('deixar uma opinião não é aceitar publicidade', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a pergunta do consentimento é SEPARADA e começa em «não»',
    async ({ page }) => {
      await visitar(page, 'es-ES');
      const escolha = page.locator('select[name="consenteCampanha"]');
      await expect(escolha, 'não há pergunta separada de consentimento').toBeVisible();
      // A primeira opção é a que vale quando ninguém mexe. Tem de ser «não».
      expect(await escolha.inputValue(),
        'a resposta começa em «sim»: uma caixa pré-marcada não é consentimento')
        .toBe('NAO');
    });

  test('e o ecrã diz que os dados de serviço não dão permissão de campanha',
    async ({ page }) => {
      await visitar(page, 'es-ES');
      const aviso = await page.locator('[data-teste="servico-nao-da-campanha"]').innerText();
      expect(aviso.toLowerCase(),
        'a tela não diz que os dados de serviço não dão permissão')
        .toContain('marketing');
    });
});

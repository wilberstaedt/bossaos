import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS,
  alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';
import { SLUG_DE_INSPECCAO } from '../packages/db/prisma/inspeccao-comum.ts';

/**
 * PUB-001, 004, 005 e 006 — o site público do restaurante, medido no navegador.
 *
 * ── Nasce com prova de móvel, e é essa a novidade ─────────────────────────
 *
 * A régua do E10 contou antes de eu escrever código: dos 72 IDs assinados até
 * ao E09, **zero** tinham a rota visitada por uma inspecção de larguras. O
 * retrofit de 29 telas seria a etapa toda. Estas nascem medidas.
 *
 * ── Toda a visita AFIRMA que chegou onde queria ───────────────────────────
 *
 * A régua reprova à cabeça «uma rota que redirecciona e é medida à mesma»: uma
 * página que devolve o ecrã de entrada mede a entrada e diz verde. Por isso cada
 * visita confirma o estado, o endereço final e um marcador da própria página.
 */

const BASE = `/r/${SLUG_DE_INSPECCAO}`;

async function visitar(
  pagina: import('@playwright/test').Page, caminho: string, marcador: string,
) {
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${caminho} respondeu ${resposta?.status()}`).toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  expect(new URL(pagina.url()).pathname, 'houve um redireccionamento').toBe(caminho.split('?')[0]);
  await expect(pagina.locator(marcador).first()).toBeVisible();
}

const TELAS = [
  { id: 'PUB-001', caminho: `${BASE}/es-ES`, marcador: '.bo-publico__heroi h1' },
  { id: 'PUB-004', caminho: `${BASE}/es-ES/about`, marcador: '.bo-publico__texto' },
  { id: 'PUB-005', caminho: `${BASE}/es-ES/contact`, marcador: 'form[action="/api/publico/lead"]' },
  {
    id: 'PUB-006',
    caminho: `${BASE}/es-ES/news/noche-de-vinos-de-la-comarca`,
    marcador: 'article .bo-publico__texto',
  },
] as const;

for (const largura of LARGURAS) {
  test.describe(`${largura} px · site público`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    for (const tela of TELAS) {
      test(`${tela.id} não transborda nem esconde acções`, async ({ page }) => {
        await visitar(page, tela.caminho, tela.marcador);
        expect(await transbordaNaHorizontal(page), 'a página rola na horizontal').toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      });
    }
  });
}

test.describe('site público a 360 px — o telemóvel na mão de quem procura o restaurante', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px em todas as páginas', async ({ page }) => {
    for (const tela of TELAS) {
      await visitar(page, tela.caminho, tela.marcador);
      const maus = await alvosPequenos(page, 44);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG em todas as páginas', async ({ page }) => {
    for (const tela of TELAS) {
      await visitar(page, tela.caminho, tela.marcador);
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id}:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('e o formulário de contacto cabe, com os rótulos ligados aos campos', async ({ page }) => {
    // Um campo sem rótulo ligado é um campo que o leitor de ecrã anuncia como
    // "caixa de texto" — e num formulário de contacto isso é o cliente a não
    // saber onde escreve o email.
    await visitar(page, `${BASE}/es-ES/contact`, 'form[action="/api/publico/lead"]');
    for (const campo of ['nome', 'email', 'telefone', 'mensagem']) {
      const rotulo = page.locator(`label[for="${campo}"]`);
      await expect(rotulo, `${campo} sem rótulo ligado`).toHaveCount(1);
    }
    expect(await transbordaNaHorizontal(page)).toBe(0);
  });

  test('o site nos três idiomas, sem transbordo', async ({ page }) => {
    for (const idioma of IDIOMAS) {
      await visitar(page, `${BASE}/${idioma}`, '.bo-publico__heroi h1');
      expect(await transbordaNaHorizontal(page), `${idioma} transborda`).toBe(0);
    }
  });

  test('e trocar de idioma FICA na mesma página', async ({ page }) => {
    // O defeito que isto apanha: quem está a ler uma novidade e carrega em `en`
    // ir parar ao início. É a maneira mais rápida de perder quem estava a ler, e
    // não dá erro nenhum.
    const caminho = `${BASE}/es-ES/news/noche-de-vinos-de-la-comarca`;
    await visitar(page, caminho, 'article .bo-publico__texto');
    await page.locator('.bo-publico__idiomas a', { hasText: 'en' }).first().click();
    await page.waitForLoadState('networkidle');
    expect(new URL(page.url()).pathname).toBe(`${BASE}/en/news/noche-de-vinos-de-la-comarca`);
  });
});

test.describe('o que o site público NÃO mostra', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o rascunho não aparece, e uma página oculta dá 404', async ({ page }) => {
    // A semeadura publica as três páginas. Uma que não existe na revisão tem de
    // dar ausência e não uma moldura vazia com 200 — que é o que põe uma página
    // em branco nos motores de busca com o nome do cliente em cima.
    const r = await page.goto(`${BASE}/es-ES/news/nao-existe-de-todo`);
    expect(r?.status()).toBe(404);
  });
});

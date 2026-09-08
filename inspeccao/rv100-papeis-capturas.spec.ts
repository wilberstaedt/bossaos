import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * As quatro capturas do §4.5 — uma por papel.
 *
 * ── Porque é que isto NÃO vive dentro da prova ────────────────────────────
 *
 * O `provar-rv100-papeis.sh` corre a prova **duas vezes**, e a segunda com o
 * plante das quatro composições iguais. Se a captura estivesse lá dentro, a
 * corrida plantada gravava quatro imagens iguais **por cima das boas** — e o
 * dossiê passava a mostrar exactamente o defeito que o guião existe para
 * recusar, sem ninguém perceber porquê. Ficheiro à parte, e o guião do plante
 * não lhe toca.
 *
 * ── A largura ────────────────────────────────────────────────────────────
 *
 * 1280, que é a largura a que o bloco é mostrado. Não se captura a 1440 para
 * depois encolher: uma imagem encolhida mente sobre o tamanho do texto, e o
 * critério 6 da régua é medido em píxeis no ecrã.
 */

const DESTINO = 'docs/visual/rv100/2026-09-08_papeis';
const LARGURA = 1280;
const IDIOMA = 'es-ES';

test('as quatro telas do §4.5, uma por papel', async ({ page }) => {
  test.setTimeout(600_000);
  mkdirSync(DESTINO, { recursive: true });

  await page.setViewportSize({ width: LARGURA, height: 900 });
  await page.goto(`/${IDIOMA}`, { waitUntil: 'networkidle' });

  const seccao = page.locator('#papeis');
  await seccao.scrollIntoViewIfNeeded();

  const separadores = seccao.locator('[role="tab"]');
  const total = await separadores.count();
  const capturas: Array<Record<string, unknown>> = [];

  for (let i = 0; i < total; i += 1) {
    const separador = separadores.nth(i);
    await separador.click();
    // Sem isto, a captura pode apanhar a imagem anterior ainda no ecrã: o
    // painel troca no mesmo quadro, o ficheiro novo não.
    await page.locator('#papeis [role="tabpanel"]:not([hidden]) img')
      .first().evaluate((img) => (img as HTMLImageElement).decode().catch(() => undefined));
    await page.waitForTimeout(120);

    const rotulo = (await separador.textContent())?.trim() ?? `papel-${i + 1}`;
    const ficheiro = `papel-${i + 1}.png`;
    await seccao.screenshot({ path: `${DESTINO}/${ficheiro}`, animations: 'disabled' });

    const painel = page.locator('#papeis [role="tabpanel"]:not([hidden])');
    capturas.push({
      ficheiro,
      papel: rotulo,
      beneficio: (await painel.locator('p').first().textContent())?.trim() ?? '',
      imagem: await painel.locator('img').first().getAttribute('src'),
      largura: LARGURA,
    });
    console.log(`CAPTURA ${ficheiro} papel="${rotulo}"`);
  }

  writeFileSync(`${DESTINO}/papeis.json`, `${JSON.stringify({
    bloco: 'RV100 §4.5 — para cada pessoa, a tela certa',
    idioma: IDIOMA,
    larguraDeCaptura: LARGURA,
    nota: 'Capturado à largura a que é mostrado. O carimbo do conteúdo é posto'
      + ' logo a seguir por scripts/frescura_do_produto.py --carimbar.',
    capturas,
  }, null, 2)}\n`, 'utf-8');
});

import { expect, test } from '@playwright/test';

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
const DESTINO = 'docs/visual/ns2/2026-09-08_depois';

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

      // ── O assunto está DENTRO da primeira viewport? ─────────────────────
      //
      // A primeira captura de 390 saiu nítida, com estado 200 e com quatro
      // mesas contadas — e não se via nenhuma: as sete pastilhas da sala
      // empilhavam-se e empurravam tudo abaixo da dobra. Contar elementos no
      // DOM não é vê-los. Mede-se a POSIÇÃO da primeira mesa.
      const caixa = await mapa.locator('.ns-mesa').first().boundingBox();
      console.log(`MESAS ${nome} primeira-mesa-y=${Math.round(caixa?.y ?? -1)} dobra=${h}`);
      expect(caixa?.y ?? Infinity,
        `a primeira mesa cai abaixo da dobra em ${nome} — a referência não mostra o seu assunto`)
        .toBeLessThan(h);
    }
  });

  /**
   * ── CONTROLO NEGATIVO da medição de cima ────────────────────────────────
   *
   * Um `y` menor do que a dobra confirma o que se espera, e o que confirma o
   * que se espera não mediu nada. Aqui a dobra é encolhida até a mesa ficar
   * mesmo abaixo dela: se a régua não acusar, ela não sabe acusar, e o verde
   * do teste anterior era um verde sobre um instrumento cego.
   */
  test('a régua da dobra sabe reprovar', async ({ page }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 390, height: 320 });
    await page.goto(ROTA, { waitUntil: 'networkidle' });
    const caixa = await page.locator('[data-teste="mapa-de-mesas"] .ns-mesa').first().boundingBox();
    const y = caixa?.y ?? -1;
    console.log(`CONTROLO dobra=320 primeira-mesa-y=${Math.round(y)} acusa=${y >= 320}`);
    expect(y, 'a 320 px de altura a mesa TEM de cair abaixo da dobra — se não cai, a régua não mede posição')
      .toBeGreaterThanOrEqual(320);
  });
});

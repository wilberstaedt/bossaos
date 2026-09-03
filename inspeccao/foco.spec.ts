import { expect, test } from '@playwright/test';

/**
 * Aceite 2 do E02: foco em diálogo e **regresso ao accionador**.
 *
 * A segunda metade é a que se perde: quem fecha um modal com o teclado e é
 * atirado para o topo da página perde o sítio onde estava. O `<dialog>` nativo
 * faz isto de graça — mas "faz de graça" é uma afirmação sobre o browser, e
 * afirmações sobre o browser verificam-se no browser.
 */
test.use({ viewport: { width: 1280, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.goto('/es-ES/interno/catalogo');
  await page.waitForLoadState('networkidle');
});

test('o diálogo prende o foco e devolve-o a quem o abriu', async ({ page }) => {
  const accionador = page.locator('#abrir-dialogo');
  await accionador.focus();
  await expect(accionador).toBeFocused();

  await accionador.press('Enter');
  const dialogo = page.locator('dialog.bo-dialogo');
  await expect(dialogo).toBeVisible();

  // O foco entrou no diálogo.
  const dentroInicial = await page.evaluate(() =>
    document.querySelector('dialog.bo-dialogo')?.contains(document.activeElement),
  );
  expect(dentroInicial, 'o foco devia estar dentro do diálogo ao abrir').toBe(true);

  // Vinte tabulações não alcançam nada por trás do modal.
  //
  // A primeira versão deste teste exigia que o foco estivesse SEMPRE dentro do
  // `<dialog>`, e falhava à segunda tabulação. Fui ver para onde ia: o ciclo do
  // Chromium é Cancelar → Guardar → <body> → Cancelar. O `<body>` é uma paragem
  // de passagem, não uma fuga — daí não se alcança nada e a tabulação seguinte
  // volta para dentro. A garantia que interessa não é "o foco nunca sai do
  // elemento", é **nenhum controlo da página por trás fica alcançável**, que é
  // o que protege quem navega por teclado de mexer no que está tapado.
  const visitados: string[] = [];
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const onde = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const dialogo = document.querySelector('dialog.bo-dialogo');
      if (!el || el === document.body || el === document.documentElement) return 'passagem';
      if (dialogo?.contains(el)) return 'dentro';
      return `FUGA: ${el.tagName.toLowerCase()}#${el.id} "${(el.textContent ?? '').trim().slice(0, 30)}"`;
    });
    visitados.push(onde);
  }
  const fugas = visitados.filter((v) => v.startsWith('FUGA'));
  expect(fugas, `o foco alcançou controlos por trás do modal:\n${fugas.join('\n')}`).toEqual([]);
  // E esteve mesmo lá dentro: um ciclo que só passasse pelo `body` não seria
  // uma armadilha de foco, seria um beco.
  expect(visitados.filter((v) => v === 'dentro').length).toBeGreaterThan(10);

  // Os botões da página por trás continuam inalcançáveis, pelo nome.
  for (const id of ['#abrir-gaveta', '#abrir-notificacao']) {
    await expect(page.locator(id)).not.toBeFocused();
  }

  // Escape fecha…
  await page.keyboard.press('Escape');
  await expect(dialogo).toBeHidden();

  // …e o foco volta ao botão que o abriu.
  await expect(accionador).toBeFocused();
});

test('a gaveta comporta-se da mesma maneira', async ({ page }) => {
  const accionador = page.locator('#abrir-gaveta');
  await accionador.focus();
  await accionador.press('Enter');

  const gaveta = page.locator('dialog.bo-gaveta');
  await expect(gaveta).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(gaveta).toBeHidden();
  await expect(accionador).toBeFocused();
});

test('CONTROLO NEGATIVO: a prova sabe distinguir preso de solto', async ({ page }) => {
  // Sem isto, o teste acima passaria também se `contains(activeElement)` fosse
  // sempre verdadeiro por engano. Aqui, com o diálogo FECHADO, o foco está
  // necessariamente fora — e a mesma medição tem de dar falso.
  const dentro = await page.evaluate(() => {
    const d = document.querySelector('dialog.bo-dialogo');
    return d ? d.contains(document.activeElement) : null;
  });
  expect(dentro, 'com o diálogo fechado o foco não pode estar lá dentro').toBe(false);
});

test('o anel de foco é visível em todos os controlos do catálogo', async ({ page }) => {
  // Percorre com Tab e exige contorno em cada paragem. Um `outline: none`
  // esquecido num componente aparece aqui, e não numa revisão de código.
  const semAnel: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const e = getComputedStyle(el);
      return {
        etiqueta: `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 24)}"`,
        contorno: e.outlineStyle !== 'none' && parseFloat(e.outlineWidth) > 0,
        sombra: e.boxShadow !== 'none',
      };
    });
    if (info && !info.contorno && !info.sombra) semAnel.push(info.etiqueta);
  }
  expect(semAnel, `sem indicação de foco:\n${semAnel.join('\n')}`).toEqual([]);
});

test('saltar para o conteúdo aparece à primeira tabulação', async ({ page }) => {
  await page.keyboard.press('Tab');
  const primeiro = await page.evaluate(() => document.activeElement?.className ?? '');
  expect(primeiro).toContain('bo-saltar');
});

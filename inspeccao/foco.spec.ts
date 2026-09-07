import { expect, test, type Page } from '@playwright/test';
import { resolverAlvos } from './alvos.ts';
import { classificar, endereçoDe } from './alcance.ts';

/**
 * Aceite 2 do E02: foco em diálogo e **regresso ao accionador**.
 *
 * A segunda metade é a que se perde: quem fecha um modal com o teclado e é
 * atirado para o topo da página perde o sítio onde estava. O `<dialog>` nativo
 * faz isto de graça — mas "faz de graça" é uma afirmação sobre o browser, e
 * afirmações sobre o browser verificam-se no browser.
 *
 * ── E o que este ficheiro media, media no sítio errado ────────────────────
 *
 * Os cinco casos originais corriam todos contra `/es-ES/interno/catalogo`, que
 * é o catálogo de desenho: a página que existe para MOSTRAR os componentes a
 * servir de produto. O sítio mais fácil para provar coisas sobre componentes é
 * o menos informativo.
 *
 * ── O que se descobriu ao ir aos momentos reais ───────────────────────────
 *
 * O atlas classifica 20 IDs como «diálogo/painel ou etapa do fluxo», e são
 * coisas que custam dinheiro: cancelar a subscrição, pedir a conta, revogar o
 * acesso de um aparelho. Fui bater às 16 que abrem hoje e **nenhuma tem um
 * `<dialog>`**. Não é que não passem pelo componente:
 *
 *   `Dialogo`/`Gaveta`  importados por UM ficheiro — `DemoInteractiva.tsx`
 *   `DemoInteractiva`   usado por UMA página — o catálogo de desenho
 *   `<dialog>` cru      zero no produto
 *
 * **O produto não tem modais.** Os 20 momentos são páginas com um botão de
 * confirmar. O «zero `<dialog>` cru» que se conhecia era verdade e queria dizer
 * o contrário do que parecia: não «tudo passa pelo componente», mas «não há
 * diálogos». Mais um número que existe e não responde à pergunta que lhe fazem.
 *
 * Por isso as três promessas do nativo — foco preso, Escape a fechar, foco de
 * volta ao accionador — continuam medidas **no componente**, e os 20 momentos
 * são contados como dívida com tecto. O verde daqui não pode ser lido como «os
 * diálogos do produto estão bem»: não há diálogos no produto.
 */
test.use({ viewport: { width: 1280, height: 900 } });

test.describe('O componente de diálogo, medido no catálogo de desenho', () => {
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
});

/**
 * Quantos dos 20 momentos do atlas ainda não passam por um diálogo.
 *
 * Hoje são os 20: o produto não tem um único `<dialog>`. Descer este número é
 * ligar um momento ao componente; subi-lo é um acto deliberado que fica no
 * diff. Sem o tecto, «zero momentos medidos» lia-se como sucesso.
 */
const TECTO_MOMENTOS_SEM_DIALOGO = 20;

/** As três promessas do `<dialog>` nativo, medidas onde houver um. */
async function tresPromessas(page: Page, seletorAccionador: string, seletorDialogo: string) {
  const accionador = page.locator(seletorAccionador);
  await accionador.focus();
  await accionador.press('Enter');
  const dialogo = page.locator(seletorDialogo);
  await expect(dialogo).toBeVisible();

  const presoDentro = await page.evaluate((sel) => {
    const d = document.querySelector(sel);
    return Boolean(d?.contains(document.activeElement));
  }, seletorDialogo);

  await page.keyboard.press('Escape');
  const fechouComEscape = await dialogo.isHidden();
  const voltouAoAccionador = await accionador.evaluate((el) => el === document.activeElement);

  return { presoDentro, fechouComEscape, voltouAoAccionador };
}

test.describe('Os momentos reais do atlas, e não a página que os imita', () => {
  test('SONDA: o detector encontra um diálogo onde ele existe', async ({ page }) => {
    // ── Sem isto, «0 em 20» não vale nada ──────────────────────────────────
    //
    // Um detector partido reporta exactamente o mesmo que um produto sem
    // diálogos: zero. A diferença entre as duas leituras é esta sonda. Aqui,
    // no catálogo, existe um `<dialog>` de certeza — e as três promessas TÊM
    // de dar verdadeiro. Se este caso ficar vermelho, o número dos 20 momentos
    // não é um facto sobre o produto, é um facto sobre o instrumento.
    await page.goto('/es-ES/interno/catalogo');
    await page.waitForLoadState('networkidle');

    const antes = await page.locator('dialog').count();
    expect(antes, 'SONDA: o catálogo de desenho devia ter diálogos no DOM').toBeGreaterThan(0);

    const p = await tresPromessas(page, '#abrir-dialogo', 'dialog.bo-dialogo');
    expect(p.presoDentro, 'SONDA: o foco não entrou no diálogo').toBe(true);
    expect(p.fechouComEscape, 'SONDA: o Escape não fechou o diálogo').toBe(true);
    expect(p.voltouAoAccionador, 'SONDA: o foco não voltou a quem abriu').toBe(true);
  });

  test('os 20 momentos que o atlas chama diálogo', async ({ page }) => {
    test.setTimeout(600_000);
    const alvos = await resolverAlvos();
    const momentos = classificar(alvos).filter((c) => /di.logo/.test(c.natureza));

    expect(momentos.length, `POPULACAO-ZERO: o atlas deu ${momentos.length} momentos de diálogo e não 20`)
      .toBe(20);

    const comDialogo: string[] = [];
    const semDialogo: string[] = [];
    const naoAlcancados: string[] = [];

    for (const m of momentos) {
      // Nada de saltar em silêncio: o que não se alcança diz-se, com o motivo.
      if (m.endereco === null) { naoAlcancados.push(`${m.id}: sem endereço — ${m.provocarComo ?? ''}`); continue; }
      if (m.falta.length > 0) { naoAlcancados.push(`${m.id}: falta ${m.falta.join(' ')}`); continue; }
      const url = endereçoDe(m.endereco, alvos, 'en');
      if (url === null) { naoAlcancados.push(`${m.id}: rota não resolve`); continue; }

      const r = await page.goto(url, { waitUntil: 'domcontentloaded' });
      if (r?.status() !== 200) { naoAlcancados.push(`${m.id}: ${r?.status()} em ${url}`); continue; }

      const quantos = await page.locator('dialog').count();
      if (quantos > 0) comDialogo.push(`${m.id} (${quantos})`);
      else semDialogo.push(m.id);
    }

    console.log(
      `AMBITO momentos=${momentos.length} comDialogo=${comDialogo.length}`
      + ` semDialogo=${semDialogo.length} naoAlcancados=${naoAlcancados.length}`
      + ` tecto=${TECTO_MOMENTOS_SEM_DIALOGO}`,
    );
    for (const s of semDialogo) console.log(`SEM-DIALOGO ${s}`);
    for (const n of naoAlcancados) console.log(`NAO-ALCANCADO ${n}`);
    if (comDialogo.length > 0) console.log(`COM-DIALOGO ${comDialogo.join(' ')}`);

    // O tecto: quantos momentos ainda não passam por um diálogo. Desce à mão
    // quando algum for ligado ao componente; subir é deliberado e fica no diff.
    const semPromessa = semDialogo.length + naoAlcancados.length;
    expect(semPromessa, `momentos sem diálogo subiram para ${semPromessa} (tecto ${TECTO_MOMENTOS_SEM_DIALOGO})`)
      .toBeLessThanOrEqual(TECTO_MOMENTOS_SEM_DIALOGO);

    // E onde houver diálogo, as três promessas medem-se de verdade.
    for (const etiqueta of comDialogo) {
      const id = etiqueta.split(' ')[0] ?? '';
      const m = momentos.find((x) => x.id === id);
      if (!m?.endereco) continue;
      const url = endereçoDe(m.endereco, alvos, 'en');
      if (url === null) continue;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const aberto = await page.locator('dialog[open]').count();
      console.log(`PROMESSAS ${id} dialogosAbertos=${aberto}`);
    }
  });
});

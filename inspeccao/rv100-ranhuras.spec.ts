import { test, expect } from '@playwright/test';

/**
 * As ranhuras abençoadas, medidas em TODAS as composições do produto.
 *
 * ── Porque é que o tipo não chega ────────────────────────────────────────
 *
 * A união `Ranhura` impede que alguém **declare** uma ranhura sem variante. Não
 * impede que a caixa saia diferente da declaração — que foi exactamente o que o
 * bloco 4 mediu: o `sizes` prometia 390 e a caixa tinha 477. O tipo fecha a
 * porta da frente; isto mede a janela.
 *
 * Mede-se por composição, em cada página que tenha alguma:
 *
 *   nitidez       mostrado ÷ ficheiro servido — nunca acima de 1,00
 *   legibilidade  14 px × (mostrado ÷ fonte original) — nunca abaixo de 11
 *
 * ── E o que fica DECLARADO em vez de escondido ───────────────────────────
 *
 * O herói da landing e as três largas da `/product` usam `ranhuraPorDecidir` e
 * **não cabem** nas duas abençoadas: encolher o herói de 720 para 477 tira-lhe a
 * imagem grande, e mantê-lo exige capturar `sala` a 834. As duas opções são
 * legíveis, portanto a régua não decide — é desenho, do Matheus e da Nathalia.
 *
 * Ficam VERMELHAS e nomeadas, que foi a ordem. A falha desta prova é a
 * declaração: enquanto a decisão não vier, isto acusa e diz exactamente quais.
 */

const PAGINAS = ['/es-ES', '/es-ES/product', '/es-ES/getting-started',
  '/es-ES/interno/ns2'] as const;

interface Medida {
  pagina: string; indice: number; fonte: number; servido: number; mostrada: number;
  declarada: string | null;
}

test('todas as composições, nas ranhuras que declaram', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize({ width: 1280, height: 900 });

  const medidas: Medida[] = [];

  for (const caminho of PAGINAS) {
    const resposta = await page.goto(caminho, { waitUntil: 'networkidle' });
    expect(resposta?.status(), `POPULACAO-ZERO: ${caminho}`).toBeLessThan(400);

    // Cada painel escondido tem caixa zero: só se mede o que está no ecrã. Os
    // separadores dos papéis já são medidos pela prova própria deles.
    const n = await page.locator('img.bo-mkt__composicao:visible').count();
    for (let i = 0; i < n; i += 1) {
      // Traz a imagem ao ecrã e espera que ela chegue. Sem isto, uma composição
      // abaixo da dobra dava `servido=0` e saía como NÃO MEDI — que é a resposta
      // honesta, mas a falha era da medição e não do produto.
      await page.locator('img.bo-mkt__composicao:visible').nth(i)
        .scrollIntoViewIfNeeded().catch(() => undefined);
      await page.waitForFunction((indice) => {
        const imgs = [...document.querySelectorAll('img.bo-mkt__composicao')]
          .filter((e) => (e as HTMLElement).offsetParent !== null) as HTMLImageElement[];
        const img = imgs[indice];
        return !!img && img.complete && img.naturalWidth > 0;
      }, i, { timeout: 20_000 }).catch(() => undefined);

      const m = await page.evaluate(async (indice) => {
        const imgs = [...document.querySelectorAll('img.bo-mkt__composicao')]
          .filter((e) => (e as HTMLElement).offsetParent !== null) as HTMLImageElement[];
        const img = imgs[indice];
        if (!img) return null;
        const servido = await fetch(img.currentSrc).then((r) => r.blob())
          .then((b) => createImageBitmap(b)).then((bm) => bm.width).catch(() => 0);
        return {
          fonte: Number(img.getAttribute('width') ?? 0),
          servido,
          mostrada: Math.round(img.getBoundingClientRect().width),
          declarada: getComputedStyle(img).getPropertyValue('--bo-ranhura').trim() || null,
        };
      }, i);
      if (m) medidas.push({ pagina: caminho, indice: i + 1, ...m });
    }
  }

  const abencoadas: string[] = [];
  const porDecidir: string[] = [];

  for (const m of medidas) {
    if (!m.fonte || !m.servido || !m.mostrada) {
      abencoadas.push(`${m.pagina} #${m.indice}: NÃO MEDI`
        + ` (fonte=${m.fonte} servido=${m.servido} mostrada=${m.mostrada})`);
      continue;
    }
    const nitidez = m.mostrada / m.servido;
    const efectivos = 14 * (m.mostrada / m.fonte);
    const linha = `${m.pagina} #${m.indice}: ranhura=${m.declarada ?? 'POR DECIDIR'}`
      + ` fonte=${m.fonte} servido=${m.servido} mostrada=${m.mostrada}`
      + ` nitidez=${nitidez.toFixed(3)} px_efectivos=${efectivos.toFixed(1)}`;
    console.log(`RANHURA ${linha}`);

    const problemas: string[] = [];
    if (nitidez > 1.0001) problemas.push(`AMPLIADO ${nitidez.toFixed(2)}×`);
    if (efectivos < 11) problemas.push(`ILEGÍVEL ${efectivos.toFixed(1)}px`);
    if (problemas.length === 0) continue;

    // A caixa TEM de bater com a ranhura declarada. Um sítio que declara 477 e
    // pinta 640 volta a ser a declaração a mentir, e o tipo não apanha isso.
    if (m.declarada === null) porDecidir.push(`${linha} — ${problemas.join(', ')}`);
    else abencoadas.push(`${linha} — ${problemas.join(', ')}`);
  }

  console.log(`AMBITO composicoes=${medidas.length}`
    + ` abencoadas_com_defeito=${abencoadas.length} por_decidir=${porDecidir.length}`);

  expect(medidas.length, 'POPULACAO-ZERO: nenhuma composição foi medida')
    .toBeGreaterThan(0);
  expect(abencoadas, `ranhuras ABENÇOADAS a falhar — estas são defeito:\n${
    abencoadas.join('\n')}`).toEqual([]);
  expect(porDecidir, 'POR DECIDIR, e é desenho e não defeito — o herói da landing e'
    + ' as largas da /product não cabem nas duas ranhuras abençoadas.\n'
    + 'Encolher o herói para 477 tira-lhe a imagem grande; mantê-lo exige capturar\n'
    + `\`sala\` a 834. Decisão do Matheus e da Nathalia:\n${porDecidir.join('\n')}`)
    .toEqual([]);
});

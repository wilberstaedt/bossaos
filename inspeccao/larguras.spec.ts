import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, PAGINAS,
  alvosPequenos, elementosForaDoEcra, indicadoresDeEstadoComPoucoContraste,
  textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * Aceite 1 do E02: 360, 390, 768, 1280 e 1440 px, sem conteúdo nem acção
 * inacessível. Seis páginas × cinco larguras, em espanhol; os outros dois
 * idiomas correm à parte, com o conteúdo longo.
 *
 * ── O QUE ESTE FICHEIRO COBRE, E O QUE NÃO COBRE ───────────────────────────
 *
 * Cobre **SEIS páginas**: as CASCAS partilhadas — `inicio`, `catalogo` e as
 * quatro estruturas (admin, pública, staff, kds). É onde a grelha, a navegação
 * e os alvos de toque vivem, e por isso um transbordo aqui aparece em todas as
 * telas que assentam nelas.
 *
 * **NÃO cobre as 332 telas validadas do produto.** Cada etapa mede as suas
 * próprias larguras dentro da sua própria prova de navegador — o E27 mediu
 * catorze, o E28 onze, o E31 onze — e é aí que está a cobertura real. A
 * `validar-movel-real.sh` cruza a alegação «móvel medido» de cada tela com o
 * spec que a mede mesmo.
 *
 * ── Porque é que isto está escrito aqui ────────────────────────────────────
 *
 * Porque o nome do ficheiro e a lista de seis caminhos convidam à conclusão
 * errada: **um instrumento que parece cobrir tudo e cobre seis é pior do que um
 * buraco**, porque quem o lê para decidir se o móvel está medido decide mal.
 *
 * Esteve na dívida 9 do E34 com a proposta de o fazer descobrir as telas do
 * `coverage.csv`. **Não é a correcção certa**: duplicaria o que cada etapa já
 * mede, 332 telas × 5 larguras, para responder à mesma pergunta duas vezes. O
 * que estava errado não era a cobertura — era a alegação.
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

/**
 * Aceite 2, a metade que faltava: contraste de INDICADORES DE ESTADO.
 *
 * A verificação de texto não vê um sublinhado de 3 px. Foi assim que o separador
 * activo passou o E02 inteiro a 2,77:1 — encontrado à mão, na revisão. Agora é
 * medido a cada corrida, na página construída.
 */
test.describe('indicadores de estado (WCAG 1.4.11)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  for (const pagina of PAGINAS) {
    test(`${pagina.nome} — nenhum indicador abaixo de 3:1`, async ({ page }) => {
      await page.goto(`/es-ES${pagina.caminho}`);
      await page.waitForLoadState('networkidle');
      const maus = await indicadoresDeEstadoComPoucoContraste(page);
      expect(maus, `indicadores com pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    });
  }

  test('o separador activo tem um segundo sinal, que não é cor', async ({ page }) => {
    await page.goto('/es-ES/interno/catalogo');
    await page.waitForLoadState('networkidle');
    const activo = page.locator('[role="tab"][aria-selected="true"]').first();
    const inactivo = page.locator('[role="tab"][aria-selected="false"]').first();

    const peso = async (l: typeof activo) =>
      Number(await l.evaluate((el) => getComputedStyle(el).fontWeight));

    // Uma pista só-cor entre dois tons escuros não resgata um indicador. O peso
    // do rótulo é o sinal que sobrevive a quem não distingue as duas cores.
    expect(await peso(activo)).toBeGreaterThan(await peso(inactivo));
  });
});

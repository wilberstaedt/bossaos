import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * As 9 telas do E30, medidas no navegador.
 *
 * ── O aceite que a régua põe em primeiro lugar ────────────────────────────
 *
 * «Ausência não é zero.» A semeadura põe uma unidade **sem dados nenhuns** e
 * outra com dados, lado a lado — e o caso exige que se escrevam **diferente**.
 *
 * Um relatório que mostra zero para as duas coisas é reprovação directa, por
 * mais bonito que esteja: quem lê `0 €` fecha o turno de almoço.
 */

const ORG = '/es-ES/app/marina-oropesa';
const BASE = `${ORG}/puerto/reports`;
const TOQUE = 44;

interface Tela { id: string; caminho: string }

const TELAS: Tela[] = [
  { id: 'REP-016', caminho: ORG },
  { id: 'REP-010', caminho: `${BASE}/trabalho` },
  { id: 'REP-011', caminho: `${BASE}/pagamentos` },
  { id: 'REP-012', caminho: `${BASE}/armazem` },
  { id: 'REP-013', caminho: `${BASE}/custos` },
  { id: 'REP-014', caminho: `${BASE}/recorrencia` },
  { id: 'REP-015', caminho: `${BASE}/campanhas` },
  { id: 'REP-017', caminho: `${BASE}/medida` },
  { id: 'CAT-028', caminho: `${ORG}/catalogo/duplicar` },
];

const QUANTAS = 9;

function colunas(linha: string): string[] {
  const saida: string[] = [];
  let campo = '';
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (c === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') { campo += '"'; i += 1; }
      else dentroDeAspas = !dentroDeAspas;
    } else if (c === ',' && !dentroDeAspas) { saida.push(campo); campo = ''; }
    else campo += c;
  }
  saida.push(campo);
  return saida;
}

async function visitar(pagina: import('@playwright/test').Page, tela: Tela, idioma: string) {
  const caminho = tela.caminho.replace('/es-ES/', `/${idioma}/`);
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${tela.id} · ${caminho} respondeu ${resposta?.status()}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  await expect(pagina.locator(`[data-tela="${tela.id}"]`).first(),
    `${tela.id} · o marcador não apareceu`).toBeVisible();
}

test('a população é 9 telas, e 9 ids DISTINTOS', () => {
  expect(TELAS.length).toBe(QUANTAS);
  expect(new Set(TELAS.map((t) => t.id)).size).toBe(QUANTAS);
});

test('e são as 9 que a MATRIZ tem no E30', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const linhas = csv.split('\n').slice(1).map(colunas).filter((c) => c[6] === 'E30');
  expect(linhas.length, 'a matriz não tem 9 telas no E30').toBe(QUANTAS);
  const DECLARADAS = new Set(['implementado aguardando validação', 'validado']);
  expect(linhas.filter((c) => DECLARADAS.has(c[16] ?? '')).length).toBe(QUANTAS);
  expect(TELAS.map((t) => t.id).sort())
    .toEqual(linhas.map((c) => c[0]?.trim() ?? '').sort());
});

test.describe('AUSÊNCIA e ZERO escrevem-se diferente, lado a lado', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('há unidades com dados e unidades sem, e distinguem-se', async ({ page }) => {
    // ── O par que a régua exige, no ecrã ────────────────────────────────
    await page.goto(ORG);
    const quantas = Number(await page.locator('[data-teste="quantas-unidades"]').innerText());
    expect(quantas, 'não havia unidade nenhuma').toBeGreaterThan(1);
    const semDados = Number(await page.locator('[data-teste="quantas-sem-dados"]').innerText());
    expect(semDados, 'nenhuma unidade sem dados: o caso mau não está semeado')
      .toBeGreaterThan(0);
    expect(semDados, 'TODAS as unidades estão sem dados: não há par para comparar')
      .toBeLessThan(quantas);

    const comMedida = await page.locator('[data-teste="medido"]').count();
    const semMedida = await page.locator('[data-teste="sem-dados"]').count();
    expect(comMedida, 'nenhuma unidade medida no ecrã').toBeGreaterThan(0);
    expect(semMedida,
      'a unidade sem dados não aparece marcada como tal: escreve-se igual a zero')
      .toBeGreaterThan(0);
  });

  test('e o ecrã explica a diferença por PALAVRAS', async ({ page }) => {
    await page.goto(ORG);
    const aviso = await page.locator('[data-teste="ausencia-nao-e-zero"]').innerText();
    // Mede-se a palavra, e não o comprimento — a lição do E24.
    expect(aviso.toLowerCase(), 'o ecrã não explica que ausência não é zero')
      .toContain('nadie sabe');
    await expect(page.locator('[data-teste="sem-dados-explica"]')).toBeVisible();
    await expect(page.locator('[data-teste="zero-explica"]')).toBeVisible();
  });

  test('e a unidade sem dados NÃO entra na contagem do total', async ({ page }) => {
    await page.goto(ORG);
    const totalLinhas = Number(await page.locator('[data-teste="total-linhas"]').innerText());
    const porUnidade = (await page.locator('[data-teste="linhas"]').allInnerTexts())
      .map(Number).reduce((a, b) => a + b, 0);
    expect(totalLinhas,
      'o total conta linhas que nenhuma unidade declarou: a vazia entrou como zero')
      .toBe(porUnidade);
  });
});

test.describe('o denominador viaja com o numerador', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a média do total NÃO é a média das médias das unidades', async ({ page }) => {
    // ── O controlo cujo critério é ter de MUDAR o número ────────────────
    //
    // A semeadura tem uma unidade com muitas linhas pequenas e outra com uma
    // linha grande. Se estes dois números fossem iguais, o caso não estaria a
    // medir nada — e a régua manda corrigir a semente, não aceitar a prova.
    await page.goto(ORG);
    const medias = (await page.locator('[data-teste="media"]').allInnerTexts()).map(Number);
    expect(medias.length, 'menos de duas unidades medidas: não há o que ponderar')
      .toBeGreaterThan(1);
    const mediaDeMedias = Math.round(medias.reduce((a, b) => a + b, 0) / medias.length);
    const ponderada = Number(await page.locator('[data-teste="total-media"]').innerText());
    expect(ponderada,
      'a ponderada e a média de médias dão o mesmo: os dados de prova não têm o caso')
      .not.toBe(mediaDeMedias);
  });

  test('e o ecrã diz por palavras porque é que a média se calcula no fim',
    async ({ page }) => {
      await page.goto(ORG);
      const texto = await page.locator('[data-teste="denominador"]').innerText();
      expect(texto.toLowerCase()).toContain('denominadores');
    });
});

test.describe('o período resolve-se por unidade', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('há duas unidades em fusos DIFERENTES no ecrã', async ({ page }) => {
    await page.goto(ORG);
    const fusos = await page.locator('[data-teste="fuso"]').allInnerTexts();
    expect(new Set(fusos).size,
      'todas as unidades no mesmo fuso: o caso mau não está semeado').toBeGreaterThan(1);
    await expect(page.locator('[data-teste="por-unidade"]')).toBeVisible();
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · analítica`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 9 telas não transbordam nem escondem acções', async ({ page }) => {
      test.setTimeout(180_000);
      for (const tela of TELAS) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('analítica a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    test.setTimeout(180_000);
    for (const tela of TELAS) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    test.setTimeout(180_000);
    for (const tela of TELAS) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('analítica nos três idiomas', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      test.setTimeout(180_000);
      for (const tela of TELAS) {
        await visitar(page, tela, idioma);
        expect(await transbordaNaHorizontal(page), `${tela.id} · ${idioma} transborda`).toBe(0);
      }
    });
  }
});

test.describe('o resto do que a régua manda o ecrã dizer', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('cada relatório declara os FILTROS e a DEFINIÇÃO sem sair da tela',
    async ({ page }) => {
      for (const tela of TELAS.filter((t) => t.id.startsWith('REP-01') && t.id !== 'REP-016')) {
        await page.goto(tela.caminho);
        await expect(page.locator('[data-teste="filtros"]'),
          `${tela.id} não diz que filtros estão postos`).toBeVisible();
        await expect(page.locator('[data-teste="definicao"]'),
          `${tela.id} não diz qual é a definição`).toBeVisible();
      }
    });

  test('o informe à medida exporta EXACTAMENTE o que mostra', async ({ page }) => {
    await page.goto(`${BASE}/medida`);
    const noAgregado = await page.locator('[data-teste="linhas-do-agregado"]').innerText();
    const exportadas = await page.locator('[data-teste="quantas-linhas-exportadas"]').innerText();
    expect(exportadas,
      'a exportação não tem as mesmas linhas que o ecrã: ela vai defender números que não viu')
      .toBe(noAgregado);
    await expect(page.locator('[data-teste="exporta-o-que-ve"]')).toBeVisible();
  });

  test('e de cada linha exportada desce-se à transacção', async ({ page }) => {
    await page.goto(`${BASE}/medida`);
    const origens = await page.locator('[data-teste="exportacao"] [data-teste="origem"]')
      .allInnerTexts();
    expect(origens.length, 'a exportação está vazia: não há o que verificar')
      .toBeGreaterThan(0);
    expect(origens.every((o) => o.trim() !== '—'),
      'há linhas exportadas que não dizem de onde vieram').toBe(true);
  });

  test('a clonagem mostra a diferença ANTES de aplicar, e não copia clientes',
    async ({ page }) => {
      await page.goto(`${ORG}/catalogo/duplicar`);
      await expect(page.locator('[data-teste="clona-configuracao"]')).toBeVisible();
      for (const nome of ['clientes', 'pedidos', 'customers', 'orders']) {
        await expect(page.locator(`input[name="${nome}"], select[name="${nome}"]`),
          `a clonagem oferece copiar ${nome}`).toHaveCount(0);
      }
    });
});

/** A porta: e depois desta etapa o menu de gestão não tem entradas mortas. */
test.describe('as telas do E30 têm porta, e o menu não tem entradas mortas', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o menu de gestão não tem NENHUMA entrada por construir', async ({ page }) => {
    // O `início` era a última. Depois do E30 o controlo de portas passa a ter o
    // produto inteiro do lado de dentro.
    await page.goto(`${ORG}/catalogo`);
    const porConstruir = await page.locator('[data-por-construir]').count();
    expect(porConstruir,
      'ainda há entradas do menu que não levam a lado nenhum').toBe(0);
  });

  test('chega-se ao início por cliques, e ele mostra a comparação', async ({ page }) => {
    await page.goto(`${ORG}/catalogo`);
    const entrada = page.getByRole('link', { name: /inicio|início|home/i }).first();
    expect(await entrada.count(), 'não há entrada de início no menu').toBeGreaterThan(0);
    expect(await entrada.getAttribute('href'), 'a entrada do início é um `#`').not.toBe('#');
    await entrada.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="REP-016"]'),
      'o início não leva à comparação entre unidades').toBeVisible();
  });

  test('e do módulo de relatórios chega-se às sete telas novas', async ({ page }) => {
    const seccoes: [string, string][] = [
      ['trabalho', 'REP-010'], ['pagamentos', 'REP-011'], ['armazem', 'REP-012'],
      ['custos', 'REP-013'], ['recorrencia', 'REP-014'], ['campanhas', 'REP-015'],
      ['medida', 'REP-017'],
    ];
    for (const [seccao, tela] of seccoes) {
      await page.goto(BASE);
      const ligacao = page.locator(`[data-seccao="${seccao}"]`);
      expect(await ligacao.count(),
        `a secção ${seccao} não tem ligação nenhuma: a ${tela} ficou sem porta`)
        .toBeGreaterThan(0);
      await ligacao.first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`[data-tela="${tela}"]`),
        `a secção ${seccao} não leva à ${tela}`).toBeVisible();
    }
  });
});

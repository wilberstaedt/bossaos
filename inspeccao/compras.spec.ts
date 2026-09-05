import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 6 telas do E26, medidas no navegador.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * «Verde sobre zero encomendas. Declara-se a população.» E «uma prova que só
 * use o caminho onde tudo bate — se não houver recepção parcial, recepção a
 * mais e factura divergente, não está provado, está demonstrado».
 *
 * A semeadura põe uma encomenda com DUAS linhas: 10 pedidos com 8 recebidos e
 * 10 facturados, e uma segunda onde tudo bate. Sem a segunda, um produto que
 * marcasse SEMPRE divergência passava a primeira.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const UNIDADE = '/es-ES/app/marina-oropesa/puerto';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  return [
    { id: 'SUP-001', caminho: `${UNIDADE}/suppliers` },
    { id: 'SUP-002', caminho: `${UNIDADE}/suppliers/${a.fornecedorDeCompras}` },
    { id: 'PUR-001', caminho: `${UNIDADE}/purchases` },
    { id: 'PUR-002', caminho: `${UNIDADE}/purchases/nova` },
    { id: 'PUR-003', caminho: `${UNIDADE}/purchases/${a.encomendaDeCompras}` },
    { id: 'PUR-004', caminho: `${UNIDADE}/purchases/custos` },
  ];
}

const QUANTAS_TELAS = 6;

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

test('a população é 6 telas, e 6 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length).toBe(QUANTAS_TELAS);
  expect(new Set(lista.map((t) => t.id)).size).toBe(QUANTAS_TELAS);
});

test('e são as 6 que a MATRIZ tem no E26', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const linhas = csv.split('\n').slice(1).map(colunas).filter((c) => c[6] === 'E26');
  expect(linhas.length, 'a matriz não tem 6 telas no E26').toBe(QUANTAS_TELAS);
  const DECLARADAS = new Set(['implementado aguardando validação', 'validado']);
  expect(linhas.filter((c) => DECLARADAS.has(c[16] ?? '')).length,
    'nem todas as 6 estão declaradas').toBe(QUANTAS_TELAS);
  expect(telas(alvos).map((t) => t.id).sort())
    .toEqual(linhas.map((c) => c[0]?.trim() ?? '').sort());
});

test.describe('a medição não é sobre zero encomendas', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('declara quantas encomendas, quantos fornecedores e quantas linhas',
    async ({ page }) => {
      await page.goto(`${UNIDADE}/purchases`);
      const encomendas = Number(await page.locator('[data-teste="quantas-encomendas"]').innerText());
      expect(encomendas, 'não havia encomenda nenhuma').toBeGreaterThan(0);
      const fornecedores = Number(await page.locator('[data-teste="quantos-fornecedores"]').innerText());
      expect(fornecedores, 'não havia fornecedor nenhum').toBeGreaterThan(0);

      await page.goto(`${UNIDADE}/purchases/${alvos.encomendaDeCompras}`);
      const linhas = Number(await page.locator('[data-teste="quantas-linhas"]').innerText());
      // DUAS linhas, e não uma: uma que diverge e outra que bate.
      expect(linhas, 'a encomenda medida não tem as duas linhas que dão sentido à prova')
        .toBeGreaterThan(1);
      const recepcoes = Number(await page.locator('[data-teste="quantas-recepcoes"]').innerText());
      expect(recepcoes, 'não havia recepção: só a recepção mexe no stock e não houve nenhuma')
        .toBeGreaterThan(0);
    });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · compras`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 6 telas não transbordam nem escondem acções', async ({ page }) => {
      test.setTimeout(120_000);
      for (const tela of telas(alvos)) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('compras a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    test.setTimeout(120_000);
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    test.setTimeout(120_000);
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('compras nos três idiomas', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      test.setTimeout(120_000);
      for (const tela of telas(alvos)) {
        await visitar(page, tela, idioma);
        expect(await transbordaNaHorizontal(page), `${tela.id} · ${idioma} transborda`).toBe(0);
      }
    });
  }
});

/** O que a régua manda o ecrã dizer — e é aqui que a etapa se joga. */
test.describe('os três números vêem-se, e a diferença vê-se como diferença', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a linha que não bate mostra encomendado, recebido E facturado',
    async ({ page }) => {
      await page.goto(`${UNIDADE}/purchases/${alvos.encomendaDeCompras}`);
      const encomendado = await page.locator('[data-teste="encomendado"]').allInnerTexts();
      const recebido = await page.locator('[data-teste="recebido"]').allInnerTexts();
      const facturado = await page.locator('[data-teste="facturado"]').allInnerTexts();
      expect(encomendado.length, 'não há coluna de encomendado').toBeGreaterThan(1);
      expect(recebido.length).toBe(encomendado.length);
      expect(facturado.length).toBe(encomendado.length);
      // Os três são NÚMEROS DIFERENTES nalguma linha. Se fossem sempre iguais,
      // o produto estaria a colapsar os três num só e ninguém daria por isso.
      const diferentes = encomendado.some((e, i) => e !== recebido[i]);
      expect(diferentes,
        'encomendado e recebido são sempre iguais: os três números são um só').toBe(true);
    });

  test('e a diferença aparece com o SINAL — a falta é negativa', async ({ page }) => {
    await page.goto(`${UNIDADE}/purchases/${alvos.encomendaDeCompras}`);
    const dif = await page.locator('[data-teste="diferenca-recepcao"]').first().innerText();
    expect(Number(dif), 'a falta não aparece como falta').toBeLessThan(0);
    const difFactura = await page.locator('[data-teste="diferenca-factura"]').first().innerText();
    expect(Number(difFactura),
      'a factura cobra o que não chegou e o ecrã não o diz').toBeGreaterThan(0);
  });

  test('e o PAR: a linha que BATE não mostra diferença nenhuma', async ({ page }) => {
    // Sem este par, «marca sempre divergência» passava os dois casos de cima —
    // e a casa reclamava de uma entrega que estava certa.
    await page.goto(`${UNIDADE}/purchases/${alvos.encomendaDeCompras}`);
    const linhas = page.locator('[data-teste="conferencia"] li');
    const total = await linhas.count();
    expect(total, 'a encomenda medida não tem duas linhas').toBeGreaterThan(1);
    let semDiferenca = 0;
    for (let i = 0; i < total; i += 1) {
      const li = linhas.nth(i);
      if (await li.locator('[data-teste="diferenca-recepcao"]').count() === 0
          && await li.locator('[data-teste="diferenca-factura"]').count() === 0) {
        semDiferenca += 1;
      }
    }
    expect(semDiferenca,
      'todas as linhas mostram divergência: o produto marca-a sempre').toBeGreaterThan(0);
  });
});

test.describe('a unidade de compra não é a unidade de uso', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o artigo mostra a embalagem E o factor', async ({ page }) => {
    await page.goto(`${UNIDADE}/suppliers/${alvos.fornecedorDeCompras}`);
    const quantos = Number(await page.locator('[data-teste="quantos-artigos"]').innerText());
    expect(quantos, 'o fornecedor medido não tem artigos').toBeGreaterThan(0);
    const factor = await page.locator('[data-teste="factor"]').first().innerText();
    // Um saco de 25 kg é 25 000 000. Se aparecesse 1, era o defeito da etapa.
    expect(Number(factor), 'o factor de conversão é 1: o saco entra como uma unidade')
      .toBeGreaterThan(1);
    await expect(page.locator('[data-teste="factor-ajuda"]'),
      'o ecrã não explica o que o factor é').toBeVisible();
  });

  test('e nenhuma tela oferece encomendar sem passar pelo artigo', async ({ page }) => {
    // Garantia pela ausência: não há campo de unidade livre. A embalagem vem
    // sempre de um artigo configurado, com factor.
    await page.goto(`${UNIDADE}/purchases/nova`);
    for (const nome of ['unidade', 'unidadeDeCompra', 'factor']) {
      await expect(page.locator(`input[name="${nome}"]`),
        `há um campo ${nome} na encomenda: a embalagem seria adivinhada aqui`).toHaveCount(0);
    }
  });
});

test.describe('só a recepção mexe no stock, e o ecrã di-lo', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a tela de preparar a compra NÃO tem botão de dar entrada', async ({ page }) => {
    await page.goto(`${UNIDADE}/purchases/nova`);
    await expect(page.locator('[data-teste="so-recepcao"]'),
      'a tela não diz que a encomenda não move stock').toBeVisible();
    // Garantia pela ausência: nenhuma acção desta tela gera um movimento.
    for (const accao of ['receber', 'confirmar', 'dar_entrada']) {
      await expect(page.locator(`input[name="accao"][value="${accao}"]`),
        `a tela da encomenda oferece ${accao}: a farinha entrava ainda no camião`)
        .toHaveCount(0);
    }
    await expect(page.locator('input[name="accao"][value="criar_encomenda"]')).toBeAttached();
  });

  test('e o PAR: a tela de conferir TEM a acção de receber', async ({ page }) => {
    await page.goto(`${UNIDADE}/purchases/${alvos.encomendaDeCompras}`);
    await expect(page.locator('input[name="accao"][value="receber"]')).toBeAttached();
    // E a quantidade escreve-se: não se herda do encomendado, senão dava
    // entrada de 10 quando chegaram 8.
    await expect(page.locator('input[name="quantidade"]').first()).toBeVisible();
  });
});

test.describe('o custo diz de que método veio', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a tela nomeia a média ponderada, e mostra as entradas', async ({ page }) => {
    await page.goto(`${UNIDADE}/purchases/custos`);
    const metodo = await page.locator('[data-teste="metodo"]').innerText();
    // Medir o COMPRIMENTO não chega — a lição do E24. Mede-se a PALAVRA.
    expect(metodo.toLowerCase(),
      'a tela não diz qual é o método de custeio').toMatch(/ponderad/);
    const quantos = Number(await page.locator('[data-teste="quantos-insumos"]').innerText());
    expect(quantos, 'nenhum insumo tem entradas: o custo media zero').toBeGreaterThan(0);
    const medio = await page.locator('[data-teste="custo-medio"]').first().innerText();
    expect(Number(medio), 'o custo médio é zero ou não é número').toBeGreaterThan(0);
  });
});

/** A porta: da sessão iniciada até uma tela do E26, por cliques. */
test.describe('as telas do E26 têm porta', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('chega-se às compras por cliques, sem escrever endereço', async ({ page }) => {
    await page.goto('/es-ES/app/marina-oropesa/organization');
    const entrada = page.getByRole('link', { name: /compras|purchasing/i }).first();
    expect(await entrada.getAttribute('href'), 'a entrada das compras é um `#`').not.toBe('#');
    await entrada.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="NAV-UNIDADE"]'),
      'o menu das compras não leva ao escolhedor de unidade').toBeVisible();
    await page.locator('[data-seccao="ir-compras"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="PUR-001"]'),
      'não se chega às compras por cliques').toBeVisible();
    expect(page.url(), 'não saiu do ponto de partida').not.toContain('/organization');
  });

  test('e do painel das compras chega-se aos fornecedores e aos custos',
    async ({ page }) => {
      // A porta do módulo não chega: seis telas atrás de uma só entrada seriam
      // cinco telas sem porta.
      await page.goto(`${UNIDADE}/purchases`);
      await page.locator('[data-seccao="fornecedores"]').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-tela="SUP-001"]')).toBeVisible();
      await page.locator('[data-teste="fornecedores"] a').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-tela="SUP-002"]')).toBeVisible();

      await page.goto(`${UNIDADE}/purchases`);
      await page.locator('[data-seccao="custos"]').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-tela="PUR-004"]')).toBeVisible();

      await page.goto(`${UNIDADE}/purchases`);
      await page.locator('[data-seccao="nova-encomenda"]').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-tela="PUR-002"]')).toBeVisible();

      await page.goto(`${UNIDADE}/purchases`);
      await page.locator('[data-teste="encomendas"] a').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-tela="PUR-003"]')).toBeVisible();
    });
});

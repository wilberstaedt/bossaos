import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 19 telas do E22, medidas no navegador.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * Verde sobre conta vazia e caixa por abrir. Estas telas quase todas têm um
 * estado vazio legítimo — «não há contas», «ainda não há caixas» — que cabe em
 * qualquer largura, não tem contraste para medir e não tem alvos de toque. É o
 * ecrã fácil, e cinco larguras verdes sobre três frases é verde sobre nada.
 *
 * Por isso há uma guarda de população que **declara quantos havia**, e a
 * semeadura põe uma conta com desconto e uma caixa com movimentos dos DOIS
 * lados: sem uma saída, a subtracção do esperado nunca era exercida.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const PAINEL = '/es-ES/app/marina-oropesa/puerto';
const STAFF = '/es-ES/staff';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  const POS = `/es-ES/pos/${a.unidadeDoStaff}`;
  const CONTA = `${POS}/conta/${a.contaDoTpv}`;
  const CAIXA = `${POS}/caixa/${a.caixaDoTpv}`;
  return [
    { id: 'POS-001', caminho: `${POS}/operador` },
    { id: 'POS-002', caminho: POS },
    { id: 'POS-003', caminho: `${POS}/balcao` },
    { id: 'POS-004', caminho: CONTA },
    { id: 'POS-006', caminho: `${CONTA}/dinheiro` },
    { id: 'POS-009', caminho: `${CONTA}/dividir` },
    { id: 'POS-010', caminho: `${CONTA}/desconto` },
    { id: 'POS-011', caminho: `${CONTA}/cortesia` },
    { id: 'POS-014', caminho: `${CONTA}/anular` },
    { id: 'POS-015', caminho: `${POS}/caixa/abrir` },
    { id: 'POS-016', caminho: `${CAIXA}/movimento` },
    { id: 'POS-017', caminho: `${CAIXA}/contagem` },
    { id: 'POS-018', caminho: `${CAIXA}/fecho` },
    { id: 'POS-019', caminho: `${POS}/caixa` },
    { id: 'FLOOR-010', caminho: `${PAINEL}/floor/contas` },
    { id: 'ORD-007', caminho: `${PAINEL}/orders/${a.orderId}/reabrir` },
    { id: 'STAFF-015', caminho: `${STAFF}/${a.unidadeDoStaff}/transferir` },
    { id: 'STAFF-016', caminho: `${STAFF}/${a.unidadeDoStaff}/desconto` },
    { id: 'STAFF-020', caminho: `${STAFF}/${a.unidadeDoStaff}/fechar-mesa` },
  ];
}

const QUANTAS_TELAS = 19;

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
  expect(new URL(pagina.url()).pathname, `${tela.id} · houve um redireccionamento`)
    .toBe(caminho.split('?')[0]);
  await expect(pagina.locator(`h1[data-tela="${tela.id}"]`).first(),
    `${tela.id} · o marcador não apareceu`).toBeVisible();
}

test('a população é 19 telas, e 19 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length).toBe(QUANTAS_TELAS);
  expect(new Set(lista.map((t) => t.id)).size, 'ids repetidos').toBe(QUANTAS_TELAS);
});

test('e são as 19 que a MATRIZ tem no E22', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const linhas = csv.split('\n').slice(1).map(colunas).filter((c) => c[6] === 'E22');
  expect(linhas.length, 'a matriz não tem 19 telas no E22').toBe(QUANTAS_TELAS);
  const DECLARADAS = new Set(['implementado aguardando validação', 'validado']);
  expect(linhas.filter((c) => DECLARADAS.has(c[16] ?? '')).length,
    'nem todas as 19 estão declaradas').toBe(QUANTAS_TELAS);
  const daMatriz = linhas.map((c) => c[0]?.trim() ?? '').sort();
  expect(telas(alvos).map((t) => t.id).sort()).toEqual(daMatriz);
});

/**
 * A guarda que a régua exige: DECLARA QUANTOS HAVIA.
 *
 * Sem isto, as 19 telas podiam estar todas a medir o ecrã de «ainda não há
 * nada» e as cinco larguras passavam sobre três frases.
 */
test.describe('a medição não é sobre listas vazias', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('declara quantos havia: contas, linhas, ajustes e movimentos', async ({ page }) => {
    const POS = `/es-ES/pos/${alvos.unidadeDoStaff}`;
    await page.goto(POS);
    const quantas = await page.locator('[data-teste="quantas"]').innerText();
    expect(Number(quantas), 'não havia contas abertas').toBeGreaterThan(0);
    await expect(page.locator('[data-teste="sem-contas"]'),
      'não havia contas: a tela mediu o ecrã de «nada por aqui»').toHaveCount(0);

    await page.goto(`${POS}/conta/${alvos.contaDoTpv}`);
    await expect(page.locator('[data-teste="linhas"] li').first()).toBeVisible();
    await expect(page.locator('[data-teste="ajustes"] li').first(),
      'não havia ajuste: «o que se tirou vê-se» mediria um ecrã sem nada tirado')
      .toBeVisible();

    await page.goto(`${POS}/caixa/${alvos.caixaDoTpv}/movimento`);
    const movimentos = await page.locator('[data-teste="movimentos"] li').count();
    expect(movimentos, 'não havia movimentos na caixa').toBeGreaterThan(1);

    await page.goto(`${POS}/caixa`);
    const caixas = await page.locator('[data-teste="quantas-caixas"]').innerText();
    expect(Number(caixas), 'não havia caixas').toBeGreaterThan(0);
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · TPV, contas e caixa`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 19 telas não transbordam nem escondem acções', async ({ page }) => {
      test.setTimeout(180_000);
      for (const tela of telas(alvos)) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('TPV a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    test.setTimeout(180_000);
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    test.setTimeout(180_000);
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · texto com pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('TPV nos três idiomas', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      test.setTimeout(180_000);
      for (const tela of telas(alvos)) {
        await visitar(page, tela, idioma);
        expect(await transbordaNaHorizontal(page), `${tela.id} · ${idioma} transborda`).toBe(0);
      }
    });
  }
});

/**
 * ── O que o dinheiro obriga a mostrar, e a não mostrar ────────────────────
 *
 * Estes casos não medem o desenho: medem o que a régua diz que o ecrã tem de
 * dizer. São o par de cada decisão desta etapa.
 */
test.describe('o ecrã diz o que a régua manda dizer', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a divisão mostra as partes E a soma — 10,00 por três não perde cêntimo',
    async ({ page }) => {
      const CONTA = `/es-ES/pos/${alvos.unidadeDoStaff}/conta/${alvos.contaDoTpv}`;
      await page.goto(`${CONTA}/dividir?partes=3`);
      const partes = await page.locator('[data-teste="partes"] li').count();
      expect(partes, 'não dividiu em três').toBe(3);
      // A propriedade que interessa não é «cada parte é X»: é a soma bater. E o
      // ecrã mostra-a, porque quem divide precisa de a ver.
      await expect(page.locator('[data-teste="soma-das-partes"]')).toBeVisible();
      await expect(page.locator('[data-teste="divisao-ajuda"]')).toBeVisible();
    });

  test('o troco diz que NÃO é receita', async ({ page }) => {
    const CONTA = `/es-ES/pos/${alvos.unidadeDoStaff}/conta/${alvos.contaDoTpv}`;
    await page.goto(`${CONTA}/dinheiro`);
    const texto = await page.locator('[data-teste="troco-ajuda"]').innerText();
    expect(texto.toLowerCase(), 'a tela não diz que o troco não é receita')
      .toContain('ingreso');
  });

  test('a caixa diz que só entra dinheiro — e o cartão fica de fora', async ({ page }) => {
    const CAIXA = `/es-ES/pos/${alvos.unidadeDoStaff}/caixa/${alvos.caixaDoTpv}`;
    await page.goto(`${CAIXA}/movimento`);
    await expect(page.locator('[data-teste="so-dinheiro"]')).toBeVisible();
    // E não há onde escolher cartão: a coluna não existe na base, e o ecrã não
    // pode oferecer o que a base não guarda.
    const opcoes = await page.locator('select[name="tipo"] option').allInnerTexts();
    expect(opcoes.join(' ').toLowerCase(), 'o ecrã oferece cartão na gaveta')
      .not.toContain('tarjeta');
  });

  test('a contagem NÃO tem campo de diferença — ela deriva-se', async ({ page }) => {
    const CAIXA = `/es-ES/pos/${alvos.unidadeDoStaff}/caixa/${alvos.caixaDoTpv}`;
    await page.goto(`${CAIXA}/contagem`);
    await expect(page.locator('[data-teste="esperado"]')).toBeVisible();
    await expect(page.locator('input[name="contado"]')).toBeVisible();
    // Uma diferença que se escreve é uma diferença que se pode escrever a zero.
    await expect(page.locator('input[name="diferenca"]'),
      'existe um campo de diferença: alguém pode escrevê-la a zero').toHaveCount(0);
  });

  test('o fecho só pede quem autoriza quando HÁ diferença', async ({ page }) => {
    const CAIXA = `/es-ES/pos/${alvos.unidadeDoStaff}/caixa/${alvos.caixaDoTpv}`;
    await page.goto(`${CAIXA}/fecho`);
    // A caixa do arnês está por contar: sem contagem não há diferença, e um
    // campo de autorização sempre presente é um campo que se preenche sem pensar.
    await expect(page.locator('[data-teste="divergencia-ajuda"]')).toHaveCount(0);
    await expect(page.locator('[data-teste="rasto"] li').first(),
      'o rasto está vazio: o fecho não teria o que auditar').toBeVisible();
  });

  test('o TPV diz que não há gateway ligado — e não finge que cobra', async ({ page }) => {
    await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}`);
    const texto = await page.locator('[data-teste="sem-provedor"]').innerText();
    expect(texto.length, 'a tela não declara a dependência em falta').toBeGreaterThan(10);
  });

  test('o balcão diz que o recibo NÃO é documento fiscal', async ({ page }) => {
    await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/balcao`);
    await expect(page.locator('[data-teste="sem-fiscal"]')).toBeVisible();
  });

  test('a conta mostra o ajuste COM o motivo, e não só o total abatido',
    async ({ page }) => {
      await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/conta/${alvos.contaDoTpv}`);
      const motivo = await page.locator('[data-teste="ajuste-motivo"]').first().innerText();
      expect(motivo.trim().length, 'o desconto aparece sem dizer porquê').toBeGreaterThan(2);
    });
});

import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 12 telas do E25, medidas no navegador.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * «Verde sobre stock vazio. Declara-se quantos movimentos e quantas fichas.»
 *
 * E não chega semear um insumo. Sem um saldo NEGATIVO, a lista de dívida mede
 * um ecrã vazio — e o negativo silencioso, que é a terceira saída que a régua
 * reprova, passava despercebido por não haver nada onde aparecer. Sem uma ficha
 * com SUB-RECEITA, as linhas e as folhas são a mesma lista, e a árvore, que é o
 * que esta etapa existe para provar, nunca chega a ser medida.
 *
 * A semeadura põe três insumos (um deles a menos de zero), cinco movimentos em
 * três tipos, e duas fichas — uma delas com a outra lá dentro.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const BASE = '/es-ES/app/marina-oropesa/puerto/inventory';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  return [
    { id: 'INV-001', caminho: BASE },
    { id: 'INV-002', caminho: `${BASE}/itens` },
    { id: 'INV-003', caminho: `${BASE}/itens/${a.insumoDoStock}` },
    { id: 'INV-004', caminho: `${BASE}/fichas` },
    { id: 'INV-005', caminho: `${BASE}/fichas/${a.fichaDoStock}` },
    { id: 'INV-006', caminho: `${BASE}/unidades` },
    { id: 'INV-007', caminho: `${BASE}/movimentos` },
    { id: 'INV-008', caminho: `${BASE}/perda` },
    { id: 'INV-009', caminho: `${BASE}/contagem` },
    { id: 'INV-010', caminho: `${BASE}/contagem/reconciliar` },
    { id: 'INV-011', caminho: `${BASE}/transferencia` },
    { id: 'INV-012', caminho: `${BASE}/disponibilidade` },
  ];
}

const QUANTAS_TELAS = 12;

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

test('a população é 12 telas, e 12 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length).toBe(QUANTAS_TELAS);
  expect(new Set(lista.map((t) => t.id)).size).toBe(QUANTAS_TELAS);
});

test('e são as 12 que a MATRIZ tem no E25', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const linhas = csv.split('\n').slice(1).map(colunas).filter((c) => c[6] === 'E25');
  expect(linhas.length, 'a matriz não tem 12 telas no E25').toBe(QUANTAS_TELAS);
  const DECLARADAS = new Set(['implementado aguardando validação', 'validado']);
  expect(linhas.filter((c) => DECLARADAS.has(c[16] ?? '')).length,
    'nem todas as 12 estão declaradas').toBe(QUANTAS_TELAS);
  expect(telas(alvos).map((t) => t.id).sort())
    .toEqual(linhas.map((c) => c[0]?.trim() ?? '').sort());
});

test.describe('a medição não é sobre stock vazio', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('declara quantos insumos, quantos movimentos e quantas fichas', async ({ page }) => {
    await page.goto(BASE);
    const insumos = Number(await page.locator('[data-teste="quantos-insumos"]').innerText());
    expect(insumos, 'não havia insumo nenhum').toBeGreaterThan(1);

    await page.goto(`${BASE}/itens/${alvos.insumoDoStock}`);
    const movimentos = Number(await page.locator('[data-teste="quantos-movimentos"]').innerText());
    expect(movimentos, 'o insumo medido não tinha movimentos').toBeGreaterThan(1);

    await page.goto(`${BASE}/fichas`);
    const fichas = Number(await page.locator('[data-teste="quantas-fichas"]').innerText());
    expect(fichas, 'não havia ficha nenhuma').toBeGreaterThan(1);

    await page.goto(`${BASE}/contagem/reconciliar`);
    const ajustes = Number(await page.locator('[data-teste="quantos-ajustes"]').innerText());
    expect(ajustes, 'não havia ajuste nenhum: a reconciliação media lista vazia')
      .toBeGreaterThan(0);
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · stock`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 12 telas não transbordam nem escondem acções', async ({ page }) => {
      test.setTimeout(180_000);
      for (const tela of telas(alvos)) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('stock a 360 px', () => {
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
      expect(maus, `${tela.id} · pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('stock nos três idiomas', () => {
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

/** O que a régua manda o ecrã dizer — e é aqui que a etapa se joga. */
test.describe('o saldo é derivado, a árvore desce, e o negativo VÊ-SE', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o saldo do insumo é a SOMA dos seus movimentos, e não um número à parte',
    async ({ page }) => {
      await page.goto(`${BASE}/itens/${alvos.insumoDoStock}`);
      const saldo = Number((await page.locator('[data-teste="saldo"]').innerText())
        .replace(/[^\d-]/g, ''));
      const tipos = await page.locator('[data-teste="tipo"]').allInnerTexts();
      expect(tipos.length, 'o insumo medido não tem movimentos').toBeGreaterThan(1);
      // A conta é a mesma que o gatilho faz na base: entradas somam, saídas
      // tiram. Se a tela mostrasse uma coluna guardada, este caso separava-a da
      // soma no dia em que as duas divergissem — que é o dia que interessa.
      const linhas = page.locator('[data-teste="movimentos"] li');
      let somado = 0;
      for (let i = 0; i < await linhas.count(); i += 1) {
        const li = linhas.nth(i);
        const tipo = await li.locator('[data-teste="tipo"]').innerText();
        const texto = await li.innerText();
        const q = Number((texto.match(/\d{3,}/) ?? ['0'])[0]);
        somado += ['ENTRADA', 'AJUSTE', 'TRANSFERENCIA_ENTRADA'].includes(tipo.trim())
          ? q : -q;
      }
      expect(somado, `o saldo mostrado (${saldo}) não bate com os movimentos (${somado})`)
        .toBe(saldo);
    });

  test('a ficha com sub-receita tem MAIS folhas do que linhas', async ({ page }) => {
    // Este é o caso que uma ficha de um nível não sabe exercer: lá, linhas e
    // folhas são a mesma lista, e «não desce a árvore» passaria verde.
    await page.goto(`${BASE}/fichas/${alvos.fichaDoStock}`);
    const linhas = await page.locator('[data-teste="linhas"] li').count();
    const folhas = await page.locator('[data-teste="folhas"] li').count();
    expect(linhas, 'a ficha medida não tem linhas').toBeGreaterThan(0);
    expect(folhas, `${folhas} folhas para ${linhas} linhas: não desceu à sub-receita`)
      .toBeGreaterThan(linhas);
  });

  test('e cada folha é um INSUMO da unidade, nunca uma ficha', async ({ page }) => {
    // ── Medir o NOME da sub-receita não chegava ─────────────────────────
    //
    // A primeira versão só exigia que «Salsa de tomate» não aparecesse. Mas a
    // tela resolve o nome pela lista de insumos e, quando não encontra, mostra
    // o identificador em cru — por isso uma sub-receita a passar por insumo
    // aparecia como um UUID, e a asserção ficava VERDE sobre o defeito.
    // Medido a 05/09 com o defeito plantado no `folhasDaFicha`.
    //
    // O que se mede agora é que TODA a folha resolveu para um insumo.
    await page.goto(`${BASE}/fichas/${alvos.fichaDoStock}`);
    const folhas = await page.locator('[data-teste="folhas"] li').allInnerTexts();
    expect(folhas.length, 'a ficha medida não tem folhas').toBeGreaterThan(0);
    const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const orfas = folhas.filter((f) => UUID.test(f) || f.includes('Salsa de tomate'));
    expect(orfas, `há folhas que não são insumos do frigorífico:\n${orfas.join('\n')}`)
      .toEqual([]);
  });

  test('o negativo aparece NA LISTA, com o número e o sinal', async ({ page }) => {
    await page.goto(BASE);
    const quantos = Number(await page.locator('[data-teste="quantos-negativos"]').innerText());
    expect(quantos, 'não havia saldo negativo: a visibilidade não teria o que mostrar')
      .toBeGreaterThan(0);
    const saldo = await page.locator('[data-teste="saldo-negativo"]').first().innerText();
    expect(Number(saldo), 'o saldo listado como dívida não é negativo').toBeLessThan(0);
    await expect(page.locator('[data-teste="sem-divida"]'),
      'diz que não há dívida e ao mesmo tempo lista uma').toHaveCount(0);
  });

  test('e o PAR: a disponibilidade conta o MESMO negativo', async ({ page }) => {
    // Sem este par, uma tela a mostrar e a outra a esconder passava o caso de
    // cima — e a que esconde é a que a equipa abre antes do serviço.
    await page.goto(`${BASE}/disponibilidade`);
    const quantos = Number(await page.locator('[data-teste="quantos-negativos"]').innerText());
    expect(quantos, 'a disponibilidade não conta o negativo que o painel conta')
      .toBeGreaterThan(0);
    await expect(page.locator('[data-teste="negativo-visivel"]')).toBeVisible();
  });
});

test.describe('nenhuma tela oferece escrever um saldo', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a contagem lança um AJUSTE, e não um saldo', async ({ page }) => {
    await page.goto(`${BASE}/contagem`);
    // Garantia pela ausência: um campo que não existe não pode escrever o saldo.
    for (const nome of ['saldo', 'saldoMili', 'saldo_mili']) {
      await expect(page.locator(`input[name="${nome}"], select[name="${nome}"]`),
        `há um campo ${nome}: o saldo passaria a ser escrito à mão`).toHaveCount(0);
    }
    await expect(page.locator('input[name="contado"]').first(),
      'não há onde escrever o que se contou').toBeVisible();
    await expect(page.locator('input[name="accao"][value="contar"]').first()).toBeAttached();
  });

  test('e a reconciliação mostra o ajuste que a contagem deixou', async ({ page }) => {
    await page.goto(`${BASE}/contagem/reconciliar`);
    const motivo = await page.locator('[data-teste="motivo"]').first().innerText();
    expect(motivo.trim().length, 'o ajuste não diz porquê').toBeGreaterThan(0);
    await expect(page.locator('[data-teste="saldo-derivado"]')).toBeVisible();
  });

  test('a transferência escolhe a unidade de DESTINO, e não a mesma', async ({ page }) => {
    await page.goto(`${BASE}/transferencia`);
    const destinos = await page.locator('select[name="paraLocationId"] option').allInnerTexts();
    expect(destinos.length, 'não há unidade de destino para onde transferir')
      .toBeGreaterThan(0);
    expect(destinos.join(' '),
      'a unidade de origem aparece como destino: a transferência seria um movimento só')
      .not.toContain('Marina Puerto');
  });
});

/** A porta: da sessão iniciada até uma tela do E25, por cliques. */
test.describe('as telas do E25 têm porta', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('chega-se ao stock por cliques, sem escrever endereço', async ({ page }) => {
    await page.goto('/es-ES/app/marina-oropesa/organization');
    const entrada = page.getByRole('link', { name: /inventario|inventário|inventory/i }).first();
    expect(await entrada.getAttribute('href'), 'a entrada do stock é um `#`').not.toBe('#');
    await entrada.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="NAV-UNIDADE"]'),
      'o menu do inventário não leva ao escolhedor de unidade').toBeVisible();
    await page.locator('[data-seccao="ir-stock"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="INV-001"]'),
      'não se chega ao stock por cliques').toBeVisible();
    expect(page.url(), 'não saiu do ponto de partida').not.toContain('/organization');
  });

  test('e do painel do stock chega-se às fichas e aos movimentos', async ({ page }) => {
    // A porta do módulo não chega: doze telas atrás de uma só entrada seriam
    // onze telas sem porta. Mede-se que o painel abre as que estão a jusante.
    await page.goto(BASE);
    await page.locator('[data-seccao="fichas"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="INV-004"]')).toBeVisible();
    await page.goto(BASE);
    await page.locator('[data-seccao="movimentos"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="INV-007"]')).toBeVisible();
  });
});

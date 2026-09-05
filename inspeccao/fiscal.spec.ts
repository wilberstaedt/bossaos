import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 5 telas do E24, medidas no navegador.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * «Verde sobre zero documentos. Declara-se a população.» E não chega um: sem o
 * ACEITE, a tela mede só «nada é documento fiscal»; sem o REJEITADO, o motivo
 * nunca aparece e ninguém nota que não se mostra. A semeadura põe os dois.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const PAINEL = '/es-ES/app/marina-oropesa/puerto';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  const POS = `/es-ES/pos/${a.unidadeDoStaff}`;
  return [
    { id: 'POS-020', caminho: `${POS}/fiscal` },
    { id: 'POS-021', caminho: `${POS}/fiscal/configuracao` },
    { id: 'POS-012', caminho: `${POS}/conta/${a.contaDoTpv}/recibo` },
    { id: 'INT-006', caminho: `${PAINEL}/integrations/fiscal` },
    { id: 'CAT-021', caminho: '/es-ES/app/marina-oropesa/catalogo/impostos' },
  ];
}

const QUANTAS_TELAS = 5;

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

test('a população é 5 telas, e 5 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length).toBe(QUANTAS_TELAS);
  expect(new Set(lista.map((t) => t.id)).size).toBe(QUANTAS_TELAS);
});

test('e são as 5 que a MATRIZ tem no E24', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const linhas = csv.split('\n').slice(1).map(colunas).filter((c) => c[6] === 'E24');
  expect(linhas.length, 'a matriz não tem 5 telas no E24').toBe(QUANTAS_TELAS);
  const DECLARADAS = new Set(['implementado aguardando validação', 'validado']);
  expect(linhas.filter((c) => DECLARADAS.has(c[16] ?? '')).length,
    'nem todas as 5 estão declaradas').toBe(QUANTAS_TELAS);
  expect(telas(alvos).map((t) => t.id).sort())
    .toEqual(linhas.map((c) => c[0]?.trim() ?? '').sort());
});

test.describe('a medição não é sobre zero documentos', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('declara quantos havia: um ACEITE e um REJEITADO', async ({ page }) => {
    await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/fiscal`);
    const quantos = await page.locator('[data-teste="quantos"]').innerText();
    expect(Number(quantos), 'não havia documento nenhum').toBeGreaterThan(1);
    await expect(page.locator('[data-teste="e-documento"]').first(),
      'não havia nenhum ACEITE: a distinção não teria o que medir').toBeVisible();
    await expect(page.locator('[data-teste="motivo-rejeicao"]').first(),
      'não havia nenhum REJEITADO: o motivo nunca apareceria').toBeVisible();
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · fiscal`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 5 telas não transbordam nem escondem acções', async ({ page }) => {
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

test.describe('fiscal a 360 px', () => {
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

test.describe('fiscal nos três idiomas', () => {
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
test.describe('o ecrã não chama documento fiscal ao que não é', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o recibo da conta COM aceite mostra-o como documento, e com número',
    async ({ page }) => {
      // ── Este caso mede a verdade da semeadura, e não a que eu supus ──────
      //
      // A primeira versão afirmava que esta conta não tinha documento aceite. A
      // semeadura liga-lhe um, e a tela mostrava-o — com razão. Um teste que
      // falha porque o autor supôs o estado errado não é um defeito do produto,
      // e mudar o produto para o satisfazer seria estragar o que está certo.
      await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/conta/${alvos.contaDoTpv}/recibo`);
      await expect(page.locator('[data-teste="e-documento"]')).toBeVisible();
      const numero = await page.locator('[data-teste="numero"]').innerText();
      expect(numero.trim().length,
        'aceite sem número: ninguém o pode ir verificar').toBeGreaterThan(3);
    });

  test('e o PAR: o que NÃO foi aceite diz que não é documento fiscal',
    async ({ page }) => {
      // Sem este par, «mostra tudo como documento» passava o caso de cima. O
      // rejeitado da semeadura é quem o exerce.
      await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/fiscal`);
      await expect(page.locator('[data-teste="nao-e-documento"]').first(),
        'nenhuma linha diz que não é documento: a distinção não está a ser feita')
        .toBeVisible();
      await expect(page.locator('[data-teste="e-documento"]').first()).toBeVisible();
    });

  test('a rejeição mostra o MOTIVO', async ({ page }) => {
    await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/fiscal`);
    const motivo = await page.locator('[data-teste="motivo-rejeicao"]').first().innerText();
    // ── Medir o COMPRIMENTO não chega ─────────────────────────────────────
    //
    // A primeira versão exigia mais de 10 caracteres, e o rótulo «Motivo del
    // rechazo» sozinho tem 17: tirar o texto do motivo deixava o caso VERDE.
    // Medido a 05/09 com o defeito plantado.
    //
    // O que se mede agora é o motivo QUE A SEMEADURA PÔS, e não o tamanho do
    // que está no ecrã.
    expect(motivo, 'o ecrã mostra o rótulo do motivo, mas não o motivo')
      .toContain('NIF');
  });

  test('a emissão real diz-se BLOQUEADA e os requisitos POR CONFIRMAR',
    async ({ page }) => {
      await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/fiscal`);
      await expect(page.locator('[data-teste="emissao-bloqueada"]')).toBeVisible();
      const pendencia = await page.locator('[data-teste="por-confirmar"]').innerText();
      expect(pendencia.toUpperCase(),
        'a pendência externa não aparece no ecrã').toContain('CONFIRMAR');
    });

  test('a configuração fiscal NÃO tem campo para credencial', async ({ page }) => {
    await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/fiscal/configuracao`);
    for (const nome of ['segredo', 'secret', 'chave', 'token', 'certificado']) {
      await expect(page.locator(`input[name="${nome}"]`),
        `há um campo para ${nome}: o segredo vive no servidor`).toHaveCount(0);
    }
  });

  test('e o catálogo NÃO afirma taxas que ninguém confirmou', async ({ page }) => {
    await page.goto('/es-ES/app/marina-oropesa/catalogo/impostos');
    await expect(page.locator('[data-teste="por-confirmar"]')).toBeVisible();
    await expect(page.locator('[data-teste="taxa-por-definir"]').first()).toBeVisible();
  });
});

/** A porta: da sessão iniciada até uma tela do E24, por cliques. */
test.describe('as telas do E24 têm porta', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('chega-se aos documentos fiscais por cliques', async ({ page }) => {
    await page.goto('/es-ES/app/marina-oropesa/organization');
    const entrada = page.getByRole('link', { name: /caja|caixa|register/i }).first();
    expect(await entrada.getAttribute('href'), 'a entrada da caixa é um `#`').not.toBe('#');
    await entrada.click();
    await page.waitForLoadState('networkidle');
    await page.locator('[data-seccao="entrar-no-tpv"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.locator('[data-seccao="fiscal"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="POS-020"]'),
      'não se chega aos documentos fiscais por cliques').toBeVisible();
    expect(page.url(), 'não saiu do ponto de partida').not.toContain('/organization');
  });
});

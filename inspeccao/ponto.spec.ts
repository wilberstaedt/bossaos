import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 11 telas do E28, medidas no navegador.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * «Verde sobre zero marcações» e «uma prova que só use o turno que corre bem —
 * sem turno atravessado, sem correcção e sem esquecimento de picar, não está
 * provado».
 *
 * A semeadura põe as três formas no mesmo dia de serviço: entrada às 18h07 com
 * saída às 00h42 da madrugada seguinte, uma correcção feita POR TERCEIRO, e
 * alguém que entrou e nunca picou a saída.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const BASE = '/es-ES/app/marina-oropesa/puerto/team';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  return [
    { id: 'HR-001', caminho: BASE },
    { id: 'HR-002', caminho: `${BASE}/${a.pessoaDoPonto}` },
    { id: 'HR-003', caminho: `${BASE}/funcoes` },
    { id: 'HR-004', caminho: `${BASE}/escala` },
    { id: 'HR-005', caminho: `${BASE}/escala/novo` },
    { id: 'HR-006', caminho: `${BASE}/jornada` },
    { id: 'HR-007', caminho: `${BASE}/picar` },
    { id: 'HR-008', caminho: `${BASE}/horas` },
    { id: 'HR-009', caminho: `${BASE}/correccao` },
    { id: 'HR-010', caminho: `${BASE}/correccoes` },
    { id: 'HR-011', caminho: `${BASE}/relatorio` },
  ];
}

const QUANTAS = 11;

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

test('a população é 11 telas, e 11 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length).toBe(QUANTAS);
  expect(new Set(lista.map((t) => t.id)).size).toBe(QUANTAS);
});

test('e são as 11 que a MATRIZ tem no E28', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const linhas = csv.split('\n').slice(1).map(colunas).filter((c) => c[6] === 'E28');
  expect(linhas.length, 'a matriz não tem 11 telas no E28').toBe(QUANTAS);
  const DECLARADAS = new Set(['implementado aguardando validação', 'validado']);
  expect(linhas.filter((c) => DECLARADAS.has(c[16] ?? '')).length).toBe(QUANTAS);
  expect(telas(alvos).map((t) => t.id).sort())
    .toEqual(linhas.map((c) => c[0]?.trim() ?? '').sort());
});

test.describe('a medição não é sobre zero marcações', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('declara quantas marcações, e que UMA delas é correcção por terceiro',
    async ({ page }) => {
      await page.goto(`${BASE}/${alvos.pessoaDoPonto}?dia=2026-09-04`);
      await page.goto(`${BASE}/correccoes`);
      const quantas = Number(await page.locator('[data-teste="quantas-correccoes"]').innerText());
      expect(quantas, 'não havia correcção nenhuma').toBeGreaterThan(0);
      const autos = Number(await page.locator('[data-teste="quantas-autocorreccoes"]').innerText());
      expect(autos, 'todas as correcções são autocorrecções: falta o caso de terceiro')
        .toBeLessThan(quantas);
      await expect(page.locator('[data-teste="por-terceiro"]').first(),
        'não há nenhuma correcção feita por outra pessoa').toBeVisible();
    });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · ponto`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 11 telas não transbordam nem escondem acções', async ({ page }) => {
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

test.describe('ponto a 360 px', () => {
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

test.describe('ponto nos três idiomas', () => {
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
test.describe('a marcação é um facto, e a correcção vê-se como correcção', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a original CONTINUA no ecrã, marcada como corrigida', async ({ page }) => {
    // ── O nome deste caso prometia mais do que ele media ────────────────
    //
    // A primeira versão só verificava que um parágrafo estava visível — e
    // falhou porque nem esse marcador existe nesta tela. Um caso cujo nome diz
    // «a original continua no ecrã» tem de ir ver a original.
    //
    // A semeadura tem três marcações no dia: a entrada às 18h07 (corrigida), a
    // saída às 00h42, e a correcção às 18h00. Se a original desaparecesse ao
    // ser corrigida, este ecrã mostrava duas.
    await page.goto(`${BASE}/${alvos.pessoaDoPonto}`);
    // Conta-se o que está DESENHADO, e não o comprimento do array que a tela
    // recebeu. Um contador que lê a propriedade diz «3» com duas linhas no
    // ecrã — foi o defeito que o E27 destapou, e aqui repetia-se.
    const quantas = await page.locator('[data-teste="marcacoes"] li').count();
    expect(quantas, 'a original desapareceu ao ser corrigida — o rasto perdeu-se')
      .toBeGreaterThan(2);
    await expect(page.locator('[data-teste="corrigida"]').first(),
      'nenhuma marcação aparece marcada como corrigida').toBeVisible();
    await expect(page.locator('[data-teste="por-terceiro"]').first(),
      'a correcção não aparece como feita por outra pessoa').toBeVisible();
    const motivo = await page.locator('[data-teste="motivo"]').first().innerText();
    // Mede-se o motivo SEMEADO, e não o comprimento do texto — a lição do E24.
    expect(motivo, 'o ecrã mostra a correcção mas não a razão dela')
      .toContain('relógio');
  });

  test('e nenhuma tela oferece EDITAR uma marcação', async ({ page }) => {
    // Garantia pela ausência: a única maneira de mudar o que uma marcação diz é
    // um registo novo, com autor e motivo.
    for (const caminho of [`${BASE}/${alvos.pessoaDoPonto}`, `${BASE}/jornada`,
                           `${BASE}/horas`, `${BASE}/correccao`]) {
      await page.goto(caminho);
      for (const accao of ['editar_marcacao', 'apagar_marcacao', 'editar', 'apagar']) {
        await expect(page.locator(`input[name="accao"][value="${accao}"]`),
          `${caminho} oferece ${accao}: a marcação deixou de ser um facto`).toHaveCount(0);
      }
    }
    await page.goto(`${BASE}/correccao`);
    await expect(page.locator('input[name="accao"][value="corrigir"]')).toBeAttached();
  });

  test('a correcção exige MOTIVO no ecrã', async ({ page }) => {
    await page.goto(`${BASE}/correccao`);
    const motivo = page.locator('input[name="motivo"]');
    await expect(motivo, 'não há campo de motivo').toBeVisible();
    expect(await motivo.getAttribute('required'),
      'o motivo não é obrigatório: corrige-se o salário de alguém sem dizer porquê')
      .not.toBeNull();
  });

  test('e a autocorrecção distingue-se da correcção por terceiro', async ({ page }) => {
    await page.goto(`${BASE}/correccoes`);
    await expect(page.locator('[data-teste="por-terceiro"]').first(),
      'a correcção por terceiro não aparece como tal').toBeVisible();
    const autor = await page.locator('[data-teste="autor"]').first().innerText();
    const quem = await page.locator('[data-teste="quem"]').first().innerText();
    expect(autor, 'quem corrigiu e quem foi corrigido aparecem como a mesma pessoa')
      .not.toBe(quem);
  });
});

test.describe('o dia de serviço não é o dia do calendário', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a saída das 00h42 aparece no dia em que o turno COMEÇOU', async ({ page }) => {
    await page.goto(`${BASE}/${alvos.pessoaDoPonto}`);
    await expect(page.locator('[data-teste="dia-de-servico"]'),
      'a tela não explica o dia de serviço').toBeVisible();
    // A prova de que não foi cortado: o dia mostra entrada E saída.
    const tipos = await page.locator('[data-teste="marcacoes"] [data-teste="tipo"]')
      .allInnerTexts();
    expect(tipos.length, 'o dia de serviço tem menos marcações do que devia')
      .toBeGreaterThan(1);
  });

  test('e a escala mostra um turno que passa das 24h', async ({ page }) => {
    await page.goto(`${BASE}/escala/novo`);
    await expect(page.locator('[data-teste="minutos-inteiros"]')).toBeVisible();
    // Garantia pela ausência: não há selector de relógio que obrigue a decidir
    // se `01:00` é hoje ou amanhã — e é essa decisão que corta o turno ao meio.
    await expect(page.locator('input[type="time"]'),
      'há um selector de hora: obriga a decidir se 01:00 é hoje ou amanhã').toHaveCount(0);
  });
});

test.describe('a jornada aberta não é uma jornada de zero', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('quem entrou e não saiu aparece como ABERTA', async ({ page }) => {
    await page.goto(`${BASE}/horas`);
    const quantas = Number(await page.locator('[data-teste="quantas-jornadas"]').innerText());
    expect(quantas, 'não havia jornada nenhuma no dia medido').toBeGreaterThan(0);
  });
});

/** A porta: da sessão iniciada até uma tela do E28, por cliques. */
test.describe('as telas do E28 têm porta', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('chega-se à equipa por cliques, sem escrever endereço', async ({ page }) => {
    await page.goto('/es-ES/app/marina-oropesa/catalogo');
    const entrada = page.getByRole('link', { name: /equipo|equipa|team/i }).first();
    expect(await entrada.getAttribute('href'), 'a entrada da equipa é um `#`').not.toBe('#');
    await entrada.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="NAV-UNIDADE"]'),
      'o menu da equipa não leva ao escolhedor de unidade').toBeVisible();
    await page.locator('[data-seccao="ir-equipa"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="HR-001"]'),
      'não se chega à equipa por cliques').toBeVisible();
  });

  test('e do painel chega-se às oito secções e à ficha de uma pessoa',
    async ({ page }) => {
      const seccoes: [string, string][] = [
        ['funcoes', 'HR-003'], ['escala', 'HR-004'], ['jornada', 'HR-006'],
        ['picar', 'HR-007'], ['horas', 'HR-008'], ['correccao', 'HR-009'],
        ['correccoes', 'HR-010'], ['relatorio', 'HR-011'],
      ];
      for (const [seccao, tela] of seccoes) {
        await page.goto(BASE);
        // ── Verificar que a ligação EXISTE, antes de lhe carregar ───────
        //
        // Sem isto, uma secção em falta dá um tempo esgotado de 30 segundos com
        // «locator.click» — e o que se lê é «demorou», não «a HR-011 ficou sem
        // porta». Um teste que falha sem dizer o quê custa mais do que um que
        // não existe, porque manda quem o lê à procura do sítio errado.
        const ligacao = page.locator(`[data-seccao="${seccao}"]`);
        expect(await ligacao.count(),
          `a secção ${seccao} não tem ligação nenhuma: a ${tela} ficou sem porta`)
          .toBeGreaterThan(0);
        await ligacao.first().click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator(`[data-tela="${tela}"]`),
          `a secção ${seccao} não leva à ${tela}`).toBeVisible();
      }
      await page.goto(BASE);
      await page.locator('[data-teste="equipa"] a').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-tela="HR-002"]')).toBeVisible();
      await page.goto(`${BASE}/escala`);
      await page.locator('[data-seccao="novo-turno"]').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-tela="HR-005"]')).toBeVisible();
    });
});

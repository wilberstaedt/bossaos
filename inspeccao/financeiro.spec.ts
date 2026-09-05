import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 11 telas do E29, medidas no navegador.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * «A semente tem de conter o caso mau: uma linha duplicada legítima e uma
 * devolução a atravessar o mês.» A semeadura põe as duas — e o caso que mais
 * interessa é o único desta etapa cujo sinal de avaria é **dois números
 * baterem certo**.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const BASE = '/es-ES/app/marina-oropesa/puerto/finance';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  return [
    { id: 'FIN-001', caminho: BASE },
    { id: 'FIN-002', caminho: `${BASE}/receitas` },
    { id: 'FIN-003', caminho: `${BASE}/contas` },
    { id: 'FIN-004', caminho: `${BASE}/conciliar/${a.contaDoBanco}` },
    { id: 'FIN-005', caminho: `${BASE}/despesas` },
    { id: 'FIN-006', caminho: `${BASE}/despesas/nova` },
    { id: 'FIN-007', caminho: `${BASE}/centros` },
    { id: 'FIN-008', caminho: `${BASE}/margem` },
    { id: 'FIN-009', caminho: `${BASE}/previsao` },
    { id: 'FIN-010', caminho: `${BASE}/exportar` },
    { id: 'FIN-011', caminho: `${BASE}/documentos` },
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

test('e são as 11 que a MATRIZ tem no E29', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const linhas = csv.split('\n').slice(1).map(colunas).filter((c) => c[6] === 'E29');
  expect(linhas.length, 'a matriz não tem 11 telas no E29').toBe(QUANTAS);
  const DECLARADAS = new Set(['implementado aguardando validação', 'validado']);
  expect(linhas.filter((c) => DECLARADAS.has(c[16] ?? '')).length).toBe(QUANTAS);
  expect(telas(alvos).map((t) => t.id).sort())
    .toEqual(linhas.map((c) => c[0]?.trim() ?? '').sort());
});

test.describe('a medição não é sobre zero movimentos', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('declara quantas linhas de extracto, e que DUAS são iguais no mesmo dia',
    async ({ page }) => {
      await page.goto(`${BASE}/contas/${alvos.contaDoBanco}`);
      const quantas = await page.locator('[data-teste="linhas"] li').count();
      // ── Duas asserções, e não uma ───────────────────────────────────
      //
      // A primeira versão exigia mais de duas linhas com a mensagem «não havia
      // linha nenhuma». Quando o controlo tirou a segunda linha igual, havia
      // duas — e a prova caiu a dizer que não havia nenhuma. Uma mensagem que
      // não descreve o que falhou manda quem a lê para o sítio errado.
      expect(quantas, 'não havia linha de extracto nenhuma').toBeGreaterThan(0);

      // As duas legítimas iguais: mesma data e mesmo montante, e ENTRARAM as duas.
      const datas = await page.locator('[data-teste="linhas"] [data-teste="data"]')
        .allInnerTexts();
      const montantes = await page.locator('[data-teste="linhas"] [data-teste="montante"]')
        .allInnerTexts();
      const pares = datas.map((d, i) => `${d}|${montantes[i]}`);
      const repetido = pares.find((p, i) => pares.indexOf(p) !== i);
      expect(repetido,
        'não há duas linhas iguais no mesmo dia: o par que impede o detector de apagar factos')
        .toBeTruthy();
    });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · financeiro`, () => {
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

test.describe('financeiro a 360 px', () => {
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

test.describe('financeiro nos três idiomas', () => {
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
test.describe('as três datas não colapsam, e vê-se no ecrã', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o painel mostra CAIXA e RESULTADO, e os dois números DISCORDAM',
    async ({ page }) => {
      // ── O caso cujo sinal de avaria é dois números baterem certo ─────────
      //
      // A semeadura tem uma venda de 28 de Setembro e a devolução a 3 de
      // Outubro. No mês corrente, os dois relatórios lêem populações
      // diferentes — e se passarem a ler a mesma, alguém colapsou as datas.
      await page.goto(BASE);
      await expect(page.locator('[data-teste="tres-datas"]'),
        'o painel não explica que as três datas são diferentes').toBeVisible();
      const caixa = await page.locator('[data-teste="quantos-caixa"]').innerText();
      const resultado = await page.locator('[data-teste="quantos-resultado"]').innerText();
      expect(Number(caixa) + Number(resultado),
        'as duas leituras estão vazias: não há o que comparar').toBeGreaterThan(0);
      expect(caixa,
        'o caixa e o resultado leem exactamente as mesmas linhas: as datas colapsaram')
        .not.toBe(resultado);
    });

  test('e o formulário da despesa pede as DUAS datas', async ({ page }) => {
    // Um formulário com uma data só obriga o produto a inventar a outra.
    await page.goto(`${BASE}/despesas/nova`);
    await expect(page.locator('input[name="ocorrenciaEm"]')).toBeVisible();
    await expect(page.locator('input[name="valorEm"]')).toBeVisible();
  });

  test('e a exportação nomeia as três', async ({ page }) => {
    await page.goto(`${BASE}/exportar`);
    const colunas = (await page.locator('[data-teste="coluna"]').allInnerTexts())
      .join(' ').toLowerCase();
    for (const palavra of ['ocurrencia', 'valor', 'registro']) {
      expect(colunas, `a exportação não nomeia a data de ${palavra}`).toContain(palavra);
    }
  });
});

test.describe('nada se auto-confirma, e conciliado é derivado', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a correspondência a 100 aparece como SUGESTÃO', async ({ page }) => {
    await page.goto(`${BASE}/conciliar/${alvos.contaDoBanco}`);
    const sugestoes = Number(await page.locator('[data-teste="quantas-sugestoes"]').innerText());
    expect(sugestoes, 'não havia sugestão nenhuma para medir').toBeGreaterThan(0);
    const semelhanca = await page.locator('[data-teste="semelhanca"]').first().innerText();
    expect(Number(semelhanca), 'a sugestão medida não é a de 100').toBe(100);
    await expect(page.locator('[data-teste="sugestao"]').first(),
      'a semelhança perfeita apareceu já confirmada').toBeVisible();
  });

  test('e a linha correspondente continua POR CONCILIAR no extracto',
    async ({ page }) => {
      await page.goto(`${BASE}/contas/${alvos.contaDoBanco}`);
      await expect(page.locator('[data-teste="por-conciliar"]').first(),
        'a linha apareceu conciliada sem ninguém ter confirmado').toBeVisible();
      await expect(page.locator('[data-teste="conciliado-derivado"]')).toBeVisible();
    });

  test('e nenhuma tela oferece MARCAR como conciliado', async ({ page }) => {
    // Garantia pela ausência: conciliado deriva-se de haver correspondência
    // confirmada. Uma caixinha era uma segunda verdade.
    for (const caminho of [`${BASE}/contas/${alvos.contaDoBanco}`,
                           `${BASE}/conciliar/${alvos.contaDoBanco}`]) {
      await page.goto(caminho);
      for (const nome of ['conciliado', 'conciliada', 'marcar_conciliado']) {
        await expect(page.locator(`input[name="${nome}"], input[value="${nome}"]`),
          `${caminho} oferece ${nome}: conciliado voltou a ser uma caixinha`).toHaveCount(0);
      }
    }
    await page.goto(`${BASE}/conciliar/${alvos.contaDoBanco}`);
    await expect(page.locator('input[name="accao"][value="confirmar"]').first()).toBeAttached();
  });
});

test.describe('a importação não ignora em silêncio', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o extracto diz quantas foram novas e quantas já vistas', async ({ page }) => {
    await page.goto(`${BASE}/contas/${alvos.contaDoBanco}`);
    const quantas = Number(await page.locator('[data-teste="quantas-importacoes"]').innerText());
    expect(quantas, 'não havia importação nenhuma').toBeGreaterThan(0);
    const jaVistas = await page.locator('[data-teste="ja-vistas"]').first().innerText();
    // Medir a PALAVRA e o número — não o comprimento do texto.
    expect(jaVistas, 'a importação não diz quantas ignorou').toMatch(/\d/);
    await expect(page.locator('[data-teste="silencio-e-defeito"]').first()).toBeHidden()
      .catch(() => undefined);
  });
});

test.describe('moedas não se somam', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o total do painel vem agrupado, com uma linha por moeda', async ({ page }) => {
    await page.goto(BASE);
    const moedas = await page.locator('[data-teste="total-resultado"] [data-teste="moeda"]')
      .allInnerTexts();
    expect(moedas.length, 'o total não diz a moeda').toBeGreaterThan(0);
    expect(new Set(moedas).size, 'há duas linhas da mesma moeda: não agrupou')
      .toBe(moedas.length);
    await expect(page.locator('[data-teste="moedas-nao-somam"]')).toBeVisible();
  });
});

test.describe('fechar proíbe, e não copia totais', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('reabrir exige motivo no ecrã', async ({ page }) => {
    await page.goto(`${BASE}/documentos`);
    const motivo = page.locator('input[name="motivo"]');
    await expect(motivo, 'não há campo de motivo para reabrir').toBeVisible();
    expect(await motivo.getAttribute('required'),
      'reabrir sem motivo: um interruptor com outro nome').not.toBeNull();
    await expect(page.locator('[data-teste="fechar-proibe"]')).toBeVisible();
  });
});

test.describe('o que a etapa faz tem por onde ser feito', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // ── Estes quatro casos existem por causa da varredura ──────────────────
  //
  // O `importarExtracto`, o `sugerirCorrespondencia`, o `fecharPeriodo` e o
  // `converterTotal` estavam escritos, provados, e sem chamador nenhum: o
  // núcleo da etapa era inalcançável a partir do produto. Ligá-los sem os medir
  // era repetir o defeito com outro nome.

  test('a conta tem por onde IMPORTAR um extracto', async ({ page }) => {
    await page.goto(`${BASE}/contas/${alvos.contaDoBanco}`);
    await expect(page.locator('input[name="accao"][value="importar"]'),
      'não há por onde importar: o extracto só entra pela semeadura').toBeAttached();
    await expect(page.locator('input[name="linhas"]')).toBeVisible();
  });

  test('a conciliação tem por onde SUGERIR, e é passo separado de confirmar',
    async ({ page }) => {
      await page.goto(`${BASE}/conciliar/${alvos.contaDoBanco}`);
      await expect(page.locator('input[name="accao"][value="sugerir"]'),
        'não há por onde sugerir uma correspondência').toBeAttached();
      await expect(page.locator('input[name="accao"][value="confirmar"]').first(),
        'sugerir e confirmar são o mesmo botão').toBeAttached();
    });

  test('os documentos têm por onde FECHAR, e por onde reabrir', async ({ page }) => {
    await page.goto(`${BASE}/documentos`);
    await expect(page.locator('input[name="accao"][value="fechar"]'),
      'não há por onde fechar um período').toBeAttached();
    await expect(page.locator('input[name="accao"][value="reabrir"]')).toBeAttached();
  });

  test('e o total noutra moeda mostra a FONTE e a data da taxa', async ({ page }) => {
    await page.goto(`${BASE}/centros`);
    const convertidos = Number(
      await page.locator('[data-teste="quantos-convertidos"]').innerText());
    expect(convertidos, 'não converteu nada: não há o que verificar').toBeGreaterThan(0);
    const fonte = await page.locator('[data-teste="fonte"]').first().innerText();
    expect(fonte.trim().length,
      'converteu sem dizer a fonte: uma opinião com aspecto de facto').toBeGreaterThan(0);
    const data = await page.locator('[data-teste="taxa-de"]').first().innerText();
    expect(data, 'converteu sem dizer a data da taxa').toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

/** A porta: da sessão iniciada até uma tela do E29, por cliques. */
test.describe('as telas do E29 têm porta', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('chega-se ao financeiro por cliques, sem escrever endereço', async ({ page }) => {
    await page.goto('/es-ES/app/marina-oropesa/catalogo');
    const entrada = page.getByRole('link', { name: /gestión económica|gestão|finances/i }).first();
    expect(await entrada.getAttribute('href'), 'a entrada do financeiro é um `#`').not.toBe('#');
    await entrada.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="NAV-UNIDADE"]'),
      'o menu do financeiro não leva ao escolhedor de unidade').toBeVisible();
    await page.locator('[data-seccao="ir-financeiro"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="FIN-001"]'),
      'não se chega ao financeiro por cliques').toBeVisible();
  });

  test('e do painel chega-se às oito secções, e da conta à conciliação',
    async ({ page }) => {
      const seccoes: [string, string][] = [
        ['receitas', 'FIN-002'], ['contas', 'FIN-003'], ['despesas', 'FIN-005'],
        ['centros', 'FIN-007'], ['margem', 'FIN-008'], ['previsao', 'FIN-009'],
        ['exportar', 'FIN-010'], ['documentos', 'FIN-011'],
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
      await page.goto(`${BASE}/contas`);
      await page.locator('[data-teste="contas"] a').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('[data-seccao="conciliar"]').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-tela="FIN-004"]')).toBeVisible();
    });
});

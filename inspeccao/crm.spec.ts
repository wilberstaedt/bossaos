import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 13 telas de gestão do E27, medidas no navegador.
 *
 * A décima quarta, a MENU-017, é **pública** e mede-se em `crm-publico.spec.ts`
 * — sem sessão, que é como um cliente do restaurante lá chega. Medi-la aqui,
 * com a sessão do painel aberta, era exactamente o defeito do E23: três telas
 * públicas contadas na população e nunca visitadas como um estranho as vê.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * «Verde sobre zero contactos.» E «uma prova que só use quem consentiu tudo —
 * sem o caso de quem consentiu serviço e recusou campanha, não está provado».
 * A semeadura põe as três pessoas: a que consentiu, a que só deu o telefone à
 * porta, e a que deu e retirou.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const UNIDADE = '/es-ES/app/marina-oropesa/puerto/customers';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  return [
    { id: 'CRM-001', caminho: UNIDADE },
    { id: 'CRM-002', caminho: `${UNIDADE}/${a.clienteQueConsentiu}` },
    { id: 'CRM-003', caminho: `${UNIDADE}/juntar` },
    { id: 'CRM-004', caminho: `${UNIDADE}/segmentos` },
    { id: 'CRM-005', caminho: `${UNIDADE}/segmentos/novo` },
    { id: 'CRM-006', caminho: `${UNIDADE}/fidelidade` },
    { id: 'CRM-007', caminho: `${UNIDADE}/${a.clienteQueConsentiu}/recompensas` },
    { id: 'CRM-008', caminho: `${UNIDADE}/campanhas` },
    { id: 'CRM-009', caminho: `${UNIDADE}/campanhas/nova` },
    { id: 'CRM-010', caminho: `${UNIDADE}/modelos` },
    { id: 'CRM-011', caminho: `${UNIDADE}/vozes` },
    { id: 'CRM-012', caminho: `${UNIDADE}/origens` },
    { id: 'CRM-013', caminho: `${UNIDADE}/${a.clienteQueConsentiu}/preferencias` },
  ];
}

const QUANTAS_DE_GESTAO = 13;
const QUANTAS_NA_MATRIZ = 14;

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

test('a população de gestão é 13 telas, e 13 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length).toBe(QUANTAS_DE_GESTAO);
  expect(new Set(lista.map((t) => t.id)).size).toBe(QUANTAS_DE_GESTAO);
});

test('e a MATRIZ tem 14 no E27 — a que falta é a pública, medida noutro sítio',
  async () => {
    const { readFile } = await import('node:fs/promises');
    const csv = await readFile('docs/progress/coverage.csv', 'utf8');
    const linhas = csv.split('\n').slice(1).map(colunas).filter((c) => c[6] === 'E27');
    expect(linhas.length, 'a matriz não tem 14 telas no E27').toBe(QUANTAS_NA_MATRIZ);
    const DECLARADAS = new Set(['implementado aguardando validação', 'validado']);
    expect(linhas.filter((c) => DECLARADAS.has(c[16] ?? '')).length).toBe(QUANTAS_NA_MATRIZ);
    const naMatriz = linhas.map((c) => c[0]?.trim() ?? '').sort();
    const medidas = [...telas(alvos).map((t) => t.id), 'MENU-017'].sort();
    // A conta fecha COM a pública: se ela sair da matriz ou do outro ficheiro,
    // este caso acende. É a lição do E23, escrita como asserção.
    expect(medidas).toEqual(naMatriz);
  });

test.describe('a medição não é sobre zero contactos', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('declara quantas pessoas, e que UMA delas só consentiu serviço',
    async ({ page }) => {
      await page.goto(UNIDADE);
      const quantos = Number(await page.locator('[data-teste="quantos-clientes"]').innerText());
      expect(quantos, 'não havia contacto nenhum').toBeGreaterThan(2);

      // ── Contar pares soltos não era medir nada ──────────────────────
      //
      // A primeira versão exigia «pelo menos um vivo e pelo menos um não vivo».
      // Isso é verdade para quase qualquer pessoa — há quatro pares e ninguém
      // consente os quatro. Media uma coisa que não podia falhar, e por isso
      // não media. Descoberto a 05/09 com o par retirado da semeadura: o
      // controlo caiu noutro caso, e este ficou verde.
      //
      // Agora nomeia-se a condição que dá sentido a toda a etapa: SERVIÇO vivo
      // e CAMPANHA não.
      await page.goto(`${UNIDADE}/${alvos.clienteSoServico}/preferencias`);
      const linhas = page.locator('[data-teste="consentimentos"] li');
      let servicoVivo = 0;
      let campanhaViva = 0;
      for (let i = 0; i < await linhas.count(); i += 1) {
        const li = linhas.nth(i);
        const finalidade = (await li.locator('[data-teste="finalidade"]').innerText())
          .toLowerCase();
        const vivo = await li.locator('[data-teste="vivo"]').count();
        if (vivo === 0) continue;
        if (finalidade.includes('promo')) campanhaViva += 1; else servicoVivo += 1;
      }
      expect(servicoVivo,
        'a pessoa medida não consentiu serviço nenhum: não é a que a régua pede')
        .toBeGreaterThan(0);
      expect(campanhaViva,
        'a pessoa medida consentiu campanha: a prova passou a medir só quem aceitou')
        .toBe(0);

      await page.goto(`${UNIDADE}/campanhas`);
      const campanhas = Number(await page.locator('[data-teste="quantas-campanhas"]').innerText());
      expect(campanhas, 'não havia campanha nenhuma').toBeGreaterThan(0);
    });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · CRM`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 13 telas não transbordam nem escondem acções', async ({ page }) => {
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

test.describe('CRM a 360 px', () => {
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

test.describe('CRM nos três idiomas', () => {
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
test.describe('serviço não dá campanha, e vê-se no ecrã', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('as quatro respostas mostram-se separadas, com finalidade e canal',
    async ({ page }) => {
      await page.goto(`${UNIDADE}/${alvos.clienteQueConsentiu}/preferencias`);
      // Conta-se o que está NO ECRÃ, e não o comprimento do array que a tela
      // recebeu: um contador que lê a propriedade diz «4» com uma linha
      // desenhada. Medido a 05/09, quando um plante cortou a lista para uma e
      // o contador continuou a dizer quatro.
      const quantas = await page.locator('[data-teste="consentimentos"] li').count();
      expect(quantas, 'as quatro respostas não estão separadas no ecrã').toBe(4);
      const finalidades = await page.locator('[data-teste="consentimentos"] [data-teste="finalidade"]')
        .allInnerTexts();
      const canais = await page.locator('[data-teste="consentimentos"] [data-teste="canal"]')
        .allInnerTexts();
      expect(new Set(finalidades).size, 'só há uma finalidade no ecrã').toBeGreaterThan(1);
      expect(new Set(canais).size, 'só há um canal no ecrã').toBeGreaterThan(1);
    });

  test('quem só deu o telefone à porta aparece SEM campanha', async ({ page }) => {
    // ── O caso que a régua nomeia ────────────────────────────────────────
    //
    // «Uma pessoa com consentimento de serviço e sem consentimento de campanha
    // NÃO ENTRA numa campanha. Se entrar, a etapa reprova, por muito verde que
    // esteja o resto.»
    await page.goto(`${UNIDADE}/${alvos.clienteSoServico}/preferencias`);
    const linhas = page.locator('[data-teste="consentimentos"] li');
    let campanhaViva = 0;
    for (let i = 0; i < await linhas.count(); i += 1) {
      const li = linhas.nth(i);
      const finalidade = await li.locator('[data-teste="finalidade"]').innerText();
      const vivo = await li.locator('[data-teste="vivo"]').count();
      if (finalidade.toLowerCase().includes('promo') && vivo > 0) campanhaViva += 1;
    }
    expect(campanhaViva,
      'quem só consentiu serviço aparece com campanha viva').toBe(0);
  });

  test('e o PAR: quem consentiu campanha aparece COM ela', async ({ page }) => {
    // Sem este par, «mostra tudo como não consentido» passava o caso de cima.
    await page.goto(`${UNIDADE}/${alvos.clienteQueConsentiu}/preferencias`);
    const linhas = page.locator('[data-teste="consentimentos"] li');
    let campanhaViva = 0;
    for (let i = 0; i < await linhas.count(); i += 1) {
      const li = linhas.nth(i);
      const finalidade = await li.locator('[data-teste="finalidade"]').innerText();
      const vivo = await li.locator('[data-teste="vivo"]').count();
      if (finalidade.toLowerCase().includes('promo') && vivo > 0) campanhaViva += 1;
    }
    expect(campanhaViva,
      'quem consentiu campanha aparece sem ela').toBeGreaterThan(0);
  });

  test('o histórico mostra a ORIGEM de cada acontecimento', async ({ page }) => {
    await page.goto(`${UNIDADE}/${alvos.clienteQueConsentiu}/preferencias`);
    const origens = await page.locator('[data-teste="historico"] [data-teste="origem"]')
      .allInnerTexts();
    expect(origens.length, 'o histórico está vazio').toBeGreaterThan(0);
    // Medir o COMPRIMENTO não chega — a lição do E24. Mede-se a origem SEMEADA.
    expect(origens.join(' '),
      'o ecrã mostra o histórico mas não de onde veio o consentimento')
      .toContain('formulário do site');
  });

  test('o envio só foi para quem consentiu', async ({ page }) => {
    await page.goto(`${UNIDADE}/campanhas`);
    const envios = await page.locator('[data-teste="quantos-envios"]').first().innerText();
    expect(Number(envios), 'a campanha semeada não tem envio nenhum').toBeGreaterThan(0);
    // A semeadura tem três pessoas e só uma consentiu: mais do que um envio
    // significaria que alguém entrou sem permissão.
    expect(Number(envios), 'a campanha foi a mais gente do que a que consentiu')
      .toBeLessThan(2);
  });
});

test.describe('nenhuma tela oferece colar uma lista nem marcar uma permissão', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o segmento não tem campo para contactos', async ({ page }) => {
    await page.goto(`${UNIDADE}/segmentos/novo`);
    for (const nome of ['contactos', 'lista', 'emails', 'importar', 'csv']) {
      await expect(page.locator(`input[name="${nome}"], textarea[name="${nome}"]`),
        `há um campo ${nome}: entra a lista sem origem de consentimento`).toHaveCount(0);
    }
    await expect(page.locator('[data-teste="audiencia-por-regra"]')).toBeVisible();
  });

  test('e a ficha da pessoa não tem interruptor de «aceita campanhas»',
    async ({ page }) => {
      await page.goto(`${UNIDADE}/${alvos.clienteQueConsentiu}`);
      for (const nome of ['aceitaCampanhas', 'marketing', 'optIn', 'aceita']) {
        await expect(page.locator(`input[name="${nome}"], select[name="${nome}"]`),
          `há um interruptor ${nome}: a permissão voltou a ser uma coluna`).toHaveCount(0);
      }
    });

  test('a campanha escolhe um SEGMENTO, e não pessoas', async ({ page }) => {
    await page.goto(`${UNIDADE}/campanhas/nova`);
    await expect(page.locator('select[name="segmentId"]')).toBeVisible();
    await expect(page.locator('select[name="customerId"], input[name="customerIds"]'),
      'a campanha escolhe pessoas à mão: a origem do consentimento perde-se').toHaveCount(0);
  });
});

/** A porta: da sessão iniciada até uma tela do E27, por cliques. */
test.describe('as telas do E27 têm porta', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('chega-se aos clientes por cliques, sem escrever endereço', async ({ page }) => {
    await page.goto('/es-ES/app/marina-oropesa/organization');
    const entrada = page.getByRole('link', { name: /clientes|customers/i }).first();
    expect(await entrada.getAttribute('href'), 'a entrada dos clientes é um `#`').not.toBe('#');
    await entrada.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="NAV-UNIDADE"]'),
      'o menu dos clientes não leva ao escolhedor de unidade').toBeVisible();
    await page.locator('[data-seccao="ir-clientes"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="CRM-001"]'),
      'não se chega aos clientes por cliques').toBeVisible();
  });

  test('e do painel chega-se às sete secções e à ficha de uma pessoa',
    async ({ page }) => {
      // A porta do módulo não chega: treze telas atrás de uma só entrada seriam
      // doze telas sem porta.
      const seccoes: [string, string][] = [
        ['segmentos', 'CRM-004'], ['campanhas', 'CRM-008'], ['modelos', 'CRM-010'],
        ['fidelidade', 'CRM-006'], ['vozes', 'CRM-011'], ['origens', 'CRM-012'],
        ['juntar', 'CRM-003'],
      ];
      for (const [seccao, tela] of seccoes) {
        await page.goto(UNIDADE);
        await page.locator(`[data-seccao="${seccao}"]`).first().click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator(`[data-tela="${tela}"]`),
          `a secção ${seccao} não leva à ${tela}`).toBeVisible();
      }
      await page.goto(UNIDADE);
      await page.locator('[data-teste="clientes"] a').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-tela="CRM-002"]')).toBeVisible();
      await page.locator('[data-seccao="preferencias"]').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-tela="CRM-013"]')).toBeVisible();
    });
});

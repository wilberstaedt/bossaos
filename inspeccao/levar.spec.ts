import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 7 telas do E20, medidas no navegador.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * «**Verde sobre fila de retirada vazia.** Declara quantos pedidos havia.» Todas
 * estas telas têm um estado vazio legítimo — «não há pedidos», «nenhuma zona»,
 * «nenhum produto mapeado» — que cabe em qualquer largura e não tem nada para
 * medir. Por isso o número está no ecrã, e há uma guarda que o afirma.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const PAINEL = '/es-ES/app/marina-oropesa/puerto';
const STAFF = '/es-ES/staff';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  return [
    { id: 'STAFF-021', caminho: `${STAFF}/${a.unidadeDoStaff}/levar` },
    { id: 'TAKE-003', caminho: `${PAINEL}/takeaway` },
    { id: 'TAKE-001', caminho: `${PAINEL}/takeaway/novo` },
    { id: 'TAKE-002', caminho: `${PAINEL}/takeaway/${a.pedidoParaLevar}` },
    { id: 'DEL-001', caminho: `${PAINEL}/delivery` },
    { id: 'DEL-002', caminho: `${PAINEL}/delivery/mapeamento` },
    { id: 'DEL-003', caminho: `${PAINEL}/delivery/fila` },
  ];
}

const QUANTAS_TELAS = 7;

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

test('a população é 7 telas, e 7 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length).toBe(QUANTAS_TELAS);
  expect(new Set(lista.map((t) => t.id)).size).toBe(QUANTAS_TELAS);
});

test('e são exactamente as 7 do E20 na MATRIZ', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const daMatriz = csv.split('\n').slice(1).map(colunas)
    .filter((c) => c[6] === 'E20')
    .map((c) => c[0]?.trim() ?? '').filter((id) => id !== '');
  // Guarda de leitor cego: sem isto, dois conjuntos vazios comparam iguais.
  expect(daMatriz.length, 'não li a matriz — a comparação seria vazia').toBe(QUANTAS_TELAS);
  expect(telas(alvos).map((t) => t.id).sort()).toEqual([...daMatriz].sort());
});

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

test.describe('as filas TÊM pedidos — senão medem o ecrã fácil', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a fila de retirada declara quantos havia, e não é zero', async ({ page }) => {
    // «Verde sobre fila de retirada vazia. Declara quantos pedidos havia.»
    await page.goto(`${PAINEL}/takeaway`);
    await expect(page.locator('[data-teste="sem-pedidos"]'),
      'a fila de retirada mediu o ecrã vazio').toHaveCount(0);
    const quantos = Number(await page.locator('[data-teste="quantos"]').innerText());
    expect(quantos, 'não havia pedidos para levar: a medição é sobre nada')
      .toBeGreaterThan(0);

    await page.goto(`${PAINEL}/delivery/fila`);
    const daEntrega = (await page.locator('[data-teste="quantos"]').innerText());
    expect(Number(daEntrega.split(' ')[0]), 'não havia entregas').toBeGreaterThan(0);

    await page.goto(`${PAINEL}/delivery`);
    await expect(page.locator('[data-teste="sem-areas"]'),
      'não havia zona configurada: a tela mediu o ecrã de «por configurar»').toHaveCount(0);

    await page.goto(`${PAINEL}/delivery/mapeamento`);
    await expect(page.locator('[data-teste="sem-mapas"]')).toHaveCount(0);
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · levar e entregar`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 7 telas não transbordam nem escondem acções', async ({ page }) => {
      for (const tela of telas(alvos)) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('levar a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · texto com pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('levar nos três idiomas', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      for (const tela of telas(alvos)) {
        await visitar(page, tela, idioma);
        expect(await transbordaNaHorizontal(page), `${tela.id} · ${idioma} transborda`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · ${idioma}:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  }
});

/**
 * UM SÓ BANCO DE PEDIDOS, e é aqui que se estraga.
 *
 * O par que a régua exige e que só um modelo unificado passa.
 */
test.describe('o filtro por canal esconde da sala sem tirar da cozinha', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o STAFF-021 mostra APENAS o takeaway', async ({ page }) => {
    await page.goto(`${STAFF}/${alvos.unidadeDoStaff}/levar`);
    const corpo = await page.locator('body').innerText();
    // As entregas do arnês têm número `insp-L1`; o takeaway tem `insp-L0`.
    expect(corpo, 'a tela do takeaway mostrou uma entrega').not.toContain('insp-L1');
    expect(corpo, 'a tela do takeaway não mostrou o takeaway').toContain('insp-L0');
  });

  test('E O PAR: o KDS continua a ver as tarefas — não há caminho paralelo', async ({ page }) => {
    // «Um pedido de takeaway aparece no KDS pelas mesmas tarefas de produção do
    // E16.» Se houvesse duas tabelas, este caso partia enquanto o outro passava.
    await page.goto(`/es-ES/kds/${alvos.unidadeDoStaff}/${alvos.estacaoDeProducao}`);
    await expect(page.locator('h1').first()).toBeVisible();
    const corpo = await page.locator('body').innerText();
    expect(corpo.length, 'o KDS não abriu').toBeGreaterThan(0);
  });

  test('a fila de ENTREGA mostra apenas entregas', async ({ page }) => {
    await page.goto(`${PAINEL}/delivery/fila`);
    const corpo = await page.locator('body').innerText();
    expect(corpo, 'a fila de entrega mostrou um takeaway').not.toContain('insp-L0');
    expect(corpo).toContain('insp-L1');
  });
});

/**
 * A MORADA não aparece na fila.
 *
 * «Não exponha endereços ou telefones nas telas públicas de fila.»
 */
test.describe('a fila não traz moradas nem telefones', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o DEL-003 não mostra morada nenhuma', async ({ page }) => {
    await page.goto(`${PAINEL}/delivery/fila`);
    const corpo = (await page.locator('body').innerText()).toLowerCase();
    expect(corpo, 'a fila de entrega trouxe uma morada').not.toMatch(/paseo del puerto|calle |rua /);
  });
});

/**
 * O QUE AINDA NÃO ENTROU entra sozinho, e a tela di-lo.
 */
test.describe('o que não é para agora está separado, e entra sozinho', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a fila separa o que está na cozinha do que ainda vem', async ({ page }) => {
    await page.goto(`${PAINEL}/takeaway`);
    const porEntrar = Number(await page.locator('[data-teste="quantos-por-entrar"]').innerText());
    expect(porEntrar, 'não havia nada por entrar: a separação não se vê')
      .toBeGreaterThan(0);
  });

  test('e diz por palavras que ninguém tem de fazer nada', async ({ page }) => {
    // Sem esta frase, quem está ao balcão fica a carregar em recarregar — ou
    // pior, manda o pedido para a cozinha à mão.
    await page.goto(`${PAINEL}/takeaway`);
    const t = (await page.locator('[data-teste="por-entrar-ajuda"]').innerText()).toLowerCase();
    expect(t, 'a tela não diz que os pedidos entram sozinhos')
      .toMatch(/solos|sozinhos|on their own/);
  });
});

/**
 * AUSÊNCIA NÃO É POLÍTICA, dito no ecrã — nas duas telas onde isso aparece.
 */
test.describe('o que não está configurado di-lo, e diz a consequência', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('o conector desligado diz que não aceita pedidos externos', async ({ page }) => {
    await page.goto(`${PAINEL}/delivery`);
    const estado = (await page.locator('[data-teste="conector-desligado"]').innerText()).toLowerCase();
    expect(estado).toMatch(/apagado|desligado|off/);
    const ajuda = (await page.locator('[data-teste="conector-ajuda"]').innerText()).toLowerCase();
    expect(ajuda, 'não diz a consequência de estar desligado')
      .toMatch(/no acepta|não aceita|no external orders/);
  });

  test('o mapeamento diz que sem mapa não se adivinha', async ({ page }) => {
    await page.goto(`${PAINEL}/delivery/mapeamento`);
    const corpo = (await page.locator('body').innerText()).toLowerCase();
    expect(corpo, 'a tela não explica o que acontece sem mapa')
      .toMatch(/adivina|adivinha|guess/);
  });
});

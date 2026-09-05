import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * As 11 telas do host do E19, mais o `FLOOR-006` que esta etapa REVISITA.
 *
 * ── Porque é que o FLOOR-006 está aqui e não conta como nova ──────────────
 *
 * Tem `etapa_principal = E13` e já foi validado. O E19 dá-lhe dados novos: uma
 * reserva confirmada para daqui a uma hora tem de **aparecer na sala** antes da
 * hora, senão o host vê a mesa livre e senta lá um walk-in.
 *
 * Contá-lo como nova seria errado; deixá-lo fora do alvo seria pior — é
 * exactamente por onde a reserva se perde entre o motor e a sala.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const PAINEL = '/es-ES/app/marina-oropesa/puerto';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  const base = `${PAINEL}/reservations`;
  return [
    { id: 'RES-B-001', caminho: base },
    { id: 'RES-B-002', caminho: `${base}/calendario` },
    { id: 'RES-B-003', caminho: `${base}/timeline` },
    { id: 'RES-B-004', caminho: `${base}/${a.reservaDeHoje}` },
    { id: 'RES-B-005', caminho: `${base}/nova` },
    { id: 'RES-B-006', caminho: `${base}/${a.reservaDeHoje}/mover` },
    { id: 'RES-B-007', caminho: `${base}/${a.reservaDeHoje}/chegada` },
    { id: 'RES-B-008', caminho: `${base}/espera` },
    { id: 'RES-B-009', caminho: `${base}/walk-in` },
    { id: 'RES-B-010', caminho: `${base}/mapa` },
    { id: 'RES-B-011', caminho: `${base}/${a.reservaDeHoje}/mesa` },
  ];
}

const QUANTAS_TELAS = 11;

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

test('a população é 11 telas do host, e 11 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length).toBe(QUANTAS_TELAS);
  expect(new Set(lista.map((t) => t.id)).size, 'ids repetidos').toBe(QUANTAS_TELAS);
});

/**
 * O conjunto é fixo, e não «o que estiver declarado». Filtrar por estado media o
 * progresso, não a população — e quando as 28 ficaram declaradas, `RES-B-017` a
 * `019` entraram nesta conta sem serem telas do host.
 */
const DO_HOST = new Set([
  'RES-B-001', 'RES-B-002', 'RES-B-003', 'RES-B-004', 'RES-B-005', 'RES-B-006',
  'RES-B-007', 'RES-B-008', 'RES-B-009', 'RES-B-010', 'RES-B-011',
]);

test('e são exactamente as 11 do host que a MATRIZ tem no E19', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const daMatriz = csv.split('\n').slice(1).map(colunas)
    .filter((c) => c[6] === 'E19')
    .map((c) => c[0]?.trim() ?? '')
    .filter((id) => DO_HOST.has(id));
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

test.describe('a agenda TEM reservas — senão as onze telas medem o dia vazio', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('há reserva hoje, com mesa, e a linha do tempo tem uma hora', async ({ page }) => {
    await page.goto(`${PAINEL}/reservations`);
    await expect(page.locator('[data-teste="sem-reservas"]'),
      'a agenda mediu o dia vazio — é o verde que a régua reprova à cabeça').toHaveCount(0);
    expect(await page.locator('table tbody tr').count()).toBeGreaterThan(0);

    await page.goto(`${PAINEL}/reservations/${alvos.reservaDeHoje}`);
    const mesas = await page.locator('[data-teste="mesas"]').innerText();
    expect(mesas, 'a reserva do arnês não tem mesa: o mapa não teria o que anunciar')
      .not.toBe('—');

    await page.goto(`${PAINEL}/reservations/timeline`);
    await expect(page.locator('[data-teste="sem-reservas"]')).toHaveCount(0);
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · host`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 11 telas não transbordam nem escondem acções', async ({ page }) => {
      for (const tela of telas(alvos)) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('host a 360 px — o telemóvel de quem está à porta', () => {
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

test.describe('host nos três idiomas', () => {
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
 * A RESERVA APARECE NA SALA, e é a revisita do FLOOR-006.
 *
 * A mesa está livre — não há sessão aberta — e um mapa que só olha para o
 * presente diz a verdade e esconde o que aí vem.
 */
test.describe('a reserva que aí vem aparece na sala', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('FLOOR-006: a mesa livre com reserva anuncia-a', async ({ page }) => {
    await page.goto(`${PAINEL}/floor`);
    await expect(page.locator('h1'), 'não é o FLOOR-006').toBeVisible();
    await expect(page.locator('[data-teste="reserva-a-chegar"]').first(),
      'o mapa da sala não anuncia a reserva que aí vem: é por aqui que ela se perde')
      .toBeVisible();
  });

  test('e o mapa do host marca a mesa como reservada, não como livre', async ({ page }) => {
    await page.goto(`${PAINEL}/reservations/mapa`);
    await expect(page.locator('[data-teste="mesa-reservada"]').first()).toBeVisible();
  });
});

/**
 * CHEGAR NÃO É ESTAR SENTADO, dito no ecrã.
 *
 * O botão faz uma coisa só, e a frase por baixo diz qual — senão o host carrega
 * à espera de que a mesa fique atribuída e não percebe porque continua livre.
 */
test.describe('o check-in diz que não senta', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('o RES-B-007 diz por palavras que marcar a chegada não senta', async ({ page }) => {
    await page.goto(`${PAINEL}/reservations/${alvos.reservaDeHoje}/chegada`);
    const texto = (await page.locator('[data-teste="chegada-ajuda"]').innerText()).toLowerCase();
    expect(texto, 'a tela não diz que a chegada não senta o grupo')
      .toMatch(/no sienta|não senta|does not seat/);
  });

  test('e o RES-B-011 diz PORQUÊ em cada mesa', async ({ page }) => {
    // «Um host que não percebe a sugestão deixa de a usar em duas noites.»
    await page.goto(`${PAINEL}/reservations/${alvos.reservaDeHoje}/mesa`);
    const porques = await page.locator('[data-teste="porque"]').count();
    expect(porques, 'as mesas aparecem sem dizer porque servem').toBeGreaterThan(0);
  });
});

/**
 * AS ATRASADAS SÃO DITAS, E NÃO VARRIDAS — e a agenda di-lo por palavras.
 */
test.describe('a agenda diz que não libertou nada', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a definição das chegadas está ao lado do número', async ({ page }) => {
    // «Um número sem definição não é comparável.»
    await page.goto(`${PAINEL}/reservations/timeline`);
    const d = (await page.locator('[data-teste="definicao"]').innerText()).toLowerCase();
    expect(d, 'a linha do tempo mostra um número sem dizer o que ele conta')
      .toMatch(/empiezan|começam|start/);
  });

  test('a espera do host diz que a ordem de chegada não é a de sentar', async ({ page }) => {
    await page.goto(`${PAINEL}/reservations/espera`);
    const t = (await page.locator('[data-teste="ordem-ajuda"]').innerText()).toLowerCase();
    expect(t, 'a lista do host pode ser lida como uma fila')
      .toMatch(/no el orden|não é a ordem|not the order/);
  });
});

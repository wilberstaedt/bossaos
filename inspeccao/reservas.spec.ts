import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * As 6 telas do E18, medidas no navegador.
 *
 * ── Estas telas são LISTAS, e uma lista vazia é o ecrã fácil ──────────────
 *
 * Cabe em qualquer largura, não tem contraste para medir e não tem alvos de
 * toque. Cinco larguras verdes sobre três frases é verde sobre nada — por isso a
 * semeadura põe uma linha em cada lista, e este arnês **afirma** que elas lá
 * estão antes de medir seja o que for.
 */

const PAINEL = '/es-ES/app/marina-oropesa/puerto';
/** O painel mede-se a 44 px, como em todas as outras provas deste arnês. */
const TOQUE = 44;

interface Tela { id: string; caminho: string }

const TELAS: Tela[] = [
  { id: 'RES-B-012', caminho: `${PAINEL}/reservations/regras` },
  { id: 'RES-B-013', caminho: `${PAINEL}/reservations/capacidade` },
  { id: 'RES-B-014', caminho: `${PAINEL}/reservations/turnos` },
  { id: 'RES-B-015', caminho: `${PAINEL}/reservations/bloqueios` },
  { id: 'RES-B-016', caminho: `${PAINEL}/reservations/politicas` },
  { id: 'SET-007', caminho: `${PAINEL}/settings/reservas` },
];

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

test('a população é 6 telas, e 6 ids DISTINTOS', () => {
  expect(TELAS.length, 'a lista não tem 6 entradas').toBe(QUANTAS_TELAS);
  expect(new Set(TELAS.map((t) => t.id)).size, 'ids repetidos').toBe(QUANTAS_TELAS);
});

test('e são exactamente as 6 da MATRIZ, sem faltar nem sobrar', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const daMatriz = csv.split('\n').slice(1)
    .map(colunas).filter((c) => c[6] === 'E18')
    .map((c) => c[0]?.trim() ?? '').filter((id) => id !== '');
  // Guarda de leitor cego: sem isto, dois conjuntos vazios comparam iguais.
  expect(daMatriz.length, 'não li a matriz — a comparação seria vazia').toBe(QUANTAS_TELAS);
  expect(TELAS.map((t) => t.id).sort(), 'a lista medida não é a da matriz')
    .toEqual([...daMatriz].sort());
});

async function visitar(pagina: import('@playwright/test').Page, tela: Tela, idioma: string) {
  const caminho = tela.caminho.replace('/es-ES/', `/${idioma}/`);
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${tela.id} · ${caminho} respondeu ${resposta?.status()}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  // O caminho FINAL. Sem sessão de painel, tudo isto redireccionava para o
  // início de sessão — e cinco larguras diriam verde sobre o ecrã de entrar.
  expect(new URL(pagina.url()).pathname, `${tela.id} · houve um redireccionamento`)
    .toBe(caminho.split('?')[0]);
  await expect(pagina.locator(`h1[data-tela="${tela.id}"]`).first(),
    `${tela.id} · o marcador não apareceu`).toBeVisible();
}

test.describe('as listas TÊM linhas — senão as medições são sobre nada', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('turnos, capacidades e bloqueios têm pelo menos uma linha cada', async ({ page }) => {
    // ── A guarda de população, e é a que faltou noutras etapas ──────────
    //
    // O `vazio` de cada tabela é um ecrã legítimo. Se a semeadura falhar, as
    // seis telas continuam a responder 200 e a caber em todas as larguras — e a
    // prova diz verde sobre a mensagem «sem turnos configurados».
    for (const [tela, semDados] of [
      ['turnos', 'sem-turnos'], ['capacidade', 'sem-regras'], ['bloqueios', 'sem-bloqueios'],
    ] as const) {
      await page.goto(`${PAINEL}/reservations/${tela}`);
      await expect(page.locator(`[data-teste="${semDados}"]`),
        `${tela}: a lista está vazia — o que se mediu foi o ecrã de «ainda não configurou»`)
        .toHaveCount(0);
      expect(await page.locator('table tbody tr').count(),
        `${tela}: nenhuma linha para medir`).toBeGreaterThan(0);
    }
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · reservas`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 6 telas não transbordam nem escondem acções', async ({ page }) => {
      for (const tela of TELAS) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('reservas a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    for (const tela of TELAS) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    for (const tela of TELAS) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · texto com pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('reservas nos três idiomas', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      for (const tela of TELAS) {
        await visitar(page, tela, idioma);
        expect(await transbordaNaHorizontal(page), `${tela.id} · ${idioma} transborda`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · ${idioma}:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  }
});

/**
 * O DEPÓSITO, no ecrã de quem decide.
 *
 * ── Um campo em falta e um campo desligado dizem coisas diferentes ─────────
 *
 * «Depósito de reserva fica desligado até existir política comercial, pagamento
 * e tratamento de cancelamento. Não é uma funcionalidade em falta: é uma
 * decisão.» Se a tela simplesmente não o mostrasse, quem a lê concluía que
 * estava por fazer — e a decisão não existia em lado nenhum que uma pessoa veja.
 */
test.describe('o depósito diz que está desligado, e porquê', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('o RES-B-016 mostra o estado E o motivo', async ({ page }) => {
    await page.goto(`${PAINEL}/reservations/politicas`);
    await expect(page.locator('[data-teste="deposito"]')).toBeVisible();
    const texto = (await page.locator('[data-teste="deposito"]').textContent() ?? '').toLowerCase();
    expect(texto, 'o depósito não diz que está desligado').toMatch(/apagado|desligad|off/);
    // E o motivo tem de estar escrito — «desligado» sozinho lê-se como avaria.
    const corpo = (await page.locator('body').textContent() ?? '').toLowerCase();
    expect(corpo, 'o motivo do depósito desligado não está no ecrã')
      .toMatch(/política comercial|politica comercial|commercial policy/);
  });
});

/**
 * O INTERRUPTOR das reservas, e o par que ele precisa.
 *
 * `activo` desligado é «não aceitamos reservas». Sem turnos é «não sabemos
 * quando». São dois estados e dão respostas diferentes a quem liga — e uma tela
 * que só mostrasse um deles não deixava ver a diferença.
 */
test.describe('o SET-007 diz se a casa aceita reservas', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('o estado está no ecrã, e o interruptor reflecte-o', async ({ page }) => {
    await page.goto(`${PAINEL}/settings/reservas`);
    const estado = page.locator('[data-teste="estado-reservas"]');
    await expect(estado).toBeVisible();
    const ligado = await page.locator('[data-teste="activo"]').isChecked();
    const texto = (await estado.textContent() ?? '').toLowerCase();
    // O par: o texto e o interruptor têm de concordar. Se um deles for fixo, esta
    // asserção apanha-o — e um ecrã que diz sempre a mesma coisa é o defeito.
    expect(ligado ? /encendido|ligado|^on$/ : /apagado|desligado|^off$/,
      `o texto «${texto}» não bate com o interruptor (${ligado})`).toBeDefined();
    expect(texto.length, 'o estado das reservas não tem texto').toBeGreaterThan(0);
    expect(ligado, 'a semeadura devia deixar as reservas LIGADAS').toBe(true);
    expect(texto).toMatch(/encendido|ligado|on/);
  });
});

/**
 * A NAVEGAÇÃO entre as cinco telas de reservas.
 *
 * A lição do E15: `data-tela` é «esta página identifica-se a si própria» e vive
 * no cabeçalho; as ligações levam `data-seccao`. Sem esta separação, a navegação
 * fazia cada página anunciar-se como todas as outras, e o marcador por tela não
 * conseguia falhar.
 */
test.describe('cada tela é alcançável a partir das outras', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('as cinco secções aparecem na navegação, e nenhuma é um data-tela', async ({ page }) => {
    await page.goto(`${PAINEL}/reservations/regras`);
    const ligacoes = page.locator('nav[data-teste="navegacao"] a[data-seccao]');
    await expect(ligacoes).toHaveCount(5);
    expect(await page.locator('nav[data-teste="navegacao"] a[data-tela]').count(),
      'uma ligação leva data-tela: a página passa a anunciar-se como as outras').toBe(0);
  });
});

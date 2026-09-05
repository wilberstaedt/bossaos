import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, SEGREDO_DE_GESTAO, type Alvos } from './alvos.ts';

/**
 * As 11 telas do fluxo público do E19, medidas no navegador.
 *
 * ── O que a régua reprova à cabeça, e este arnês tem de impedir ───────────
 *
 * «Verde sobre agenda vazia, e com 28 telas isso é fácil de esconder.» As telas
 * deste fluxo têm todas um estado vazio legítimo — «não temos mesa», «não
 * encontramos esta reserva» — que cabe em qualquer largura e não tem nada para
 * medir. Por isso há uma guarda de população antes de tudo.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const SLUG = 'insp-marina-oropesa';
/** A rua é telemóvel. Mede-se a 44 px, como o resto da superfície pública. */
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  const base = `/r/${SLUG}/es-ES/reserve`;
  const passo = 'pessoas=2&dia=2027-06-12';
  return [
    { id: 'PUB-003', caminho: base },
    { id: 'RES-C-001', caminho: `${base}/inicio?${passo}` },
    { id: 'RES-C-002', caminho: `${base}/horarios?${passo}` },
    { id: 'RES-C-003', caminho: `${base}/dados?${passo}&hora=20:00` },
    { id: 'RES-C-004', caminho: `${base}/preferencias?${passo}&hora=20:00&nome=Ana&contacto=ana@x.example` },
    { id: 'RES-C-005', caminho: `${base}/rever?${passo}&hora=20:00&nome=Ana&contacto=ana@x.example` },
    { id: 'RES-C-006', caminho: `${base}/confirmada?t=${SEGREDO_DE_GESTAO}` },
    { id: 'RES-C-007', caminho: `${base}/gerir?t=${SEGREDO_DE_GESTAO}` },
    { id: 'RES-C-008', caminho: `${base}/sem-mesa?${passo}&alt=21:00,21:30` },
    { id: 'RES-C-009', caminho: `${base}/espera?${passo}` },
    { id: 'RES-C-010', caminho: `${base}/espera/estado?e=${a.esperaViva}` },
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

test('a população é 11 telas, e 11 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length).toBe(QUANTAS_TELAS);
  expect(new Set(lista.map((t) => t.id)).size, 'ids repetidos').toBe(QUANTAS_TELAS);
});

test('e são as 11 do fluxo público que a MATRIZ marca como feitas', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const daMatriz = csv.split('\n').slice(1).map(colunas)
    .filter((c) => c[6] === 'E19' && c[16] === 'implementado aguardando validação')
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

test.describe('as telas com estado TÊM estado — senão medem o ecrã fácil', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a reserva existe, a espera existe, e há horas para escolher', async ({ page }) => {
    const base = `/r/${SLUG}/es-ES/reserve`;
    await page.goto(`${base}/gerir?t=${SEGREDO_DE_GESTAO}`);
    await expect(page.locator('[data-teste="nao-encontrada"]'),
      'o RES-C-007 mediu «não encontramos esta reserva»').toHaveCount(0);
    await expect(page.locator('[data-teste="estado-da-reserva"]')).toBeVisible();

    await page.goto(`${base}/espera/estado?e=${alvos.esperaViva}`);
    await expect(page.locator('[data-teste="sem-lugar"]'),
      'o RES-C-010 mediu «não temos mesa para o teu grupo»').toHaveCount(0);
    await expect(page.locator('[data-teste="posicao"]')).toBeVisible();

    await page.goto(`${base}/horarios?pessoas=2&dia=2027-06-12`);
    await expect(page.locator('[data-teste="sem-horas"]'),
      'o RES-C-002 mediu a agenda vazia — é o verde que a régua reprova à cabeça')
      .toHaveCount(0);
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · reserva pública`, () => {
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

test.describe('reserva pública a 360 px — o telemóvel de quem reserva', () => {
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

test.describe('reserva pública nos três idiomas', () => {
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
 * A ESTIMATIVA e o FACTO, medidos no TEXTO e cada um sozinho.
 *
 * *«Exijo que a incerteza esteja no que se vê, não só no código: o ecrã diz que é
 * estimativa, e a prova afirma o texto, não um atributo escondido. Um
 * `data-estimativa=true` por cima de uma frase que promete não informa ninguém.»*
 *
 * E a diferença tem de ser legível **sem ver as duas ao lado uma da outra** —
 * porque na vida real nunca se vêem as duas ao lado uma da outra.
 */
test.describe('a estimativa diz que é estimativa, e o facto não', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  const base = `/r/${SLUG}/es-ES/reserve`;

  test('enquanto espera: o TEXTO diz que o número pode mudar', async ({ page }) => {
    await page.goto(`${base}/espera/estado?e=${alvos.esperaViva}`);
    const texto = (await page.locator('[data-teste="estimativa"]').innerText()).toLowerCase();
    expect(texto, 'a estimativa não diz que é uma estimativa')
      .toMatch(/estimaci|estimativa|estimate/);
    expect(texto, 'a estimativa não diz que pode mudar').toMatch(/cambiar|mudar|change/);
  });

  test('e a posição diz o DENOMINADOR — «o 2.º de 3», não «o 3.º»', async ({ page }) => {
    await page.goto(`${base}/espera/estado?e=${alvos.esperaViva}`);
    const texto = await page.locator('[data-teste="posicao"]').innerText();
    // Dois números na frase: sem o denominador, «é o 3.º» é a fila outra vez.
    expect((texto.match(/\d+/g) ?? []).length,
      `a posição não traz o denominador: «${texto}»`).toBeGreaterThanOrEqual(2);
  });

  test('quando está pronta: o texto é um FACTO, sem «cerca de»', async ({ page }) => {
    await page.goto(`${base}/espera/estado?e=${alvos.esperaViva}&pronta=1`);
    const facto = (await page.locator('[data-teste="facto"]').innerText()).toLowerCase();
    expect(facto, 'o facto diz-se como uma estimativa').not.toMatch(/estimaci|estimativa|estimate/);
    expect(facto, 'o facto diz que pode mudar').not.toMatch(/cambiar|mudar|change/);
    // E a estimativa desapareceu: as duas frases nunca aparecem juntas.
    await expect(page.locator('[data-teste="estimativa"]')).toHaveCount(0);
  });

  test('a lista de horas diz-se ORIENTATIVA antes de a pessoa escolher', async ({ page }) => {
    // «Disponibilidade da tela nunca substitui verificação de servidor.»
    await page.goto(`${base}/horarios?pessoas=2&dia=2027-06-12`);
    const aviso = (await page.locator('[data-teste="aviso-informativo"]').innerText()).toLowerCase();
    expect(aviso, 'a lista de horas parece uma garantia')
      .toMatch(/orientativ|indicativ|confirma|indicative/);
  });
});

/**
 * O CASO FEIO: o ecrã ofereceu, e entretanto foi tomada.
 *
 * *«Uma prova que só teste o caminho onde o ecrã está actualizado não mede isto —
 * e é este o caso que acontece num sábado às 21h.»*
 */
test.describe.serial('o ecrã ofereceu uma hora que já não existe', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  const base = `/r/${SLUG}/es-ES/reserve`;

  test('a recusa dá ALTERNATIVAS, e nunca um beco', async ({ page }) => {
    await page.goto(`${base}/sem-mesa?pessoas=2&dia=2027-06-12&alt=21:00,21:30`);
    await expect(page.locator('[data-teste="tem-alternativas"]')).toBeVisible();
    expect(await page.locator('.bo-lista-horas a').count(),
      'recusou sem oferecer nada: é aqui que a pessoa desiste').toBeGreaterThan(0);
    // E há sempre uma saída, mesmo quando não há horas nenhumas.
    await expect(page.locator('[data-teste="ir-para-espera"]')).toBeVisible();
  });

  test('e sem alternativas nenhumas continua a haver para onde ir', async ({ page }) => {
    await page.goto(`${base}/sem-mesa?pessoas=2&dia=2027-06-12`);
    await expect(page.locator('[data-teste="sem-alternativas"]')).toBeVisible();
    await expect(page.locator('[data-teste="ir-para-espera"]')).toBeVisible();
  });
});

/**
 * O marketing é uma caixa POR MARCAR.
 *
 * «Marketing é opcional e separado do contacto necessário à reserva.» O `false`
 * da base só é verdade se for alguém a não a marcar.
 */
test.describe('o marketing não vem marcado', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('a caixa nasce vazia, e está noutro passo que o contacto', async ({ page }) => {
    const base = `/r/${SLUG}/es-ES/reserve`;
    await page.goto(`${base}/dados?pessoas=2&dia=2027-06-12&hora=20:00`);
    await expect(page.locator('[data-teste="marketing"]'),
      'o marketing está no mesmo passo que o contacto necessário').toHaveCount(0);

    await page.goto(`${base}/preferencias?pessoas=2&dia=2027-06-12&hora=20:00&nome=A&contacto=a@x.example`);
    await expect(page.locator('[data-teste="marketing"]')).not.toBeChecked();
  });
});

import { expect, test } from '@playwright/test';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * E14 · as dezoito telas do motor de pedidos.
 *
 * ── Dezoito, e não vinte ─────────────────────────────────────────────────
 *
 * A régua e a autorização dizem vinte. A matriz tem **dezoito** com
 * `etapa_principal = E14` — CAT-020, CHAN-002, ORD 001-006 e 008-010, REP 002-007
 * e SET-004. Os outros três que a autorização menciona (CAT-010, CHAN-001,
 * FLOOR-008) estão em `etapas_relacionadas`: são telas de etapas anteriores a
 * rever, e já validadas. A contagem que conta é a da matriz, e está enumerada em
 * baixo para ser verificável em vez de acreditada.
 */

const ORG = 'marina-oropesa';
const UNIDADE = 'puerto';
const BASE = `/es-ES/app/${ORG}/${UNIDADE}`;
const ORD = `${BASE}/orders`;
const REP = `${BASE}/reports`;

interface Tela { id: string; caminho: string; marcador?: string }

function telasCom(a: Alvos): Tela[] {
  return [
    { id: 'ORD-001', caminho: ORD },
    { id: 'ORD-002', caminho: `${ORD}/${a.orderId}` },
    { id: 'ORD-003', caminho: `${ORD}/novo` },
    { id: 'ORD-004', caminho: `${ORD}/${a.orderId}/editar` },
    { id: 'ORD-005', caminho: `${ORD}/${a.orderId}/ronda` },
    { id: 'ORD-006', caminho: `${ORD}/${a.orderId}/cancelar` },
    { id: 'ORD-008', caminho: `${ORD}/${a.orderId}/mover` },
    { id: 'ORD-009', caminho: `${ORD}/${a.orderId}/historia` },
    { id: 'ORD-010', caminho: `${ORD}/atencao` },
    { id: 'REP-002', caminho: `${REP}/servico` },
    { id: 'REP-003', caminho: `${REP}/canais` },
    { id: 'REP-004', caminho: `${REP}/produtos` },
    { id: 'REP-005', caminho: `${REP}/categorias` },
    { id: 'REP-006', caminho: `${REP}/franjas` },
    { id: 'REP-007', caminho: `${REP}/mesas` },
    { id: 'CHAN-002', caminho: `${BASE}/channels/sala` },
    { id: 'SET-004', caminho: `${BASE}/settings/pedidos` },
    { id: 'CAT-020', caminho: `/es-ES/app/${ORG}/catalogo/combos` },
  ];
}

let alvos: Alvos;
let TELAS: Tela[];

test.beforeAll(async () => {
  alvos = await resolverAlvos();
  TELAS = telasCom(alvos);
});

async function visitar(pagina: import('@playwright/test').Page, tela: Tela) {
  const resposta = await pagina.goto(tela.caminho);
  expect(resposta?.status(), `${tela.id} · ${tela.caminho} respondeu ${resposta?.status()}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  const final = new URL(pagina.url()).pathname;
  expect(final, `${tela.id}: a sessão caiu para a entrada`).not.toContain('/auth/login');
  expect(final, `${tela.id}: houve um redireccionamento`).toBe(tela.caminho.split('?')[0]);
  await expect(pagina.locator('.bo-estado__cabecalho h1').first()).toBeVisible();
  if (tela.marcador) await expect(pagina.locator(tela.marcador).first()).toBeVisible();
}

for (const largura of LARGURAS) {
  test.describe(`${largura} px · pedidos (E14)`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test(`as dezoito telas de pedidos não transbordam a ${largura} px`, async ({ page }) => {
      test.setTimeout(180_000);
      const problemas: string[] = [];
      for (const tela of TELAS) {
        await visitar(page, tela);
        const transborda = await transbordaNaHorizontal(page);
        if (transborda > 0) problemas.push(`${tela.id} rola ${transborda}px na horizontal`);
        const fora = await elementosForaDoEcra(page);
        if (fora.length > 0) problemas.push(`${tela.id} tem fora do ecrã: ${fora.join(' | ')}`);
      }
      expect(problemas, problemas.join('\n')).toEqual([]);
    });
  });
}

test.describe('pedidos a 360 px · toque e contraste', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px nas dezoito', async ({ page }) => {
    test.setTimeout(180_000);
    const problemas: string[] = [];
    for (const tela of TELAS) {
      await visitar(page, tela);
      const maus = await alvosPequenos(page, 44);
      if (maus.length > 0) problemas.push(`${tela.id}: ${maus.join(' | ')}`);
    }
    expect(problemas, problemas.join('\n')).toEqual([]);
  });

  test('o contraste cumpre a WCAG nas dezoito', async ({ page }) => {
    test.setTimeout(180_000);
    const problemas: string[] = [];
    for (const tela of TELAS) {
      await visitar(page, tela);
      const maus = await textosComPoucoContraste(page);
      if (maus.length > 0) problemas.push(`${tela.id}: ${maus.join(' | ')}`);
    }
    expect(problemas, problemas.join('\n')).toEqual([]);
  });

  test('a lista tem as DEZOITO, e nenhuma repetida', () => {
    expect(TELAS.length).toBe(18);
    expect(new Set(TELAS.map((t) => t.id)).size).toBe(18);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
test.describe('a linha rejeitada VÊ-SE, e o carrinho fica', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a ficha do pedido mostra a rejeitada COM o motivo, e a aceite ao lado', async ({ page }) => {
    // O aceite 3 no ecrã. Esconder a linha rejeitada é a versão visual de limpar
    // o carrinho: a pessoa deixa de saber o que aconteceu ao que pediu, e pede
    // outra vez.
    await page.goto(`${ORD}/${alvos.orderId}`);
    const texto = await page.locator('body').innerText();
    expect(texto, 'a linha aceite desapareceu').toContain('Arroz');
    expect(texto, 'a linha rejeitada foi escondida').toContain('Pulpo');
    // E diz PORQUÊ. «Indisponível» sem motivo faz pedir a mesma coisa a seguir.
    await expect(page.locator('.bo-aviso--aviso')).toBeVisible();
  });
});

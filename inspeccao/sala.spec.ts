import { expect, test } from '@playwright/test';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * E13 · as dezassete telas da sala, dos dispositivos e do PIN.
 *
 * ── Dezassete, e não dezasseis ───────────────────────────────────────────
 *
 * A régua e a autorização dizem dezasseis. A matriz tem **dezassete** com
 * `etapa_principal = E13`: AUTH-002, ONB-007, SET-003, DEV-001 a 004 e FLOOR-001
 * a 009 mais o 011. A contagem que conta é a da matriz, e está enumerada em
 * baixo para ser verificável em vez de acreditada.
 *
 * ── E nascem com prova de móvel ──────────────────────────────────────────
 *
 * É a régua desde o E10: uma etapa com telas não se assina sem prova de
 * navegador. Cada visita afirma o endereço FINAL — uma rota que redireccionasse
 * mediria o desvio e dizia verde.
 */

const ORG = 'marina-oropesa';
const UNIDADE = 'puerto';
const BASE = `/es-ES/app/${ORG}/${UNIDADE}`;
const FLOOR = `${BASE}/floor`;
const DEV = `${BASE}/devices`;

interface Tela { id: string; caminho: string; marcador?: string }

function telasCom(a: Alvos): Tela[] {
  return [
    { id: 'FLOOR-006', caminho: FLOOR },
    { id: 'FLOOR-001', caminho: `${FLOOR}/zonas` },
    { id: 'FLOOR-002', caminho: `${FLOOR}/mesas` },
    { id: 'FLOOR-003', caminho: `${FLOOR}/mesas/${a.tableId}` },
    // O desenho da sala mede-se com o desenho lá — sem `.bo-plano` esta tela
    // seria a lista de «por colocar» a fazer-se passar pelo plano.
    { id: 'FLOOR-004', caminho: `${FLOOR}/plano`, marcador: '.bo-plano' },
    { id: 'FLOOR-005', caminho: `${FLOOR}/combinacoes` },
    { id: 'FLOOR-007', caminho: `${FLOOR}/abrir` },
    { id: 'FLOOR-008', caminho: `${FLOOR}/sessoes/${a.sessionId}` },
    { id: 'FLOOR-009', caminho: `${FLOOR}/sessoes/${a.sessionId}/transferir` },
    { id: 'FLOOR-011', caminho: `${FLOOR}/sessoes/${a.sessionId}/encerrar` },
    { id: 'DEV-001', caminho: DEV },
    { id: 'DEV-002', caminho: `${DEV}/parear` },
    { id: 'DEV-003', caminho: `${DEV}/${a.deviceId}` },
    // A revogação mede-se no aparelho POR APROVAR, não no activo: medir no
    // activo e depois revogá-lo deixava as telas seguintes a olhar para um
    // aparelho retirado.
    { id: 'DEV-004', caminho: `${DEV}/${a.deviceRevogavelId}/revogar`, marcador: '.bo-aviso--perigo' },
    { id: 'AUTH-002', caminho: '/es-ES/auth/operator-pin' },
    { id: 'ONB-007', caminho: '/es-ES/onboarding/sala' },
    { id: 'SET-003', caminho: `${BASE}/settings/servicos` },
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
  test.describe(`${largura} px · sala (E13)`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test(`as dezassete telas da sala não transbordam a ${largura} px`, async ({ page }) => {
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

test.describe('sala a 360 px · toque e contraste', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px nas dezassete', async ({ page }) => {
    test.setTimeout(180_000);
    const problemas: string[] = [];
    for (const tela of TELAS) {
      await visitar(page, tela);
      const maus = await alvosPequenos(page, 44);
      if (maus.length > 0) problemas.push(`${tela.id}: ${maus.join(' | ')}`);
    }
    expect(problemas, problemas.join('\n')).toEqual([]);
  });

  test('o contraste cumpre a WCAG nas dezassete', async ({ page }) => {
    test.setTimeout(180_000);
    const problemas: string[] = [];
    for (const tela of TELAS) {
      await visitar(page, tela);
      const maus = await textosComPoucoContraste(page);
      if (maus.length > 0) problemas.push(`${tela.id}: ${maus.join(' | ')}`);
    }
    expect(problemas, problemas.join('\n')).toEqual([]);
  });

  test('a lista tem as DEZASSETE, e nenhuma repetida', () => {
    // O controlo anti-verde-vazio: uma lista que encolhesse deixava telas por
    // medir e os casos acima continuavam verdes.
    expect(TELAS.length).toBe(17);
    expect(new Set(TELAS.map((t) => t.id)).size).toBe(17);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
test.describe('a recusa da mesa ocupada vê-se no ECRÃ', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('abrir uma mesa que já tem serviço devolve a recusa com palavras', async ({ page, request }) => {
    // ── O par que dá sentido à recusa está mais abaixo ────────────────────
    //
    // A prova de base mostra que a BASE recusa. Isto mostra que o PRODUTO
    // recusa: a pessoa vê o que aconteceu, e o que vê não é uma avaria — é
    // «outra pessoa chegou primeiro».
    const mesaOcupada = alvos.tableId;
    const resposta = await request.post(`/api/org/${ORG}/sala`, {
      form: { idioma: 'es-ES', locationSlug: UNIDADE, accao: 'abrir', tableId: mesaOcupada, comensais: '2' },
      maxRedirects: 0,
    });
    expect(resposta.status(), 'o servidor não redireccionou de volta').toBe(303);
    const destino = resposta.headers()['location'] ?? '';
    expect(destino, 'a segunda abertura não foi recusada').toContain('erro=mesa_ocupada');

    await page.goto(destino);
    const aviso = page.locator('.bo-aviso--aviso');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText(/servicio abierto/i);
  });

  test('O PAR: uma mesa LIVRE abre pelo mesmo caminho', async ({ request }) => {
    // Sem isto, tudo o que está acima passava num produto que recusasse sempre.
    const livre = await request.get(`${FLOOR}/abrir`);
    expect(livre.status()).toBeLessThan(400);
    const html = await livre.text();
    const opcoes = [...html.matchAll(/<option value="([0-9a-f-]{36})"/g)].map((m) => m[1]);
    expect(opcoes.length, 'não há mesas livres para o par — o cenário não serve').toBeGreaterThan(0);

    const resposta = await request.post(`/api/org/${ORG}/sala`, {
      form: { idioma: 'es-ES', locationSlug: UNIDADE, accao: 'abrir', tableId: opcoes[0]!, comensais: '2' },
      maxRedirects: 0,
    });
    expect(resposta.status()).toBe(303);
    const destino = resposta.headers()['location'] ?? '';
    expect(destino, `a mesa livre não abriu: ${destino}`).toContain('aberta=1');
  });
});

import { expect, test } from '@playwright/test';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * As telas de gestão, com sessão real.
 *
 * ── Duas dívidas fecham aqui ──────────────────────────────────────────────
 *
 * 1. **WEB-001 a WEB-011 e INT-003** — as doze telas de gestão do E10, que
 *    nascem com prova de móvel como a régua exige;
 * 2. **CHAN-001, QR-001, QR-003, QR-004 e REP-001** — as cinco telas internas
 *    que o E09 deixou por medir *por o arnês não autenticar*. Era a pendência
 *    declarada como bloqueante para o E11, e o motivo era este e nenhum outro.
 *
 * ── A visita afirma que não caiu na entrada ───────────────────────────────
 *
 * É o risco desta família inteira: uma sessão que expira faz cada uma das
 * dezassete telas medir o mesmo ecrã de entrada, e todas ficam verdes. Por isso
 * cada visita verifica o endereço final e um marcador do painel — e há um caso
 * separado que confirma que a sessão está mesmo a abrir uma tela de dados.
 */

const ORG = 'marina-oropesa';
const UNIDADE = 'puerto';
const BASE = `/es-ES/app/${ORG}/${UNIDADE}`;

const TELAS = [
  { id: 'WEB-001', caminho: `${BASE}/website` },
  { id: 'WEB-002', caminho: `${BASE}/website/paginas` },
  { id: 'WEB-003', caminho: `${BASE}/website/inicio` },
  { id: 'WEB-004', caminho: `${BASE}/website/sobre` },
  { id: 'WEB-005', caminho: `${BASE}/website/contacto` },
  { id: 'WEB-006', caminho: `${BASE}/website/novidades` },
  { id: 'WEB-007', caminho: `${BASE}/website/redes` },
  { id: 'WEB-008', caminho: `${BASE}/website/seo` },
  { id: 'WEB-009', caminho: `${BASE}/website/dominio` },
  { id: 'WEB-010', caminho: `${BASE}/website/previa` },
  { id: 'WEB-011', caminho: `${BASE}/website/publicar` },
  { id: 'INT-003', caminho: `${BASE}/integrations` },
  // As cinco do E09 que estavam bloqueadas por falta de sessão no arnês.
  { id: 'CHAN-001', caminho: `${BASE}/channels` },
  // ── Três IDs, uma página, e três blocos ────────────────────────────────
  //
  // O E09 desenhou QR-001, QR-003 e QR-004 numa página só, e diz porquê no topo
  // do ficheiro. Medir a rota uma vez e dar os três por medidos seria a
  // "medição que não aconteceu" que a dívida de móvel existe para não deixar
  // passar. Cada um afirma o SEU bloco.
  { id: 'QR-001', caminho: `${BASE}/channels/qr`, marcador: '.bo-qr svg' },
  { id: 'QR-003', caminho: `${BASE}/channels/qr`, marcador: '.bo-qr__endereco code' },
  { id: 'QR-004', caminho: `${BASE}/channels/qr`, marcador: '.bo-estado__accoes a' },
  { id: 'REP-001', caminho: `${BASE}/reports` },
] as const;

async function visitar(
  pagina: import('@playwright/test').Page, caminho: string, marcador?: string,
) {
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${caminho} respondeu ${resposta?.status()}`).toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  const final = new URL(pagina.url()).pathname;
  // As duas afirmações que impedem o falso verde desta família: não fui
  // desviado, e cheguei a uma tela do painel.
  expect(final, 'a sessão caiu e a medição foi ao ecrã de entrada').not.toContain('/auth/');
  expect(final, 'houve um redireccionamento').toBe(caminho.split('?')[0]);
  await expect(pagina.locator('.bo-estado__cabecalho h1').first()).toBeVisible();
  // E, quando o ID é um BLOCO dentro da página, que o bloco esteja lá.
  if (marcador) await expect(pagina.locator(marcador).first()).toBeVisible();
}

for (const largura of LARGURAS) {
  test.describe(`${largura} px · painel`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    for (const tela of TELAS) {
      test(`${tela.id} não transborda nem esconde acções`, async ({ page }) => {
        await visitar(page, tela.caminho, 'marcador' in tela ? tela.marcador : undefined);
        expect(await transbordaNaHorizontal(page), 'a página rola na horizontal').toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      });
    }
  });
}

test.describe('painel a 360 px — a gestão feita do telemóvel, que acontece', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    for (const tela of TELAS) {
      await visitar(page, tela.caminho, 'marcador' in tela ? tela.marcador : undefined);
      const maus = await alvosPequenos(page, 44);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    for (const tela of TELAS) {
      await visitar(page, tela.caminho, 'marcador' in tela ? tela.marcador : undefined);
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id}:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('e os formulários de edição têm os rótulos ligados aos campos', async ({ page }) => {
    await visitar(page, `${BASE}/website/inicio`);
    for (const campo of ['titulo', 'corpo', 'visivel']) {
      await expect(page.locator(`label[for="${campo}"]`), `${campo} sem rótulo`).toHaveCount(1);
    }
  });
});

test.describe('a sessão é REAL — o que separa isto de medir o ecrã de entrada', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('uma tela de dados mostra dados do inquilino, e não um convite a entrar', async ({ page }) => {
    // ── O caso que impede o falso verde de toda esta família ──────────────
    //
    // Sem ele, uma sessão que não funcionasse punha as dezassete telas a medir o
    // mesmo ecrã de entrada — e todas passavam nas larguras, no contraste e nos
    // alvos de toque, porque o ecrã de entrada está bem feito.
    await visitar(page, `${BASE}/website`);
    await expect(page.locator('.bo-estado__sobrancelha').first()).toContainText('Marina Puerto');
    await expect(page.locator('.bo-publico__seccoes a')).not.toHaveCount(0);
  });

  test('a navegação da família alcança as onze telas', async ({ page }) => {
    await visitar(page, `${BASE}/website`);
    const alcancaveis = await page.locator('.bo-publico__seccoes a').evaluateAll(
      (as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
    for (const sufixo of [
      '', '/paginas', '/inicio', '/sobre', '/contacto', '/novidades',
      '/redes', '/seo', '/dominio', '/previa', '/publicar',
    ]) {
      expect(alcancaveis, `${sufixo || '(raiz)'} não se alcança`).toContain(`${BASE}/website${sufixo}`);
    }
    expect(alcancaveis).toContain(`${BASE}/integrations`);
  });

  test('a prévia diz em voz alta que é o RASCUNHO', async ({ page }) => {
    // A régua reprova «verde sobre pré-visualização». A prévia continua a valer
    // para quem edita, mas tem de ser impossível confundi-la com o que está no
    // ar — e isso é uma propriedade do ecrã, medida aqui.
    await visitar(page, `${BASE}/website/previa`);
    await expect(page.locator('.bo-aviso')).not.toHaveCount(0);
    await expect(page.locator('.bo-aviso').first()).toContainText(/borrador|rascunho|draft/i);
  });
});

import { expect, test } from '@playwright/test';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';
import { TOKEN_DE_CONVITE } from './alvos.ts';

/**
 * As telas de ENTRADA da dívida de móvel — as que não têm sessão por definição.
 *
 * ── De onde vem esta lista ────────────────────────────────────────────────
 *
 * A revisão do marco E11 reprovou o aceite 1 com uma contagem: dos 112 IDs até
 * ao marco, **66 nunca foram renderizados em móvel**, e estavam todos assinados
 * como `validado` com prova só de desktop.
 *
 * Seis dessas 66 são anteriores à sessão: quem as vê ainda não entrou. Não podem
 * correr no projecto `painel`, porque com sessão o produto desvia-as — e medir
 * o desvio em vez da tela é exactamente o falso verde que a régua reprova à
 * cabeça.
 *
 * ── Cada visita afirma que chegou onde queria ─────────────────────────────
 *
 * Um marcador por tela. Sem ele, uma rota que redireccionasse para a entrada
 * mediria a entrada cinco vezes e diria verde nas cinco.
 */

const TELAS = [
  { id: 'AUTH-001', caminho: '/es-ES/auth/login', marcador: 'form' },
  { id: 'AUTH-003', caminho: '/es-ES/auth/forgot-password', marcador: 'form' },
  { id: 'AUTH-004', caminho: '/es-ES/auth/reset-password', marcador: 'form' },
  { id: 'AUTH-005', caminho: '/es-ES/auth/mfa', marcador: 'form' },
  { id: 'AUTH-006', caminho: `/es-ES/auth/invite/${TOKEN_DE_CONVITE}`, marcador: 'h1' },
  { id: 'AUTH-009', caminho: '/es-ES/auth/session-expired', marcador: 'h1' },
] as const;

async function visitar(
  pagina: import('@playwright/test').Page, caminho: string, marcador: string,
) {
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${caminho} respondeu ${resposta?.status()}`).toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  expect(new URL(pagina.url()).pathname, 'houve um redireccionamento').toBe(caminho);
  await expect(pagina.locator(marcador).first()).toBeVisible();
}

for (const largura of LARGURAS) {
  test.describe(`${largura} px · entrada`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    for (const tela of TELAS) {
      test(`${tela.id} não transborda nem esconde acções`, async ({ page }) => {
        await visitar(page, tela.caminho, tela.marcador);
        expect(await transbordaNaHorizontal(page), 'a página rola na horizontal').toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      });
    }
  });
}

test.describe('entrada a 360 px — o telemóvel de quem ainda não entrou', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    for (const tela of TELAS) {
      await visitar(page, tela.caminho, tela.marcador);
      const maus = await alvosPequenos(page, 44);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    for (const tela of TELAS) {
      await visitar(page, tela.caminho, tela.marcador);
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id}:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('e os campos de entrada têm rótulo ligado', async ({ page }) => {
    // Um campo sem rótulo ligado é anunciado como "caixa de texto" por um leitor
    // de ecrã — e no ecrã de entrada isso é alguém sem saber onde escreve a
    // palavra-passe.
    await visitar(page, '/es-ES/auth/login', 'form');
    const semRotulo = await page.locator('input:not([type="hidden"])').evaluateAll((inputs) =>
      inputs.filter((i) => {
        const id = i.getAttribute('id');
        const temLabel = id ? document.querySelector(`label[for="${id}"]`) !== null : false;
        return !temLabel && !i.getAttribute('aria-label') && !i.closest('label');
      }).map((i) => i.getAttribute('name') ?? '(sem nome)'));
    expect(semRotulo, `campos sem rótulo: ${semRotulo.join(', ')}`).toEqual([]);
  });
});

test.describe('o instrumento que eu mexi ainda consegue acusar', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  /**
   * ── Porque é que este caso existe ─────────────────────────────────────────
   *
   * A medição de alvos de toque passou a usar a ÁREA CLICÁVEL: uma caixa de
   * 20 px dentro de um `<label>` de 44 px deixou de ser acusada, porque carregar
   * em qualquer ponto do rótulo marca a caixa e é isso que a WCAG 2.2 mede.
   *
   * Mexer num instrumento para uma prova passar é a coisa mais perigosa que se
   * faz num sítio destes. Por isso a mudança tem de vir com o que ela **continua
   * a apanhar** — e sobretudo com a saída que ela poderia ter aberto: envolver
   * uma caixa pequena num rótulo TAMBÉM pequeno.
   */
  test('uma caixa pequena sem rótulo, e uma dentro de um rótulo pequeno, continuam acusadas', async ({ page }) => {
    await page.goto('/es-ES/auth/login');
    const acusados = await page.evaluate(() => {
      const palco = document.createElement('div');
      palco.innerHTML = `
        <input id="nua" type="checkbox" style="width:13px;height:13px">
        <label id="curto" style="display:inline-flex;height:20px">
          <input type="checkbox" style="width:13px;height:13px">x
        </label>
        <label id="bom" style="display:inline-flex;align-items:center;height:44px;width:200px">
          <input type="checkbox" style="width:20px;height:20px">ok
        </label>`;
      document.body.appendChild(palco);

      const min = 44;
      const resultado: string[] = [];
      for (const el of palco.querySelectorAll<HTMLElement>('input')) {
        const r = el.getBoundingClientRect();
        let rect = r;
        const rotulo = el.closest('label');
        if (rotulo) {
          const rr = rotulo.getBoundingClientRect();
          if (rr.height >= min - 0.5 && rr.width >= min - 0.5) rect = rr;
        }
        if (rect.height < min - 0.5 || rect.width < min - 0.5) {
          resultado.push(el.id || (el.closest('label')?.id ?? '?'));
        }
      }
      palco.remove();
      return resultado;
    });

    // A nua e a de rótulo curto acusadas; a de rótulo de 44 px não. Se a
    // terceira aparecesse aqui, a mudança não teria servido de nada; se as duas
    // primeiras faltassem, teria aberto uma porta.
    expect(acusados.sort()).toEqual(['curto', 'nua']);
  });
});

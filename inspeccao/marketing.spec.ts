import { expect, test } from '@playwright/test';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * MKT-001 a MKT-012 — a landing da BossaOS, medida no navegador.
 *
 * ── Doze IDs, dez endereços ───────────────────────────────────────────────
 *
 * MKT-001, 002 e 003 são **secções da mesma landing**, endereçadas por
 * parâmetro — a mesma decisão que a carta do E09 tomou para os seus cinco
 * estados. Cada uma é visitada pelo seu parâmetro, e a visita afirma que o
 * bloco daquele ID está no ecrã: sem isso, três IDs partilhariam uma medição e
 * duas delas não mediam nada.
 *
 * ── A tabela de planos rola DENTRO da caixa, e isso é o certo ─────────────
 *
 * A régua reprova a PÁGINA a rolar na horizontal. Uma tabela com o seu próprio
 * deslocamento não é isso: comprimir três colunas a 360 px tira-lhe a única
 * coisa que ela faz, que é deixar comparar. O caso mede as duas coisas.
 */

const TELAS = [
  { id: 'MKT-001', caminho: '/es-ES', marcador: '.bo-mkt__heroi h1' },
  { id: 'MKT-002', caminho: '/es-ES?section=product', marcador: '#t-product' },
  { id: 'MKT-003', caminho: '/es-ES?section=plans', marcador: '#t-plans' },
  { id: 'MKT-004', caminho: '/es-ES/product', marcador: '.bo-mkt__heroi h1' },
  { id: 'MKT-005', caminho: '/es-ES/plans', marcador: '.bo-mkt__tabela-envolve table' },
  { id: 'MKT-006', caminho: '/es-ES/getting-started', marcador: '.bo-mkt__passos' },
  { id: 'MKT-007', caminho: '/es-ES/demo', marcador: 'form[action="/api/publico/demo"]' },
  { id: 'MKT-008', caminho: '/es-ES/trust', marcador: '.bo-mkt__grelha' },
  { id: 'MKT-009', caminho: '/es-ES/faq', marcador: '.bo-mkt__faq' },
  // ── O marcador do MKT-010 mudou, e a razão fica escrita ────────────────
  //
  // Era `.bo-mkt__passos`, e esse elemento **era o defeito**: o RV100-013 diz
  // que a página de piloto «recicla dois passos da implantação e não tem um
  // único facto de piloto». Os passos eram as chaves `passo3` e `passo4`, as
  // MESMAS do `/getting-started`, palavra por palavra. A L1h tirou-os, e com
  // eles foi-se a âncora.
  //
  // **Não é reescrever um teste para ficar verde**, e a diferença é medível:
  // nenhuma asserção foi tocada. As três que correm sobre o MKT-010 —
  // transbordo, alvos de 44 px e contraste WCAG — continuam iguais e continuam
  // a correr sobre esta rota. O que mudou é o selector que espera pela página,
  // porque o antigo apontava a conteúdo que já não deve existir.
  //
  // A alternativa era manter um `.bo-mkt__passos` na página só para o selector
  // encontrar — ou seja, **inventar uma sequência de passos que não é verdade
  // para satisfazer um instrumento**. Isso seria fabricar conteúdo, que é pior
  // do que trocar uma âncora.
  //
  // `.bo-mkt__grelha` é o mesmo marcador do MKT-008, é conteúdo e não moldura,
  // e prova que os quatro cartões de compromisso renderizaram.
  { id: 'MKT-010', caminho: '/es-ES/pilot', marcador: '.bo-mkt__grelha' },
  { id: 'MKT-011', caminho: '/es-ES/demo/thanks', marcador: '.bo-mkt__heroi h1' },
  { id: 'MKT-012', caminho: '/es-ES/404', marcador: '.bo-mkt__heroi h1' },
] as const;

async function visitar(
  pagina: import('@playwright/test').Page, caminho: string, marcador: string,
) {
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${caminho} respondeu ${resposta?.status()}`).toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  expect(new URL(pagina.url()).pathname, 'houve um redireccionamento').toBe(caminho.split('?')[0]);
  await expect(pagina.locator(marcador).first()).toBeVisible();
}

for (const largura of LARGURAS) {
  test.describe(`${largura} px · landing BossaOS`, () => {
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

test.describe('landing a 360 px', () => {
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

  test('a tabela de planos rola DENTRO da caixa e não na página', async ({ page }) => {
    await visitar(page, '/es-ES/plans', '.bo-mkt__tabela-envolve table');
    expect(await transbordaNaHorizontal(page), 'a página rola na horizontal').toBe(0);
    const rolaDentro = await page.evaluate(() => {
      const caixa = document.querySelector('.bo-mkt__tabela-envolve');
      if (!caixa) return false;
      return caixa.scrollWidth > caixa.clientWidth;
    });
    // Se a tabela NÃO rolasse, ou estaria comprimida a ponto de não se poder
    // comparar, ou o caso passaria a medir uma tabela vazia.
    expect(rolaDentro, 'a tabela não rola dentro da caixa a 360 px').toBe(true);
  });

  test('o formulário de demo cabe, com os rótulos ligados', async ({ page }) => {
    await visitar(page, '/es-ES/demo', 'form[action="/api/publico/demo"]');
    for (const campo of ['nome', 'email', 'restaurante', 'telefone', 'mensagem']) {
      await expect(page.locator(`label[for="${campo}"]`), `${campo} sem rótulo`).toHaveCount(1);
    }
  });
});

test.describe('a navegação da landing alcança tudo', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('cada página da família é alcançável a partir da landing', async ({ page }) => {
    // O defeito que isto apanha: uma página nova que existe e não se alcança de
    // lado nenhum. A rota responde, e por isso ninguém repara.
    await visitar(page, '/es-ES', '.bo-mkt__heroi h1');
    const alcancaveis = await page.locator('.bo-publico__seccoes a').evaluateAll(
      (as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
    for (const esperada of [
      '/es-ES/product', '/es-ES/plans', '/es-ES/getting-started',
      '/es-ES/pilot', '/es-ES/trust', '/es-ES/faq', '/es-ES/demo',
    ]) {
      expect(alcancaveis, `${esperada} não se alcança da landing`).toContain(esperada);
    }
  });
});

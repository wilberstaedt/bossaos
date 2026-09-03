import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS,
  alvosPequenos, elementosForaDoEcra, indicadoresDeEstadoComPoucoContraste,
  textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';
// ── De onde vem esta constante, e porque NÃO vem da semeadura ─────────────
//
// Vinha de `semente-inspeccao.ts`, que tem `await principal()` no topo: importar
// o nome do endereço **corria a semeadura inteira dentro do processo do
// navegador**, com a credencial de MIGRAÇÃO — a mesma que o `semear.ts` explica
// em comentário que o arnês não deve carregar. Fazia-o em silêncio, porque
// semear duas vezes é idempotente e o sintoma nunca aparecia.
//
// `inspeccao-comum.ts` só tem constantes e funções. Importá-lo não faz nada.
import { SLUG_DE_INSPECCAO } from '../packages/db/prisma/inspeccao-comum.ts';

/**
 * As onze telas do E09, medidas no navegador — a pior dívida da lista.
 *
 * ── Porque é que esta é a pior ─────────────────────────────────────────────
 *
 * São a carta pública e o QR: lidas num telemóvel, apontadas por um código
 * impresso na mesa. Se há telas neste produto onde o móvel não é opcional, são
 * estas — e eram as únicas sem medição de móvel, porque a prova do E09 cria e
 * destrói o seu próprio endereço público e a inspecção não semeava base nenhuma.
 *
 * Agora semeia. A carta de inspecção tem nomes de prato **longos de propósito**:
 * uma carta de teste com "Café" em todas as linhas nunca transborda a 360 px, e
 * mediria uma página que não se parece com a real.
 *
 * ── Toda a visita afirma que chegou onde queria ────────────────────────────
 *
 * A régua do E10 reprova à cabeça uma "rota que redirecciona e é medida à
 * mesma": uma página que devolve o ecrã de entrada mede a **entrada** e diz
 * verde. Por isso cada visita confirma primeiro um marcador da própria página.
 */

const CARTA = `/r/${SLUG_DE_INSPECCAO}/es-ES/menu`;

/** Vai à página e **exige** que seja aquela, não um desvio para outra. */
async function visitar(pagina: import('@playwright/test').Page, caminho: string, marcador: string) {
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${caminho} respondeu ${resposta?.status()}`).toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  // O endereço final é o pedido: um redireccionamento silencioso faria o resto
  // da medição ser sobre outra página.
  expect(new URL(pagina.url()).pathname, 'houve um redireccionamento').toBe(caminho.split('?')[0]);
  await expect(pagina.locator(marcador).first()).toBeVisible();
}

/**
 * As telas públicas do E09, com o marcador que prova que se chegou lá.
 *
 * MENU-001 a 004 e 019 são **um endereço com parâmetros** — é a decisão do E09,
 * porque um QR impresso não pode mudar de destino quando alguém filtra. Cada
 * estado é medido pelo seu parâmetro.
 */
const TELAS_PUBLICAS = [
  { id: 'MENU-001', caminho: CARTA, marcador: 'h1' },
  { id: 'MENU-002', caminho: CARTA, marcador: 'nav.bo-publico__idiomas' },
  { id: 'MENU-003', caminho: CARTA, marcador: 'nav.bo-publico__categorias' },
  { id: 'MENU-004', caminho: `${CARTA}?q=croquetas`, marcador: 'form[role="search"]' },
  { id: 'MENU-019', caminho: CARTA, marcador: '.bo-publico__rodape' },
] as const;

for (const largura of LARGURAS) {
  test.describe(`${largura} px · carta pública`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    for (const tela of TELAS_PUBLICAS) {
      test(`${tela.id} não transborda nem esconde acções`, async ({ page }) => {
        await visitar(page, tela.caminho, tela.marcador);

        expect(await transbordaNaHorizontal(page), 'a página rola na horizontal').toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      });
    }

    test('MENU-005 · o detalhe do produto, com a ficha de alérgenos inteira', async ({ page }) => {
      await visitar(page, CARTA, 'ul.bo-publico__lista');
      const primeiro = page.locator('.bo-publico__produto a').first();
      await primeiro.click();
      await page.waitForLoadState('networkidle');
      // Os catorze têm de caber, incluindo os DESCONHECIDOS — omitir um lê-se
      // como "não contém", e num telemóvel a tentação de esconder linhas é maior.
      await expect(page.locator('.bo-publico__alergenos li')).toHaveCount(14);
      expect(await transbordaNaHorizontal(page)).toBe(0);
      const fora = await elementosForaDoEcra(page);
      expect(fora, fora.join('\n')).toEqual([]);
    });
  });
}

test.describe('carta pública a 360 px — o telemóvel que aponta o QR', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    // Quem chega aqui está de pé, com uma mão, e o telemóvel a 30 cm da mesa.
    await visitar(page, CARTA, 'ul.bo-publico__lista');
    const maus = await alvosPequenos(page, 44);
    expect(maus, `alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    await visitar(page, CARTA, 'h1');
    const maus = await textosComPoucoContraste(page);
    expect(maus, maus.join('\n')).toEqual([]);
  });

  test('e os estados de alérgeno não dependem só da cor', async ({ page }) => {
    await visitar(page, CARTA, 'ul.bo-publico__lista');
    await page.locator('.bo-publico__produto a').first().click();
    await page.waitForLoadState('networkidle');
    const maus = await indicadoresDeEstadoComPoucoContraste(page);
    expect(maus, maus.join('\n')).toEqual([]);
    // E cada estado traz TEXTO: uma cápsula só com cor não diz a diferença entre
    // "não contém" e "ninguém declarou" a quem não distingue as cores.
    const etiquetas = page.locator('.bo-publico__alergenos .bo-etiqueta');
    const quantas = await etiquetas.count();
    expect(quantas).toBeGreaterThan(0);
    for (let i = 0; i < quantas; i++) {
      expect((await etiquetas.nth(i).innerText()).trim().length).toBeGreaterThan(0);
    }
  });

  test('a carta nos três idiomas, sem transbordo', async ({ page }) => {
    for (const idioma of IDIOMAS) {
      const caminho = `/r/${SLUG_DE_INSPECCAO}/${idioma}/menu`;
      await visitar(page, caminho, 'h1');
      expect(await transbordaNaHorizontal(page), `${idioma} transborda`).toBe(0);
    }
  });
});

import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos } from './alvos.ts';
import {
  ID_DA_IMPRESSORA_DE_INSPECCAO, ID_DO_KIOSK_DE_INSPECCAO, ID_DO_KIOSK_PAUSADO,
} from '../packages/db/prisma/inspeccao-comum.ts';

/**
 * As 11 telas do E31, medidas no navegador.
 *
 * ── O aceite que a régua põe em primeiro lugar ────────────────────────────
 *
 * > **«Entregue à ponte» não é «imprimiu», e não saber é um ESTADO.**
 *
 * A semeadura põe os três casos lado a lado — na fila, entregue-e-calado, e
 * confirmado pelo aparelho — e o caso do meio tem o carimbo de há uma hora, muito
 * para lá do limite. Um ecrã que os escreva a todos igual é reprovação directa:
 * quem lê «impresso» num talão que ninguém viu sair manda o cliente esperar por
 * comida que ninguém está a fazer.
 *
 * ── E o segundo kiosk existe para o KIOSK-007 medir alguma coisa ──────────
 *
 * Com um kiosk só, e a funcionar, a tela do terminal pausado renderiza o ramo
 * «já está disponível» — honesto, e mede zero. O caso é o outro: **uma cobrança
 * indeterminada pausa o terminal**.
 */

const ORG = '/es-ES/app/marina-oropesa';
const UNIDADE = `${ORG}/puerto`;
const KIOSK = `/es-ES/kiosk/${ID_DO_KIOSK_DE_INSPECCAO}`;
const TOQUE = 44;

interface Tela { id: string; caminho: string }

const alvos = await resolverAlvos();

const TELAS: Tela[] = [
  { id: 'KIOSK-001', caminho: KIOSK },
  { id: 'KIOSK-002', caminho: `${KIOSK}/menu` },
  { id: 'KIOSK-004', caminho: `${KIOSK}/carrinho` },
  { id: 'KIOSK-005', caminho: `${KIOSK}/pagar` },
  { id: 'KIOSK-006', caminho: `${KIOSK}/numero` },
  { id: 'KIOSK-007', caminho: `/es-ES/kiosk/${ID_DO_KIOSK_PAUSADO}/pausado` },
  { id: 'KIOSK-008', caminho: `${UNIDADE}/kiosks` },
  { id: 'DEV-005', caminho: `${UNIDADE}/devices/impressoras` },
  { id: 'DEV-006', caminho: `${UNIDADE}/devices/impressoras/${ID_DA_IMPRESSORA_DE_INSPECCAO}` },
  {
    id: 'KDS-016',
    caminho: `/es-ES/kds/${alvos.unidadeDoStaff}/${alvos.estacaoDeProducao}/impressao`,
  },
];

const QUANTAS = 11;

/**
 * A KIOSK-003 sai da CARTA, e não de um identificador escrito à mão.
 *
 * O detalhe do produto vive em `/menu/[produtoId]`, e o identificador é gerado
 * pela semeadura. Escrevê-lo aqui era medir a página de «não encontrado» às
 * cinco larguras no dia em que a semeadura mudasse — cinco verdes sobre um 404.
 * Sai da própria carta, que é o caminho por onde uma pessoa lá chega.
 */
async function telaDoProduto(pagina: import('@playwright/test').Page): Promise<Tela> {
  await pagina.goto(`${KIOSK}/menu`);
  const ligacao = pagina.locator('[data-teste="produto"] a').first();
  await expect(ligacao, 'a carta do kiosk não tem produto nenhum: nada para medir')
    .toBeVisible();
  const href = await ligacao.getAttribute('href');
  expect(href, 'o produto da carta não tem endereço').toBeTruthy();
  return { id: 'KIOSK-003', caminho: href as string };
}

async function visitar(
  pagina: import('@playwright/test').Page, tela: Tela, idioma: string,
) {
  const caminho = tela.caminho.replace('/es-ES/', `/${idioma}/`);
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${tela.id} · ${caminho} respondeu ${resposta?.status()}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  await expect(pagina.locator(`[data-tela="${tela.id}"]`).first(),
    `${tela.id} · o marcador não apareceu`).toBeVisible();
}

test('a população é 11 telas, e 11 ids DISTINTOS', async ({ page }) => {
  const todas = [...TELAS, await telaDoProduto(page)];
  expect(todas.length).toBe(QUANTAS);
  expect(new Set(todas.map((t) => t.id)).size).toBe(QUANTAS);
});

test.describe('«entregue à ponte» não é «imprimiu»', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('os TRÊS estados aparecem, e escrevem-se diferente', async ({ page }) => {
    await page.goto(`${UNIDADE}/devices/impressoras/${ID_DA_IMPRESSORA_DE_INSPECCAO}`);

    const estados = await page.locator('[data-teste="envio"]').allInnerTexts();
    expect(estados.length, 'nenhum envio na fila: o caso não está semeado')
      .toBeGreaterThan(2);

    // O que interessa é que não colapsam num só.
    const distintos = new Set(estados.map((t) => t.replace(/\s+/g, ' ').trim()));
    expect(distintos.size,
      'os envios escrevem-se todos igual: os estados colapsaram num só')
      .toBeGreaterThan(2);
  });

  test('e o que saiu sem resposta diz NÃO SEI — nem impresso nem falhado',
    async ({ page }) => {
      await page.goto(`${UNIDADE}/devices/impressoras/${ID_DA_IMPRESSORA_DE_INSPECCAO}`);
      const naoSei = page.locator('[data-teste="nao-sei"]');
      await expect(naoSei.first(),
        'o envio entregue e sem resposta não aparece como «não sei»').toBeVisible();

      // E diz DESDE QUANDO, senão ninguém consegue escolher entre esperar mais
      // e ir à cozinha ver.
      const texto = await naoSei.first().innerText();
      expect(texto.toLowerCase()).toContain('desde');
    });

  test('e o ecrã diz a frase por PALAVRAS', async ({ page }) => {
    await page.goto(`${UNIDADE}/devices/impressoras/${ID_DA_IMPRESSORA_DE_INSPECCAO}`);
    // Mede-se a palavra, e não o comprimento — a lição do E24.
    const aviso = await page.locator('[data-teste="entregue-nao-e-impresso"]').innerText();
    expect(aviso.toLowerCase()).toContain('no es');
  });
});

test.describe('a homologação tem TRÊS respostas', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('uma impressora por testar diz POR TESTAR, e explica-o', async ({ page }) => {
    // «Uma linha vazia lê-se como uma linha aprovada.» A semeadura cria a
    // impressora sem homologação, e o ecrã tem de o dizer por palavras — não
    // deixar o espaço em branco.
    await page.goto(`${UNIDADE}/devices/impressoras`);
    await expect(page.locator('[data-teste="por-testar-ajuda"]').first()).toBeVisible();
    const ajuda = await page.locator('[data-teste="por-testar-ajuda"]').first().innerText();
    expect(ajuda.toLowerCase(),
      'o ecrã não explica que «por testar» não é «falha»').toContain('no es lo mismo');
  });
});

test.describe('o terminal pausado, e a razão certa', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o kiosk com cobrança por resolver está PAUSADO', async ({ page }) => {
    await page.goto(`/es-ES/kiosk/${ID_DO_KIOSK_PAUSADO}/pausado`);
    await expect(page.locator('[data-teste="pausado-cobranca"]'),
      'o kiosk com cobrança indeterminada não aparece pausado').toBeVisible();
  });

  test('e o kiosk sadio NÃO está pausado — senão isto não media nada',
    async ({ page }) => {
      // O par. Sem ele, «diz sempre pausado» passava o caso de cima, e um kiosk
      // que nunca serve ninguém ficava verde.
      await page.goto(`${KIOSK}/pausado`);
      await expect(page.locator('[data-teste="ja-disponivel"]')).toBeVisible();
      await expect(page.locator('[data-teste="pausado-cobranca"]')).toHaveCount(0);
    });

  test('e o início do kiosk pausado NÃO deixa começar um pedido', async ({ page }) => {
    // Deixar alguém começar por cima de uma cobrança por resolver era empilhar
    // um problema de dinheiro em cima de outro, e o segundo esconde o primeiro.
    await page.goto(`/es-ES/kiosk/${ID_DO_KIOSK_PAUSADO}`);
    await expect(page.locator('[data-tela="KIOSK-007"]'),
      'o kiosk pausado deixou entrar no início').toBeVisible();
  });
});

test.describe('a segunda via distingue-se no papel', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o talão da reimpressão traz a marca, e o KDS lê-a', async ({ page }) => {
    await page.goto(`/es-ES/kds/${alvos.unidadeDoStaff}/${alvos.estacaoDeProducao}/impressao`);
    const taloes = await page.locator('[data-teste="talao"]').allInnerTexts();
    expect(taloes.length, 'nenhum talão por resolver: o caso não está semeado')
      .toBeGreaterThan(0);
    const comMarca = taloes.filter((t) => t.includes('VIA 2'));
    expect(comMarca.length,
      'nenhum talão traz a marca da segunda via: a cozinha não os distingue')
      .toBeGreaterThan(0);
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · kiosk e impressão`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 11 telas não transbordam nem escondem acções', async ({ page }) => {
      test.setTimeout(240_000);
      for (const tela of [...TELAS, await telaDoProduto(page)]) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('kiosk a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    test.setTimeout(240_000);
    for (const tela of [...TELAS, await telaDoProduto(page)]) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    test.setTimeout(240_000);
    for (const tela of [...TELAS, await telaDoProduto(page)]) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('as três línguas', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('as 11 telas abrem nas três, e o marcador não muda', async ({ page }) => {
    test.setTimeout(240_000);
    const todas = [...TELAS, await telaDoProduto(page)];
    for (const idioma of IDIOMAS) {
      for (const tela of todas) {
        await visitar(page, tela, idioma);
      }
    }
  });
});

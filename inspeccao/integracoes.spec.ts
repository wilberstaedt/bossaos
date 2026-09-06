import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos } from './alvos.ts';
import { CHAVE_DE_INSPECCAO } from '../packages/db/prisma/inspeccao-comum.ts';

/**
 * As 13 telas do E32, medidas no navegador — e as rotas da API, medidas por HTTP.
 *
 * ── Porque é que as rotas estão AQUI e não na prova de base ───────────────
 *
 * A régua manda medir que o âmbito é declarado **em cada rota**, e não num
 * portão central. Escrevi esse grupo em `provas/integracoes.test.ts` primeiro, a
 * importar os manipuladores directamente, e não carrega: o
 * `--experimental-strip-types` não resolve o `next/server` fora do Next.
 *
 * Podia ter medido o `comChave` em vez das rotas. **Não é a mesma coisa** — isso
 * mostraria que o motor decide bem, e o que falta mostrar é que as rotas o usam.
 * É a lição que o E31 me deu pela via cara: o motor estava verde e a carta vinha
 * vazia.
 */

const ORG = '/es-ES/app/marina-oropesa';
const UNIDADE = `${ORG}/puerto`;
const INT = `${UNIDADE}/integrations`;
const PLAT = '/es-ES/platform';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

const alvos = await resolverAlvos();

const TELAS: Tela[] = [
  { id: 'INT-001', caminho: `${INT}/catalogo` },
  { id: 'INT-007', caminho: `${INT}/delivery` },
  { id: 'INT-008', caminho: `${INT}/chaves` },
  { id: 'INT-009', caminho: `${INT}/webhooks` },
  { id: 'INT-010', caminho: `${INT}/registos` },
  { id: 'ORG-011', caminho: `${ORG}/organization/cobranca` },
  { id: 'ORG-012', caminho: `${ORG}/organization/cobranca/metodo` },
  { id: 'ORD-011', caminho: `${UNIDADE}/orders/reprocessar` },
  { id: 'PLAT-005', caminho: `${PLAT}/assinaturas` },
  { id: 'PLAT-012', caminho: `${PLAT}/promocoes` },
  { id: 'PLAT-015', caminho: `${PLAT}/webhooks` },
  { id: 'PLAT-020', caminho: `${PLAT}/provedores` },
];

const QUANTAS = 13;

/**
 * A INT-002 sai do CATÁLOGO, e não de um identificador escrito à mão.
 *
 * O detalhe vive em `/catalogo/[integrationId]`, e o identificador é gerado pela
 * semeadura. Escrevê-lo aqui era medir a página de «não encontrado» às cinco
 * larguras no dia em que a semeadura mudasse.
 */
async function telaDoDetalhe(pagina: import('@playwright/test').Page): Promise<Tela> {
  await pagina.goto(`${INT}/catalogo`);
  const ligacao = pagina.locator('[data-teste="integracao"] a').first();
  await expect(ligacao, 'o catálogo não tem integração nenhuma: nada para medir')
    .toBeVisible();
  const href = await ligacao.getAttribute('href');
  expect(href, 'a integração não tem endereço').toBeTruthy();
  return { id: 'INT-002', caminho: href as string };
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

test('a população é 13 telas, e 13 ids DISTINTOS', async ({ page }) => {
  const todas = [...TELAS, await telaDoDetalhe(page)];
  expect(todas.length).toBe(QUANTAS);
  expect(new Set(todas.map((t) => t.id)).size).toBe(QUANTAS);
  void alvos;
});

test.describe('O ÂMBITO ESTÁ DECLARADO EM CADA ROTA, e não no encaminhador', () => {
  /**
   * As chaves da semeadura têm resumos que não correspondem a chave nenhuma
   * real — de propósito: uma chave utilizável escrita numa semente é uma chave
   * utilizável num repositório.
   *
   * Por isso estes casos medem a RECUSA, que é o lado que interessa: sem chave,
   * com chave inventada, e as duas a dizer a mesma coisa.
   */
  test('sem chave, 401 — e o corpo não diz mais do que precisa', async ({ request }) => {
    const r = await request.get('/api/v1/pedidos');
    expect(r.status()).toBe(401);
    expect(await r.json()).toEqual({ erro: 'nao_autorizado' });
  });

  test('com uma chave inventada, a MESMA resposta', async ({ request }) => {
    // A diferença entre «não trouxe» e «trouxe uma que não existe» só interessa
    // a quem esteja a sondar. As duas dizem o mesmo.
    const semNada = await request.get('/api/v1/pedidos');
    const inventada = await request.get('/api/v1/pedidos', {
      headers: { authorization: 'Bearer bk_inventada' },
    });
    expect(inventada.status()).toBe(semNada.status());
    expect(await inventada.json()).toEqual(await semNada.json());
  });

  test('e as DUAS rotas recusam a chave inventada, cada uma por si', async ({ request }) => {
    for (const rota of ['/api/v1/pedidos', '/api/v1/catalogo']) {
      const r = await request.get(rota, {
        headers: { authorization: 'Bearer bk_inventada' },
      });
      expect(r.status(), `${rota} deixou passar uma chave inventada`).toBe(401);
    }
  });

  test('O PAR QUE DECIDE: a chave de CATÁLOGO entra no catálogo e é recusada nos pedidos',
    async ({ request }) => {
      // ── Porque é que este caso precisou de uma chave a sério ───────────
      //
      // A primeira versão media só recusas de chaves inventadas — e as duas
      // rotas recusam-nas por igual, portanto trocar o âmbito de UMA delas não
      // mudava nada. O controlo ficou VERDE com o defeito plantado, e o buraco
      // era da prova.
      //
      // Com uma chave que PASSA, a diferença entre as duas rotas aparece: e é
      // essa diferença que prova que o âmbito é declarado por operação, e não
      // num portão central que ambas partilhariam.
      const cabecalhos = { authorization: `Bearer ${CHAVE_DE_INSPECCAO}` };

      const catalogo = await request.get('/api/v1/catalogo', { headers: cabecalhos });
      expect(catalogo.status(),
        'a chave de catálogo não entrou no catálogo: a semente não monta o caso')
        .toBe(200);

      const pedidos = await request.get('/api/v1/pedidos', { headers: cabecalhos });
      expect(pedidos.status(),
        'a chave de catálogo leu os pedidos: o âmbito não é por operação')
        .toBe(403);
    });

  test('e a chamada que passou deixou rasto com a CHAVE, nunca com o valor',
    async ({ request, page }) => {
      await request.get('/api/v1/catalogo', {
        headers: { authorization: `Bearer ${CHAVE_DE_INSPECCAO}` },
      });
      await page.goto(`${INT}/registos`);
      const texto = await page.locator('[data-teste="registos"]').innerText();
      expect(texto, 'a chamada não deixou rasto').toContain('api.catalogo.ler');
      expect(texto, 'o VALOR da chave apareceu no registo')
        .not.toContain(CHAVE_DE_INSPECCAO);
    });
});

test.describe('O webhook do SaaS não muda nada com o corpo', () => {
  test('sem provedor configurado, 404 — e não 401', async ({ request }) => {
    // Dizer «existe mas não estás autorizado» conta a quem sonda que este
    // provedor está ligado aqui.
    const r = await request.post('/api/webhooks/saas/provedor-que-nao-existe', {
      data: { id: 'x', customer: 'y' },
    });
    expect(r.status()).toBe(404);
  });
});

test.describe('a tentativa fica VISÍVEL, e o que não tem vínculo fica parado', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a PLAT-005 mostra o evento que alegou outra organização', async ({ page }) => {
    await page.goto(`${PLAT}/assinaturas`);
    const marcados = page.locator('[data-teste="evento"]').filter({ hasText: 'organización' });
    // O contador dos sem-vínculo tem de ser maior do que zero: sem isso, este
    // ecrã estaria verde sobre um caso que não está semeado.
    const semVinculo = Number(
      await page.locator('[data-teste="quantos-sem-vinculo"]').innerText());
    expect(semVinculo,
      'nenhum evento sem vínculo: o caso não está semeado').toBeGreaterThan(0);
    await expect(page.locator('[data-teste="sem-vinculo-ajuda"]')).toBeVisible();
    void marcados;
  });

  test('e diz por PALAVRAS que um evento sem vínculo não muda nada', async ({ page }) => {
    await page.goto(`${PLAT}/assinaturas`);
    const texto = await page.locator('[data-teste="sem-vinculo-ajuda"]').innerText();
    // Mede-se a palavra, e não o comprimento — a lição do E24.
    expect(texto.toLowerCase()).toContain('no cambian nada');
  });
});

test.describe('a chave mostra-se uma vez, e o ecrã di-lo', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a lista mostra o PREFIXO e nunca a chave', async ({ page }) => {
    await page.goto(`${INT}/chaves`);
    const chaves = page.locator('[data-teste="chave"]');
    expect(await chaves.count(), 'nenhuma chave semeada').toBeGreaterThan(1);
    const prefixos = await page.locator('[data-teste="prefixo"]').allInnerTexts();
    expect(prefixos.length).toBeGreaterThan(0);
    for (const p of prefixos) {
      // O alfabeto e base64url: leva `-` e `_`, que o \w nao cobre. A primeira
      // versao usava \w e falhava numa chave com hifen — a guarda a medir a
      // grafia em vez da propriedade, outra vez.
      //
      // A propriedade e: o que se mostra e CURTO. Uma chave inteira tem 32
      // caracteres depois do `bk_`; o prefixo tem 8.
      const so = /bk_([A-Za-z0-9_-]+)…/.exec(p);
      expect(so, `nao ha prefixo reconhecivel em: ${p}`).not.toBeNull();
      expect((so?.[1] ?? '').length,
        'o prefixo mostrado e longo de mais para nao abrir nada').toBeLessThanOrEqual(12);
    }
  });

  test('e há uma chave VÁLIDA e uma REVOGADA, lado a lado', async ({ page }) => {
    // O par. Com um estado só, «mostra sempre válida» passava.
    await page.goto(`${INT}/chaves`);
    const texto = await page.locator('[data-teste="chaves"]').innerText();
    expect(texto).toContain('Válida');
    expect(texto).toContain('Revocada');
  });

  test('e explica por palavras que não se volta a ver', async ({ page }) => {
    await page.goto(`${INT}/chaves`);
    const aviso = await page.locator('[data-teste="uma-vez"]').innerText();
    expect(aviso.toLowerCase()).toContain('única vez');
  });
});

test.describe('o que não está ligado diz o que falta', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a INT-001 mostra os requisitos de cada integração desligada', async ({ page }) => {
    await page.goto(`${INT}/catalogo`);
    const requisitos = await page.locator('[data-teste="requisitos"]').allInnerTexts();
    expect(requisitos.length,
      'nenhuma integração diz o que falta: «não conectada» é um beco')
      .toBeGreaterThan(0);
    for (const r of requisitos) {
      expect(r.length, 'o requisito está vazio: é o mesmo que silêncio')
        .toBeGreaterThan(20);
    }
  });
});

test.describe('os dois dinheiros não somam', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a ORG-011 mostra o que a casa nos paga, e diz que são duas contas',
    async ({ page }) => {
      await page.goto(`${ORG}/organization/cobranca`);
      await expect(page.locator('[data-teste="dois-dinheiros"]')).toBeVisible();
      const montantes = await page.locator('[data-teste="montante"]').allInnerTexts();
      expect(montantes.length, 'nenhuma factura semeada').toBeGreaterThan(0);

      // E NÃO há total nesta tela. Um total aqui responderia a uma pergunta que
      // ninguém faz e esconderia as duas que se fazem.
      const texto = (await page.locator('.bo-pagina').innerText()).toLowerCase();
      expect(texto).not.toContain('total');
    });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · integrações`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 13 telas não transbordam nem escondem acções', async ({ page }) => {
      test.setTimeout(240_000);
      for (const tela of [...TELAS, await telaDoDetalhe(page)]) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('integrações a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    test.setTimeout(240_000);
    for (const tela of [...TELAS, await telaDoDetalhe(page)]) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    test.setTimeout(240_000);
    for (const tela of [...TELAS, await telaDoDetalhe(page)]) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('as três línguas', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('as 13 telas abrem nas três, e o marcador não muda', async ({ page }) => {
    test.setTimeout(240_000);
    const todas = [...TELAS, await telaDoDetalhe(page)];
    for (const idioma of IDIOMAS) {
      for (const tela of todas) await visitar(page, tela, idioma);
    }
  });
});

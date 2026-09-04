import { expect, test } from '@playwright/test';
import { FICHEIRO_DE_SESSAO, FICHEIRO_DE_SESSAO_B } from './caminhos.ts';

/**
 * O acesso cruzado entre inquilinos, **negado no produto**.
 *
 * ── Porque é que as 54 asserções contra o PostgreSQL não chegavam ─────────
 *
 * A revisão do marco E11 reprovou este aceite com uma frase que é a régua
 * inteira:
 *
 * > *«O isolamento tem 54 asserções contra o PostgreSQL, e isso prova que a
 * > BASE recusa. O aceite pede a negação vista NO PRODUTO.»*
 *
 * E acrescentou o que existia no navegador e porque não servia: o `painel.spec`
 * prova que a sessão vê os dados **do próprio** inquilino. É um bom controlo
 * anti-verde-vazio e **não é uma negação**.
 *
 * ── O que isto mede, e o par sem o qual não mediria nada ──────────────────
 *
 * Duas contas reais, em organizações diferentes, e o **mesmo identificador**
 * pedido pelas duas:
 *
 * 1. A sessão de **A** pede um recurso de **B** → tem de ver a recusa no ecrã;
 * 2. a sessão de **B** pede o **mesmo** recurso → tem de o ver.
 *
 * Sem o número 2, isto passava com uma implementação que recusasse tudo — e uma
 * implementação que recusa tudo também «isola», e não serve para nada. É o mesmo
 * par (1)/(2) que a prova de acesso do E04 faz por HTTP, agora no navegador.
 *
 * ── E o identificador EXISTE, que é o que separa isto de um 404 qualquer ──
 *
 * Pedir `/unidades/00000000-…` também dá 404, e não prova coisa nenhuma: prova
 * que uma coisa inexistente não aparece. O que se pede aqui é uma unidade que
 * está mesmo na base, viva, e que pertence ao outro inquilino.
 */

/** Fixtures do E03: os dois inquilinos com nomes parecidos, de propósito. */
const ORG_A = 'marina-oropesa';
const ORG_B = 'marina-barcelona';
/** A unidade de B. Existe, está viva, e não é de A. */
const UNIDADE_DE_B = 'bbbb2222-2222-4222-8222-333333333333';
const UNIDADE_DE_A = 'aaaa1111-1111-4111-8111-222222222222';

const recursoDeB = (org: string) => `/es-ES/app/${org}/organization/unidades/${UNIDADE_DE_B}`;

test.describe('a sessão de A não alcança nada de B', () => {
  test.use({ storageState: FICHEIRO_DE_SESSAO, viewport: { width: 1280, height: 900 } });

  test('primeiro: a sessão de A é MESMO uma sessão', async ({ page }) => {
    // Sem isto, tudo o que vem a seguir passava com uma sessão expirada — que
    // não alcança nada de A nem de B, e por isso «isola» perfeitamente.
    const r = await page.goto(`/es-ES/app/${ORG_A}/organization/unidades/${UNIDADE_DE_A}`);
    expect(r?.status(), 'a sessão de A não abre a unidade de A').toBeLessThan(400);
    expect(new URL(page.url()).pathname, 'a sessão caiu para a entrada').not.toContain('/auth/');
    await expect(page.locator('.bo-estado__cabecalho h1').first()).toBeVisible();
  });

  test('A pede a UNIDADE DE B pelo endereço de A: recusa no ecrã, com 404', async ({ page }) => {
    const r = await page.goto(recursoDeB(ORG_A));
    // O produto responde ausência — e ausência é a resposta certa: dizer «existe
    // mas não é tua» a quem pergunta é confirmar-lhe que existe.
    expect(r?.status(), 'o produto serviu um recurso de outro inquilino').toBe(404);

    // E a recusa é VISÍVEL. Um 404 sem ecrã é uma recusa que o utilizador lê
    // como uma avaria da aplicação.
    await expect(page.locator('h1').first()).toBeVisible();

    // ── Mede-se o que o utilizador VÊ, e não o HTML todo ──────────────────
    //
    // A primeira versão comparava `page.content()` e falhou — e o motivo vale a
    // pena ficar escrito: o identificador aparece no payload de encaminhamento
    // do Next, **ecoado do URL que a própria pessoa escreveu**. Isso não é uma
    // fuga; é o pedido dela a voltar. Um detector que o conta como fuga acusa
    // toda a gente e acaba desligado.
    //
    // A fuga seria ver DADOS de B. Por isso mede-se o texto visível.
    const visivel = await page.locator('body').innerText();
    expect(visivel, 'a organização de B apareceu no ecrã').not.toContain(ORG_B);
    // E o ecrã servido é o de recusa, e não a ficha da unidade: sem isto, um
    // produto que servisse a unidade alheia com o nome em branco passava.
    expect(visivel, 'o ecrã servido não é o de recusa').not.toContain('Marina Playa');
  });

  test('A pede a ORGANIZAÇÃO de B: nunca lá entra', async ({ page }) => {
    await page.goto(`/es-ES/app/${ORG_B}/organization`);
    await page.waitForLoadState('networkidle');
    const final = new URL(page.url()).pathname;

    // O produto manda-o escolher organização — que é a recusa desta família, e é
    // visível: ele fica a olhar para a lista das organizações DELE.
    expect(final, `A entrou na organização de B: ${final}`).not.toBe(`/es-ES/app/${ORG_B}/organization`);
    expect(final).toContain('/auth/organizations');
    await expect(page.locator('h1').first()).toBeVisible();

    // ── Mede-se o que o utilizador VÊ, e não o HTML todo ──────────────────
    //
    // A primeira versão comparava `page.content()` e falhou: o identificador
    // aparece no payload de encaminhamento do Next, ecoado do URL que a própria
    // pessoa escreveu. Isso não é uma fuga — é o pedido dela a voltar.
    //
    // A fuga seria ver DADOS do outro inquilino. Por isso mede-se o texto
    // visível, e procura-se o que só lá estaria se o produto tivesse servido.
    const visivel = await page.locator('body').innerText();
    expect(visivel, 'dados do outro inquilino no ecrã').not.toContain(ORG_B);
  });

  test('e o catálogo de B também não', async ({ page }) => {
    // Uma segunda família de rota, porque a recusa tem de ser da PORTA e não de
    // uma verificação escrita à mão numa página só.
    await page.goto(`/es-ES/app/${ORG_B}/catalogo`);
    await page.waitForLoadState('networkidle');
    expect(new URL(page.url()).pathname).toContain('/auth/organizations');
  });
});

test.describe('O PAR: o mesmo recurso, pedido pelo dono, TEM de aparecer', () => {
  test.use({ storageState: FICHEIRO_DE_SESSAO_B, viewport: { width: 1280, height: 900 } });

  test('B abre a unidade de B, com o mesmo identificador que A não alcançou', async ({ page }) => {
    // ── Este é o caso que torna o de cima uma prova ────────────────────────
    //
    // Sem ele, tudo passa com uma implementação que devolva 404 a toda a gente.
    // É o par (1)/(2) do E04: a ausência de um recurso alheio e a ausência de um
    // recurso que não existe têm de ser indistinguíveis **para quem não é dono**,
    // e distinguíveis para quem é.
    const r = await page.goto(recursoDeB(ORG_B));
    expect(r?.status(), 'o dono não consegue abrir a própria unidade').toBeLessThan(400);
    expect(new URL(page.url()).pathname, 'a sessão de B caiu para a entrada').not.toContain('/auth/');
    await expect(page.locator('.bo-estado__cabecalho h1').first()).toBeVisible();
  });

  test('e B, por sua vez, não alcança a unidade de A — a recusa vale nos dois sentidos', async ({ page }) => {
    // O isolamento não é uma propriedade de A sobre B: é simétrica. Medi-la num
    // só sentido deixava passar uma implementação que privilegiasse um inquilino.
    const r = await page.goto(`/es-ES/app/${ORG_B}/organization/unidades/${UNIDADE_DE_A}`);
    expect(r?.status(), 'B serviu um recurso de A').toBe(404);
    // ── Mede-se o que o utilizador VÊ, e não o HTML todo ──────────────────
    //
    // A primeira versão comparava `page.content()` e falhou: o identificador
    // aparece no payload de encaminhamento do Next, ecoado do URL que a própria
    // pessoa escreveu. Isso não é uma fuga — é o pedido dela a voltar.
    //
    // A fuga seria ver DADOS do outro inquilino. Por isso mede-se o texto
    // visível, e procura-se o que só lá estaria se o produto tivesse servido.
    const visivel = await page.locator('body').innerText();
    expect(visivel, 'dados do outro inquilino no ecrã').not.toContain(ORG_A);
  });
});

test.describe('a recusa também se vê no telemóvel', () => {
  // A régua do marco pede o mesmo fluxo nas duas superfícies, e a recusa é parte
  // do fluxo: um 404 que transborde a 360 px é um ecrã que ninguém lê.
  test.use({ storageState: FICHEIRO_DE_SESSAO, viewport: { width: 360, height: 780 } });

  test('a 360 px, a recusa aparece e não transborda', async ({ page }) => {
    const r = await page.goto(recursoDeB(ORG_A));
    expect(r?.status()).toBe(404);
    await expect(page.locator('h1').first()).toBeVisible();
    const transborda = await page.evaluate(() => {
      const d = document.documentElement;
      return Math.max(0, d.scrollWidth - d.clientWidth - 1);
    });
    expect(transborda, 'a página de recusa rola na horizontal a 360 px').toBe(0);
  });
});

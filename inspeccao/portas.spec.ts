import { expect, test } from '@playwright/test';

/**
 * As portas dos módulos entregues — e este ficheiro mede o CAMINHO.
 *
 * ── Porque é que isto é um ficheiro à parte ───────────────────────────────
 *
 * Todas as outras suites visitam o endereço directamente: `goto(URL)`, confirma
 * o marcador, mede contraste e largura. Isso responde à pergunta «a tela
 * existe?» e **nunca** à pergunta «alguém lá chega?» — e o silêncio da segunda
 * parece aprovação da primeira. Medido no E21: zero `getByRole('link')` em toda
 * a inspecção, e sete das oito entradas do menu eram `#`.
 *
 * Aqui há **um único `goto`** por caso, e é para o sítio onde a sessão aterra.
 * Daí em diante é tudo por cliques.
 *
 * ── E o controlo negativo estraga o MENU, nunca a tela ────────────────────
 *
 * É a única forma de provar que o que se mede é o caminho: se o plante
 * estragasse uma tela, media outra vez a existência da tela — que já está medida
 * vinte etapas atrás.
 */

const ENTRADA = '/es-ES/app/marina-oropesa/organization';

/** Um módulo entregue, a sua entrada no menu, e onde o clique tem de acabar. */
interface Porta {
  modulo: string;
  /** O nome no menu, nos três idiomas que a casca pode estar a mostrar. */
  nomeNoMenu: RegExp;
  /** Precisa de escolher unidade antes de chegar ao módulo? */
  escolheUnidade: boolean;
  /**
   * O troço de endereço onde o caminho tem de acabar.
   *
   * ── Porque não é o `data-tela` ─────────────────────────────────────────
   *
   * Medido: só 61 ficheiros do produto o têm. É convenção que entrou a meio do
   * projecto, e a raiz da sala, do catálogo e dos relatórios não a adoptou —
   * `FLOOR-001` está em `/floor/zonas`, não em `/floor`.
   *
   * Exigir o marcador seria exigir que estes módulos mudassem para a prova
   * passar. O que aqui se mede é o CAMINHO, e um caminho acaba num endereço.
   */
  chegaA: RegExp;
}

const PORTAS: Porta[] = [
  { modulo: 'catálogo', nomeNoMenu: /cat[aá]logo|catalog/i, escolheUnidade: false, chegaA: /\/catalogo$/ },
  { modulo: 'reservas', nomeNoMenu: /reservas|bookings/i, escolheUnidade: true, chegaA: /\/reservations$/ },
  { modulo: 'sala e pedidos', nomeNoMenu: /sala|floor|room/i, escolheUnidade: true, chegaA: /\/floor$/ },
  { modulo: 'takeaway e entrega', nomeNoMenu: /llevar|levar|takeaway/i, escolheUnidade: true, chegaA: /\/takeaway$/ },
  { modulo: 'relatórios', nomeNoMenu: /informes|relat[óo]rios|reports/i, escolheUnidade: true, chegaA: /\/reports$/ },
  { modulo: 'caixa', nomeNoMenu: /caja|caixa|register/i, escolheUnidade: true, chegaA: /\/pos\/[0-9a-f-]+$/ },
];

test.describe('cada módulo entregue tem porta', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  for (const porta of PORTAS) {
    test(`chega-se a ${porta.modulo} por cliques`, async ({ page }) => {
      // O ÚNICO endereço escrito, e é onde quem entra aterra.
      await page.goto(ENTRADA);

      const entrada = page.getByRole('link', { name: porta.nomeNoMenu }).first();
      await expect(entrada,
        `o menu não tem entrada para ${porta.modulo}: é uma porta que ninguém abriu`)
        .toBeVisible();
      expect(await entrada.getAttribute('href'),
        `a entrada de ${porta.modulo} é um '#'`).not.toBe('#');

      await entrada.click();
      await page.waitForLoadState('networkidle');

      if (porta.escolheUnidade) {
        // «Não há navegação para um módulo dentro de uma unidade sem um sítio
        // onde a unidade se escolha.» Quem tem três restaurantes tem de dizer
        // em qual está antes de o módulo fazer sentido.
        const unidade = page.locator('a[data-seccao^="ir-"], a[data-seccao="entrar-no-tpv"]').first();
        await expect(unidade,
          `${porta.modulo} não deixa escolher a unidade`).toBeVisible();
        await unidade.click();
        await page.waitForLoadState('networkidle');
      }

      const onde = new URL(page.url()).pathname;
      expect(onde, `o clique não chegou a ${porta.modulo}`).toMatch(porta.chegaA);

      // E chegou a uma tela a sério, não a um erro com o endereço certo: o 404
      // do Next responde 200 no cliente e teria passado a asserção de cima.
      await expect(page.locator('h1').first(),
        `${porta.modulo}: o endereço está certo e a tela não abriu`).toBeVisible();

      // Guarda de leitor cego: se nada tivesse navegado, o endereço seria o de
      // partida e as asserções acima podiam passar por engano.
      expect(onde, 'não saiu do ponto de partida').not.toContain('/organization');
    });
  }
});

/**
 * O outro lado da regra, e sem ele o «uma porta por módulo» passa com um menu
 * onde tudo é ligação e metade não leva a lado nenhum.
 */
test.describe('o que ainda não existe diz que não existe', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('nenhum item do menu é um `#` que parece clicável', async ({ page }) => {
    await page.goto(ENTRADA);
    const mortas = await page.locator('nav a[href="#"]').count();
    expect(mortas,
      'há entradas de menu que parecem ligações e não levam a lado nenhum').toBe(0);
  });

  test('e os módulos por construir dizem QUAL etapa os vai fazer', async ({ page }) => {
    await page.goto(ENTRADA);
    const marcadores = page.locator('[data-por-construir]');
    const quantos = await marcadores.count();
    // Guarda de leitor cego: sem marcadores nenhuns isto passava por vácuo, e o
    // menu podia estar simplesmente vazio.
    expect(quantos, 'não há marcadores nenhuns: a medição seria vazia')
      .toBeGreaterThan(0);
    for (let i = 0; i < quantos; i += 1) {
      const etapa = await marcadores.nth(i).getAttribute('data-por-construir');
      expect(etapa ?? '', 'um marcador sem etapa não é marcador, é um resto')
        .toMatch(/^E\d\d$/);
    }
  });
});

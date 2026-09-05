import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, TOKEN_DO_VISITANTE, type Alvos } from './alvos.ts';

/**
 * As 12 telas do E23, medidas no navegador.
 *
 * ── O que a régua reprova à cabeça ────────────────────────────────────────
 *
 * «Verde sobre zero pagamentos. Declara-se a população.» Sem um pagamento
 * capturado não há comprovativo para medir, e a MENU-016 media o ecrã de «não
 * encontramos» — que é o ecrã fácil: cabe em qualquer largura e não tem nada
 * para ler.
 *
 * E «as telas sem porta» — o marco do Restaurant foi reprovado por isso e não
 * passa duas vezes.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const PAINEL = '/es-ES/app/marina-oropesa/puerto';
const STAFF = '/es-ES/staff';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

function telas(a: Alvos): Tela[] {
  const POS = `/es-ES/pos/${a.unidadeDoStaff}`;
  const CONTA = `${POS}/conta/${a.contaDoTpv}`;
  const MESA = '/es-ES/r/insp-marina-oropesa/es-ES/mesa';
  return [
    { id: 'POS-005', caminho: `${CONTA}/cobrar` },
    { id: 'POS-007', caminho: `${CONTA}/cartao` },
    { id: 'POS-008', caminho: `${CONTA}/misto` },
    { id: 'POS-013', caminho: `${CONTA}/devolver` },
    { id: 'POS-022', caminho: `${POS}/pagamentos` },
    { id: 'POS-023', caminho: `${POS}/terminais` },
    { id: 'STAFF-019', caminho: `${STAFF}/${a.unidadeDoStaff}/cobrar` },
    { id: 'INT-005', caminho: `${PAINEL}/integrations/pagamentos` },
  ];
}

/**
 * As três públicas, que correm com a bolacha do visitante.
 *
 * ── Estavam declaradas e NÃO eram medidas ─────────────────────────────────
 *
 * A população contava 12 e os ciclos de largura, toque, contraste e idioma
 * corriam só sobre as 8 do painel. Uma tela contada e não visitada é pior do que
 * uma tela em falta: a contagem diz que está coberta.
 *
 * Apanhado a 05/09 a olhar para um controlo negativo que ficou verde.
 */
const SLUG_PUBLICO = 'insp-marina-oropesa';

function telasPublicas(a: Alvos): Tela[] {
  // A superfície pública é `/r/<slug>/<locale>/`, e NÃO vive sob `[idioma]`.
  const MESA = `/r/${SLUG_PUBLICO}/es-ES/mesa`;
  return [
    { id: 'MENU-014', caminho: `${MESA}/pagar` },
    { id: 'MENU-015', caminho: `${MESA}/dividir` },
    { id: 'MENU-016', caminho: `${MESA}/comprovativo/${a.reciboDoTpv}` },
  ];
}

/** Sem a bolacha, as telas da visita medem o DESVIO e não a tela. */
async function comBolachaDeVisita(
  contexto: import('@playwright/test').BrowserContext, token: string,
) {
  await contexto.addCookies([{
    name: 'bo_visita', value: token, domain: '127.0.0.1', path: `/r/${SLUG_PUBLICO}`,
  }]);
}

const QUANTAS_TELAS = 12;

function colunas(linha: string): string[] {
  const saida: string[] = [];
  let campo = '';
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (c === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') { campo += '"'; i += 1; }
      else dentroDeAspas = !dentroDeAspas;
    } else if (c === ',' && !dentroDeAspas) { saida.push(campo); campo = ''; }
    else campo += c;
  }
  saida.push(campo);
  return saida;
}

async function visitar(pagina: import('@playwright/test').Page, tela: Tela, idioma: string) {
  const caminho = tela.caminho.replace('/es-ES/', `/${idioma}/`);
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${tela.id} · ${caminho} respondeu ${resposta?.status()}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  await expect(pagina.locator(`[data-tela="${tela.id}"]`).first(),
    `${tela.id} · o marcador não apareceu`).toBeVisible();
}

test('a população é 12 telas, e 12 ids DISTINTOS', () => {
  const lista = [...telas(alvos), ...telasPublicas(alvos)];
  // A STATE-011 não é uma rota: é o componente do estado indeterminado, e
  // mede-se onde ele aparece. Conta na matriz e não nesta lista de endereços.
  expect(lista.length + 1).toBe(QUANTAS_TELAS);
  expect(new Set(lista.map((t) => t.id)).size).toBe(lista.length);
});

test('e são as 12 que a MATRIZ tem no E23', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const linhas = csv.split('\n').slice(1).map(colunas).filter((c) => c[6] === 'E23');
  expect(linhas.length, 'a matriz não tem 12 telas no E23').toBe(QUANTAS_TELAS);
  const DECLARADAS = new Set(['implementado aguardando validação', 'validado']);
  expect(linhas.filter((c) => DECLARADAS.has(c[16] ?? '')).length,
    'nem todas as 12 estão declaradas').toBe(QUANTAS_TELAS);
});

/** «Verde sobre zero pagamentos» — declara-se a população. */
test.describe('a medição não é sobre um sistema sem pagamentos', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('declara quantos havia: um pagamento capturado, com gorjeta', async ({ page }) => {
    await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/conta/${alvos.contaDoTpv}/devolver`);
    const pagamentos = await page.locator('[data-teste="pagamentos"] li').count();
    expect(pagamentos, 'não havia pagamento nenhum: a devolução mediria um ecrã vazio')
      .toBeGreaterThan(0);
    await expect(page.locator('[data-teste="capturado"]').first()).toBeVisible();
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · pagamentos`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as telas do painel não transbordam nem escondem acções', async ({ page }) => {
      test.setTimeout(180_000);
      for (const tela of telas(alvos)) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('pagamentos a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    test.setTimeout(180_000);
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    test.setTimeout(180_000);
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('pagamentos nos três idiomas', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      test.setTimeout(180_000);
      for (const tela of telas(alvos)) {
        await visitar(page, tela, idioma);
        expect(await transbordaNaHorizontal(page), `${tela.id} · ${idioma} transborda`).toBe(0);
      }
    });
  }
});

test.describe('as três telas públicas, com a bolacha do visitante', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('as três abrem, não transbordam, e o comprovativo mostra a GORJETA',
    async ({ page }) => {
      test.setTimeout(120_000);
      await comBolachaDeVisita(page.context(), TOKEN_DO_VISITANTE);
      for (const tela of telasPublicas(alvos)) {
        // `visitar` troca o primeiro `/es-ES/` pelo idioma; nas públicas esse
        // troço é o locale que já lá está, por isso a troca é inócua em es-ES.
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} transborda`).toBe(0);
        const maus = await alvosPequenos(page, TOQUE);
        expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
      }
      // ── A guarda de população das públicas ──────────────────────────────
      //
      // Uma gorjeta a zero é indistinguível de «a gorjeta nunca aparece». É por
      // isso que a semeadura põe uma diferente de zero, e é por isso que isto a
      // exige: sem ela, o comprovativo passava a medir um caso onde o campo não
      // existe e ninguém notava.
      await expect(page.locator('[data-teste="gorjeta"]'),
        'o comprovativo não mostra a gorjeta: a medição não distingue zero de ausente')
        .toBeVisible();
    });

  test('e o comprovativo diz que NÃO é documento fiscal', async ({ page }) => {
    await comBolachaDeVisita(page.context(), TOKEN_DO_VISITANTE);
    await page.goto(`/r/${SLUG_PUBLICO}/es-ES/mesa/comprovativo/${alvos.reciboDoTpv}`);
    await expect(page.locator('[data-teste="sem-fiscal"]')).toBeVisible();
  });
});

/**
 * ── O que a régua manda o ecrã dizer, e o que ele não pode oferecer ───────
 */
test.describe('o ecrã não finge que fala com um banco', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o INT-005 declara a integração como PENDENTE', async ({ page }) => {
    await page.goto(`${PAINEL}/integrations/pagamentos`);
    await expect(page.locator('[data-teste="integracao-pendente"]')).toBeVisible();
    const texto = await page.locator('[data-teste="integracao-pendente"]').innerText();
    expect(texto.toUpperCase(), 'não diz que está pendente').toContain('PENDIENTE');
  });

  test('sem adquirente ligado, o cartão NÃO é oferecido', async ({ page }) => {
    await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/conta/${alvos.contaDoTpv}/cartao`);
    // Uma opção que falha ao ser escolhida ensina a equipa a evitar o ecrã.
    await expect(page.locator('form button[type="submit"]'),
      'há um botão de cobrar sem adquirente ligado').toHaveCount(0);
    await expect(page.locator('[data-teste="sem-adquirente"]')).toBeVisible();
  });

  test('e o ecrã diz que voltar não prova pagamento', async ({ page }) => {
    await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/conta/${alvos.contaDoTpv}/cobrar`);
    const texto = await page.locator('[data-teste="nao-prova"]').innerText();
    expect(texto.length, 'a tela não diz que o retorno não confirma').toBeGreaterThan(10);
  });

  test('a configuração NÃO tem campo para uma chave secreta', async ({ page }) => {
    await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/pagamentos`);
    for (const nome of ['segredo', 'secret', 'chave', 'token', 'apiKey']) {
      await expect(page.locator(`input[name="${nome}"]`),
        `há um campo para ${nome}: o segredo vive no servidor`).toHaveCount(0);
    }
    await expect(page.locator('[data-teste="segredo-fora"]')).toBeVisible();
  });

  test('o terminal que responde não prova que o pagamento chegou', async ({ page }) => {
    await page.goto(`/es-ES/pos/${alvos.unidadeDoStaff}/terminais`);
    await expect(page.locator('[data-teste="ping-nao-prova"]')).toBeVisible();
  });
});

/** A porta: da sessão iniciada até uma tela do E23, por cliques. */
test.describe('as telas do E23 têm porta', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('chega-se à configuração de cobros por cliques', async ({ page }) => {
    await page.goto('/es-ES/app/marina-oropesa/organization');
    const entrada = page.getByRole('link', { name: /caja|caixa|register/i }).first();
    expect(await entrada.getAttribute('href'), 'a entrada da caixa é um `#`').not.toBe('#');
    await entrada.click();
    await page.waitForLoadState('networkidle');
    await page.locator('[data-seccao="entrar-no-tpv"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.locator('[data-seccao="pagamentos"]').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tela="POS-022"]'),
      'não se chega à configuração de cobros por cliques').toBeVisible();
    expect(page.url(), 'não saiu do ponto de partida').not.toContain('/organization');
  });
});

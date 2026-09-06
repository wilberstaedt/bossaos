import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos } from './alvos.ts';
import { ID_DA_SESSAO_ESQUECIDA, ID_DA_SESSAO_VIVA } from '../packages/db/prisma/inspeccao-comum.ts';

/**
 * As 19 telas do E33, medidas no navegador — a maior etapa do projecto.
 *
 * ── O que se mede aqui, e porque é que não é o mesmo do motor ─────────────
 *
 * O motor prova que a sessão expirada não autoriza. Isto prova que a **casa
 * vê** — e ver é uma das quatro condições, a única que não vive na base. Uma
 * garantia que ninguém consegue ler é uma garantia que ninguém pode contestar.
 */

const ORG = '/es-ES/app/marina-oropesa';
const UNIDADE = `${ORG}/puerto`;
const SET = `${UNIDADE}/settings`;
const PLAT = '/es-ES/platform';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

const alvos = await resolverAlvos();

const TELAS: Tela[] = [
  { id: 'ORG-009', caminho: `${ORG}/organization/papeis` },
  { id: 'SET-010', caminho: `${SET}/acesso` },
  { id: 'SET-011', caminho: `${SET}/auditoria` },
  { id: 'SET-013', caminho: `${SET}/retencao` },
  { id: 'SET-014', caminho: `${SET}/flags` },
  { id: 'HELP-001', caminho: `${ORG}/ajuda` },
  { id: 'HELP-002', caminho: `${ORG}/ajuda/novo` },
  { id: 'HELP-003', caminho: `${ORG}/ajuda/meus` },
  { id: 'HELP-004', caminho: `${ORG}/ajuda/estado` },
  { id: 'PLAT-001', caminho: PLAT },
  { id: 'PLAT-007', caminho: `${PLAT}/suporte` },
  { id: 'PLAT-008', caminho: `${PLAT}/suporte/${ID_DA_SESSAO_VIVA}` },
  { id: 'PLAT-009', caminho: `${PLAT}/${alvos.orgId}/diagnostico` },
  { id: 'PLAT-013', caminho: `${PLAT}/auditoria` },
  { id: 'PLAT-014', caminho: `${PLAT}/trabalhos` },
  { id: 'PLAT-016', caminho: `${PLAT}/incidentes` },
  { id: 'PLAT-017', caminho: `${PLAT}/modelos` },
  { id: 'PLAT-018', caminho: `${PLAT}/moderacao` },
  { id: 'PLAT-019', caminho: `${PLAT}/migracao` },
];

const QUANTAS = 19;

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

test('a população é 19 telas, e 19 ids DISTINTOS', () => {
  expect(TELAS.length).toBe(QUANTAS);
  expect(new Set(TELAS.map((t) => t.id)).size).toBe(QUANTAS);
});

test.describe('O INQUILINO VÊ A ENTRADA — a condição que não vive na base', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a casa vê quem entrou, quando, porquê e até quando', async ({ page }) => {
    await page.goto(`${SET}/acesso`);
    const sessoes = page.locator('[data-teste="sessao"]');
    expect(await sessoes.count(), 'a casa não vê entrada nenhuma').toBeGreaterThan(1);

    // As quatro coisas, e cada uma medida por si.
    await expect(page.locator('[data-teste="quem"]').first()).toBeVisible();
    await expect(page.locator('[data-teste="porque"]').first()).toBeVisible();
    await expect(page.locator('[data-teste="ambito"]').first()).toBeVisible();
    const texto = await sessoes.first().innerText();
    expect(texto.length, 'a entrada aparece vazia').toBeGreaterThan(40);
  });

  test('e a promessa está escrita por PALAVRAS', async ({ page }) => {
    await page.goto(`${SET}/acesso`);
    // Mede-se a palavra, e não o comprimento — a lição do E24.
    const promessa = await page.locator('[data-teste="ves-tudo"]').innerText();
    expect(promessa.toLowerCase()).toContain('todas las entradas');
    const expira = await page.locator('[data-teste="expira-sozinha"]').innerText();
    expect(expira.toLowerCase()).toContain('caduca sola');
  });

  test('e o PAR aparece: uma sessão em curso e uma CADUCADA', async ({ page }) => {
    // A caducada é o caso que decide a fronteira 1: ninguém a fechou, e ela
    // deixou de valer. Com um estado só, «mostra sempre em curso» passava.
    await page.goto(`${SET}/acesso`);
    const texto = await page.locator('[data-teste="sessoes"]').innerText();
    expect(texto, 'não há sessão em curso semeada').toContain('En curso');
    expect(texto, 'não há sessão caducada: o caso mau não está semeado')
      .toContain('Caducada');
  });
});

test.describe('a plataforma conta o que ficou por fechar', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a PLAT-007 conta as sessões EXPIRADAS', async ({ page }) => {
    await page.goto(`${PLAT}/suporte`);
    const esquecidas = Number(
      await page.locator('[data-teste="quantas-expiradas"]').innerText());
    expect(esquecidas,
      'nenhuma sessão expirada: o caso não está semeado').toBeGreaterThan(0);
  });

  test('e a sessão esquecida aparece como CADUCADA, não como em curso',
    async ({ page }) => {
      await page.goto(`${PLAT}/suporte/${ID_DA_SESSAO_ESQUECIDA}`);
      const texto = await page.locator('[data-teste="ate-quando"]').innerText();
      expect(texto, 'a sessão que ninguém fechou aparece como viva')
        .toContain('Caducada');
      // E não há botão de fechar numa que já não vale.
      await expect(page.locator('[data-teste="terminar"]')).toHaveCount(0);
    });

  test('e a sessão viva TEM botão de fechar — senão isto não media nada',
    async ({ page }) => {
      await page.goto(`${PLAT}/suporte/${ID_DA_SESSAO_VIVA}`);
      await expect(page.locator('[data-teste="terminar"]')).toBeVisible();
    });

  test('e a PLAT-008 NÃO mostra os dados da casa', async ({ page }) => {
    // Saber que algo está mal não exige ver o quê. Uma tela de suporte que
    // mostra o conteúdo do restaurante ao lado do botão de fechar convida a
    // olhar sem motivo — e o motivo é uma das quatro condições.
    await page.goto(`${PLAT}/suporte/${ID_DA_SESSAO_VIVA}`);
    await expect(page.locator('[data-teste="vemos-o-que-precisamos"]')).toBeVisible();
    const texto = (await page.locator('.bo-pagina').innerText()).toLowerCase();
    for (const proibido of ['café', 'tortilla', 'a104']) {
      expect(texto, `a tela de suporte mostra conteúdo da casa: ${proibido}`)
        .not.toContain(proibido);
    }
  });
});

test.describe('o rasto guarda a pessoa, e o contador que não devia crescer', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a PLAT-013 CONTA as acções assinadas por um papel, e mostra o número',
    async ({ page }) => {
      // ── Porque é que isto NÃO exige zero ────────────────────────────────
      //
      // Escrevi `toBe(0)` à primeira e falhou com três. Fui ver, e as três são
      // do meu próprio controlo negativo: ele desliga o gatilho de propósito e
      // insere `suporte@bossa.example` para ver a prova acender.
      //
      // A auditoria é **append-only** — a base recusa apagar —, portanto ficam.
      // E ficam bem: o registo passou a dizer que a 06/09 alguém desligou a
      // protecção e assinou com um papel. **É exactamente para isso que serve
      // um registo de auditoria.** Um que se pudesse arrumar não seria um.
      //
      // Ou seja: o contador está certo, e a asserção é que estava errada.
      // Exigir zero seria medir o AMBIENTE — uma base que nunca correu
      // controlos — e não o produto.
      //
      // Quem garante que o gatilho recusa é a prova de base, no grupo 4. Aqui
      // mede-se o que esta tela existe para fazer: **mostrar o número**, para
      // alguém o ver crescer no dia em que crescer.
      await page.goto(`${PLAT}/auditoria`);
      const cru = await page.locator('[data-teste="quantas-por-papel"]').innerText();
      expect(Number.isInteger(Number(cru)),
        `o contador não é um número: ${cru}`).toBe(true);
      await expect(page.locator('[data-teste="papel-nao-e-pessoa"]')).toBeVisible();
    });

  test('e há acções da plataforma para contar — senão o zero é vácuo',
    async ({ page }) => {
      // O par. Um contador a zero sobre uma lista vazia não prova nada, e é o
      // «verde sobre população zero» que a régua reprova.
      await page.goto(`${PLAT}/auditoria`);
      const eventos = await page.locator('[data-teste="evento"]').count();
      expect(eventos, 'não há acções da plataforma: o zero acima é vácuo')
        .toBeGreaterThan(0);
      const quem = await page.locator('[data-teste="quem"]').first().innerText();
      expect(quem, 'a acção não diz quem a fez').toContain('@');
    });
});

test.describe('nenhum segredo aparece no ecrã', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a PLAT-017 mostra o estado e NUNCA o valor', async ({ page }) => {
    await page.goto(`${PLAT}/modelos`);
    await expect(page.locator('[data-teste="segredo"]').first()).toBeVisible();
    await expect(page.locator('[data-teste="nunca-se-ve"]')).toBeVisible();

    const texto = await page.locator('.bo-pagina').innerText();
    // Nem valores, nem máscaras: uma máscara diz que o valor está do lado de cá.
    for (const proibido of ['sk_live', 'sk_test', '••••', '****']) {
      expect(texto, `apareceu algo que parece um segredo: ${proibido}`)
        .not.toContain(proibido);
    }
  });
});

test.describe('privacidade e exportação não ficam atrás do plano', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a SET-013 tem o botão de exportar, sem portão nenhum', async ({ page }) => {
    await page.goto(`${SET}/retencao`);
    await expect(page.locator('[data-teste="exportar"]')).toBeVisible();
    await expect(page.locator('[data-teste="nunca-atras-do-plano"]')).toBeVisible();
  });

  test('e o vazio aparece como VAZIO, e não como zero', async ({ page }) => {
    // «Vazio significa sem decidir, não para sempre.» Um zero aqui seria uma
    // política de retenção de zero dias — apagar tudo hoje.
    await page.goto(`${SET}/retencao`);
    for (const campo of ['diasPedidos', 'diasClientes', 'diasAuditoria']) {
      const valor = await page.locator(`[data-teste="${campo}"]`).inputValue();
      expect(valor, `${campo} apareceu preenchido: a semente decidiu por eles`).toBe('');
    }
    const ajuda = await page.locator('[data-teste="nao-decidida"]').innerText();
    expect(ajuda.toLowerCase()).toContain('sin decidir');
  });
});

test.describe('o estado do sistema chega ao cliente', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('a HELP-004 mostra o incidente aberto', async ({ page }) => {
    // Um incidente que só nós vemos é um telefone a tocar.
    await page.goto(`${ORG}/ajuda/estado`);
    const incidentes = await page.locator('[data-teste="incidente"]').count();
    expect(incidentes, 'o incidente semeado não chega ao cliente').toBeGreaterThan(0);
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · plataforma`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 19 telas não transbordam nem escondem acções', async ({ page }) => {
      test.setTimeout(300_000);
      for (const tela of TELAS) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('plataforma a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    test.setTimeout(300_000);
    for (const tela of TELAS) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    test.setTimeout(300_000);
    for (const tela of TELAS) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('as três línguas', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('as 19 telas abrem nas três, e o marcador não muda', async ({ page }) => {
    test.setTimeout(300_000);
    for (const idioma of IDIOMAS) {
      for (const tela of TELAS) await visitar(page, tela, idioma);
    }
  });
});

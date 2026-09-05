import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * As 6 últimas telas do E19: a mensageria e o relatório.
 *
 * ── Os dois pontos da régua que estas telas carregam ──────────────────────
 *
 * **Ponto 2:** «reenviar a mesma mensagem não a entrega duas vezes». O ecrã tem
 * de o dizer, senão quem carrega assume que carregou em vão e carrega mais.
 *
 * **Ponto 3:** «a definição escrita ao lado do número, no ecrã». Um «no-show: 12»
 * sem dizer se conta a reserva ou as pessoas é um número que o dono vai usar para
 * decidir e que ninguém consegue reproduzir.
 *
 * E o que a régua reprova à cabeça: **mensageria externa activa sem contrato**. O
 * conector fica desligado e **visível como desligado** — não a fingir que enviou.
 */

const PAINEL = '/es-ES/app/marina-oropesa/puerto';
const TOQUE = 44;

interface Tela { id: string; caminho: string }

const TELAS: Tela[] = [
  { id: 'RES-B-017', caminho: `${PAINEL}/reservations/mensagens` },
  { id: 'RES-B-018', caminho: `${PAINEL}/reservations/mensagens/historico` },
  { id: 'RES-B-019', caminho: `${PAINEL}/reservations/relatorio` },
  { id: 'REP-008', caminho: `${PAINEL}/reports/reservas` },
  { id: 'INT-004', caminho: `${PAINEL}/integrations/mensageria` },
  { id: 'SET-009', caminho: `${PAINEL}/settings/mensagens` },
];

const QUANTAS_TELAS = 6;

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

test('a população é 6 telas, e 6 ids DISTINTOS', () => {
  expect(TELAS.length).toBe(QUANTAS_TELAS);
  expect(new Set(TELAS.map((t) => t.id)).size).toBe(QUANTAS_TELAS);
});

test('e AS 28 DO E19 estão todas na matriz como feitas', async () => {
  // ── A conta que fecha a etapa ────────────────────────────────────────
  //
  // A régua fixou 28 antes de existir código, e escreveu-as uma a uma
  // precisamente porque «um número sem o conjunto deixa passar uma tela trocada
  // por outra». Isto compara conjunto a conjunto.
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const linhas = csv.split('\n').slice(1).map(colunas).filter((c) => c[6] === 'E19');
  expect(linhas.length, 'a matriz não tem 28 telas no E19').toBe(28);
  // ── «Feita» tem mais que um nome, e o segundo é MELHOR que o primeiro ──
  //
  // Isto exigia a palavra `implementado aguardando validação`, que era o estado
  // do E19 no dia em que a guarda foi escrita. Quando o sénior assinou o E19 e
  // passou as 28 a `validado` (3ee1383), a guarda ficou vermelha por a etapa ter
  // AVANÇADO — mediu o nome do estado, não o facto de a tela estar feita.
  //
  // Não é calibrar ao que existe: `validado` é uma forma mais forte de feita, e o
  // conjunto continua a excluir `planejado` e `em execução`. Uma tela por
  // construir continua a acender isto — é o controlo negativo desta linha.
  const DECLARADAS = new Set(['implementado aguardando validação', 'validado']);
  const feitas = linhas.filter((c) => DECLARADAS.has(c[16] ?? ''));
  expect(feitas.length, 'nem todas as 28 estão declaradas').toBe(28);

  const daMatriz = linhas.map((c) => c[0]?.trim() ?? '')
    .filter((id) => ['RES-B-017', 'RES-B-018', 'RES-B-019', 'REP-008', 'INT-004', 'SET-009']
      .includes(id));
  expect(TELAS.map((t) => t.id).sort()).toEqual([...daMatriz].sort());
});

async function visitar(pagina: import('@playwright/test').Page, tela: Tela, idioma: string) {
  const caminho = tela.caminho.replace('/es-ES/', `/${idioma}/`);
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${tela.id} · ${caminho} respondeu ${resposta?.status()}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  expect(new URL(pagina.url()).pathname, `${tela.id} · houve um redireccionamento`)
    .toBe(caminho.split('?')[0]);
  await expect(pagina.locator(`h1[data-tela="${tela.id}"]`).first(),
    `${tela.id} · o marcador não apareceu`).toBeVisible();
}

test.describe('há mensagens e textos — senão medem o ecrã fácil', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('o histórico tem linhas e a lista de textos também', async ({ page }) => {
    await page.goto(`${PAINEL}/reservations/mensagens/historico`);
    await expect(page.locator('[data-teste="sem-mensagens"]'),
      'o histórico mediu o ecrã vazio').toHaveCount(0);
    expect(await page.locator('table tbody tr').count()).toBeGreaterThan(0);

    await page.goto(`${PAINEL}/reservations/mensagens`);
    await expect(page.locator('[data-teste="sem-templates"]')).toHaveCount(0);
  });
});

for (const largura of LARGURAS) {
  test.describe(`${largura} px · mensageria`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 6 telas não transbordam nem escondem acções', async ({ page }) => {
      for (const tela of TELAS) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('mensageria a 360 px', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    for (const tela of TELAS) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    for (const tela of TELAS) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · texto com pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('mensageria nos três idiomas', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      for (const tela of TELAS) {
        await visitar(page, tela, idioma);
        expect(await transbordaNaHorizontal(page), `${tela.id} · ${idioma} transborda`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · ${idioma}:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  }
});

/**
 * O CONECTOR desligado, e visível como desligado.
 */
test.describe('a mensageria não finge que enviou', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('o INT-004 diz que está desligado E diz a consequência', async ({ page }) => {
    await page.goto(`${PAINEL}/integrations/mensageria`);
    const estado = (await page.locator('[data-teste="estado-conector"]').innerText()).toLowerCase();
    expect(estado, 'o conector não diz que não tem provedor')
      .toMatch(/sin proveedor|sem provedor|no provider/);
    const ajuda = (await page.locator('[data-teste="conector-ajuda"]').innerText()).toLowerCase();
    expect(ajuda, 'não diz que nenhuma mensagem aparecerá como enviada')
      .toMatch(/no se envía|não se envia|nothing is sent/);
  });

  test('e quem escreve os textos vê o mesmo aviso', async ({ page }) => {
    // Quem escreve é quem vai perguntar porque é que os clientes não recebem.
    await page.goto(`${PAINEL}/reservations/mensagens`);
    await expect(page.locator('[data-teste="conector-desligado"]')).toBeVisible();
  });

  test('o histórico mostra a mensagem PENDENTE, e não ENVIADA', async ({ page }) => {
    await page.goto(`${PAINEL}/reservations/mensagens/historico`);
    const corpo = await page.locator('table tbody').innerText();
    expect(corpo, 'uma mensagem apareceu como enviada sem provedor nenhum')
      .not.toMatch(/ENVIADA/);
    expect(corpo).toMatch(/PENDENTE/);
  });
});

/**
 * O REENVIO deduplicado, dito no ecrã.
 */
test.describe('o histórico diz que reenviar não entrega duas vezes', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('a frase está no RES-B-018', async ({ page }) => {
    await page.goto(`${PAINEL}/reservations/mensagens/historico`);
    const t = (await page.locator('[data-teste="reenviar-ajuda"]').innerText()).toLowerCase();
    expect(t, 'o ecrã não diz que reenviar não entrega duas vezes')
      .toMatch(/dos veces|duas vezes|twice/);
  });

  test('e a coluna das TENTATIVAS existe — o resultado do provedor é guardado', async ({ page }) => {
    await page.goto(`${PAINEL}/reservations/mensagens/historico`);
    const cabecalho = await page.locator('table thead').innerText();
    expect(cabecalho.toLowerCase(), 'o histórico não mostra quantas vezes se tentou')
      .toMatch(/intentos|tentativas|attempts/);
  });
});

/**
 * A DEFINIÇÃO ao lado do número, nas DUAS telas que o mostram.
 */
test.describe('cada número diz o que conta', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  for (const [tela, caminho] of [
    ['RES-B-019', `${PAINEL}/reservations/relatorio`],
    ['REP-008', `${PAINEL}/reports/reservas`],
  ] as const) {
    test(`${tela}: as cinco definições estão no ecrã`, async ({ page }) => {
      await page.goto(caminho);
      const definicoes = page.locator('[data-teste="definicao"]');
      expect(await definicoes.count(), 'faltam definições ao lado dos números').toBe(5);
      const texto = (await page.locator('table tbody').innerText()).toLowerCase();
      // O no-show é o que mais se confunde: conta reservas, não pessoas.
      expect(texto, 'o no-show não diz se conta reservas ou pessoas')
        .toMatch(/no cuenta personas|não conta pessoas|not people/);
    });
  }

  test('e as duas telas dizem o MESMO — a conta é uma só', async ({ page }) => {
    // Dois relatórios com a mesma pergunta e contas diferentes é a forma clássica
    // de uma organização discutir números em vez de decidir.
    await page.goto(`${PAINEL}/reservations/relatorio`);
    const umas = await page.locator('table tbody').innerText();
    await page.goto(`${PAINEL}/reports/reservas`);
    const outras = await page.locator('table tbody').innerText();
    expect(outras, 'as duas telas mostram números diferentes para a mesma pergunta')
      .toBe(umas);
  });
});

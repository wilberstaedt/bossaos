import { expect, test } from '@playwright/test';
import {
  IDIOMAS, LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste,
  transbordaNaHorizontal,
} from './ajudas.ts';
import { resolverAlvos, TOKEN_DO_VISITANTE, type Alvos } from './alvos.ts';

/**
 * As 16 telas do E17, medidas no navegador.
 *
 * ── O que este arnês tem de diferente ─────────────────────────────────────
 *
 * Dez das dezasseis são de **quem não tem sessão de inquilino** — são as telas do
 * visitante, servidas pela porta pública. A sessão que elas precisam é a do
 * visitante, e vem de uma bolacha que a prova põe à mão, com o token que a
 * semeadura fixou.
 *
 * Sem essa bolacha, as sete telas da visita mediam o **desvio** para o STATE-009:
 * cinco larguras verdes sobre o ecrã errado, que é o falso verde que este arnês
 * existe para impedir.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const SLUG = 'insp-marina-oropesa';
/** O painel mede-se a 44 px, e é assim em todas as outras provas deste arnês. */
const TOQUE = 44;

interface Tela {
  id: string;
  caminho: string;
  marcador: string;
  /** Precisa da bolacha do visitante para não medir o desvio. */
  comVisita?: true;
}

function telas(a: Alvos): Tela[] {
  const marcador = (id: string) => `h1[data-tela="${id}"]`;
  const painel = `/es-ES/app/marina-oropesa/puerto/channels/qr`;
  const publico = `/r/${SLUG}/es-ES`;
  return [
    // ── As dez do visitante ──────────────────────────────────────────────
    { id: 'MENU-006', caminho: `${publico}/menu/produto/${a.productId}/pedir`,
      marcador: marcador('MENU-006'), comVisita: true },
    { id: 'MENU-007', caminho: `${publico}/mesa/pedido`, marcador: marcador('MENU-007'), comVisita: true },
    { id: 'MENU-008', caminho: `${publico}/mesa/enviar`, marcador: marcador('MENU-008'), comVisita: true },
    { id: 'MENU-009', caminho: `${publico}/mesa/recebido`, marcador: marcador('MENU-009'), comVisita: true },
    { id: 'MENU-010', caminho: `${publico}/mesa/andamento`, marcador: marcador('MENU-010'), comVisita: true },
    { id: 'MENU-011', caminho: `${publico}/mesa`, marcador: marcador('MENU-011'), comVisita: true },
    { id: 'MENU-012', caminho: `${publico}/mesa/ajuda`, marcador: marcador('MENU-012'), comVisita: true },
    { id: 'MENU-013', caminho: `${publico}/mesa/conta`, marcador: marcador('MENU-013'), comVisita: true },
    { id: 'MENU-020', caminho: `${publico}/mesa/esgotado`, marcador: marcador('MENU-020'), comVisita: true },
    // Os dois estados que explicam o que aconteceu. Não precisam de visita — são
    // exactamente o que se vê quando ela não existe.
    { id: 'MENU-018', caminho: `${publico}/menu?qr=inactivo`, marcador: marcador('MENU-018') },
    { id: 'STATE-009', caminho: `${publico}/menu?sessao=terminou`, marcador: marcador('STATE-009') },
    // ── As quatro do painel ──────────────────────────────────────────────
    { id: 'QR-002', caminho: `${painel}/mesa/${a.mesaComQr}`, marcador: marcador('QR-002') },
    { id: 'QR-005', caminho: `${painel}/mesa/${a.mesaComQr}/renovar`, marcador: marcador('QR-005') },
    { id: 'QR-006', caminho: `${painel}/sessoes`, marcador: marcador('QR-006') },
    { id: 'QR-007', caminho: `${painel}/sessoes/${a.visitanteVivo}`, marcador: marcador('QR-007') },
    // STATE-010 vive dentro do MENU-020: é um estado daquele fluxo, e o que se
    // revê é o que acabou de acontecer. Marcador de secção, e não de página.
    { id: 'STATE-010', caminho: `${publico}/mesa/esgotado`,
      marcador: 'section[data-tela="STATE-010"]', comVisita: true },
  ];
}

/** Põe a bolacha do visitante, com o token que a semeadura fixou. */
async function comBolachaDeVisita(contexto: import('@playwright/test').BrowserContext) {
  await contexto.addCookies([{
    name: 'bo_visita', value: TOKEN_DO_VISITANTE,
    domain: '127.0.0.1', path: `/r/${SLUG}`,
  }]);
}

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

const QUANTAS_TELAS = 16;

test('a população é 16 telas, e 16 ids DISTINTOS', () => {
  const lista = telas(alvos);
  expect(lista.length, 'a lista não tem 16 entradas').toBe(QUANTAS_TELAS);
  expect(new Set(lista.map((t) => t.id)).size, 'ids repetidos').toBe(QUANTAS_TELAS);
});

test('e são exactamente as 16 da MATRIZ, sem faltar nem sobrar', async () => {
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile('docs/progress/coverage.csv', 'utf8');
  const daMatriz = csv.split('\n').slice(1)
    .map(colunas).filter((c) => c[6] === 'E17')
    .map((c) => c[0]?.trim() ?? '').filter((id) => id !== '');
  // Guarda de leitor cego: sem isto, dois conjuntos vazios comparam iguais.
  expect(daMatriz.length, 'não li a matriz — a comparação seria vazia').toBe(QUANTAS_TELAS);
  expect(telas(alvos).map((t) => t.id).sort(), 'a lista medida não é a da matriz')
    .toEqual([...daMatriz].sort());
});

async function visitar(
  pagina: import('@playwright/test').Page, tela: Tela, idioma: string,
) {
  if (tela.comVisita) await comBolachaDeVisita(pagina.context());
  const caminho = tela.caminho.replace('/es-ES/', `/${idioma}/`).replace(`/${SLUG}/es-ES`, `/${SLUG}/${idioma}`);
  const resposta = await pagina.goto(caminho);
  expect(resposta?.status(), `${tela.id} · ${caminho} respondeu ${resposta?.status()}`)
    .toBeLessThan(400);
  await pagina.waitForLoadState('networkidle');
  // ── O caminho FINAL, e é aqui que o desvio se apanha ────────────────────
  //
  // Sem a bolacha, as telas da visita redireccionam para o STATE-009. Sem esta
  // asserção, mediam esse ecrã em cinco larguras e diziam verde nas cinco.
  expect(new URL(pagina.url()).pathname, `${tela.id} · houve um redireccionamento`)
    .toBe(caminho.split('?')[0]);
  await expect(pagina.locator(tela.marcador).first(), `${tela.id} · o marcador não apareceu`)
    .toBeVisible();
}

for (const largura of LARGURAS) {
  test.describe(`${largura} px · visitante`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('as 16 telas não transbordam nem escondem acções', async ({ page }) => {
      for (const tela of telas(alvos)) {
        await visitar(page, tela, 'es-ES');
        expect(await transbordaNaHorizontal(page), `${tela.id} rola na horizontal`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · elementos fora do ecrã:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  });
}

test.describe('visitante a 360 px — o telemóvel de quem está sentado', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('os alvos de toque têm 44 px', async ({ page }) => {
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES');
      const maus = await alvosPequenos(page, TOQUE);
      expect(maus, `${tela.id} · alvos pequenos:\n${maus.join('\n')}`).toEqual([]);
    }
  });

  test('o contraste cumpre a WCAG', async ({ page }) => {
    for (const tela of telas(alvos)) {
      await visitar(page, tela, 'es-ES');
      const maus = await textosComPoucoContraste(page);
      expect(maus, `${tela.id} · texto com pouco contraste:\n${maus.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('visitante nos três idiomas', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  for (const idioma of IDIOMAS) {
    test(`${idioma} a 360 px`, async ({ page }) => {
      for (const tela of telas(alvos)) {
        await visitar(page, tela, idioma);
        expect(await transbordaNaHorizontal(page), `${tela.id} · ${idioma} transborda`).toBe(0);
        const fora = await elementosForaDoEcra(page);
        expect(fora, `${tela.id} · ${idioma}:\n${fora.join('\n')}`).toEqual([]);
      }
    });
  }
});

/**
 * OS DOIS ACTOS, no ecrã de quem carrega no botão.
 *
 * ── A separação não pode viver só no código ───────────────────────────────
 *
 * *«Colapsar as duas num "invalidar" dá um sistema que ou nunca roda, ou expulsa
 * gente da mesa a meio do prato.»* Se o ecrã oferecesse um botão só, a regra da
 * base estaria certa e o produto estaria errado — e a pessoa que decide nunca
 * saberia que havia duas coisas.
 */
test.describe('rodar e revogar são dois actos, e o ecrã di-lo', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  const renovar = (a: Alvos) =>
    `/es-ES/app/marina-oropesa/puerto/channels/qr/mesa/${a.mesaComQr}/renovar`;

  test('as duas acções estão SEPARADAS, com a consequência escrita', async ({ page }) => {
    await page.goto(renovar(alvos));
    await page.waitForLoadState('networkidle');

    // Dois formulários, e não um. Um botão único a dizer «invalidar» é o colapso.
    await expect(page.locator('[data-teste="rodar"]'), 'não há acto de rodar').toHaveCount(1);
    await expect(page.locator('[data-teste="revogar"]'), 'não há acto de revogar').toHaveCount(1);

    // E cada um diz o que faz a quem está a comer. Sem as frases, os dois botões
    // são indistinguíveis para quem nunca leu o contrato — que é toda a gente.
    const ajudaRodar = await page.locator('[data-teste="rodar-ajuda"]').innerText();
    const ajudaRevogar = await page.locator('[data-teste="revogar-ajuda"]').innerText();
    expect(ajudaRodar.trim().length, 'rodar não explica o que faz').toBeGreaterThan(0);
    expect(ajudaRevogar.trim().length, 'revogar não explica o que faz').toBeGreaterThan(0);
    expect(ajudaRodar, 'as duas acções estão explicadas com as MESMAS palavras')
      .not.toBe(ajudaRevogar);
  });

  test('o NÚMERO das sessões que caem aparece ANTES de confirmar', async ({ page }) => {
    // «Descartar é aceitável quando quem decide sabe o que está a descartar;
    // descobrir depois não é.» O número está no ecrã antes de haver confirmação.
    await page.goto(renovar(alvos));
    await page.waitForLoadState('networkidle');

    const linha = page.locator('[data-teste="vao-cair"]');
    await expect(linha, 'o ecrã de revogar não diz quantas sessões vão cair').toBeVisible();
    const texto = await linha.innerText();
    expect(texto, 'o número não está escrito').toMatch(/\d/);
  });

  test('e RODAR diz quantas CONTINUARAM — a prova no ecrã de que não revoga',
    async ({ page }) => {
      // O caso 1 do contrato, visto por quem carregou no botão. A pergunta que
      // essa pessoa tem na cabeça é «estraguei o jantar de alguém?», e a resposta
      // tem de estar no ecrã seguinte.
      await page.goto(renovar(alvos));
      await page.waitForLoadState('networkidle');

      const vivasAntes = Number(
        (await page.locator('[data-teste="vao-cair"]').innerText()).replace(/\D+/g, ''));
      expect(vivasAntes, 'não há sessão viva: rodar não provaria nada')
        .toBeGreaterThan(0);

      await page.locator('[data-teste="rodar"] button').click();
      await page.waitForLoadState('networkidle');

      const continuaram = page.locator('[data-teste="continuaram"]');
      await expect(continuaram, 'o ecrã não diz quantas sessões continuaram').toBeVisible();
      const quantas = Number((await continuaram.innerText()).replace(/\D+/g, ''));
      expect(quantas, `rodar fechou sessões: eram ${vivasAntes} e continuaram ${quantas}`)
        .toBe(vivasAntes);

      // E o segredo novo aparece UMA vez, com a frase que o diz.
      await expect(page.locator('[data-teste="uma-vez"]')).toBeVisible();
      await expect(page.locator('[data-teste="qr-novo"] svg')).toBeVisible();
    });
});

/**
 * O visitante que já lá está CONTINUA a pedir depois de rodar.
 *
 * É o caso 1 do contrato medido no produto, e não na base: a bolacha antiga
 * continua a abrir as telas da visita depois de o QR ter sido trocado.
 */
test.describe('rodar não expulsa quem está sentado', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('a visita aberta antes da rotação continua a abrir depois dela', async ({ page }) => {
    await comBolachaDeVisita(page.context());
    const daVisita = `/r/${SLUG}/es-ES/mesa`;

    await page.goto(daVisita);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1[data-tela="MENU-011"]'), 'a visita não abre sequer')
      .toBeVisible();

    // Roda-se o QR pelo PRODUTO, e não por SQL: é o caminho que a pessoa faz.
    await page.goto(`/es-ES/app/marina-oropesa/puerto/channels/qr/mesa/${alvos.mesaComQr}/renovar`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-teste="rodar"] button').click();
    await page.waitForLoadState('networkidle');

    // E a visita continua. Se cair aqui, a rotação está a revogar.
    await page.goto(daVisita);
    await page.waitForLoadState('networkidle');
    expect(new URL(page.url()).pathname, 'rodar expulsou quem estava sentado')
      .toBe(daVisita);
    await expect(page.locator('h1[data-tela="MENU-011"]')).toBeVisible();
  });
});

/**
 * O CICLO DA CHAMADA, ponta a ponta — ponto 4 do enunciado.
 *
 * ── O que a régua exige ver, e porquê ─────────────────────────────────────
 *
 * *«Quero ver duas chamadas seguidas darem uma, e o par — uma chamada legítima
 * depois da janela passa. Sem o par, "ignora tudo" passa o teste.»*
 *
 * A regra está provada na base, onde vive. Aqui mede-se o que só o navegador
 * vê: que as **três respostas são diferentes no ecrã**, e que a confirmação
 * chega a quem chamou. É essa diferença que faz alguém parar de carregar — sem
 * ela, a regra está certa e a pessoa continua a bater no botão.
 */
test.describe.serial('chamar a sala: o ciclo completo', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  const daAjuda = `/r/${SLUG}/es-ES/mesa/ajuda`;

  /** Apaga as chamadas desta unidade, para cada caso começar do zero. */
  async function limparChamadas() {
    const { Client } = await import('pg');
    const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) throw new Error('MIGRATION_DATABASE_URL em falta');
    const sql = new Client({ connectionString: url });
    await sql.connect();
    await sql.query(
      `DELETE FROM guest_calls WHERE table_id IN
         (SELECT id FROM service_tables WHERE codigo LIKE 'insp-%')`);
    await sql.end();
  }

  test('o primeiro toque diz «avisámos agora», e o segundo diz «já tínhamos avisado»',
    async ({ page }) => {
      await limparChamadas();
      await comBolachaDeVisita(page.context());

      await page.goto(daAjuda);
      await page.waitForLoadState('networkidle');
      // Declarado antes de afirmar: não havia chamadas nenhumas.
      expect(Number(await page.locator('[data-teste="quantas-chamadas"]').innerText()),
        'já havia chamadas: a contagem não mediria a deduplicação').toBe(0);

      await page.locator('[data-teste="chamar"] button').click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-teste="resposta-da-chamada"]'))
        .toHaveAttribute('data-resposta', '1');
      const depoisDaPrimeira = Number(
        await page.locator('[data-teste="quantas-chamadas"]').innerText());
      expect(depoisDaPrimeira, 'o primeiro toque não registou chamada nenhuma').toBe(1);

      // ── O segundo toque ────────────────────────────────────────────────
      await page.goto(daAjuda);
      await page.locator('[data-teste="chamar"] button').click();
      await page.waitForLoadState('networkidle');

      // A resposta é OUTRA — e é isso que faz a pessoa parar. «Pedido enviado»
      // nas duas dava a mesma frase a quem carregou uma vez e a quem carregou
      // cinco, e nenhuma delas dizia se havia alguém a caminho.
      await expect(page.locator('[data-teste="resposta-da-chamada"]'),
        'o segundo toque respondeu como se fosse o primeiro')
        .toHaveAttribute('data-resposta', 'ja');

      // E continua a haver UMA chamada, não duas.
      expect(Number(await page.locator('[data-teste="quantas-chamadas"]').innerText()),
        'o segundo toque criou uma chamada nova').toBe(1);
    });

  test('a sala VÊ a chamada, atende, e quem chamou fica a saber', async ({ page }) => {
    // A confirmação é a metade que fecha o ciclo. Sem ela, quem chamou não sabe
    // se alguém vem — e volta a carregar até deixar de acreditar no botão.
    await limparChamadas();
    await comBolachaDeVisita(page.context());

    await page.goto(daAjuda);
    await page.locator('[data-teste="chamar"] button').click();
    await page.waitForLoadState('networkidle');
    // Ainda ninguém viu, e o ecrã di-lo por palavras.
    await expect(page.locator('[data-teste="chamada"]').first())
      .toHaveAttribute('data-atendida', '0');

    // ── Do lado da sala ────────────────────────────────────────────────
    await page.goto(`/es-ES/staff/${alvos.unidadeDoStaff}/avisos`);
    await page.waitForLoadState('networkidle');
    const naSala = page.locator('[data-teste="aviso"][data-tipo="chamada"]');
    await expect(naSala, 'a chamada não chegou ao ecrã de quem serve').toHaveCount(1);

    await naSala.locator('[data-teste="atender"] button').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-teste="aviso"][data-tipo="chamada"]'),
      'a chamada atendida ficou na fila de quem serve').toHaveCount(0);

    // ── E de volta ao telemóvel de quem chamou ─────────────────────────
    await page.goto(daAjuda);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-teste="chamada"]').first(),
      'quem chamou não vê que alguém já foi')
      .toHaveAttribute('data-atendida', '1');

    // E se carregar outra vez, a resposta di-lo — em vez de fingir que criou
    // uma chamada nova.
    await page.locator('[data-teste="chamar"] button').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-teste="resposta-da-chamada"]'))
      .toHaveAttribute('data-resposta', 'atendida');
  });

  test('pedir a CONTA é outra chamada, e não é engolida pela de ajuda',
    async ({ page }) => {
      // Cada uma tem uma resposta diferente do outro lado: uma traz uma pessoa, a
      // outra traz a conta. Colapsá-las fazia quem pediu a conta receber alguém a
      // perguntar o que se passa.
      await limparChamadas();
      await comBolachaDeVisita(page.context());

      await page.goto(daAjuda);
      await page.locator('[data-teste="chamar"] button').click();
      await page.waitForLoadState('networkidle');

      await page.goto(`/r/${SLUG}/es-ES/mesa/conta`);
      await page.waitForLoadState('networkidle');
      await page.locator('[data-teste="pedir-conta"] button').click();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('[data-teste="resposta-da-chamada"]'),
        'pedir a conta foi engolido pela chamada de ajuda')
        .toHaveAttribute('data-resposta', '1');

      // A sala vê as duas, e distingue-as: uma leva uma pessoa, a outra a conta.
      await page.goto(`/es-ES/staff/${alvos.unidadeDoStaff}/avisos`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-teste="aviso"][data-chamada="AJUDA"]')).toHaveCount(1);
      await expect(page.locator('[data-teste="aviso"][data-chamada="CONTA"]')).toHaveCount(1);

      await limparChamadas();
    });
});

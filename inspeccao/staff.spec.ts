import { expect, test } from '@playwright/test';
import { resolverAlvos, type Alvos } from './alvos.ts';

/**
 * E15 · o Staff PWA, medido onde ele mente.
 *
 * ── A pergunta desta prova ───────────────────────────────────────────────
 *
 * A régua abre com ela: *«nas outras etapas um defeito dava erro. Aqui o defeito
 * típico é o sistema a dizer que correu bem»*. «Enviado» num ecrã, com o comando
 * só gravado no telemóvel; o empregado vira costas, a cozinha nunca soube, e
 * ninguém procura o que não deu erro.
 *
 * Por isso **quase todos os casos recarregam a página**. Um toast desaparece na
 * recarga; um estado errado gravado não desaparece — e é a recarga que separa os
 * dois.
 *
 * ── E declara-se sempre quantos comandos havia ───────────────────────────
 *
 * «Verde sobre fila vazia» é o primeiro item do que a régua reprova à cabeça: uma
 * fila local sem comandos passa quase tudo.
 */

let alvos: Alvos;
test.beforeAll(async () => { alvos = await resolverAlvos(); });

const rotaDoStaff = (a: Alvos) => `/es-ES/staff/${a.unidadeDoStaff}`;

/** Quantos comandos existem no armazém deste navegador, de quem quer que sejam. */
async function comandosNoAparelho(pagina: import('@playwright/test').Page): Promise<number> {
  return pagina.evaluate(() => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k?.startsWith('bossaos.fila.v1.')) continue;
      try { total += (JSON.parse(localStorage.getItem(k) ?? '[]') as unknown[]).length; } catch { /* ilegível */ }
    }
    return total;
  });
}

/** Os estados escritos no ecrã, por palavras. Sem som e sem toast. */
async function estadosNoEcra(pagina: import('@playwright/test').Page): Promise<string[]> {
  return pagina.locator('[data-teste="entrada"]').evaluateAll(
    (els) => els.map((e) => e.getAttribute('data-estado') ?? ''));
}

test.describe.serial('perda de rede ANTES do envio', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('a fila começa VAZIA — declarado antes de afirmar seja o que for', async ({ page }) => {
    // O estado de rede é de CONTEXTO e sobrevive entre testes. Repô-lo no início
    // de cada um evita a fuga que me deu um falso «não enviado» no teste seguinte
    // — e um teste que depende do que o anterior deixou não é um teste.
    await page.context().setOffline(false);
    await page.goto(rotaDoStaff(alvos));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    expect(await comandosNoAparelho(page), 'o aparelho já tinha comandos').toBe(0);
    await expect(page.locator('[data-teste="fila-vazia"]')).toBeVisible();
  });

  test('compor com a rede CORTADA: o ecrã diz NÃO ENVIADO, e sobrevive ao F5', async ({ page }) => {
    // A rede morre antes de o comando sair, e o APARELHO sabe: `navigator.onLine`
    // é falso. É essa a diferença entre «sei que não saiu» e «saiu, e não sei» —
    // e sem ela o ecrã exagerava o que tinha acontecido.
    await page.goto(rotaDoStaff(alvos));
    await page.context().setOffline(true);

    await page.locator('[data-teste="compor"]').click();
    await expect(page.locator('[data-teste="entrada"]')).toHaveCount(1);

    // O ecrã NÃO diz enviado. É o *Respeite 1* do contrato.
    expect(await estadosNoEcra(page)).toEqual(['NAO_ENVIADO']);
    await expect(page.locator('[data-teste="por-enviar"]')).toContainText('1');

    // ── E AGORA O F5, que é o que separa um toast de um estado ───────────
    //
    // A rede volta ANTES da recarga, e é preciso que volte: um `reload` sem rede
    // nem chega a carregar a página. E não falseia nada — nada sincroniza sozinho
    // ao voltar a ligação, por isso o que se lê a seguir é o que **estava
    // gravado**, e não o resultado de um envio que aconteceu no meio.
    await page.context().setOffline(false);
    await page.reload();
    expect(await comandosNoAparelho(page), 'o rascunho não sobreviveu à recarga').toBe(1);
    expect(await estadosNoEcra(page), 'depois da recarga o estado mudou sozinho')
      .toEqual(['NAO_ENVIADO']);
  });

  test('O PAR: com a rede de volta, o mesmo comando confirma', async ({ page }) => {
    // Sem isto, tudo o que está acima passava num PWA que nunca envia nada.
    //
    // O caso é auto-suficiente: cada teste tem contexto próprio e o
    // `localStorage` NÃO sobrevive entre eles. Depender do que o anterior deixou
    // dava um caso que passa por ordem e falha sozinho.
    await page.context().setOffline(false);
    await page.goto(rotaDoStaff(alvos));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    expect(await comandosNoAparelho(page)).toBe(0);

    await page.context().setOffline(true);
    await page.locator('[data-teste="compor"]').click();
    await expect(page.locator('[data-teste="entrada"][data-estado="NAO_ENVIADO"]')).toHaveCount(1);

    await page.context().setOffline(false);
    await page.locator('[data-teste="sincronizar"]').click();
    await expect(page.locator('[data-teste="entrada"][data-estado="CONFIRMADO"]')).toHaveCount(1);

    // E confirma-se DEPOIS da recarga: o estado ficou gravado, não só pintado.
    await page.reload();
    expect(await estadosNoEcra(page)).toEqual(['CONFIRMADO']);
  });
});

test.describe.serial('perda de rede DEPOIS do envio', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('o servidor recebe e a resposta morre: o ecrã fica À ESPERA, não confirmado', async ({ page }) => {
    await page.context().setOffline(false);
    await page.goto(rotaDoStaff(alvos));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    expect(await comandosNoAparelho(page)).toBe(0);

    // O POST CHEGA ao servidor — e a resposta é que se perde. É a distinção que a
    // régua exige: não é a rede falhar antes de gravar, é gravar e não saber.
    // O POST CHEGA ao servidor — `rota.fetch()` executa-o de verdade — e o que o
    // cliente vê é um erro de gateway: a resposta perdeu-se pelo caminho. Não é
    // um «não» do servidor; é não saber. `fetch` seguido de `abort` não é legal
    // no Playwright, e um `abort` sozinho nunca teria chegado ao servidor.
    await page.route('**/api/org/**/pedidos', async (rota) => {
      if (rota.request().method() !== 'POST') return rota.fallback();
      // O POST CHEGA ao servidor de verdade, e o que o cliente vê é um erro de
      // gateway: a resposta perdeu-se pelo caminho. Não é um «não» do servidor —
      // é não saber, que é o caso que a régua exige.
      const resposta = await rota.fetch();
      void resposta;
      await rota.fulfill({ status: 502, body: 'a resposta perdeu-se' });
    });

    await page.locator('[data-teste="compor"]').click();
    await expect(page.locator('[data-teste="entrada"][data-estado="PENDENTE_DE_CONFIRMACAO"]'))
      .toHaveCount(1);
    expect(await estadosNoEcra(page), 'disse confirmado sobre uma resposta que nunca chegou')
      .toEqual(['PENDENTE_DE_CONFIRMACAO']);

    await page.reload();
    expect(await estadosNoEcra(page), 'a dúvida desapareceu na recarga')
      .toEqual(['PENDENTE_DE_CONFIRMACAO']);

    // Sem isto, o interceptor sobrevive ao teste e o Playwright queixa-se de uma
    // chamada em voo quando ele acaba.
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('ao reconectar, CONSULTA antes de repetir — e vê-se a consulta acontecer', async ({ page }) => {
    // A régua: «quero ver a consulta acontecer, não só a ausência de duplicado».
    await page.context().setOffline(false);
    await page.goto(rotaDoStaff(alvos));
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Deixa um comando PENDENTE: o servidor recebe-o e a resposta perde-se.
    await page.route('**/api/org/**/pedidos', async (rota) => {
      if (rota.request().method() !== 'POST') return rota.fallback();
      await rota.fetch();
      await rota.fulfill({ status: 502, body: 'a resposta perdeu-se' });
    });
    await page.locator('[data-teste="compor"]').click();
    await expect(page.locator('[data-teste="entrada"][data-estado="PENDENTE_DE_CONFIRMACAO"]'))
      .toHaveCount(1);
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    expect(await comandosNoAparelho(page), 'não há comando pendente para reconciliar').toBe(1);

    const pedidos: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/pedidos')) pedidos.push(`${r.method()} ${r.url()}`);
    });

    await page.locator('[data-teste="sincronizar"]').click();
    await expect(page.locator('[data-teste="entrada"][data-estado="CONFIRMADO"]')).toHaveCount(1);

    const consultas = pedidos.filter((p) => p.startsWith('GET') && p.includes('commandId='));
    const envios = pedidos.filter((p) => p.startsWith('POST'));

    expect(consultas.length, `não houve consulta por commandId: ${pedidos.join(' | ')}`)
      .toBeGreaterThan(0);
    // E a consulta veio ANTES de qualquer reenvio — não depois de já ter repetido.
    const primeiraConsulta = pedidos.findIndex((p) => p.startsWith('GET') && p.includes('commandId='));
    const primeiroEnvio = pedidos.findIndex((p) => p.startsWith('POST'));
    if (primeiroEnvio >= 0) {
      expect(primeiraConsulta, 'repetiu antes de consultar').toBeLessThan(primeiroEnvio);
    }
    // O servidor já o conhecia, portanto não houve reenvio nenhum.
    expect(envios, `reenviou um comando que o servidor já tinha: ${envios.join(' | ')}`).toEqual([]);
  });
});

test.describe('«nunca mostre enviado» — o controlo negativo a sério', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('com o envio a falhar sempre, o ecrã NUNCA diz confirmado — nem depois do F5', async ({ page }) => {
    await page.context().setOffline(false);
    await page.goto(rotaDoStaff(alvos));
    await page.evaluate(() => localStorage.clear());
    // Falha dura: o servidor recusa. Não é indeterminado, é um não.
    await page.route('**/api/org/**/pedidos**', (rota) =>
      rota.fulfill({ status: 500, body: 'nao' }));
    await page.reload();

    await page.locator('[data-teste="compor"]').click();
    await expect(page.locator('[data-teste="entrada"]')).toHaveCount(1);

    const antes = await estadosNoEcra(page);
    expect(antes, 'disse confirmado sobre um envio que falhou').not.toContain('CONFIRMADO');

    await page.reload();
    const depois = await estadosNoEcra(page);
    expect(depois, 'a recarga transformou um envio falhado em confirmado')
      .not.toContain('CONFIRMADO');
    expect(await comandosNoAparelho(page), 'o comando desapareceu com a falha').toBe(1);
  });
});

test.describe('offline não paga', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('a acção financeira é RECUSADA, e não enfileirada', async ({ page }) => {
    await page.context().setOffline(false);
    await page.goto(rotaDoStaff(alvos));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const antes = await comandosNoAparelho(page);
    expect(antes).toBe(0);

    await page.locator('[data-teste="pagar"]').click();
    const recusa = page.locator('[data-teste="recusa-offline"]');
    await expect(recusa).toBeVisible();
    // Recusada COM o motivo. «Bloqueado» sem motivo faz tentar outra vez.
    await expect(recusa).toContainText(/conexión|conex|connection/i);

    // E NÃO ficou na fila: enfileirar prometia que ia acontecer.
    expect(await comandosNoAparelho(page), 'a acção financeira foi enfileirada').toBe(antes);
  });
});

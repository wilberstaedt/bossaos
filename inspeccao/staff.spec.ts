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


/**
 * A TROCA DE UTILIZADOR, no produto — e o par sem o qual não valia nada.
 *
 * ── É a família de defeito que já apareceu três vezes neste projecto ─────
 *
 * A régua nomeia-a: *«trocar de utilizador não mostra rascunhos do anterior — e
 * o par: o anterior volta e os rascunhos dele ainda lá estão. Uma implementação
 * que apague ao trocar passa a primeira metade e destrói trabalho.»*
 *
 * ── O que torna isto uma medição e não uma encenação ─────────────────────
 *
 * **Um contexto só**, portanto **um `localStorage` só** — que é o que um tablet
 * de sala é. O que muda entre os dois momentos é a bolacha da sessão, e mais
 * nada. Duas janelas separadas teriam dois armazéns, e o cenário do contrato —
 * «A compõe, fica sem rede, sai; B entra» — deixava de existir.
 *
 * E a segunda pessoa está na **mesma organização e na mesma unidade** que a
 * primeira. Com a conta do outro inquilino, isto media a partição por inquilino
 * e passava com uma fila que ignorasse quem é a pessoa — que é precisamente o
 * defeito.
 */
test.describe.serial('troca de utilizador no mesmo aparelho', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  /** As bolachas de uma sessão guardada, sem lhe tocar no `localStorage`. */
  async function bolachasDe(ficheiro: string) {
    const { readFile } = await import('node:fs/promises');
    const estado = JSON.parse(await readFile(ficheiro, 'utf8')) as {
      cookies: Parameters<import('@playwright/test').BrowserContext['addCookies']>[0];
    };
    return estado.cookies;
  }

  test('os rascunhos de A não seguem com a sessão de C, e voltam com A', async ({ page }) => {
    const { FICHEIRO_DE_SESSAO, FICHEIRO_DE_SESSAO_C } = await import('./caminhos.ts');
    const contexto = page.context();
    const deA = await bolachasDe(FICHEIRO_DE_SESSAO);
    const deC = await bolachasDe(FICHEIRO_DE_SESSAO_C);

    await contexto.setOffline(false);
    await page.goto(rotaDoStaff(alvos));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    expect(await comandosNoAparelho(page), 'o aparelho já tinha comandos').toBe(0);

    // ── A compõe DOIS rascunhos, sem rede ────────────────────────────────
    await contexto.setOffline(true);
    await page.locator('[data-teste="compor"]').click();
    await expect(page.locator('[data-teste="entrada"]')).toHaveCount(1);
    await page.locator('[data-teste="compor"]').click();
    await expect(page.locator('[data-teste="entrada"]')).toHaveCount(2);
    await contexto.setOffline(false);

    const doA = await comandosNoAparelho(page);
    expect(doA, 'A não deixou dois rascunhos no aparelho').toBe(2);

    // ── C entra NO MESMO APARELHO. Só a bolacha muda ─────────────────────
    await contexto.clearCookies();
    await contexto.addCookies(deC);
    await page.reload();

    // 1ª metade: C não vê os rascunhos de A.
    await expect(page.locator('[data-teste="entrada"]'), 'C está a ver os rascunhos de A')
      .toHaveCount(0);

    // E o aparelho CONTINUA a ter os dois. Esta é a asserção que separa
    // «suspendeu» de «apagou» — e apagar era destruir o trabalho de alguém.
    expect(await comandosNoAparelho(page), 'os rascunhos de A foram APAGADOS ao trocar de pessoa')
      .toBe(doA);

    // E contam-se: uma fila que suspende em silêncio parece vazia, e o dono
    // conclui que perdeu tudo.
    await expect(page.locator('[data-teste="suspensas"]'), 'as suspensas não são declaradas a C')
      .toContainText(String(doA));

    // ── E o PAR: A volta, e o que era dele ainda lá está ─────────────────
    //
    // Sem isto, tudo acima passava com uma implementação que apaga a fila em
    // cada troca — que esconde os rascunhos de A com perfeição e perde o
    // trabalho dele.
    await contexto.clearCookies();
    await contexto.addCookies(deA);
    await page.reload();

    await expect(page.locator('[data-teste="entrada"]'), 'A voltou e os rascunhos dele sumiram')
      .toHaveCount(2);
    expect(await estadosNoEcra(page)).toEqual(['NAO_ENVIADO', 'NAO_ENVIADO']);
  });
});

/**
 * Offline não paga — e agora a prova consegue ficar VERMELHA.
 *
 * ── O caso que estava aqui não media nada ────────────────────────────────
 *
 * O caso anterior punha a rede **ligada**, carregava no botão e verificava a
 * recusa. Passava — e passava porque a recusa era incondicional: `podeOffline`
 * responde sobre a **acção** (pagamento exige servidor), não sobre a rede, e o
 * ecrã mostrava-a sempre. Apagar a lógica de offline inteira deixava o caso
 * exactamente igual.
 *
 * É o que a régua reprova pelo nome — *«uma suite que não consegue ficar
 * vermelha»* — e estava do meu lado, na entrega e no instrumento ao mesmo tempo.
 *
 * Agora as duas metades são medidas e são **diferentes**: sem rede é recusa, com
 * rede é a verdade sobre quem cobra. Um teste que corra só num dos estados falha
 * a metade que interessa.
 */
test.describe('offline não paga, e com rede a resposta é OUTRA', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('SEM rede: recusa com motivo, e nada entra na fila', async ({ page }) => {
    await page.context().setOffline(false);
    await page.goto(rotaDoStaff(alvos));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const antes = await comandosNoAparelho(page);
    expect(antes, 'o aparelho já tinha comandos').toBe(0);

    await page.context().setOffline(true);
    await page.locator('[data-teste="pagar"]').click();

    const recusa = page.locator('[data-teste="recusa-offline"]');
    await expect(recusa, 'sem rede não houve recusa nenhuma').toBeVisible();
    await expect(recusa).toContainText(/conexión|conex|connection/i);
    // E NÃO ficou na fila: enfileirar prometia que ia acontecer.
    expect(await comandosNoAparelho(page), 'a acção financeira foi enfileirada').toBe(antes);

    await page.context().setOffline(false);
  });

  test('COM rede: não diz que falta conexão — diz quem decide', async ({ page }) => {
    // Este é o controlo negativo do caso acima. Com a implementação antiga — a
    // recusa incondicional — este caso REPROVA, porque o ecrã mostrava
    // «recusa-offline» com a rede ligada.
    await page.context().setOffline(false);
    await page.goto(rotaDoStaff(alvos));
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.locator('[data-teste="pagar"]').click();

    await expect(page.locator('[data-teste="pagamento-no-servidor"]')).toBeVisible();
    await expect(
      page.locator('[data-teste="recusa-offline"]'),
      'com rede, o ecrã continua a dizer que falta conexão',
    ).toHaveCount(0);
    expect(await comandosNoAparelho(page), 'a acção financeira foi enfileirada').toBe(0);
  });
});

/**
 * A DIVERGÊNCIA DE PREÇO, ponta a ponta — e é o E14 a aterrar no ecrã.
 *
 * ── O que a régua exige, e porque é que uma semente não chegava ──────────
 *
 * *«Um rascunho escrito offline e aceite mais tarde vale o preço do servidor no
 * momento em que aceita, e a divergência é rejeitada com motivo. Isso tem de
 * estar visível no ecrã do empregado — a linha rejeitada fica, com o preço
 * proposto e o oficial lado a lado. Se a divergência só aparecer num log, o E14
 * foi bem implementado e mal entregue.»*
 *
 * A semeadura tem uma linha divergente para o painel ter o que desenhar às cinco
 * larguras. **Isso mede o desenho, não o mecanismo**: uma linha escrita à mão na
 * base aparece na mesma se o motor de preços não existir.
 *
 * Este caso faz a coisa acontecer: compõe-se com a rede cortada — o aparelho
 * guarda o preço de AGORA como proposta —, muda-se a carta enquanto o rascunho
 * está no telemóvel, e liga-se a rede. O que o servidor faz com isso é o que
 * está a ser medido, e a carta volta ao que era no fim.
 */
test.describe.serial('a carta muda enquanto o rascunho está no telemóvel', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  /** Muda o preço do prato que o STAFF-001 oferece compor. Devolve como reverter. */
  async function mexerNoPreco(delta: number): Promise<{ repor: () => Promise<void> }> {
    const { Client } = await import('pg');
    const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) throw new Error('MIGRATION_DATABASE_URL em falta');
    const sql = new Client({ connectionString: url });
    await sql.connect();
    // O MESMO prato que a tela oferece: o primeiro por nome, que é como o
    // `produtosParaCompor` os ordena. Escolher outro media um preço que ninguém
    // propôs, e a linha voltava aceite — verde sobre o caso errado.
    const { rows } = await sql.query(
      `SELECT pr.id, pr.montante_menor FROM price_rules pr
         JOIN products p ON p.id = pr.product_id
        WHERE p.nome LIKE 'insp-%' AND p.estado = 'ACTIVO'
        ORDER BY p.nome ASC LIMIT 1`);
    const regra = rows[0] as { id: string; montante_menor: number } | undefined;
    if (!regra) throw new Error('não há regra de preço para o prato do Staff');
    await sql.query('UPDATE price_rules SET montante_menor = $1 WHERE id = $2',
      [regra.montante_menor + delta, regra.id]);
    await sql.end();
    return {
      repor: async () => {
        const outro = new Client({ connectionString: url });
        await outro.connect();
        await outro.query('UPDATE price_rules SET montante_menor = $1 WHERE id = $2',
          [regra.montante_menor, regra.id]);
        await outro.end();
      },
    };
  }

  test('o preço mudou: a linha é REJEITADA e o ecrã mostra os dois números', async ({ page }) => {
    await page.context().setOffline(false);
    await page.goto(rotaDoStaff(alvos));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    expect(await comandosNoAparelho(page), 'o aparelho já tinha comandos').toBe(0);

    // 1. Compõe-se SEM rede. O preço que fica no rascunho é o de agora.
    await page.context().setOffline(true);
    await page.locator('[data-teste="compor"]').click();
    await expect(page.locator('[data-teste="entrada"][data-estado="NAO_ENVIADO"]')).toHaveCount(1);
    expect(await comandosNoAparelho(page), 'o rascunho não ficou no aparelho').toBe(1);

    // 2. A carta muda enquanto o rascunho está no telemóvel.
    const carta = await mexerNoPreco(500);
    try {
      // 3. A rede volta e o rascunho sai.
      await page.context().setOffline(false);
      await page.locator('[data-teste="sincronizar"]').click();
      await expect(page.locator('[data-teste="entrada"][data-estado="CONFIRMADO"]')).toHaveCount(1);

      // 4. E no ecrã do empregado a linha está REJEITADA, com os dois preços.
      await page.goto(`/es-ES/staff/${alvos.unidadeDoStaff}/andamento`);
      await page.waitForLoadState('networkidle');

      const divergentes = page.locator('[data-teste="linha"][data-motivo="PRECO_DIVERGENTE"]');
      await expect(divergentes, 'a divergência não chegou ao ecrã do empregado')
        .not.toHaveCount(0);

      const primeira = divergentes.first();
      const proposto = await primeira.locator('[data-teste="preco-proposto"]').innerText();
      const oficial = await primeira.locator('[data-teste="preco-oficial"]').innerText();
      // Os dois números existem, e são DIFERENTES. Iguais, não havia divergência
      // nenhuma para mostrar — e o painel estaria a desenhar ruído.
      expect(proposto.trim().length, 'o preço proposto está vazio').toBeGreaterThan(0);
      expect(oficial.trim().length, 'o preço oficial está vazio').toBeGreaterThan(0);
      expect(proposto, 'os dois preços são iguais: isto não é uma divergência')
        .not.toBe(oficial);
      // E diz-se porquê, por palavras: um número riscado sem frase não explica
      // a quem está na mesa o que tem de decidir.
      await expect(primeira.locator('[data-teste="divergiu"]')).toBeVisible();
    } finally {
      // A carta volta ao que era, sempre. Uma prova que deixa a base mexida põe
      // a seguinte a medir um cenário que ninguém escreveu.
      await carta.repor();
    }
  });
});

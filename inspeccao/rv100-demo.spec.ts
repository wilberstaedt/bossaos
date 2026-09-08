import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * RV100 · a DEMO e a conversão (MKT-007), medidas antes e depois.
 *
 * ── Porque é que esta página tem peso diferente das outras ────────────────
 *
 * Não há registo público, checkout nem criação de assinatura em lado nenhum: o
 * funil comercial inteiro acaba neste formulário. E é o único sítio da
 * superfície comercial que **recolhe dados pessoais** — nome, correio,
 * telefone, restaurante e mensagem.
 *
 * ── O que se mede, e porquê assim ─────────────────────────────────────────
 *
 *   `consentimento`  a caixa de marketing existe, é SEPARADA do envio, e chega
 *                    **por marcar**. `preMarcada` é o campo que interessa: uma
 *                    caixa pré-marcada recolhe o consentimento de quem não
 *                    reparou, que é o contrário de consentir. Mede-se também
 *                    `obrigatoria`, porque um consentimento que bloqueia o envio
 *                    não é consentimento, é preço.
 *
 *   `avisoAntesDoBotao`
 *                    o aviso de tratamento aparece ACIMA do botão, medido em
 *                    píxeis e em ordem de documento. Depois de enviar já não é
 *                    aviso: a pessoa entregou os dados antes de saber o que lhes
 *                    acontece. As duas medições porque só juntas distinguem
 *                    «está na página» de «está antes da decisão».
 *
 *   `errosDistintos` o §6.7 pede validação, erro e sucesso REAIS. A rota já
 *                    distinguia `erro=campos` de `erro=gravacao` — mas o ecrã
 *                    mostrava o MESMO texto nos dois. Mede-se o que a pessoa lê,
 *                    e não o que o redireccionamento carrega: a distinção
 *                    existia no caminho e morria na mensagem.
 *
 *   `cookies`        a página afirma não pôr cookies de análise nem de rastreio.
 *                    Uma afirmação nova precisa de guarda — é o padrão que a
 *                    página de confiança já estabeleceu, onde os três pilares
 *                    têm `provar-publicacao.sh`, `validar-alergenios.sh` e
 *                    `validar-rls.sh` por trás. Sem isto, a frase seria a mesma
 *                    classe de promessa que o `faq4` fazia sobre a rede.
 *
 *   `terceiros`      recursos carregados de fora da origem. Um script de
 *                    terceiro é rastreio mesmo sem cookie, e medir só cookies
 *                    deixava essa porta aberta.
 */

const FASE = process.env.RV100_FASE ?? '';
const DESTINO = 'docs/visual/rv100/2026-09-06/evidence/demo';

async function medirDemo(pagina: import('@playwright/test').Page) {
  return pagina.evaluate(() => {
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none';
    };

    const formulario = document.querySelector('form[action="/api/publico/demo"]');
    const botao = formulario?.querySelector('button[type="submit"]') ?? null;

    // ── A caixa de consentimento ──────────────────────────────────────────
    const caixas = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    );
    const consentimento = caixas.find((c) => /consentimento|marketing/i.test(c.name)) ?? null;

    // ── O aviso ANTES do botão, nas duas medidas ──────────────────────────
    const aviso = document.querySelector<HTMLElement>('.bo-mkt__tratamento');
    let avisoAntesDoBotao: boolean | null = null;
    let avisoOrdemDom: boolean | null = null;
    if (aviso && botao) {
      avisoAntesDoBotao = aviso.getBoundingClientRect().top < botao.getBoundingClientRect().top;
      // `DOCUMENT_POSITION_FOLLOWING` = o botão vem DEPOIS do aviso na árvore.
      avisoOrdemDom = Boolean(
        aviso.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }

    // ── Cookies e terceiros ───────────────────────────────────────────────
    const cookies = document.cookie ? document.cookie.split(';').length : 0;
    const origem = location.origin;
    const externo = (u: string | null) =>
      Boolean(u && /^https?:\/\//i.test(u) && !u.startsWith(origem));
    const terceiros = [
      ...Array.from(document.querySelectorAll('script[src]')).map((e) => e.getAttribute('src')),
      ...Array.from(document.querySelectorAll('link[href]')).map((e) => e.getAttribute('href')),
      ...Array.from(document.querySelectorAll('img[src]')).map((e) => e.getAttribute('src')),
      ...Array.from(document.querySelectorAll('iframe[src]')).map((e) => e.getAttribute('src')),
    ].filter(externo) as string[];

    const ligacaoPrivacidade = document.querySelector<HTMLAnchorElement>(
      'a[href$="/privacy"]',
    );

    return {
      // Controlo positivo: sem formulário isto não é a página por medir.
      formulario: Boolean(formulario),
      camposDeTexto: formulario
        ? formulario.querySelectorAll('input[type="text"], input:not([type]), input[type="email"], textarea').length
        : 0,
      consentimento: consentimento
        ? {
          existe: true,
          nome: consentimento.name,
          preMarcada: consentimento.checked,
          obrigatoria: consentimento.required,
          temRotulo: Boolean(
            consentimento.closest('label')
            || document.querySelector(`label[for="${consentimento.id}"]`),
          ),
          alvo: (() => {
            const r = (consentimento.closest('label') ?? consentimento).getBoundingClientRect();
            return { largura: Math.round(r.width), altura: Math.round(r.height) };
          })(),
        }
        : { existe: false },
      aviso: aviso ? {
        existe: true,
        fonte: Math.round(parseFloat(getComputedStyle(aviso).fontSize)),
        avisoAntesDoBotao,
        avisoOrdemDom,
      } : { existe: false, avisoAntesDoBotao, avisoOrdemDom },
      ligacaoPrivacidade: ligacaoPrivacidade ? ligacaoPrivacidade.getAttribute('href') : null,
      cookies,
      terceiros,
      seccoes: Array.from(document.querySelectorAll('main section')).filter(visivel).length,
      alturaRolavel: document.documentElement.scrollHeight,
    };
  });
}

/** O que a PESSOA lê em cada desfecho de erro. */
async function lerErro(pagina: import('@playwright/test').Page, idioma: string, qual: string) {
  await pagina.goto(`/${idioma}/demo?erro=${qual}`, { waitUntil: 'networkidle' });
  return pagina.evaluate(() => {
    const a = document.querySelector('[class*="aviso"], [role="alert"], .bo-aviso');
    return (a?.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 160);
  });
}

test.describe('RV100 · demo e conversão', () => {
  test.skip(!FASE, 'define RV100_FASE=antes|depois para gravar evidência');

  test('o formulário de demo, nas cinco larguras e nas três línguas', async ({ page }) => {
    test.setTimeout(240_000);
    const recolha: unknown[] = [];

    for (const idioma of ['es-ES', 'pt-BR', 'en'] as const) {
      for (const largura of LARGURAS) {
        await page.setViewportSize({ width: largura, height: 900 });
        const resposta = await page.goto(`/${idioma}/demo`, { waitUntil: 'networkidle' });
        expect(resposta?.status()).toBeLessThan(400);

        const medida = await medirDemo(page);
        expect(medida.formulario, `${idioma} a ${largura}px não tem o formulário`).toBe(true);

        recolha.push({
          idioma,
          largura,
          transbordo: await transbordaNaHorizontal(page),
          alvosPequenos: await alvosPequenos(page, 44),
          foraDoEcra: await elementosForaDoEcra(page),
          contrastes: await textosComPoucoContraste(page),
          ...medida,
        });
      }
    }

    // ── Os dois erros, lidos como a pessoa os lê ────────────────────────────
    await page.setViewportSize({ width: 1440, height: 900 });
    const erros: Record<string, { campos: string; gravacao: string; distintos: boolean }> = {};
    for (const idioma of ['es-ES', 'pt-BR', 'en'] as const) {
      const campos = await lerErro(page, idioma, 'campos');
      const gravacao = await lerErro(page, idioma, 'gravacao');
      erros[idioma] = { campos, gravacao, distintos: campos !== gravacao && campos.length > 0 };
    }

    /**
     * ── CONTROLO NEGATIVO do detector de cookies ─────────────────────────
     *
     * O detector devolveu `0` em quinze combinações, e um zero pode ser duas
     * coisas muito diferentes: **não há cookies**, ou **o detector não sabe
     * ver cookies**. As duas escrevem-se `0`.
     *
     * A página afirma, em três línguas, que não põe cookies de análise nem de
     * rastreio. Uma afirmação sustentada por um detector que nunca se viu
     * acender é a mesma família de verde vazio que já mordeu este repositório —
     * o verificador que dizia verde com zero grupos, o `grep` sem linhas que
     * devolve 1.
     *
     * Aqui planta-se um cookie e exige-se que a contagem suba. Se não subir, a
     * medição inteira é inútil e tem de ficar VERMELHA.
     */
    await page.goto(`/es-ES/demo`, { waitUntil: 'networkidle' });
    const antesDoControlo = await page.evaluate(() => document.cookie.split(';').filter(Boolean).length);
    await page.evaluate(() => { document.cookie = 'rv100_controlo_negativo=1; path=/'; });
    const comOControlo = await page.evaluate(() => document.cookie.split(';').filter(Boolean).length);
    await page.evaluate(() => {
      document.cookie = 'rv100_controlo_negativo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    });
    const depoisDeLimpar = await page.evaluate(() => document.cookie.split(';').filter(Boolean).length);
    expect(
      comOControlo,
      'o detector de cookies não acendeu com um cookie plantado — a leitura de zero não vale nada',
    ).toBeGreaterThan(antesDoControlo);
    const controloDeCookies = { antesDoControlo, comOControlo, depoisDeLimpar, acendeu: comOControlo > antesDoControlo };

    // ── A ligação de privacidade não pode ser porta morta ──────────────────
    const privacidade: Record<string, number> = {};
    for (const idioma of ['es-ES', 'pt-BR', 'en'] as const) {
      const r = await page.goto(`/${idioma}/privacy`, { waitUntil: 'networkidle' });
      privacidade[idioma] = r?.status() ?? 0;
    }

    /**
     * RV100-021 — a recusa devolve o que a pessoa escreveu.
     *
     * ── A armadilha está no que se submete ────────────────────────────────
     *
     * Deixar um campo obrigatório vazio NÃO serve de prova: o navegador recusa
     * a submissão antes de sair do ecrã, o servidor nunca vê nada, e o teste
     * ficaria verde sem tocar no defeito. É a mesma família do controlo que
     * passa sobre população zero.
     *
     * O que se submete é `a@b`: **válido para `type="email"`** — o navegador
     * deixa passar, porque não exige um ponto — e **recusado pelo
     * `validarLead`**, cujo padrão exige `@` e ponto. É uma recusa REAL do
     * servidor, que é a única que exercita o caminho `erro=campos`.
     */
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/es-ES/demo', { waitUntil: 'domcontentloaded' });
    const escrito = {
      nome: 'Ana Reposição',
      email: 'a@b',
      restaurante: 'Casa da Prova',
      telefone: '+34 600 000 000',
      mensagem: 'Isto é a mensagem que custa mais a reescrever.',
    };
    for (const [campo, valor] of Object.entries(escrito)) {
      await page.fill(`#${campo}`, valor);
    }
    await page.click('form[action="/api/publico/demo"] button[type="submit"]');
    await page.waitForURL(/\/demo\?erro=campos/, { timeout: 20_000 });

    const reposto = await page.evaluate(() => {
      const v = (id: string) =>
        (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? null;
      return {
        nome: v('nome'), email: v('email'), restaurante: v('restaurante'),
        telefone: v('telefone'), mensagem: v('mensagem'),
      };
    });
    const reposicao = {
      submetido: escrito,
      reposto,
      camposRepostos: Object.entries(escrito).filter(([c, val]) => reposto[c as keyof typeof reposto] === val).length,
      total: Object.keys(escrito).length,
    };
    expect(
      reposicao.camposRepostos,
      `só ${reposicao.camposRepostos} de ${reposicao.total} campos voltaram: ${JSON.stringify(reposto)}`,
    ).toBe(reposicao.total);

    // CONTROLO: a recusa foi mesmo do SERVIDOR e não do navegador — se o
    // navegador tivesse bloqueado, nunca teríamos chegado a `?erro=campos`.
    expect(page.url(), 'não passámos pelo caminho de recusa do servidor').toContain('erro=campos');

    mkdirSync(DESTINO, { recursive: true });
    writeFileSync(
      `${DESTINO}/${FASE}-demo.json`,
      JSON.stringify({ paginas: recolha, erros, privacidade, controloDeCookies, reposicao }, null, 2) + '\n',
    );
  });
});

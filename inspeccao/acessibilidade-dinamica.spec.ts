import { expect, test, type Page } from '@playwright/test';

/**
 * A metade DINÂMICA da acessibilidade — a que exige navegador.
 *
 * A metade estática está feita e conforme (rótulos, `lang`, um `h1` por
 * render), no `07_INDICE_DE_EVIDENCIAS.md`. Esta é a que aparecia como NÃO MEDI
 * declarado em quatro lotes seguidos, e é o único buraco do dossiê que não
 * espera por aprovação nenhuma.
 *
 * ── A regra que governa este ficheiro ─────────────────────────────────────
 *
 * Há uma hora um detector de coral dava ZERO POR CONSTRUÇÃO — comparava o texto
 * do token com o que o navegador devolve — e o zero era plausível porque a
 * hipótese que ele media dizia que o coral estava ausente. **Um detector
 * partido a concordar com a hipótese que devia testar.** Nenhuma regra escrita
 * o apanharia.
 *
 * Uma prova de acessibilidade que não encontra problemas tem exactamente essa
 * forma. Por isso cada um dos quatro detectores aqui tem uma SONDA que lhe
 * planta o defeito que ele deve encontrar e exige que o encontre. Um zero só
 * conta depois de a sonda acender.
 *
 * ── E as sondas plantam no DOM, não no código ─────────────────────────────
 *
 * O `MenuMkt.tsx`, o `Marketing.tsx`, o `page.tsx` e o `estilos.css` estão a ser
 * editados por outro implementador. Plantar neles seria mexer no trabalho de
 * quem está a trabalhar — e um plante que não se repõe numa árvore partilhada é
 * um estrago com temporizador. Todas as plantas aqui são construídas na página
 * e desaparecem com o próximo `goto`.
 */

const MOVEL = { width: 390, height: 844 };
const ESCRITORIO = { width: 1280, height: 900 };

/** As superfícies públicas: onde vive o menu, e onde vive o fundo escuro. */
const SUPERFICIES = [
  { id: 'MKT-001', caminho: '/en', porque: 'a landing, onde o menu móvel vive' },
  { id: 'MKT-004', caminho: '/en/product', porque: 'segunda página de marketing, mesmo cabeçalho' },
  { id: 'AUTH-001', caminho: '/en/auth/login', porque: 'a única superfície `.bo-inverso` do produto' },
];

// ── Contraste, pela fórmula do WCAG ────────────────────────────────────────
const CONTRASTE_MINIMO = 3; // WCAG 2.2, 1.4.11: indicador de foco vs. fundo

interface Achado { onde: string; detalhe: string }

/**
 * O anel de foco tem contraste contra o fundo que está mesmo por trás dele?
 *
 * O fundo não é o do elemento: é o da primeira superfície opaca acima dele na
 * árvore. Um botão transparente dentro de um cabeçalho escuro tem o fundo do
 * cabeçalho, e é contra esse que o anel se vê ou não.
 */
async function anelSemContraste(page: Page): Promise<{ medidos: number; maus: Achado[] }> {
  return page.evaluate((minimo) => {
    const luminancia = (cor: string): number | null => {
      const m = cor.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const partes = (m[1] ?? '').split(',').map((x) => parseFloat(x));
      const [r, g, b, a] = partes;
      if (r === undefined || g === undefined || b === undefined) return null;
      if (a !== undefined && a < 0.99) return null; // translúcido: não se afere assim
      const canal = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
    };
    // ── De QUE fundo se trata: o de trás do ANEL, não o do elemento ────────
    //
    // Com `outline-offset` positivo — e o token é `2px` — o anel desenha-se
    // FORA da caixa do elemento, e portanto sobre o fundo do pai. A primeira
    // versão disto começava no próprio elemento e acusou sete controlos, todos
    // botões primários escuros cujo fundo calha ser a mesma cor do anel: dava
    // 1.00:1 e a culpa era do medidor, não do desenho. Com afastamento
    // negativo o anel cai por dentro, e aí o fundo do elemento é o certo.
    const fundoAtras = (el: HTMLElement, afastamento: number): string | null => {
      const inicio = afastamento >= 0 ? el.parentElement : el;
      for (let n: HTMLElement | null = inicio; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
      }
      return getComputedStyle(document.body).backgroundColor;
    };

    const maus: Array<{ onde: string; detalhe: string }> = [];
    let medidos = 0;
    const focaveis = document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
    );
    for (const el of Array.from(focaveis)) {
      const caixa = el.getBoundingClientRect();
      if (caixa.width <= 1 || caixa.height <= 1) continue; // escondido: não se vê, não se afere
      el.focus();
      const estilo = getComputedStyle(el);
      const cor = estilo.outlineColor;
      const espessura = parseFloat(estilo.outlineWidth) || 0;
      if (estilo.outlineStyle === 'none' || espessura === 0) {
        maus.push({ onde: `${el.tagName}"${(el.textContent ?? '').trim().slice(0, 24)}"`, detalhe: 'sem anel nenhum ao focar' });
        continue;
      }
      const afastamento = parseFloat(estilo.outlineOffset) || 0;
      const fundo = fundoAtras(el, afastamento);
      const lAnel = luminancia(cor);
      const lFundo = fundo === null ? null : luminancia(fundo);
      medidos += 1;
      if (lAnel === null || lFundo === null) continue;
      const razao = (Math.max(lAnel, lFundo) + 0.05) / (Math.min(lAnel, lFundo) + 0.05);
      if (razao < minimo) {
        maus.push({
          onde: `${el.tagName}"${(el.textContent ?? '').trim().slice(0, 24)}"`,
          detalhe: `anel ${cor} sobre ${fundo} = ${razao.toFixed(2)}:1`,
        });
      }
    }
    (document.activeElement as HTMLElement | null)?.blur();
    return { medidos, maus };
  }, minimoDoContraste());
}

function minimoDoContraste() { return CONTRASTE_MINIMO; }

test.describe('Acessibilidade: a metade que só o navegador mede', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. O MENU MÓVEL — o único caso real de foco no produto
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Já ficou medido que o produto não tem `<dialog>` nenhum: o `Dialogo` é
  // importado por um ficheiro só, o catálogo de desenho. Logo não há outro
  // sítio onde o foco preso importe — e este é o único que importa mesmo.

  test('o menu móvel devolve o foco ao botão que o abriu', async ({ page }) => {
    await page.setViewportSize(MOVEL);
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const botao = page.locator('.bo-mkt__abrir');
    await expect(botao, 'POPULACAO-ZERO: não há botão de menu móvel nesta página').toHaveCount(1);

    await botao.focus();
    await botao.press('Enter');
    await expect(botao).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(botao).toHaveAttribute('aria-expanded', 'false');

    const voltou = await botao.evaluate((el) => el === document.activeElement);
    expect(voltou, 'o Escape fechou o menu e deixou o foco no princípio do documento').toBe(true);
  });

  test('SONDA: o detector do regresso do foco vê um menu que NÃO o devolve', async ({ page }) => {
    // A planta é construída na página, não no `MenuMkt.tsx` — esse está a ser
    // editado agora por outro implementador. O que se prova aqui é a MEDIÇÃO.
    await page.setViewportSize(MOVEL);
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const devolveu = await page.evaluate(() => {
      const b = document.createElement('button');
      b.id = 'sonda-abrir';
      b.setAttribute('aria-expanded', 'false');
      const painel = document.createElement('div');
      painel.innerHTML = '<a href="#x">dentro</a>';
      painel.hidden = true;
      b.addEventListener('click', () => { b.setAttribute('aria-expanded', 'true'); painel.hidden = false; });
      // O defeito: fecha e NÃO devolve o foco.
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        b.setAttribute('aria-expanded', 'false');
        painel.hidden = true;
        (document.querySelector('a') as HTMLElement | null)?.focus();
      });
      document.body.append(b, painel);
      b.focus();
      b.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      return b === document.activeElement;
    });

    expect(devolveu, 'SONDA: um menu que não devolve o foco passou como se devolvesse — o detector não distingue')
      .toBe(false);

    // O marcador só se imprime se a asserção acima passou. O guião conta ESTES,
    // e não linhas do relatório: o projecto `preparar` corre como dependência do
    // `chromium` e os seus três casos entravam na conta — «7 sondas» quando são
    // quatro. Um número que não bate é um número que mente.
    console.log('SONDA-ACENDEU regresso-do-foco');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. O ANEL DE FOCO, contra cada fundo
  // ─────────────────────────────────────────────────────────────────────────
  //
  // A regra existe e é abrangente (`:where(a, button, …):focus-visible`), com
  // variante `.bo-inverso` para superfícies escuras. Que ela EXISTA não é a
  // pergunta: a pergunta é se rende contraste suficiente em cada superfície, e
  // isso mede-se.

  test('o anel de foco vê-se contra o fundo, em cada superfície', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    const linhas: string[] = [];
    let medidosTotal = 0;

    for (const s of SUPERFICIES) {
      await page.goto(s.caminho);
      await page.waitForLoadState('networkidle');
      const r = await anelSemContraste(page);
      expect(r.medidos, `POPULACAO-ZERO: ${s.id} não deu um único focável para medir — ${s.porque}`)
        .toBeGreaterThan(0);
      medidosTotal += r.medidos;
      for (const m of r.maus) linhas.push(`${s.id} · ${m.onde} · ${m.detalhe}`);
    }

    console.log(`AMBITO-ANEL medidos=${medidosTotal} superficies=${SUPERFICIES.length} maus=${linhas.length}`);
    expect(linhas, `anel de foco sem contraste (mínimo ${CONTRASTE_MINIMO}:1):\n${linhas.join('\n')}`)
      .toEqual([]);
  });

  test('SONDA: o detector do anel vê um anel da cor do fundo', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const antes = (await anelSemContraste(page)).maus.length;
    await page.evaluate(() => {
      const caixa = document.createElement('div');
      caixa.style.cssText = 'background:#ffffff;padding:8px';
      const b = document.createElement('button');
      b.textContent = 'sonda do anel';
      // O defeito: anel branco sobre fundo branco. Razão 1:1.
      b.style.cssText = 'outline:3px solid #ffffff;outline-offset:2px;background:#ffffff';
      b.addEventListener('focus', () => { b.style.outline = '3px solid #ffffff'; });
      caixa.append(b);
      document.body.append(caixa);
    });
    const depois = (await anelSemContraste(page)).maus;

    expect(depois.length, 'SONDA: um anel branco sobre fundo branco não foi visto — o detector do contraste está cego')
      .toBeGreaterThan(antes);

    // O marcador só se imprime se a asserção acima passou. O guião conta ESTES,
    // e não linhas do relatório: o projecto `preparar` corre como dependência do
    // `chromium` e os seus três casos entravam na conta — «7 sondas» quando são
    // quatro. Um número que não bate é um número que mente.
    console.log('SONDA-ACENDEU anel-sem-contraste');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ALCANCE POR TECLADO das acções principais
  // ─────────────────────────────────────────────────────────────────────────

  test('as acções principais alcançam-se só com Tab', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const principais = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('header a[href], header button, main a[href], main button'))
        .filter((el) => {
          const c = el.getBoundingClientRect();
          return c.width > 1 && c.height > 1;
        })
        .slice(0, 25)
        .map((el, i) => { el.dataset.sondaAlcance = String(i); return String(i); }),
    );
    expect(principais.length, 'POPULACAO-ZERO: a landing não deu acções principais para alcançar')
      .toBeGreaterThan(0);

    const alcancados = new Set<string>();
    for (let i = 0; i < principais.length * 3 + 20; i++) {
      await page.keyboard.press('Tab');
      const marca = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.sondaAlcance);
      if (marca !== undefined) alcancados.add(marca);
      if (alcancados.size === principais.length) break;
    }

    const perdidas = principais.filter((p) => !alcancados.has(p));
    console.log(`AMBITO-TECLADO principais=${principais.length} alcancadas=${alcancados.size}`);
    expect(perdidas, `acções que o Tab não alcança: ${perdidas.length} de ${principais.length}`).toEqual([]);
  });

  test('SONDA: o detector do teclado vê uma acção tirada da ordem de tabulação', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // O defeito: uma acção visível, com `tabindex="-1"`. Existe, vê-se, e o Tab
    // nunca lá chega — que é a forma mais silenciosa de uma acção desaparecer.
    const alcancou = await page.evaluate(async () => {
      const b = document.createElement('button');
      b.textContent = 'sonda inalcançável';
      b.tabIndex = -1;
      b.dataset.sondaAlcance = 'sonda';
      document.querySelector('main')?.prepend(b);
      return b.tabIndex >= 0;
    });
    expect(alcancou, 'SONDA: a planta não ficou fora da ordem de tabulação').toBe(false);

    const alcancados = new Set<string>();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const marca = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.sondaAlcance);
      if (marca !== undefined) alcancados.add(marca);
    }
    expect(alcancados.has('sonda'), 'SONDA: o Tab alcançou um elemento com tabindex=-1 — o detector do alcance mente')
      .toBe(false);

    // O marcador só se imprime se a asserção acima passou. O guião conta ESTES,
    // e não linhas do relatório: o projecto `preparar` corre como dependência do
    // `chromium` e os seus três casos entravam na conta — «7 sondas» quando são
    // quatro. Um número que não bate é um número que mente.
    console.log('SONDA-ACENDEU alcance-por-teclado');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. ZOOM A 200%
  // ─────────────────────────────────────────────────────────────────────────
  //
  // 200% de zoom a 1280 px é, em área de conteúdo, o mesmo que 640 px de
  // largura. O que a norma pede é que nada se perca nem exija rolar na
  // horizontal (WCAG 1.4.10).

  test('a 200% de zoom nada se perde nem exige rolar na horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 450 });
    const linhas: string[] = [];
    for (const s of SUPERFICIES) {
      await page.goto(s.caminho);
      await page.waitForLoadState('networkidle');
      const m = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        cliente: document.documentElement.clientWidth,
      }));
      if (m.scroll > m.cliente + 1) linhas.push(`${s.id} · rola ${m.scroll}px numa janela de ${m.cliente}px`);
    }
    console.log(`AMBITO-ZOOM superficies=${SUPERFICIES.length} mas=${linhas.length}`);
    expect(linhas, `a 200% de zoom há páginas a rolar na horizontal:\n${linhas.join('\n')}`).toEqual([]);
  });

  test('SONDA: o detector do zoom vê uma página que rola na horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 450 });
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    const rolaAgora = await page.evaluate(() => {
      const d = document.createElement('div');
      d.style.cssText = 'width:2000px;height:10px';
      document.body.append(d);
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(rolaAgora, 'SONDA: 2000 px numa janela de 640 não fizeram a página rolar — o detector do zoom está cego')
      .toBe(true);

    // O marcador só se imprime se a asserção acima passou. O guião conta ESTES,
    // e não linhas do relatório: o projecto `preparar` corre como dependência do
    // `chromium` e os seus três casos entravam na conta — «7 sondas» quando são
    // quatro. Um número que não bate é um número que mente.
    console.log('SONDA-ACENDEU zoom-a-200');
  });
});

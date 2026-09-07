import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { readdirSync, readFileSync } from 'node:fs';
import { LARGURAS } from './ajudas.ts';

/**
 * RV100 · o fecho da secção 6, medido nas OITO páginas comerciais.
 *
 * ── Porque é que este lote começa por medir o que já está feito ───────────
 *
 * Três dos quatro achados desta lista foram escritos contra a linha de base de
 * ontem, e desde então mexeu-se no CSS **global**: o `.bo-mkt__seccao` passou a
 * `--bo-espaco-gigante` no desktop, e essa mudança não é da home, é de todas as
 * páginas que usam a classe.
 *
 * Um achado que já está corrigido e continua aberto custa o mesmo que um achado
 * ignorado: manda alguém trabalhar onde não há trabalho. Por isso o primeiro
 * passo é medir as oito e ver quais é que ainda falham.
 *
 * ── O que se mede ─────────────────────────────────────────────────────────
 *
 *   `alturaRolavel`  RV100-008: «cinco das oito cabem inteiras em 900 px».
 *   `respiro`        o padding vertical real entre secções (§4.4: 80–128).
 *   `heroFimX`       RV100-009, pelo `folhaAteX` da L1e — o máximo `right` das
 *                    FOLHAS com conteúdo. A métrica antiga somava todos os
 *                    descendentes e um `<p>` de largura total saturava-a.
 *   `coral`          RV100-012: elementos que usam o acento, e se algum o usa
 *                    sobre fundo escuro, que é a única composição em que ele
 *                    passa como texto (4,71 sobre o verde-escuro).
 *
 * ── O que este instrumento NÃO mede, e porquê ─────────────────────────────
 *
 * Não corre `alvosPequenos`, `textosComPoucoContraste`, `elementosForaDoEcra`
 * nem `transbordaNaHorizontal`. Não é por serem pouco importantes — é por já
 * serem medidos, e por aqui saírem caros ao ponto de partirem a medição:
 * cada um percorre o DOM inteiro, e numa página de 5974 px as cinco larguras
 * não cabiam em cinco minutos. As três páginas mais longas — a home, a
 * `/product` e a `/getting-started` — falharam por tempo, e as quatro mais
 * curtas passaram. **Um instrumento que só consegue medir as páginas
 * pequenas mede o tamanho, não o defeito.**
 *
 * Quem os mede: a `marketing.spec.ts` corre alvos e contraste a 360 px sobre
 * as doze telas MKT — que é a largura onde ambos mordem —, e cada lote desta
 * série mediu os quatro na sua própria página. Repeti-los aqui era pagar o
 * preço todo por uma segunda leitura do mesmo.
 */

const FASE = process.env.RV100_FASE ?? '';
const DESTINO = 'docs/visual/rv100/2026-09-06_e953a87/evidence/fecho';
/** Uma página por ficheiro: estado partilhado não sobrevive a um worker reiniciado. */
const PARCIAIS = `${DESTINO}/.parciais-${FASE}`;

const PAGINAS = [
  '', '/product', '/plans', '/getting-started', '/pilot', '/trust', '/faq', '/demo',
] as const;

async function medir(pagina: import('@playwright/test').Page) {
  return pagina.evaluate(() => {
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none';
    };

    // ── O fim do herói, pelas FOLHAS com conteúdo ─────────────────────────
    const heroi = document.querySelector('.bo-mkt__heroi');
    let heroFimX = 0;
    if (heroi) {
      for (const el of Array.from(heroi.querySelectorAll<HTMLElement>('*'))) {
        if (el.children.length > 0) continue;              // só folhas
        if (!(el.textContent ?? '').trim() && el.tagName !== 'IMG') continue;
        if (!visivel(el)) continue;
        heroFimX = Math.max(heroFimX, Math.round(el.getBoundingClientRect().right));
      }
    }

    const seccoes = Array.from(document.querySelectorAll<HTMLElement>('main section')).filter(visivel);
    const respiros = seccoes.map((s) => {
      const e = getComputedStyle(s);
      return Math.round(parseFloat(e.paddingTop) + parseFloat(e.paddingBottom));
    });

    // ── O coral, e sobre que fundo ────────────────────────────────────────
    /**
     * ── O detector comparava HEX com RGB e nunca podia acender ────────────
     *
     * A primeira versao lia `--bo-acento` do `:root` — que vale `#F5664D`, o
     * texto do token — e comparava-o com `getComputedStyle(el).color`, que o
     * browser devolve SEMPRE como `rgb(245, 102, 77)`. As duas cadeias nunca
     * sao iguais, portanto `usaCoral` era **zero por construcao**, no antes e
     * no depois.
     *
     * E o zero era plausivel: o RV100-012 diz exactamente que o coral esta
     * ausente. Um detector avariado a concordar com o achado que devia medir e'
     * a pior especie de verde — so se apanha porque o numero nao se MEXEU
     * depois de uma mudanca que tinha de o mexer.
     *
     * A conversao passa pelo browser: pinta-se o token num elemento descartavel
     * e le-se o que ele computa. Assim os dois lados da comparacao saem do
     * mesmo sitio, que e' a unica forma de a comparacao significar algo.
     */
    const normalizar = (valor: string): string => {
      const sonda = document.createElement('span');
      sonda.style.color = valor;
      document.body.appendChild(sonda);
      const lido = getComputedStyle(sonda).color;
      sonda.remove();
      return lido.replace(/\s/g, '');
    };
    const corDoAcento = normalizar(
      getComputedStyle(document.documentElement).getPropertyValue('--bo-acento').trim(),
    );
    const luminancia = (cor: string) => {
      const m = cor.match(/\d+/g);
      if (!m || m.length < 3) return null;
      const [r, g, b] = m.slice(0, 3).map((n) => {
        const c = Number(n) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const fundoEfectivo = (el: Element): string => {
      let n: Element | null = el;
      while (n) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
        n = n.parentElement;
      }
      return 'rgb(255, 255, 255)';
    };
    let usaCoral = 0;
    let coralSobreEscuro = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main *'))) {
      if (!visivel(el)) continue;
      const e = getComputedStyle(el);
      const temCoral = [e.color, e.backgroundColor, e.borderTopColor, e.borderLeftColor]
        .some((c) => Boolean(c) && Boolean(corDoAcento) && c.replace(/\s/g, '') === corDoAcento);
      if (!temCoral) continue;
      usaCoral++;
      const l = luminancia(fundoEfectivo(el));
      if (l !== null && l < 0.2) coralSobreEscuro++;
    }

    // Secções com fundo escuro — a composição em que o coral funciona.
    const seccoesEscuras = seccoes.filter((s) => {
      const l = luminancia(fundoEfectivo(s));
      return l !== null && l < 0.2;
    }).length;

    return {
      seccoes: seccoes.length,
      respiroMin: respiros.length ? Math.min(...respiros) : null,
      respiroMax: respiros.length ? Math.max(...respiros) : null,
      heroFimX,
      alturaRolavel: document.documentElement.scrollHeight,
      cabeNumaDobra: document.documentElement.scrollHeight <= 900,
      usaCoral,
      coralSobreEscuro,
      seccoesEscuras,
    };
  });
}

/**
 * ── Um teste POR PÁGINA, e não um por tudo ────────────────────────────────
 *
 * A primeira versão media as oito páginas num teste só, e reprovava sempre por
 * TEMPO: 5 minutos na primeira tentativa, 15 na segunda. Subir o relógio outra
 * vez seria tratar o sintoma — 40 combinações × cinco travessias do DOM não
 * cabem num teste, e o problema não é o limite, é a granularidade.
 *
 * O tempo do Playwright é POR TESTE. Com oito, cada um mede uma página nas
 * cinco larguras e acaba folgado, e a evidência escreve-se no `afterAll` a
 * partir do que todos acumularam. Mede-se exactamente o mesmo — o que muda é
 * onde o relógio corre.
 *
 * E há um ganho que não é de tempo: com um teste por página, uma página que
 * parta fica vermelha sozinha. Antes, a primeira a falhar levava as outras sete
 * com ela e o relatório não dizia qual era.
 */
test.describe('RV100 · fecho da secção 6', () => {
  test.skip(!FASE, 'define RV100_FASE=antes|depois para gravar evidência');

  for (const rota of PAGINAS) {
    test(`${rota || '/'} nas cinco larguras`, async ({ page }) => {
      test.setTimeout(300_000);
      const daPagina: unknown[] = [];
      for (const largura of LARGURAS) {
        await page.setViewportSize({ width: largura, height: 900 });
        /**
         * `load` e não `networkidle`, e com relógio PRÓPRIO.
         *
         * Duas coisas, e a segunda é a que interessa. A `/product` carrega cinco
         * composições do produto; com `networkidle` a navegação ficava à espera
         * de um silêncio de rede que as variantes do `srcset` iam adiando, e
         * pendurava. `load` dispara depois de as imagens carregarem, que é
         * exactamente o que esta medição precisa — alturas e posições.
         *
         * E o `timeout` explícito: sem ele, o `goto` herda o orçamento do TESTE
         * inteiro, e uma navegação pendurada consome os cinco minutos todos e
         * reporta «test timeout». O relatório culpava o teste quando o culpado
         * era um pedido. Com 45 s, a navegação que pendura di-lo pelo nome e
         * sobra tempo para as outras quatro larguras.
         */
        const r = await page.goto(`/es-ES${rota}`, { waitUntil: 'load', timeout: 45_000 });
        expect(r?.status(), `${rota} a ${largura}`).toBeLessThan(400);
        const m = await medir(page);
        expect(m.seccoes, `${rota} a ${largura} sem secções`).toBeGreaterThan(0);
        daPagina.push({ rota: rota || '/', largura, ...m });
      }
      // Cada página escreve o SEU ficheiro, e é isso que a torna fiável.
      mkdirSync(PARCIAIS, { recursive: true });
      writeFileSync(
        `${PARCIAIS}/${(rota || 'home').replace(/\//g, '_')}.json`,
        JSON.stringify(daPagina, null, 2) + '\n',
      );
    });
  }

  /**
   * CONTROLO POSITIVO do detector de coral, e a escrita da evidência.
   *
   * Planta-se um elemento com o próprio token e exige-se que o detector o veja.
   * Sem isto, `usaCoral: 0` significa as duas coisas — «não há coral» e «o
   * detector não vê coral» — e as duas escrevem-se `0`. Foi exactamente o que
   * aconteceu na primeira versão, que comparava o hexadecimal do token com o
   * `rgb()` que o browser computa.
   */
  test('o detector acende, e a evidência fica escrita', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/es-ES', { waitUntil: 'domcontentloaded' });
    const acende = await page.evaluate(() => {
      const alvo = document.querySelector('main');
      if (!alvo) return false;
      const sonda = document.createElement('p');
      sonda.style.color = getComputedStyle(document.documentElement)
        .getPropertyValue('--bo-acento').trim();
      sonda.textContent = 'controlo';
      alvo.appendChild(sonda);
      const acento = getComputedStyle(sonda).color.replace(/\s/g, '');
      const viu = Array.from(document.querySelectorAll<HTMLElement>('main *'))
        .some((el) => getComputedStyle(el).color.replace(/\s/g, '') === acento);
      sonda.remove();
      return viu;
    });
    expect(
      acende,
      'o detector de coral não acendeu com um elemento coral plantado — os zeros não valem nada',
    ).toBe(true);

    /**
     * A junção lê os ficheiros PARCIAIS do disco, e não uma variável de módulo.
     *
     * A versão anterior acumulava num `const recolha` de módulo e escrevia no
     * fim. O Playwright **reinicia o worker depois de uma falha**, e um worker
     * novo tem módulos novos: a `recolha` voltava a `[]` e as páginas medidas
     * antes da falha desapareciam. Escreveu **20 registos em vez de 40** e não
     * se queixou — a `/plans` passou e não estava lá.
     *
     * E o meu controlo de população não apanhou nada, porque perguntava
     * `> 0` e 20 é maior do que zero. **A pergunta certa é se estão TODAS**, e
     * é a que se faz agora.
     */
    const ficheiros = readdirSync(PARCIAIS).filter((f) => f.endsWith('.json'));
    const recolha = ficheiros.flatMap(
      (f) => JSON.parse(readFileSync(`${PARCIAIS}/${f}`, 'utf8')) as unknown[]);
    expect(
      ficheiros.length,
      `mediram-se ${ficheiros.length} páginas de ${PAGINAS.length} — a evidência estaria incompleta`,
    ).toBe(PAGINAS.length);
    expect(recolha.length, 'registos a menos').toBe(PAGINAS.length * LARGURAS.length);
    mkdirSync(DESTINO, { recursive: true });
    writeFileSync(`${DESTINO}/${FASE}-fecho.json`, JSON.stringify(recolha, null, 2) + '\n');
  });
});

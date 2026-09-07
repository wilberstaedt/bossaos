import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * RV100 · a MOLDURA comercial, medida antes e depois.
 *
 * ── Porque é que isto é um instrumento e não uma inspecção ─────────────────
 *
 * A `marketing.spec.ts` REPROVA — mede transbordo, alvos e contraste, e falha
 * quando estão errados. Esta não julga: recolhe números e escreve-os, tal como
 * a `rv100-baseline.spec.ts` do §2 fez para as oito páginas a 1440 px. É a mesma
 * família de instrumento — Playwright, `getBoundingClientRect`, JSON no
 * `evidence/` — porque comparar um número medido com um bocado de CSS lido não
 * é comparar nada.
 *
 * O baseline mediu UMA largura (1440) e as oito páginas. Esta mede as CINCO
 * larguras do arnês e as DEZ rotas da família — as oito comerciais mais a
 * `/demo/thanks` e a `/404`, que herdam a moldura e por isso mudam com ela.
 *
 * ── Duas corridas, e a segunda não vale sozinha ───────────────────────────
 *
 *   RV100_FASE=antes  npx playwright test inspeccao/rv100-moldura.spec.ts
 *   RV100_FASE=depois npx playwright test inspeccao/rv100-moldura.spec.ts
 *
 * Sem `RV100_FASE` o caso salta-se de propósito: correr a suite inteira não pode
 * reescrever por cima da evidência de uma fase que já foi tirada. E um número de
 * "depois" sem o "antes" ao lado não prova que alguma coisa mudou — prova que
 * alguém mediu uma vez.
 *
 * ── O controlo positivo ───────────────────────────────────────────────────
 *
 * Cada rota tem de ter cabeçalho E rodapé. Se não tiver, não é uma moldura por
 * medir: é uma página que não carregou, e a recolha inteira passa a descrever
 * um erro de rede.
 */

const FASE = process.env.RV100_FASE ?? '';
const DESTINO = 'docs/visual/rv100/2026-09-06_e953a87/evidence/moldura';

const ROTAS = [
  { id: 'MKT-001', nome: 'home', caminho: '/es-ES' },
  { id: 'MKT-004', nome: 'produto', caminho: '/es-ES/product' },
  { id: 'MKT-005', nome: 'planos', caminho: '/es-ES/plans' },
  { id: 'MKT-006', nome: 'implantacao', caminho: '/es-ES/getting-started' },
  { id: 'MKT-007', nome: 'demo', caminho: '/es-ES/demo' },
  { id: 'MKT-008', nome: 'confianca', caminho: '/es-ES/trust' },
  { id: 'MKT-009', nome: 'faq', caminho: '/es-ES/faq' },
  { id: 'MKT-010', nome: 'piloto', caminho: '/es-ES/pilot' },
  { id: 'MKT-011', nome: 'obrigado', caminho: '/es-ES/demo/thanks' },
  { id: 'MKT-012', nome: 'naoencontrado', caminho: '/es-ES/404' },
] as const;

/** O que a moldura mostra, medido no DOM construído e não lido no CSS. */
async function medirMoldura(pagina: import('@playwright/test').Page) {
  return pagina.evaluate(() => {
    const arred = (n: number) => Math.round(n * 10) / 10;
    const caixa = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { largura: arred(r.width), altura: arred(r.height), topo: arred(r.top) };
    };
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none';
    };

    /**
     * Nome acessível aproximado: `aria-label`, `aria-labelledby`, ou o texto
     * mais os `alt` das imagens lá dentro. Não é a árvore de acessibilidade do
     * navegador — é o suficiente para distinguir "sem nome" de "com nome", e
     * para apanhar um `aria-label` que diz «logo» em vez de dizer para onde vai.
     */
    const nomeAcessivel = (el: Element | null): string | null => {
      if (!el) return null;
      const rotulo = el.getAttribute('aria-label');
      if (rotulo?.trim()) return rotulo.trim();
      const ref = el.getAttribute('aria-labelledby');
      if (ref) {
        const alvo = document.getElementById(ref);
        if (alvo) return (alvo.textContent ?? '').trim() || null;
      }
      const texto = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const alts = Array.from(el.querySelectorAll('img'))
        .map((i) => (i.getAttribute('alt') ?? '').trim())
        .filter(Boolean).join(' ');
      const junto = [texto, alts].filter(Boolean).join(' ').trim();
      return junto || null;
    };

    const cab = document.querySelector('.bo-publico__cabecalho');
    const rod = document.querySelector('.bo-publico__rodape');
    const nav = document.querySelector('.bo-publico__seccoes');

    // ① A assinatura. Medida como aparece, não como o componente diz.
    const img = cab?.querySelector('img') ?? null;
    const ligacaoDaMarca = img?.closest('a') ?? null;

    // ② A navegação principal.
    const ligacoesNav = nav ? Array.from(nav.querySelectorAll('a')) : [];
    const navVisiveis = ligacoesNav.filter(visivel);
    const linhasDaNav = new Set(navVisiveis.map((a) => Math.round(a.getBoundingClientRect().top)));
    const capsulas = navVisiveis.filter((a) => {
      const raio = parseFloat(getComputedStyle(a).borderTopLeftRadius);
      return Number.isFinite(raio) && raio >= 100;
    }).length;
    // Agrupamentos = filhos DIRECTOS visíveis da nav. Sete irmãos numa lista são
    // sete agrupamentos; três ligações mais um grupo com três dentro são quatro.
    const agrupamentos = nav
      ? Array.from(nav.children).filter((c) => visivel(c)).length
      : 0;
    // Uma ligação com fundo próprio destaca-se das que não têm: é assim que se
    // distingue um CTA de mais um irmão igual, sem perguntar ao CSS pelo nome.
    const comFundoProprio = navVisiveis.filter((a) => {
      const c = getComputedStyle(a).backgroundColor;
      const m = c.match(/rgba?\(([^)]+)\)/);
      const p = m?.[1]?.split(',').map((v) => parseFloat(v.trim())) ?? [];
      return (p[3] ?? 1) > 0.05;
    }).map((a) => (a.textContent ?? '').trim().slice(0, 24));

    // Todas as ligações da MOLDURA (cabeçalho + nav + rodapé), com destino.
    //
    // O `Set` não é zelo: as três raízes podem estar ENCAIXADAS umas nas outras
    // — a navegação vive dentro do cabeçalho — e sem ele a mesma ligação era
    // contada duas vezes. Um instrumento que conta o dobro por causa da forma da
    // árvore mede a árvore, não a moldura.
    const daModura = (raiz: Element | null) => (raiz ? Array.from(raiz.querySelectorAll('a')) : []);
    const ligacoesDaModura = [...new Set([...daModura(cab), ...daModura(nav), ...daModura(rod)])]
      .map((a) => ({
        texto: (a.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
        destino: new URL(a.href, location.href).pathname,
        visivel: visivel(a),
      }));

    // ③ Selector de idioma: ligações da moldura que apontam para OUTRO idioma.
    const idiomaActual = location.pathname.split('/')[1] ?? '';
    const idiomas = ligacoesDaModura.filter((l) => {
      const primeiro = l.destino.split('/')[1] ?? '';
      return ['es-ES', 'pt-BR', 'en'].includes(primeiro) && primeiro !== idiomaActual;
    });

    // ④ Entrada na conta.
    const login = ligacoesDaModura.filter((l) => l.destino.endsWith('/auth/login'));

    // ⑤ Menu móvel: um controlo de abrir/fechar na moldura, e se está VISÍVEL
    //    nesta largura. Conta `<button aria-expanded>` e `<summary>`.
    //    Também aqui o `Set`: com a navegação dentro do cabeçalho, as duas
    //    varreduras apanham o mesmo botão de grupo.
    const controlos = [...new Set([
      ...Array.from(document.querySelectorAll('.bo-publico__cabecalho button[aria-expanded], .bo-publico__cabecalho summary')),
      ...Array.from(document.querySelectorAll('.bo-publico__seccoes button[aria-expanded], .bo-publico__seccoes summary')),
    ])];
    const menu = controlos.map((c) => ({
      etiqueta: c.tagName.toLowerCase(),
      nome: nomeAcessivel(c),
      visivel: visivel(c),
      caixa: caixa(c),
    }));

    // ⑥ O rodapé: quantas ligações, e quantos grupos com título.
    const rodapeLigacoes = rod ? Array.from(rod.querySelectorAll('a')).filter(visivel).length : 0;
    const rodapeGrupos = rod ? rod.querySelectorAll('nav, ul').length : 0;
    const rodapeTexto = rod ? (rod.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) : null;

    /**
     * O contraste do CTA, em número e não em promessa.
     *
     * O manual (p. 16) proíbe branco sobre coral — 3,05:1 — e aceita
     * verde-escuro, 4,71:1. A `marketing.spec.ts` mede contraste **só a 360 px**,
     * onde o CTA vive dentro de uma gaveta fechada: um elemento de caixa zero
     * está fora daquela varredura, e a verificação passava sem nunca ter olhado
     * para este botão. É a diferença entre verde e verde sobre população zero.
     */
    const razaoDoCta = (() => {
      const cta = document.querySelector('.bo-mkt__cta') as HTMLElement | null;
      if (!cta) return null;
      const canais = (cor: string): [number, number, number, number] => {
        const m = cor.match(/rgba?\(([^)]+)\)/);
        if (!m?.[1]) return [0, 0, 0, 0];
        const p = m[1].split(',').map((v) => parseFloat(v.trim()));
        return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
      };
      const lum = (rgb: [number, number, number]) => {
        const [r, g, b] = rgb.map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        }) as [number, number, number];
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const estilo = getComputedStyle(cta);
      const [tr, tg, tb] = canais(estilo.color);
      const [fr, fg, fb] = canais(estilo.backgroundColor);
      const la = lum([tr, tg, tb]);
      const lb = lum([fr, fg, fb]);
      return {
        texto: estilo.color,
        fundo: estilo.backgroundColor,
        razao: Math.round(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)) * 100) / 100,
      };
    })();

    return {
      cabecalho: caixa(cab),
      rodape: caixa(rod),
      marca: {
        caixa: caixa(img),
        ligada: !!ligacaoDaMarca,
        destino: ligacaoDaMarca ? new URL(ligacaoDaMarca.href, location.href).pathname : null,
        nomeAcessivel: nomeAcessivel(ligacaoDaMarca ?? img),
        alt: img?.getAttribute('alt') ?? null,
      },
      navegacao: {
        existe: !!nav,
        dentroDoCabecalho: !!(nav && cab?.contains(nav)),
        ligacoes: ligacoesNav.length,
        visiveis: navVisiveis.length,
        agrupamentos,
        linhas: linhasDaNav.size,
        capsulas,
        comFundoProprio,
      },
      idiomas: { quantos: idiomas.length, destinos: idiomas.map((l) => l.destino) },
      login: { quantos: login.length, destinos: login.map((l) => l.destino) },
      menu,
      rodapeEstrutura: { ligacoes: rodapeLigacoes, grupos: rodapeGrupos, texto: rodapeTexto },
      cta: razaoDoCta,
      ligacoesDaModura,
    };
  });
}

/**
 * O que só existe depois de alguém CARREGAR.
 *
 * A gaveta do telemóvel e o grupo de recursos nascem fechados, e um elemento de
 * caixa zero está fora de todas as varreduras do arnês — as de alvo, de
 * contraste e de fora-do-ecrã saltam-no por construção. Sem abrir, mediria-se a
 * moldura toda e nenhum dos controlos novos, e o verde não queria dizer nada.
 *
 * Devolve `null` quando não há o que abrir — que é o estado do «antes», e não é
 * a mesma coisa que «abriu e estava bem».
 */
async function medirComAberto(pagina: import('@playwright/test').Page) {
  /**
   * A ORDEM importa e não é arbitrária: abaixo de 1024 px o botão do grupo vive
   * DENTRO da gaveta, e só fica visível depois de ela abrir. Medir o grupo antes
   * dava sempre «não visível» no telemóvel — e o telemóvel é onde o painel tem
   * mais coisas lá dentro.
   */
  const SELECTORES = ['.bo-mkt__abrir', '.bo-mkt__grupo-botao'] as const;
  const abertos: string[] = [];

  for (const selector of SELECTORES) {
    const botao = pagina.locator(selector).first();
    if (await pagina.locator(selector).count() === 0) continue;
    if (!(await botao.isVisible())) continue;

    /**
     * Carrega até o estado mudar, e não uma vez à sorte.
     *
     * O botão vem no HTML do servidor e só passa a fazer alguma coisa depois da
     * hidratação. Um clique que chegue antes dela **perde-se** — o `onClick`
     * ainda não está ligado —, e o `toHaveAttribute` a seguir ficava a esperar
     * cinco segundos por uma mudança que já ninguém ia fazer. Foi assim que a
     * medição a 768 px reprovou uma vez e passou a seguir, sozinha: um
     * instrumento com resultado dependente do momento não mede nada.
     *
     * A repetição é idempotente porque só carrega quando está FECHADO. Se
     * clicasse sempre, alternava o estado e o segundo clique desfazia o
     * primeiro.
     *
     * E isto é o arnês a contornar uma propriedade real, que fica dita: abaixo
     * de 1024 px **a navegação principal precisa de JavaScript**. O que a
     * segura sem ele é o rodapé, que é servidor puro e leva os dez destinos.
     */
    await expect(async () => {
      if ((await botao.getAttribute('aria-expanded')) !== 'true') await botao.click();
      expect(await botao.getAttribute('aria-expanded'),
        `${selector} não assumiu o estado aberto`).toBe('true');
    }).toPass({ timeout: 10_000 });

    abertos.push(selector);
  }

  if (abertos.length === 0) return null;

  const medida = await medirMoldura(pagina);
  const resultado = {
    abertos,
    navVisiveis: medida.navegacao.visiveis,
    ligacoesVisiveis: medida.ligacoesDaModura.filter((l) => l.visivel).length,
    transbordo: await transbordaNaHorizontal(pagina),
    alvosPequenos: await alvosPequenos(pagina, 44),
    foraDoEcra: await elementosForaDoEcra(pagina),
    contrastes: await textosComPoucoContraste(pagina),
  };

  // Fecha pela ordem inversa, e pela mesma razão idempotente.
  for (const selector of [...abertos].reverse()) {
    const botao = pagina.locator(selector).first();
    await expect(async () => {
      if ((await botao.getAttribute('aria-expanded')) !== 'false') await botao.click();
      expect(await botao.getAttribute('aria-expanded')).toBe('false');
    }).toPass({ timeout: 10_000 });
  }
  return resultado;
}

test.describe('RV100 · moldura comercial', () => {
  test.skip(!FASE, 'define RV100_FASE=antes|depois para gravar evidência');

  for (const largura of LARGURAS) {
    test(`a moldura das dez rotas, a ${largura} px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      const recolha: unknown[] = [];

      for (const rota of ROTAS) {
        const resposta = await page.goto(rota.caminho, { waitUntil: 'networkidle' });
        expect(resposta?.status(), `${rota.caminho} respondeu ${resposta?.status()}`)
          .toBeLessThan(400);

        const medida = await medirMoldura(page);

        // Controlo positivo: sem cabeçalho e sem rodapé isto não é uma moldura
        // por medir, é uma página que não carregou.
        expect(medida.cabecalho, `${rota.nome} não tem cabeçalho — não carregou`).not.toBeNull();
        expect(medida.rodape, `${rota.nome} não tem rodapé — não carregou`).not.toBeNull();

        recolha.push({
          id: rota.id,
          pagina: rota.nome,
          rota: rota.caminho,
          largura,
          transbordo: await transbordaNaHorizontal(page),
          alvosPequenos: (await alvosPequenos(page, 44)).length,
          ...medida,
          // O estado que só existe depois de um toque.
          comMenusAbertos: await medirComAberto(page),
        });
      }

      mkdirSync(DESTINO, { recursive: true });
      writeFileSync(
        `${DESTINO}/${FASE}-${largura}.json`,
        JSON.stringify(recolha, null, 2) + '\n',
      );
    });
  }

  /**
   * A mesma moldura, nas TRÊS línguas.
   *
   * O `05_MARKETING_AND_CONVERSION.md` deixou isto escrito como não-medido: «as
   * chaves existem nos três catálogos e a `validar-tres-linguas.sh` prova que
   * nenhuma falta. Prova chaves, não composição: uma tradução 30–50% mais longa
   * parte layouts, e isso ainda não foi visto.»
   *
   * Passa a ser visto, e a razão é directa: a altura do cabeçalho é o número
   * contra o qual o herói se vai compor. Um número medido só em espanhol é um
   * número de uma língua, não do produto — «Implantación», «Implantação» e
   * «Onboarding» não medem o mesmo, e a barra tem `flex-wrap`.
   *
   * A pergunta aqui é **«cabe?»** e não «melhorou?»: é um limiar, não um delta.
   */
  test('a moldura cabe nas três línguas, nas cinco larguras', async ({ page }) => {
    const recolha: unknown[] = [];

    for (const idioma of ['es-ES', 'pt-BR', 'en'] as const) {
      for (const largura of LARGURAS) {
        await page.setViewportSize({ width: largura, height: 900 });
        await page.goto(`/${idioma}`, { waitUntil: 'networkidle' });
        const medida = await medirMoldura(page);

        // Controlo positivo: sem cabeçalho isto não mediu a moldura.
        expect(medida.cabecalho, `${idioma} a ${largura}px não tem cabeçalho`).not.toBeNull();

        recolha.push({
          idioma,
          largura,
          cabecalho: medida.cabecalho?.altura ?? null,
          marca: medida.marca.caixa,
          navLinhas: medida.navegacao.linhas,
          navVisiveis: medida.navegacao.visiveis,
          transbordo: await transbordaNaHorizontal(page),
          alvosPequenos: await alvosPequenos(page, 44),
          foraDoEcra: await elementosForaDoEcra(page),
          contrastes: await textosComPoucoContraste(page),
          comMenusAbertos: await medirComAberto(page),
        });
      }
    }

    mkdirSync(DESTINO, { recursive: true });
    writeFileSync(
      `${DESTINO}/${FASE}-tres-linguas.json`,
      JSON.stringify(recolha, null, 2) + '\n',
    );
  });
});

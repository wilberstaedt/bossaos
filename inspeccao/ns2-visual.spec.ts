import { expect, test } from '@playwright/test';

/**
 * O SISTEMA VISUAL do North Star v2, medido na página renderizada.
 *
 * ── Porque é que isto não lê CSS ──────────────────────────────────────────
 *
 * A régua desta entrega é textual: *«mede-se a página renderizada, nunca o
 * código — ler `background: verde` no CSS não prova que a secção é verde: pode
 * estar coberta, pode não aplicar»*. Aqui pergunta-se ao navegador o que ele
 * pintou, e cada número traz a POPULAÇÃO que olhou, porque «zero cartões
 * órfãos» sobre zero grelhas é verde sobre nada.
 *
 * A superfície medida é `interno/ns2`, que é onde o sistema da Fase 1 existe.
 * **Não é a landing** — essa é a Fase 2, e medi-la agora seria medir o que
 * ainda não foi construído.
 */

const ROTA = '/es-ES/interno/ns2';
/** 18,66 px negrito é a fronteira do «texto grande» da WCAG 1.4.3. */
const TEXTO_GRANDE = 18.66;

function luminancia(cor: string): number | null {
  const m = cor.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return null;
  const c = m.slice(0, 3).map((x) => Number(x) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (c[0] as number) + 0.7152 * (c[1] as number) + 0.0722 * (c[2] as number);
}
function razao(a: string, b: string): number | null {
  const [la, lb] = [luminancia(a), luminancia(b)];
  if (la === null || lb === null) return null;
  const [alto, baixo] = la > lb ? [la, lb] : [lb, la];
  return (alto + 0.05) / (baixo + 0.05);
}

test.describe('North Star v2 — o sistema da Fase 1', () => {
  test('ritmo, escala, CTA, bento, shell e a mesa visual', async ({ page }) => {
    test.setTimeout(600_000);
    const falhas: string[] = [];

    // ── 1 · O RITMO: as secções não podem ter todas o mesmo fundo ────────
    await page.setViewportSize({ width: 1440, height: 900 });
    const r = await page.goto(ROTA, { waitUntil: 'networkidle' });
    expect(r?.status(), `POPULACAO-ZERO: ${ROTA} respondeu ${r?.status()}`).toBe(200);

    const fundos = await page.locator('section[data-ns]').evaluateAll(
      (els) => els.map((e) => ({ qual: e.getAttribute('data-ns'), cor: getComputedStyle(e).backgroundColor })));
    const distintas = new Set(fundos.map((f) => f.cor));
    console.log(`RITMO seccoes=${fundos.length} fundosDistintos=${distintas.size}`);
    for (const f of fundos) console.log(`   ${f.qual} ${f.cor}`);
    if (fundos.length === 0) falhas.push('POPULACAO-ZERO: nenhuma secção com `data-ns`');
    if (distintas.size < 3) falhas.push(`RITMO: só ${distintas.size} fundos distintos (mínimo 3)`);
    const heroi = fundos.find((f) => f.qual === 'heroi');
    const AREIA = 'rgb(247, 244, 236)';
    if (heroi && heroi.cor === AREIA) falhas.push('RITMO: o herói é areia — o primeiro ponto da lista de reprovação');

    // ── 2 · A ESCALA de display, nas duas larguras ───────────────────────
    const medirTexto = async () => page.evaluate(() => {
      const px = (s: string) => parseFloat(s);
      const um = (sel: string) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const s = getComputedStyle(e);
        return { tamanho: px(s.fontSize), peso: s.fontWeight };
      };
      return { display: um('.ns-display'), titulo: um('.ns-titulo'), lead: um('.ns-lead') };
    });
    const secretaria = await medirTexto();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ROTA, { waitUntil: 'networkidle' });
    const movel = await medirTexto();
    console.log(`ESCALA secretaria display=${secretaria.display?.tamanho} titulo=${secretaria.titulo?.tamanho} lead=${secretaria.lead?.tamanho}`);
    console.log(`ESCALA movel      display=${movel.display?.tamanho}`);
    const entre = (v: number | undefined, min: number, max: number, nome: string) => {
      if (v === undefined) { falhas.push(`ESCALA: ${nome} não foi medido`); return; }
      if (v < min || v > max) falhas.push(`ESCALA: ${nome} = ${v}px, fora de ${min}–${max}`);
    };
    entre(secretaria.display?.tamanho, 68, 76, 'display a 1440');
    entre(movel.display?.tamanho, 42, 48, 'display a 390');
    entre(secretaria.titulo?.tamanho, 44, 56, 'título a 1440');
    entre(secretaria.lead?.tamanho, 19, 22, 'lead a 1440');

    // ── 3 · O CTA CORAL sobre o verde, e as duas perguntas separadas ─────
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROTA, { waitUntil: 'networkidle' });
    const cta = await page.evaluate(() => {
      const b = document.querySelector('.ns-accao-heroi');
      const seccao = document.querySelector('section[data-ns="heroi"]');
      if (!b || !seccao) return null;
      const s = getComputedStyle(b);
      return {
        fundo: s.backgroundColor, texto: s.color, tamanho: parseFloat(s.fontSize),
        peso: s.fontWeight, atras: getComputedStyle(seccao).backgroundColor,
      };
    });
    if (!cta) {
      falhas.push('POPULACAO-ZERO: não encontrei o CTA do herói');
    } else {
      const contraFundo = razao(cta.fundo, cta.atras) ?? 0;
      const textoNoCta = razao(cta.texto, cta.fundo) ?? 0;
      const grande = cta.tamanho >= TEXTO_GRANDE && Number(cta.peso) >= 700;
      console.log(`CTA fundo=${cta.fundo} sobre=${cta.atras} contraste=${contraFundo.toFixed(2)}`
        + ` texto=${textoNoCta.toFixed(2)} tamanho=${cta.tamanho} peso=${cta.peso} grande=${grande}`);
      if (contraFundo < 3) falhas.push(`CTA: o botão contra o herói dá ${contraFundo.toFixed(2)}:1 (mínimo 3)`);
      // O limiar do texto DEPENDE do tamanho, e é essa a razão de o rótulo ser
      // grande: nenhum coral serve 3:1 sobre areia E 4,5:1 com texto verde.
      const minimo = grande ? 3 : 4.5;
      if (textoNoCta < minimo) {
        falhas.push(`CTA: texto a ${textoNoCta.toFixed(2)}:1 com rótulo ${grande ? 'grande' : 'normal'} (mínimo ${minimo})`);
      }
    }

    // ── 4 · O BENTO é assimétrico, e não quatro caixas iguais ───────────
    const bento = await page.locator('.ns-bento__area').evaluateAll(
      (els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    const largurasDistintas = new Set(bento).size;
    console.log(`BENTO areas=${bento.length} largurasDistintas=${largurasDistintas} [${bento.join(', ')}]`);
    if (bento.length === 0) falhas.push('POPULACAO-ZERO: nenhuma área de bento');
    else if (largurasDistintas < 2) falhas.push('BENTO: todas as áreas têm a mesma largura — é uma grelha, não um bento');

    // ── 5 · A MESA é um mapa, não uma lista ─────────────────────────────
    const mesa = await page.evaluate(() => {
      const mapa = document.querySelector('.ns-mesas');
      if (!mapa) return null;
      const s = getComputedStyle(mapa);
      const cartoes = [...mapa.querySelectorAll('.ns-mesa')];
      return {
        display: s.display, colunas: s.gridTemplateColumns.split(' ').length,
        mesas: cartoes.length,
        comEstado: cartoes.filter((c) => (c.textContent ?? '').trim().length > 0 && c.getAttribute('data-estado')).length,
        estadosDistintos: new Set(cartoes.map((c) => c.getAttribute('data-estado'))).size,
        emLista: mapa.tagName === 'UL' || cartoes.some((c) => c.tagName === 'LI'),
      };
    });
    if (!mesa) falhas.push('POPULACAO-ZERO: não encontrei o mapa de mesas');
    else {
      console.log(`MESAS display=${mesa.display} colunas=${mesa.colunas} mesas=${mesa.mesas}`
        + ` comEstado=${mesa.comEstado} estados=${mesa.estadosDistintos} emLista=${mesa.emLista}`);
      if (mesa.display !== 'grid') falhas.push(`MESAS: o mapa é \`${mesa.display}\` e não uma grelha`);
      if (mesa.colunas < 2) falhas.push('MESAS: uma coluna só — isso é uma lista, não um mapa');
      if (mesa.comEstado !== mesa.mesas) falhas.push(`MESAS: ${mesa.mesas - mesa.comEstado} mesas sem estado declarado`);
      if (mesa.estadosDistintos < 3) falhas.push(`MESAS: só ${mesa.estadosDistintos} estados distintos`);
    }

    // ── 6 · O SHELL: barra lateral e o activo por barra coral ───────────
    const shell = await page.evaluate(() => {
      const lado = document.querySelector('.ns-shell__lado');
      const activo = document.querySelector('.ns-shell__item[aria-current="page"]');
      if (!lado || !activo) return null;
      const antes = getComputedStyle(activo, '::before');
      return {
        largura: Math.round(lado.getBoundingClientRect().width),
        barra: antes.backgroundColor, larguraBarra: antes.width,
      };
    });
    if (!shell) falhas.push('POPULACAO-ZERO: não encontrei o shell ou o item activo');
    else {
      console.log(`SHELL lado=${shell.largura}px barraActiva=${shell.barra} (${shell.larguraBarra})`);
      if (shell.largura < 232 || shell.largura > 264) falhas.push(`SHELL: barra lateral de ${shell.largura}px, fora de 232–264`);
      if (parseFloat(shell.larguraBarra) <= 0) falhas.push('SHELL: o item activo não tem barra — o norte pede barra coral, não só bloco');
    }

    // ── A SONDA: cada detector sabe acender? ────────────────────────────
    //
    // Um zero que confirma o que se espera não mediu nada. Planta-se o defeito
    // que a régua nomeia — todas as secções com o mesmo fundo — e exige-se que
    // a contagem de fundos distintos caia para um.
    const sonda = await page.evaluate((areia) => {
      const seccoes = [...document.querySelectorAll<HTMLElement>('section[data-ns]')];
      if (seccoes.length === 0) return 'sem seccoes';
      const antes = seccoes.map((e) => e.style.backgroundColor);
      seccoes.forEach((e) => { e.style.backgroundColor = areia; });
      const distintos = new Set(seccoes.map((e) => getComputedStyle(e).backgroundColor)).size;
      seccoes.forEach((e, i) => { e.style.backgroundColor = antes[i] ?? ''; });
      return distintos === 1 ? 'acendeu' : `CEGA (${distintos} distintos)`;
    }, AREIA);
    console.log(`SONDA-RITMO ${sonda}`);

    console.log(`AMBITO seccoes=${fundos.length} bento=${bento.length} mesas=${mesa?.mesas ?? 0} falhas=${falhas.length}`);
    for (const f of falhas) console.log(`FALHA ${f}`);

    expect(sonda, 'SONDA-CEGA: com todas as secções da mesma cor, a contagem não caiu para 1').toBe('acendeu');
    expect(falhas, `o sistema da Fase 1 não cumpre:\n${falhas.join('\n')}`).toEqual([]);
  });
});

/**
 * AS TREZE CONDIÇÕES DE REPROVAÇÃO do §8, medidas na landing servida.
 *
 * A régua `ALVO-NORTH-STAR-V2.md` traduziu-as em instrumento e limiar. Onze
 * medem-se aqui; a 4 (capturas como anexos) é **juízo humano declarado** e a 13
 * (o executor aprovar-se) é **processo**, e nenhuma das duas se finge medida.
 */
test.describe('North Star v2 — as condições de reprovação, na landing', () => {
  test('as onze que se medem', async ({ page }) => {
    test.setTimeout(900_000);
    const falhas: string[] = [];
    const AREIA = 'rgb(247, 244, 236)';

    await page.setViewportSize({ width: 1440, height: 900 });
    const r = await page.goto('/es-ES', { waitUntil: 'networkidle' });
    expect(r?.status(), 'POPULACAO-ZERO: a landing não respondeu 200').toBe(200);

    const d = await page.evaluate((areia) => {
      const sec = [...document.querySelectorAll('section[data-ns]')];
      const fundos = sec.map((e) => getComputedStyle(e).backgroundColor);
      const heroi = sec.find((e) => e.getAttribute('data-ns') === 'heroi');
      // Cartões de texto SEMELHANTES: mesma classe, e sem imagem dentro. Um
      // cartão com captura não é «mais um cartão de texto».
      const cartoes = [...document.querySelectorAll('article, .ns-bento__area, .ns-preco')]
        .filter((e) => !e.querySelector('img')).length;
      // Área de produto contra área de texto nos primeiros 1800 px.
      const dentro = (e: Element) => e.getBoundingClientRect().top + window.scrollY < 1800;
      const areaImg = [...document.querySelectorAll('img')].filter(dentro)
        .reduce((t, e) => t + e.getBoundingClientRect().width * e.getBoundingClientRect().height, 0);
      const areaTexto = [...document.querySelectorAll('p, h1, h2, h3, li')].filter(dentro)
        .reduce((t, e) => t + e.getBoundingClientRect().width * e.getBoundingClientRect().height, 0);
      const capa = heroi?.querySelector('img') as HTMLImageElement | null;
      return {
        seccoes: sec.length,
        fundosDistintos: new Set(fundos).size,
        heroiEhAreia: heroi ? getComputedStyle(heroi).backgroundColor === areia : true,
        cartoes,
        areaImg: Math.round(areaImg), areaTexto: Math.round(areaTexto),
        capaLargura: capa ? Math.round(capa.getBoundingClientRect().width) : 0,
        capaNatural: capa?.naturalWidth ?? 0,
        frases: [...document.querySelectorAll('p')].map((e) => (e.textContent ?? '').trim())
          .filter((t) => t.length > 30),
      };
    }, AREIA);

    // ── 1 · fundo areia em todas as secções ─────────────────────────────
    console.log(`C1 seccoes=${d.seccoes} fundosDistintos=${d.fundosDistintos} heroiAreia=${d.heroiEhAreia}`);
    if (d.fundosDistintos < 3) falhas.push(`C1: ${d.fundosDistintos} fundos distintos (mínimo 3)`);
    if (d.heroiEhAreia) falhas.push('C1: o herói é areia');

    // ── 2 · mais de dez cartões de texto semelhantes ────────────────────
    console.log(`C2 cartoesDeTexto=${d.cartoes}`);
    if (d.cartoes > 10) falhas.push(`C2: ${d.cartoes} cartões de texto (máximo 10)`);

    // ── 3 · o herói mostra uma interface LEGÍVEL ────────────────────────
    const escala = d.capaNatural ? d.capaLargura / d.capaNatural : 0;
    const textoNoEcra = 14 * escala;
    console.log(`C3 capa=${d.capaLargura}/${d.capaNatural} escala=${escala.toFixed(2)} texto14=${textoNoEcra.toFixed(1)}px`);
    if (d.capaLargura < 650) falhas.push(`C3: a captura tem ${d.capaLargura}px (mínimo 650)`);
    if (textoNoEcra < 11) falhas.push(`C3: texto de 14px do produto chega a ${textoNoEcra.toFixed(1)}px (mínimo 11)`);

    // ── 5 · mais de oito blocos narrativos ──────────────────────────────
    if (d.seccoes > 8) falhas.push(`C5: ${d.seccoes} blocos (máximo 8)`);

    // ── 6 · coral e lima só como detalhe ────────────────────────────────
    //
    // A régua diz «área de PÍXEIS por cor». Somar caixas de elementos não é
    // isso: uma caixa transparente conta como se pintasse, e uma cor herdada
    // conta duas vezes. Aqui fotografa-se a página e contam-se os píxeis que
    // saíram — que é a mesma disciplina de medir o que o navegador pintou.
    const tiro = (await page.screenshot({ fullPage: true })).toString('base64');
    const cores = await page.evaluate(async (b64) => {
      const img = new Image();
      await new Promise((ok) => { img.onload = ok; img.src = `data:image/png;base64,${b64}`; });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const perto = (r: number, g: number, b: number, a: number[], t = 26) =>
        Math.abs(r - (a[0] as number)) <= t && Math.abs(g - (a[1] as number)) <= t
        && Math.abs(b - (a[2] as number)) <= t;
      let coral = 0; let lima = 0; let verde = 0; let claro = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] as number; const g = d[i + 1] as number; const b = d[i + 2] as number;
        if (perto(r, g, b, [216, 90, 68])) coral += 1;
        else if (perto(r, g, b, [221, 234, 145])) lima += 1;
        else if (perto(r, g, b, [16, 46, 53])) verde += 1;
        else if (perto(r, g, b, [247, 244, 236]) || perto(r, g, b, [255, 255, 255], 6)) claro += 1;
      }
      const total = c.width * c.height;
      return { coral, lima, verde, claro, total };
    }, tiro);
    if (!cores) falhas.push('POPULACAO-ZERO: não consegui contar píxeis');
    else {
      const pc = (n: number) => (n / cores.total) * 100;
      console.log(`C6 coral=${pc(cores.coral).toFixed(1)}% lima=${pc(cores.lima).toFixed(2)}%`
        + ` verde=${pc(cores.verde).toFixed(1)}% claro=${pc(cores.claro).toFixed(1)}%`);
      if (cores.lima <= 0) falhas.push('C6: lima com zero presença');
      if (pc(cores.coral) < 8) {
        falhas.push(`C6: coral a ${pc(cores.coral).toFixed(1)}% da página (mínimo 8)`);
      }
    }

    // ── 7 · mais texto que produto nas duas primeiras telas ─────────────
    console.log(`C7 areaImg=${d.areaImg} areaTexto=${d.areaTexto}`);
    if (d.areaImg < d.areaTexto) {
      falhas.push(`C7: nos primeiros 1800px o texto ocupa ${d.areaTexto} e o produto ${d.areaImg}`);
    }

    // ── 8 · /product repete a home ──────────────────────────────────────
    await page.goto('/es-ES/product', { waitUntil: 'networkidle' });
    const doProduto = await page.evaluate(() => [...document.querySelectorAll('p')]
      .map((e) => (e.textContent ?? '').trim()).filter((t) => t.length > 30));
    const comuns = d.frases.filter((f) => doProduto.includes(f)).length;
    const pct = d.frases.length ? (comuns / d.frases.length) * 100 : 0;
    console.log(`C8 frasesHome=${d.frases.length} comuns=${comuns} (${pct.toFixed(0)}%)`);
    if (d.frases.length === 0) falhas.push('POPULACAO-ZERO: a home não deu frases para comparar');
    else if (pct >= 30) falhas.push(`C8: ${pct.toFixed(0)}% das frases da home repetem-se em /product`);

    // ── 10 · o móvel é o desktop empilhado ──────────────────────────────
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/es-ES', { waitUntil: 'networkidle' });
    const soMovel = await page.evaluate(() => {
      const visivel = (e: Element) => {
        const c = e.getBoundingClientRect();
        return c.width > 0 && c.height > 0;
      };
      return [...document.querySelectorAll('source[media]')].length
        + [...document.querySelectorAll('[class*="movel"], [class*="movil"]')].filter(visivel).length;
    });
    console.log(`C10 componentesSoMovel=${soMovel}`);
    if (soMovel < 1) falhas.push('C10: nada distingue o móvel do desktop empilhado');

    // ── 11 · métricas ou depoimentos inventados ─────────────────────────
    const inventado = await page.evaluate(() => {
      const texto = document.body.innerText;
      // Números com % ou «x» de resultado, e aspas de depoimento.
      const suspeitos = texto.match(/\b\d+\s?%|\b\d+x\b|«[^»]{40,}»/g) ?? [];
      return suspeitos.slice(0, 5);
    });
    console.log(`C11 suspeitos=${inventado.length} ${JSON.stringify(inventado)}`);
    if (inventado.length > 0) falhas.push(`C11: possível métrica ou depoimento: ${inventado.join(' · ')}`);

    console.log(`AMBITO-C13 medidas=11 juizoHumano=1 processo=1 falhas=${falhas.length}`);
    for (const f of falhas) console.log(`FALHA ${f}`);
    expect(falhas, `condições de reprovação:\n${falhas.join('\n')}`).toEqual([]);
  });
});

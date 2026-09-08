// ── Fita métrica do §4: o que a landing TEM DE ser ─────────────────────────
//
// Uso: node scripts/medir-quatro.mjs <url>
//
// ISTO NAO E UMA GUARDA. Mede e relata. Nao recusa nada e nao entra no
// `validar-no-commit` — a decisao do que fazer com um desvio e de quem desenha.
//
// ── Porque e que isto existe, e e uma falha minha ──────────────────────────
//
// A 08/09 o Matheus abriu a landing publicada e disse que estava horrivel. Eu
// tinha-lhe dito que passavam os treze criterios do norte. As duas coisas eram
// verdade, e e isso que interessa: as onze condicoes que se medem sao o §8, as
// condicoes de REPROVACAO — o que a pagina nao pode fazer. A direccao vive no
// §4.1 ao §4.8, bloco a bloco, e disso NUNCA se mediu nada.
//
// Construi instrumento para metade do norte e apresentei essa metade como se
// falasse de qualidade. Isto e a outra metade.
//
// ── Duas regras que este ficheiro cumpre, e que me custaram o dia ──────────
//
// 1. DECLARA A LARGURA. Uma medicao sem o viewport ao lado nao vale nada: as
//    exigencias de secretaria (heroi >= 760, contentor 1240-1280) sao falsas a
//    500 px, e hoje quase as reportei como violacao por medir na largura errada.
//
// 2. ABSTEM-SE em vez de adivinhar. O que nao se pode medir na largura corrente
//    sai como NAO MEDI e diz porque. Um verde que nao mediu e pior do que um
//    vermelho.
import { chromium } from 'playwright';

/* O corpo de `page.evaluate` corre NO NAVEGADOR, nao aqui. O `eslint.config`
 * da a `scripts/**` so os globais do Node, e bem — este ficheiro e' a
 * excepcao e declara-a onde ela vive, em vez de alargar a regra para todos.
 * globals: document, getComputedStyle */
/* global document, getComputedStyle */

const URL = process.argv[2];
if (!URL) { console.error('uso: node scripts/medir-quatro.mjs <url>'); process.exit(2); }

const LARGURAS = [{ nome: 'secretaria', w: 1440, h: 900 }, { nome: 'movel', w: 390, h: 844 }];
// Usa o Chrome instalado em vez de descarregar o headless do Playwright: sao
// centenas de MB na maquina do Matheus para uma medicao que o Chrome dele faz.
const b = await chromium.launch({ channel: 'chrome' });
let desvios = 0, medidos = 0, abstidos = 0;

const diz = (estado, texto) => {
  if (estado === 'ok') { medidos++; console.log(`  ok        ${texto}`); }
  else if (estado === 'desvio') { medidos++; desvios++; console.log(`  DESVIO    ${texto}`); }
  else { abstidos++; console.log(`  NAO MEDI  ${texto}`); }
};

for (const L of LARGURAS) {
  const p = await b.newPage({ viewport: { width: L.w, height: L.h } });
  await p.goto(URL, { waitUntil: 'networkidle' });
  console.log(`\n── ${L.nome}, ${L.w} px ──────────────────────────────`);

  const d = await p.evaluate(() => {
    const hdr = document.querySelector('header');
    const secs = [...document.querySelectorAll('section')];
    const acha = (re) => secs.find((s) => re.test((s.querySelector('h2') || {}).textContent || ''));
    const cta = hdr?.querySelector('.bo-mkt__cta');
    const marca = hdr?.querySelector('.bo-mkt__marca');
    const heroi = secs[0];
    const capa = heroi?.querySelector('img');
    const b2 = acha(/principio a fin|comanda/i);
    const b4 = acha(/Cada uno ve|cada pessoa|cada persona/i);
    const conta = (s) => s ? { img: s.querySelectorAll('img').length, p: s.querySelectorAll('p').length,
                               h3: s.querySelectorAll('h3').length,
                               tabs: s.querySelectorAll('[role="tab"],button[aria-selected]').length } : null;
    return {
      hdrH: hdr ? Math.round(hdr.getBoundingClientRect().height) : null,
      logoW: marca ? Math.round(marca.getBoundingClientRect().width) : null,
      idiomas: [...(hdr?.querySelectorAll('a') || [])]
        .filter((a) => /^(ES|PT|EN)$/i.test(a.textContent.trim()))
        .filter((a) => a.getBoundingClientRect().width > 0).length,
      ctaFundo: cta ? getComputedStyle(cta).backgroundColor : null,
      ctaVisivel: cta ? cta.getBoundingClientRect().width > 0 : false,
      heroiH: heroi ? Math.round(heroi.getBoundingClientRect().height) : null,
      capaW: capa ? Math.round(capa.getBoundingClientRect().width) : null,
      b2: conta(b2), b4: conta(b4),
      euros: (document.body.innerText.match(/€\s?[\d.,]+/g) || []).length,
      faq: document.querySelectorAll('details').length,
    };
  });

  const CORAL = 'rgb(216, 90, 68)';

  // §4.1 — vale nas duas larguras
  diz(d.hdrH >= 72 && d.hdrH <= 80 ? 'ok' : 'desvio', `§4.1 altura do cabecalho ${d.hdrH}px (spec 72-80)`);
  diz(d.logoW >= 145 && d.logoW <= 165 ? 'ok' : 'desvio', `§4.1 logotipo ${d.logoW}px (spec 145-165)`);
  diz(d.ctaFundo === CORAL ? 'ok' : 'desvio', `§4.1 CTA do cabecalho ${d.ctaFundo} (spec coral ${CORAL})`);

  if (L.nome === 'secretaria') {
    diz(d.idiomas <= 1 ? 'ok' : 'desvio', `§4.1 ${d.idiomas} itens de idioma visiveis (spec: selector compacto, NAO tres)`);
    diz(d.heroiH >= 760 ? 'ok' : 'desvio', `§4.2 heroi ${d.heroiH}px (spec min 760)`);
    diz(d.capaW >= 650 ? 'ok' : 'desvio', `§4.2 captura principal ${d.capaW}px (spec min 650 em secretaria)`);
  } else {
    diz(d.ctaVisivel ? 'ok' : 'desvio', `§4.1 movel ${d.ctaVisivel ? 'tem' : 'NAO tem'} CTA (spec: logo, CTA curto e menu real)`);
    diz('naomedi', '§4.2 heroi e captura: exigencias de secretaria, nao se medem a 390');
  }

  // §4.3 e §4.5 — contagens de nos, independentes da largura
  if (d.b2) diz(d.b2.img >= 4 ? 'ok' : 'desvio',
    `§4.3 bloco 2 tem ${d.b2.img} imagens e ${d.b2.p} paragrafos (spec: quatro crops; PROIBE quatro cards de texto)`);
  else diz('naomedi', '§4.3 nao encontrei o bloco 2 pelo titulo');

  if (d.b4) diz(d.b4.tabs > 0 ? 'ok' : 'desvio',
    `§4.5 bloco 4 tem ${d.b4.tabs} tabs e ${d.b4.img} imagem(ns) (spec: alternavel, um ecra por papel)`);
  else diz('naomedi', '§4.5 nao encontrei o bloco 4 pelo titulo');

  diz(d.euros > 0 ? 'ok' : 'desvio', `§4.6 ${d.euros} valores em euros na pagina (spec: 19, 79, 149)`);
  diz(d.faq <= 6 ? 'ok' : 'desvio', `§4.8 ${d.faq} perguntas (spec: no maximo seis)`);

  await p.close();
}
await b.close();
console.log(`\n  ${medidos} medidas, ${desvios} desvios, ${abstidos} abstencoes.`);
console.log('  Isto mede o §4 (o que a pagina TEM DE ser). O §8 e outra lista.');

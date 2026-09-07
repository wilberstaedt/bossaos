/**
 * ── Uma família de ícones, um ícone por item ───────────────────────────────
 *
 * O DEFEITO que isto existe para apanhar: os catorze itens da barra lateral do
 * backoffice tinham o MESMO glifo — quatro quadrados, um marcador de lugar que
 * foi para produção. Ninguém olha para isso e diz «um contador de distintos
 * daria 1 em 14»; diz que está feio. Esta sonda transforma o juízo em número.
 *
 * O QUE MEDE: quantas geometrias DISTINTAS há entre os ícones da navegação, e
 * se cada um cumpre a especificação do manual (grelha de 24, traço de 2 px,
 * `currentColor`) e é decorativo (`aria-hidden`) — o rótulo já está no texto, e
 * um ícone que se anuncia faz o leitor de ecrã dizer a mesma coisa duas vezes.
 *
 * O QUE NÃO PROMETE: que os ícones sejam BONITOS, nem que cada um represente
 * bem o seu item. Isso é juízo humano e é do Matheus. Isto mede distinção,
 * consistência e tamanho.
 *
 * NÃO CONSTRÓI NADA, de propósito. Duas construções ao mesmo tempo escrevem o
 * mesmo `.next` e servem páginas a meio — foi a causa de três sintomas
 * separados a 07/09. Se não houver servidor, sai a NÃO MEDI e não disputa o
 * build a ninguém.
 *
 * Três respostas: OK (0) · FALHOU (1) · NÃO MEDI (2).
 */
import { chromium } from 'playwright';
import { abrirSessao } from './sessao-da-demo.mjs';

const OK = 0, FALHOU = 1, NAO_MEDI = 2;
const PORTA = process.env.PORTA_ICONES ?? process.env.PORTA_MESTRES ?? '3020';
const BASE = `http://127.0.0.1:${PORTA}`;
const verde = (m) => console.log(`  ok       ${m}`);
const vermelho = (m) => console.log(`  FALHOU   ${m}`);
const naomedi = (m) => console.log(`  NÃO MEDI ${m}`);

console.log('A navegação tem uma família de ícones, ou um glifo repetido?');

/** A assinatura de um ícone: a geometria, sem espaços nem ordem de atributos. */
function assinatura(html) {
  return (html || '')
    .replace(/\s+/g, ' ')
    .replace(/ (fill|stroke|class|style)="[^"]*"/g, '')
    .trim();
}

/**
 * O CONTROLO, e corre ANTES de olhar para o produto: um conjunto sintético com
 * um duplicado conhecido. Um contador que devolva sempre o total do array passa
 * despercebido enquanto os ícones forem distintos — e um contador de distintos
 * que nunca viu um duplicado não provou que sabe vê-los.
 */
function sondaDoContador() {
  const falso = ['<path d="A"/>', '<path d="B"/>', '<path d="A"/>', '<path d="C"/>'];
  const distintas = new Set(falso.map(assinatura)).size;
  return distintas === 3;
}

if (!sondaDoContador()) {
  naomedi('a sonda não acendeu: o contador não viu um duplicado que lá estava.');
  process.exit(NAO_MEDI);
}
verde('a sonda acendeu: o contador vê um duplicado plantado (4 formas, 3 distintas)');

let navegador;
try {
  const r = await fetch(BASE, { signal: AbortSignal.timeout(4000) }).catch(() => null);
  if (!r) {
    naomedi(`não há servidor em ${BASE} — esta sonda não constrói, para não disputar o \`.next\`.`);
    process.exit(NAO_MEDI);
  }
  navegador = await chromium.launch();
  const ctx = await abrirSessao(navegador, BASE);
  const pagina = await ctx.newPage();
  const resp = await pagina.goto(`${BASE}/es-ES/app/bossa-demo`, { waitUntil: 'load', timeout: 30_000 });
  if (!resp || resp.status() !== 200) {
    naomedi(`o backoffice devolveu ${resp ? resp.status() : 'nada'} — sem página não há ícones.`);
    process.exit(NAO_MEDI);
  }
  const itens = await pagina.$$eval('.bo-admin__ligacao', (ns) => ns.map((n) => {
    const svg = n.querySelector('svg') || n.querySelector('.bo-admin__glifo');
    return {
      rotulo: (n.textContent || '').trim(),
      geometria: svg ? svg.innerHTML : null,
      viewBox: svg ? svg.getAttribute('viewBox') : null,
      traco: svg ? (svg.getAttribute('stroke-width') || getComputedStyle(svg).strokeWidth) : null,
      escondido: svg ? (svg.getAttribute('aria-hidden') === 'true'
        || svg.closest('[aria-hidden="true"]') !== null) : null,
    };
  }));

  if (itens.length === 0) { naomedi('zero itens de navegação — população vazia.'); process.exit(NAO_MEDI); }
  const semIcone = itens.filter((i) => !i.geometria);
  if (semIcone.length) {
    vermelho(`${semIcone.length} de ${itens.length} itens sem ícone nenhum: ${semIcone.map((i) => i.rotulo).join(', ')}`);
    process.exit(FALHOU);
  }

  const distintas = new Set(itens.map((i) => assinatura(i.geometria))).size;
  const falhas = [];
  if (distintas !== itens.length) falhas.push(`${distintas} formas DISTINTAS em ${itens.length} itens — há glifo repetido`);
  const maus = itens.filter((i) => !/(^|\s)0 0 24 24(\s|$)/.test(i.viewBox || ''));
  if (maus.length) falhas.push(`${maus.length} fora da grelha de 24: ${maus.map((i) => `${i.rotulo}=${i.viewBox}`).slice(0, 4).join(' · ')}`);
  const finos = itens.filter((i) => String(i.traco).replace('px', '') !== '2');
  if (finos.length) falhas.push(`${finos.length} fora do traço de 2: ${finos.map((i) => `${i.rotulo}=${i.traco}`).slice(0, 4).join(' · ')}`);
  const anunciados = itens.filter((i) => i.escondido === false);
  if (anunciados.length) falhas.push(`${anunciados.length} ícones não são \`aria-hidden\` — o leitor de ecrã diz o rótulo duas vezes`);

  if (falhas.length) { falhas.forEach(vermelho); console.log(`\n  âmbito:  ${itens.length} itens de navegação medidos em ${BASE}`); process.exit(FALHOU); }

  verde(`${distintas} formas distintas em ${itens.length} itens — uma por item`);
  verde('grelha de 24, traço de 2 e `aria-hidden` em todos');
  console.log(`\n  âmbito:  ${itens.length} itens em \`/es-ES/app/bossa-demo\`, medidos em ${BASE}.`);
  console.log('           FORA: se o ícone REPRESENTA bem o item, e se é bonito — juízo humano.');
  process.exit(OK);
} catch (e) {
  naomedi(`não consegui medir: ${e.message}`);
  process.exit(NAO_MEDI);
} finally {
  if (navegador) await navegador.close();
}

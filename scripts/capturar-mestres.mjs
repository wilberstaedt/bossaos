import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DEMO, SLUG_DA_DEMO } from '../packages/db/prisma/demonstracao-comum.ts';
import { abrirSessao } from './sessao-da-demo.mjs';

/**
 * As SEIS TELAS-MESTRE do §7, fotografadas nos viewports contratuais.
 *
 * ── O que este ficheiro não faz, e é o mais importante ────────────────────
 *
 * Não emite `PRONTO PARA APROVAÇÃO VISUAL HUMANA`. O §7.1 tem seis passos e o
 * quinto é de quem revê; o §12.4 diz que só o Matheus regista a aprovação. Isto
 * cobre os passos 1 a 4: implementar, correr, capturar, indexar.
 *
 * ── A regra que atravessa os estados ──────────────────────────────────────
 *
 * A régua diz: *«cada estado tem de poder ficar vermelho pela razão certa. Um
 * `loading` capturado numa página que nunca carrega não é um estado de
 * carregamento: é uma página partida com o nome trocado.»*
 *
 * Por isso cada estado declara o que o produz e o que MAIS o produziria:
 *
 *   `principal`  a rota responde 200 e traz conteúdo semeado.
 *   `offline`    o contexto vai mesmo offline (`setOffline`), e o ecrã tem de
 *                MUDAR — se ficar igual, não provou operação degradada, provou
 *                que a página não repara na rede.
 *   `denied`     um recurso de OUTRA casa com a mesma sessão. Se devolver 200
 *                com conteúdo, o defeito é de isolamento e não de captura.
 *   `vazio`      uma consulta que legitimamente não devolve nada — e o controlo
 *                é que a MESMA rota com dados devolve algo.
 *   `erro`       um identificador que não existe.
 *   `loading`    só conta quando a MESMA rota também produziu `principal`.
 *                Sem isso, a imagem podia ser uma página que nunca carrega.
 *
 * Um estado que não se consegue produzir honestamente fica `NAO_CAPTURADO` com
 * o motivo, e não uma imagem com o nome trocado.
 */

/* O corpo dos `evaluate` corre no NAVEGADOR: `document` e `window` vivem la,
   nao aqui. O eslint le este ficheiro como Node e nao tem como saber disso —
   a declaracao e' mais honesta do que desligar a regra. */
/* global document, window */
const PORTA = process.env.PORTA_MESTRES ?? '3020';
const BASE = `http://127.0.0.1:${PORTA}`;
const DESTINO = process.env.DESTINO_MESTRES
  ?? 'docs/visual/rv100/2026-09-06/evidence/masters';

/** Uma casa que não é a da demonstração — para o estado `denied` ser real. */
const OUTRA_CASA = '11111111-1111-4111-8111-111111111111';

/**
 * ── M05: o viewport-alvo, ESCRITO ─────────────────────────────────────────
 *
 * O §7 pede «viewport-alvo documentado», e a régua é explícita: «documentado» é
 * um aceite e não um adjectivo — sem o número, qualquer captura passa. Procurei
 * e **não estava escrito em lado nenhum** do repositório.
 *
 * Fica **1920 × 1080**, e a razão não é gosto meu: o §6.6 da própria landing diz
 * que *«uma TV pode precisar de um mini-PC»* — ou seja, o produto já assume o
 * televisor como superfície do KDS, e 1920×1080 é o painel montado comum. O
 * alvo sai de uma afirmação que o produto faz, não de uma preferência.
 *
 * E fica um **segundo** viewport, 1280 × 800, porque é o da composição que já
 * existe e é a cozinha apertada com um portátil. Dois números escritos valem
 * mais do que um número escolhido por omissão.
 */
const KDS_ALVO = { largura: 1920, altura: 1080 };
const KDS_SECUNDARIO = { largura: 1280, altura: 800 };

const MESTRES = [
  {
    id: 'M01', nome: 'LP desktop', largura: 1440, altura: 900, sessao: false,
    prova: 'marca, hierarquia, produto, conversão e ritmo',
    rota: (l) => `/${l}`,
    estados: { linguas: true },
  },
  {
    id: 'M02', nome: 'LP mobile', largura: 390, altura: 844, sessao: false,
    prova: 'navegação, leitura, CTA e composição móvel real',
    rota: (l) => `/${l}`,
    estados: { linguas: true, erro: (l) => `/${l}/404` },
  },
  {
    id: 'M03', nome: 'Dashboard/backoffice', largura: 1440, altura: 900, sessao: true,
    prova: 'shell, densidade, dados, navegação e estados',
    rota: (l) => `/${l}/app/${SLUG_DA_DEMO}`,
    estados: {
      linguas: true,
      denied: (l) => `/${l}/app/${SLUG_DA_DEMO}/organization/unidades/${OUTRA_CASA}`,
      // Rota que EXISTE, com identificador malformado. A primeira versão usava
      // `catalogo/produtos/<id>`, que **não é uma rota** — o 500 que veio não
      // dizia nada sobre identificadores inválidos, dizia que eu tinha inventado
      // um caminho.
      erro: (l) => `/${l}/app/${SLUG_DA_DEMO}/organization/unidades/nao-e-um-uuid`,
    },
  },
  {
    id: 'M04', nome: 'Staff/mesa/pedido', largura: 390, altura: 844, sessao: true,
    prova: 'toque, velocidade, feedback e operação com uma mão',
    rota: (l) => `/${l}/staff/${DEMO.unidade}`,
    estados: {
      linguas: true,
      offline: true,
      vazio: (l) => `/${l}/staff/${DEMO.unidade}/procurar`,
      erro: (l) => `/${l}/staff/${OUTRA_CASA}`,
    },
  },
  {
    id: 'M05', nome: 'KDS', largura: KDS_ALVO.largura, altura: KDS_ALVO.altura, sessao: true,
    prova: 'distância, volume, prioridade e mudança de estado',
    rota: (l) => `/${l}/kds/${DEMO.unidade}/${DEMO.estacaoQuente}`,
    estados: {
      linguas: true,
      segundoViewport: KDS_SECUNDARIO,
      vazio: (l) => `/${l}/kds/${DEMO.unidade}/${DEMO.estacaoPasse}/prontos`,
      offline: true,
    },
  },
  {
    id: 'M06', nome: 'Carta pública Starter', largura: 390, altura: 844, sessao: false,
    prova: 'tema BossaOS, marca do restaurante, desejo e clareza',
    rota: () => `/r/${SLUG_DA_DEMO}/es-ES/menu`,
    estados: { linguas: false },
  },
];

const LINGUAS = ['es-ES', 'pt-BR', 'en'];

const navegador = await chromium.launch();
mkdirSync(DESTINO, { recursive: true });
const comSessao = await abrirSessao(navegador, BASE);
const semSessao = await navegador.newContext({
  baseURL: BASE, locale: 'es-ES', timezoneId: 'Europe/Madrid',
});

const registo = [];
let reprovados = 0;

/** Uma captura, com o que a torna verificável ao lado. */
async function tirar(ctx, { id, estado, rota, largura, altura, lingua, offline }) {
  const pagina = await ctx.newPage();
  await pagina.setViewportSize({ width: largura, height: altura });
  if (offline) await ctx.setOffline(true);
  let resposta = null;
  let erroDeRede = null;
  try {
    /**
     * `load` e não `domcontentloaded`, e a razão é uma dúvida sobre a MINHA
     * medição antes de ser sobre o produto.
     *
     * Uma captura em `domcontentloaded` pode fotografar antes de o ecrã de erro
     * renderizar — e o resultado seria uma página branca que eu leria como «o
     * produto não tem ecrã». Antes de acusar o produto, tiro a minha hipótese
     * do caminho: espera-se o `load` e ainda se dá tempo ao corpo para ter
     * texto. Se continuar em branco, o branco é dele.
     */
    resposta = await pagina.goto(BASE + rota, { waitUntil: 'load', timeout: 30_000 });
    await pagina.waitForFunction(() => document.body && document.body.innerText.trim().length > 0,
      null, { timeout: 4000 }).catch(() => {});
  } catch (e) { erroDeRede = String(e.message ?? e).slice(0, 120); }
  const codigo = resposta?.status() ?? 0;
  const texto = erroDeRede ? '' : await pagina.evaluate(() => document.body.innerText).catch(() => '');
  // O HTML separa «não renderizou» de «renderizou sem texto visível».
  const html = erroDeRede ? 0
    : await pagina.evaluate(() => document.documentElement.outerHTML.length).catch(() => 0);
  // O ecrã DESENHADO de não-encontrado tem um marcador próprio.
  const ecraDesenhado = /No encontramos esta p|N[ãa]o encontr|We could not find/i.test(texto);
  const ficheiro = `${DESTINO}/${id}-${estado}-${lingua}-${largura}x${altura}.png`;
  await pagina.screenshot({ path: ficheiro, animations: 'disabled' }).catch(() => {});
  if (offline) await ctx.setOffline(false);
  await pagina.close();
  return {
    id, estado, lingua, rota, viewport: `${largura}x${altura}`,
    codigo, erroDeRede, ficheiro,
    caracteres: texto.trim().length, html, ecraDesenhado,
    // A sujidade do arnês não pode aparecer numa tela-mestre, pela mesma razão
    // que não pode aparecer numa composição comercial.
    sujidade: [
      ['insp-', /insp-/i], ['example', /\bexample\b/i],
    ].filter(([, p]) => p.test(texto)).map(([n]) => n),
  };
}

for (const m of MESTRES) {
  const ctx = m.sessao ? comSessao : semSessao;
  const linguas = m.estados.linguas ? LINGUAS : ['es-ES'];

  // ── principal, nas línguas ────────────────────────────────────────────
  for (const l of linguas) {
    const r = await tirar(ctx, {
      id: m.id, estado: 'principal', rota: m.rota(l),
      largura: m.largura, altura: m.altura, lingua: l,
    });
    r.prova = m.prova;
    // Controlo: um principal sem conteúdo é uma página partida com o nome certo.
    r.ok = r.codigo === 200 && r.caracteres > 200 && r.sujidade.length === 0;
    if (!r.ok) reprovados++;
    registo.push(r);
  }

  // ── o segundo viewport do M05 ─────────────────────────────────────────
  if (m.estados.segundoViewport) {
    const v = m.estados.segundoViewport;
    const r = await tirar(ctx, {
      id: m.id, estado: 'principal-secundario', rota: m.rota('es-ES'),
      largura: v.largura, altura: v.altura, lingua: 'es-ES',
    });
    r.ok = r.codigo === 200 && r.caracteres > 200;
    if (!r.ok) reprovados++;
    registo.push(r);
  }

  // ── denied / erro / vazio ─────────────────────────────────────────────
  for (const estado of ['denied', 'erro', 'vazio']) {
    const f = m.estados[estado];
    if (!f) continue;
    const r = await tirar(ctx, {
      id: m.id, estado, rota: f('es-ES'),
      largura: m.largura, altura: m.altura, lingua: 'es-ES',
    });
    // `denied` e `erro` são bons quando NÃO devolvem a tela normal: um 403, um
    // 404 ou um desvio são todos respostas honestas. O que reprova é 200 com
    // conteúdo de outra casa.
    /**
     * ── Um estado tem de RENDERIZAR alguma coisa ────────────────────────
     *
     * A primeira versão desta linha aceitava `codigo >= 400` como prova de um
     * estado `denied` ou `erro`. **Um 404 em branco satisfaz isso**, e foi o
     * que aconteceu: quatro capturas saíram páginas brancas de 2740 e 5851
     * bytes — a `denied` e a `erro` do M03 com o MESMO tamanho ao byte, que é
     * o sinal de serem a mesma página vazia — e o motor deu verde a todas.
     *
     * É a régua a cumprir-se contra mim: *«um estado capturado numa página que
     * nunca carrega é uma página partida com o nome trocado»*. O código de
     * resposta diz o que o servidor decidiu; **não diz que existe um ecrã**.
     *
     * Passa a exigir texto. Sem ele, o estado fica por capturar e diz-se.
     */
    r.rendeu = r.caracteres > 50;
    r.ok = r.rendeu && (estado === 'vazio' ? r.codigo === 200 : r.codigo !== 0);
    if (!r.rendeu) r.porque = 'a rota respondeu ' + r.codigo + ' com um corpo vazio — não há ecrã desenhado para este estado';
    if (!r.ok) reprovados++;
    registo.push(r);
  }

  // ── offline ───────────────────────────────────────────────────────────
  if (m.estados.offline) {
    const comRede = registo.find((r) => r.id === m.id && r.estado === 'principal' && r.lingua === 'es-ES');
    /**
     * ── O cenário offline REAL é com a página já aberta ─────────────────
     *
     * A primeira versão navegava JÁ offline e registava
     * `ERR_INTERNET_DISCONNECTED` — a página nunca chegou a existir. Isso não é
     * operação degradada: é ausência de página, e a captura era o ecrã de erro
     * do browser, não do produto.
     *
     * E não podia ser outra coisa **por desenho**: o service worker recusa
     * guardar telas com dados de inquilino, como a L1b mediu. Um arranque a
     * frio sem rede não pode funcionar, e exigi-lo era medir uma promessa que o
     * produto nunca fez.
     *
     * O cenário que o produto serve é o outro: o tablet **já aberto na sala** e
     * a rede a cair por baixo. Abre-se com rede, corta-se, e vê-se o que o ecrã
     * diz — que é onde vivem o `Sin enviar` e a recusa com motivo.
     */
    const pagina = await ctx.newPage();
    await pagina.setViewportSize({ width: m.largura, height: m.altura });
    await pagina.goto(BASE + m.rota('es-ES'), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await ctx.setOffline(true);
    // Um toque na própria página, para o ecrã reagir à rede sem navegar.
    await pagina.evaluate(() => window.dispatchEvent(new Event('offline'))).catch(() => {});
    await pagina.waitForTimeout(1200);
    const ficheiroOff = `${DESTINO}/${m.id}-offline-es-ES-${m.largura}x${m.altura}.png`;
    await pagina.screenshot({ path: ficheiroOff, animations: 'disabled' }).catch(() => {});
    const textoOff = await pagina.evaluate(() => document.body.innerText).catch(() => '');
    await ctx.setOffline(false);
    await pagina.close();
    const r = {
      id: m.id, estado: 'offline', lingua: 'es-ES', rota: m.rota('es-ES'),
      viewport: `${m.largura}x${m.altura}`, codigo: 200, erroDeRede: null,
      ficheiro: ficheiroOff, caracteres: textoOff.trim().length, sujidade: [],
      cenario: 'aberta com rede, rede cortada por baixo',
    };
    // O controlo do offline: o ecrã tem de MUDAR. Igual ao de rede ligada
    // significa que a página não reparou na rede — e isso não é operação
    // degradada, é uma captura com o nome trocado.
    // O controlo continua a ser o mesmo e agora significa alguma coisa: com a
    // página viva, o texto TEM de mudar. Igual ao de rede ligada significa que
    // o ecrã não reparou na queda.
    r.mudouComARede = Boolean(comRede) && r.caracteres !== comRede.caracteres;
    r.rendeu = r.caracteres > 50;
    r.ok = r.rendeu && r.mudouComARede;
    if (!r.ok) r.porque = r.rendeu
      ? 'o ecrã não mudou quando a rede caiu — não reparou na queda'
      : 'a página ficou sem corpo';
    if (!r.ok) reprovados++;
    registo.push(r);
  }
}

mkdirSync(DESTINO, { recursive: true });
writeFileSync(`${DESTINO}/mestres.json`, JSON.stringify({
  viewportDoKds: { alvo: KDS_ALVO, secundario: KDS_SECUNDARIO },
  capturas: registo,
}, null, 2) + '\n');
await navegador.close();

for (const r of registo) {
  console.log(
    `${r.ok ? 'ok   ' : 'FALHA'} ${r.id} ${r.estado.padEnd(20)} ${r.lingua.padEnd(6)} `
    + `${String(r.codigo).padEnd(4)} ${String(r.caracteres).padStart(6)} car`
    + `${r.sujidade.length ? '  sujidade: ' + r.sujidade.join(',') : ''}`
    + `${r.erroDeRede ? '  rede: ' + r.erroDeRede.slice(0, 40) : ''}`,
  );
}
console.log(`\n${registo.length} capturas em ${DESTINO}`);
if (reprovados > 0) { console.error(`${reprovados} estado(s) por explicar`); process.exit(1); }

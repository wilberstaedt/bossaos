import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DEMO, SLUG_DA_DEMO } from '../packages/db/prisma/demonstracao-comum.ts';
import { abrirSessao } from './sessao-da-demo.mjs';

/**
 * O MOTOR DE PROVA — fotografa o produto a correr sobre o inquilino de
 * demonstração.
 *
 * ── O que o §6.4 pede, e o que isto faz ───────────────────────────────────
 *
 *   «screenshots reais e determinísticos do build»   → corre contra o build de
 *      produção, com o cenário semeado por `semente-demonstracao.ts`, que tem
 *      identificadores fixos.
 *   «dados claramente artificiais»                   → «Bossa Demo», sem
 *      prefixo de arnês e sem endereço de correio de ninguém.
 *   «desktop, tablet, telemóvel e KDS coerentes»     → quatro larguras, a mesma
 *      casa, o mesmo serviço, o mesmo pedido em cima da mesa.
 *   «mostrar uma acção e o seu resultado»            → o pedido A128 aparece na
 *      sala como sessão aberta e na cozinha como as tarefas dele.
 *   «sem blur, perspectiva ou mockup minúsculo»      → captura recta, 1:1, sem
 *      moldura nem transformação.
 *
 * ── A sessão é REAL ───────────────────────────────────────────────────────
 *
 * Regista-se pela porta do produto e a pertença entra por SQL, que é o mesmo
 * que o arnês faz e pela mesma razão: convidar tem prova própria, e forjar um
 * cookie mede o cookie em vez do produto.
 *
 * **Sem `brand_id` no papel**, e isto está documentado no arnês em prosa: uma
 * concessão de MARCA não alcança um recurso da ORGANIZAÇÃO, e o dono leva 404
 * nas rotas da organização. Parece um defeito de produto e é semeadura errada.
 */

const PORTA = process.env.PORTA_DEMO ?? '3018';
const BASE = `http://127.0.0.1:${PORTA}`;
/**
 * Onde as composições ficam: **dentro da aplicação**, e não no `evidence/`.
 *
 * Elas deixaram de ser só prova e passaram a ser peças que a landing importa —
 * o `next/image` gera daqui as versões responsivas. Tê-las em dois sítios era
 * ter duas cópias de 380 KB no repositório e a certeza de que uma envelhecia.
 * O `evidence/` guarda o MANIFESTO, que é o que diz o que cada uma prova e que
 * passou o controlo de sujidade.
 */
const DESTINO = process.env.DESTINO_CAPTURAS ?? 'apps/web/src/demonstracao';

/**
 * ── UM CONJUNTO POR IDIOMA, e antes havia um só ───────────────────────────
 *
 * Este guião tinha `es-ES` cravado nas cinco rotas e no contexto do navegador, e
 * a landing importava cinco PNG fixos. Resultado medido a 07/09: `/pt-BR/product`
 * e `/es-ES/product` serviam **exactamente os mesmos ficheiros** — somas de
 * verificação iguais. Um visitante brasileiro lia «com o seu cardápio» em
 * português por cima de `Mesas en tiempo real` e `Caja`.
 *
 * Não era o idioma a não propagar: **não existia mecanismo para propagar**.
 *
 * A rota é agora função do idioma, e o contexto do navegador segue-a — o
 * `locale` decide a formatação de datas e números, e uma captura em português
 * com números espanhóis por baixo seria o mesmo defeito com outra cara.
 */
const IDIOMAS = ['es-ES', 'pt-BR', 'en'];
const MANIFESTO = 'docs/visual/rv100/2026-09-06_e953a87/evidence/demonstracao';

/**
 * As composições. Cada uma diz **porque existe** — uma captura sem razão é uma
 * captura que ninguém sabe substituir quando o produto mudar.
 */
const COMPOSICOES = [
  {
    nome: 'kds-cozinha',
    porque: 'A superfície que o §6.4 nomeia, e a que tem menos folga: o quadro '
      + 'da cozinha com o pedido A128 em preparação.',
    rota: (l) => `/${l}/kds/${DEMO.unidade}/${DEMO.estacaoQuente}`,
    largura: 1280, altura: 800, sessao: true,
  },
  {
    nome: 'sala-servico',
    porque: 'O outro lado da mesma acção: a mesa 07 aberta, de onde saiu o A128.',
    rota: (l) => `/${l}/app/bossa-demo/sala/floor`,
    largura: 1440, altura: 900, sessao: true,
  },
  {
    nome: 'catalogo',
    porque: 'A base única do §6.3.3 — o catálogo de onde a carta e a cozinha leem. '
      + 'É a LISTA de produtos e não o painel do catálogo: o painel mostra dois '
      + 'indicadores a dizer «Aún no medido», que é o produto a ser honesto sobre '
      + 'o que ainda não construiu — e honesto no produto é péssimo numa peça '
      + 'comercial, porque anuncia o que não existe. O controlo de sujidade '
      + 'apanhou-o e por isso a composição mudou de rota.',
    rota: (l) => `/${l}/app/bossa-demo/catalogo/produtos`,
    largura: 1440, altura: 900, sessao: true,
  },
  {
    nome: 'sala-tablet',
    porque: 'A largura de TABLET, que o §6.4 nomeia e que faltava — 834 px é o '
      + 'retrato do iPad, que é o aparelho que anda na mão de quem serve. '
      + 'Não se chama 1280 de tablet.',
    rota: (l) => `/${l}/app/bossa-demo/sala/floor`,
    largura: 834, altura: 1112, sessao: true,
  },
  /**
   * ── AS ESTREITAS, e a razão é aritmética ────────────────────────────────
   *
   * Quatro das cinco composições eram de secretária e apareciam no telemóvel a
   * um quarto do tamanho. Medido a 07/09 na terceira fotografia do dono do
   * produto: o catálogo e a sala têm 1440 px e são mostrados a **342**, escala
   * **0,24** — texto que no produto tem 14 px chega ao ecrã dele a **3,3 px**.
   * O KDS a 3,7 e o tablet a 5,7. Só a carta, capturada a 390, chegava legível
   * a 12,3.
   *
   * A página dizia «olha o produto» e mostrava-o num tamanho em que não se lê
   * nada. Encolher uma captura de secretária não é a versão móvel dela: é a
   * mesma imagem ilegível. Por isso o telemóvel recebe capturas TIRADAS
   * estreitas — o produto na largura em que ele é usado nessa mão.
   */
  {
    nome: 'catalogo-estreito',
    porque: 'O catálogo na largura do telemóvel: a 1440 encolhido para 342 o '
      + 'texto chegava a 3,3 px.',
    rota: (l) => `/${l}/app/bossa-demo/catalogo/produtos`,
    largura: 390, altura: 844, sessao: true,
  },
  {
    nome: 'sala-estreita',
    porque: 'A sala na largura do telemóvel, pela mesma razão do catálogo.',
    rota: (l) => `/${l}/app/bossa-demo/sala/floor`,
    largura: 390, altura: 844, sessao: true,
  },
  {
    nome: 'kds-estreito',
    porque: 'O KDS na largura do telemóvel: a 1280 encolhido chegava a 3,7 px.',
    rota: (l) => `/${l}/kds/${DEMO.unidade}/${DEMO.estacaoQuente}`,
    largura: 390, altura: 844, sessao: true,
  },
  {
    nome: 'carta-movel',
    porque: 'O que o cliente vê ao apontar para o código da mesa. Sem sessão, '
      + 'porque é assim que ela se usa.',
    rota: (l) => `/r/${SLUG_DA_DEMO}/${l}/menu`,
    largura: 390, altura: 844, sessao: false,
  },
];

/** Regista a conta pela porta real e dá-lhe pertença na demonstração. */
const navegador = await chromium.launch();
mkdirSync(DESTINO, { recursive: true });

/**
 * Uma sessão SÓ, e três contextos que herdam o estado dela.
 *
 * Abrir três sessões seria bater no limitador de abuso de propósito: ele
 * devolve 429 ao fim de três `sign-in` em dez segundos, e o `abrirSessao`
 * responde-lhe com esperas de onze segundos — três entradas podiam custar
 * minutos e falhar na mesma. O `storageState` leva os cookies para contextos
 * novos sem repetir a entrada, e cada um deles leva o seu `locale`.
 */
const sessaoBase = await abrirSessao(navegador, BASE);
const estado = await sessaoBase.storageState();
const contextos = {};
for (const l of IDIOMAS) {
  contextos[l] = {
    comSessao: await navegador.newContext({
      baseURL: BASE, locale: l, timezoneId: 'Europe/Madrid', storageState: estado,
    }),
    semSessao: await navegador.newContext({
      baseURL: BASE, locale: l, timezoneId: 'Europe/Madrid',
    }),
  };
}

const registo = [];
let reprovadas = 0;

for (const idioma of IDIOMAS) {
 mkdirSync(`${DESTINO}/${idioma}`, { recursive: true });
 for (const c of COMPOSICOES) {
  const rota = c.rota(idioma);
  const pagina = await (c.sessao ? contextos[idioma].comSessao : contextos[idioma].semSessao).newPage();
  await pagina.setViewportSize({ width: c.largura, height: c.altura });
  const resposta = await pagina.goto(BASE + rota, { waitUntil: 'networkidle' });
  const estado = resposta?.status() ?? 0;
  const caminhoFinal = new URL(pagina.url()).pathname;

  /**
   * O CONTROLO da captura, e é o que a torna prova em vez de fotografia.
   *
   * Três coisas que uma captura comercial não pode ter, e que a do arnês tinha
   * todas: o prefixo do arnês, um domínio de fantasia, e o rótulo de uma coisa
   * que o produto ainda não mede. Se alguma aparecer, a captura sai marcada e o
   * guião reprova — em vez de o ficheiro ir para a landing na mesma.
   */
  // `document` vive no NAVEGADOR, não aqui: o corpo do `evaluate` é serializado
  // e corre lá dentro. O eslint lê este ficheiro como Node e não tem como saber
  // disso — daí a declaração, que é mais honesta do que desligar a regra.
  /* global document */
  const texto = await pagina.evaluate(() => document.body.innerText);
  const sujidade = [
    ['insp-', /insp-/i],
    ['example', /\bexample\b|@[a-z0-9-]+\.example/i],
    ['por medir', /A[úu]n no medido|Ainda n[ãa]o medido|Not measured yet/i],
    ['sem configurar', /sin configurar|sem configurar|not configured/i],
  ].filter(([, padrao]) => padrao.test(texto)).map(([nome]) => nome);

  const desviou = caminhoFinal !== rota;
  const mau = estado >= 400 || desviou || sujidade.length > 0;
  if (mau) reprovadas++;

  const ficheiro = `${DESTINO}/${idioma}/${c.nome}-${c.largura}.png`;
  await pagina.screenshot({ path: ficheiro, animations: 'disabled' });
  registo.push({
    idioma, nome: c.nome, porque: c.porque, rota, largura: c.largura, altura: c.altura,
    estado, caminhoFinal, desviou, sujidade, ficheiro,
  });
  console.log(
    `${mau ? 'FALHA' : 'ok   '} ${idioma.padEnd(6)} ${c.nome.padEnd(14)} ${String(estado).padEnd(4)} `
    + `${sujidade.length ? 'sujidade: ' + sujidade.join(', ') : ''}${desviou ? ' DESVIOU para ' + caminhoFinal : ''}`,
  );
  await pagina.close();
 }
}

mkdirSync(MANIFESTO, { recursive: true });
writeFileSync(`${MANIFESTO}/composicoes.json`, JSON.stringify(registo, null, 2) + '\n');
await navegador.close();

if (reprovadas > 0) {
  console.error(`\n${reprovadas} composição(ões) reprovada(s) — não vão para a landing assim.`);
  process.exit(1);
}
console.log(`\n${registo.length} composições em ${DESTINO}`);

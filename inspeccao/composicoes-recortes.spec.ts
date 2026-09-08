import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import {
  CONTA_DA_DEMO, SENHA_DA_DEMO, DEMO, SLUG_DA_DEMO,
} from '../packages/db/prisma/demonstracao-comum.ts';

/**
 * Os RECORTES das três composições de paisagem.
 *
 * ── A aritmética que obriga a isto ────────────────────────────────────────
 *
 * O critério 6 da régua pede `escala × 14 px ≥ 11 px`, e a ranhura do bloco dos
 * papéis são **477 px**. Um mestre de 1440 mostrado a 477 é 0,33×, e põe um
 * texto de 14 px a **4,6 px**. Para lá chegar, o catálogo precisaria de uma
 * ranhura de 1131 px e o KDS de 1006 — e num telemóvel a ranhura útil são ~350,
 * o que os poria a 3,4 e 3,8. **Uma captura de 1440 nunca é legível num
 * telefone: é aritmética, não é defeito de CSS.**
 *
 * A cura é a FONTE, e a régua já a tinha escrita: o critério 6 diz **crops**
 * legíveis — *recortes*. O bloco mostrava ecrãs INTEIROS onde a régua pedia
 * recortes, e ninguém reparou porque o critério media a razão e não o que
 * estava dentro dela.
 *
 * ── Porquê 560 ───────────────────────────────────────────────────────────
 *
 * A banda é estreita e fecha dos dois lados. Abaixo de 477 o ficheiro seria
 * **ampliado** na ranhura, e ampliar não inventa detalhe. Acima de 607 o texto
 * cai abaixo dos 11 px. **560** fica no meio: nitidez `477/560 = 0,85` e
 * legibilidade `14 × 0,85 = 11,9`. É também a largura que os `fluxo-*-560.png`
 * já usavam neste repositório — não inventei número novo.
 *
 * ── Como se recorta ──────────────────────────────────────────────────────
 *
 * Com `clip` de 560 px de largura ancorado no canto do `main`, e **não** com um
 * `screenshot` de elemento: o elemento sai à largura que tiver, e o que aqui é
 * preciso é uma janela de largura FIXA sobre o ecrã real, com o texto ao
 * tamanho a que foi desenhado. É o mesmo que curou o papel 4 — mostrar ao
 * tamanho dele.
 *
 * A região de cada um é a que se reconhece: a lista de artigos do catálogo, a
 * coluna de comandas do KDS, e a comanda aberta no ponto de venda.
 */

const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;
const DESTINO = 'apps/web/src/demonstracao';

/**
 * As duas larguras abençoadas, e as duas formas de as tirar.
 *
 * **560 é recorte**: uma janela de largura fixa sobre o ecrã real, ancorada numa
 * região com sentido, com o texto ao tamanho a que foi desenhado.
 *
 * **390 é visor inteiro**: põe-se o navegador a 390×844 e fotografa-se o que se
 * vê. É como as `*-estreito-390` existentes foram feitas, e é o que faz sentido
 * — a 390 o produto tem um desenho próprio, e recortar 390 de um ecrã largo
 * mostraria um terço de um layout que ninguém vê assim.
 */
const RECORTE = { largura: 560, altura: 500 } as const;
const VISOR_ESTREITO = { width: 390, height: 844 } as const;

test('os três recortes, um por ecrã e por idioma', async ({ page }) => {
  test.setTimeout(900_000);

  // ── O inquilino é o da DEMONSTRAÇÃO, e isso não é detalhe ───────────────
  //
  // A primeira versão capturou do `marina-oropesa`, que é o inquilino do ARNÊS,
  // e o recorte do KDS saiu com `insp-Plato de cocina 1` e `insp-K000` — dados
  // de teste, perfeitamente legíveis, a caminho da landing. Os mestres que estão
  // no produto mostram o `bossa-demo`: «Croquetas caseras», «Pulpo a la
  // gallega», comanda A128. **Um recorte do inquilino errado é um recorte
  // impecável do sítio errado**, que é a mesma família do 404 que se fotografa
  // sem dar por isso.
  //
  // Entra-se com a conta de captura da própria semeadura. A porta do registo
  // está fechada desde 07/09, e por isso ela nasce na semeadura e não por
  // inscrição — quem a apaga é quem a cria.
  const entrada = await page.request.post('/api/auth/sign-in/email', {
    data: { email: CONTA_DA_DEMO, password: SENHA_DA_DEMO },
  });
  if (entrada.status() >= 400) {
    throw new Error(`a conta de captura não entrou: ${entrada.status()}`
      + ' — sem sessão, o que se fotografa é o ecrã de entrada');
  }

  const faltaram: string[] = [];

  for (const idioma of IDIOMAS) {
    // A âncora de cada um é o que dá sentido ao recorte, e não o canto da
    // página: a lista de artigos, a COLUNA de comandas, e o salão no tablet —
    // que é o que o `altTablet` já promete, «o aparelho que fica na mão de quem
    // serve». Trocar o salão por uma comanda tornaria o texto alternativo falso.
    // A âncora de cada um é o que dá sentido ao recorte, e não o canto da
    // página: a lista de artigos, a COLUNA de comandas, o salão, a carta.
    const regioes = [
      { nome: 'catalogo-recorte-560', modo: 'recorte', ancora: 'main',
        visor: { width: 1280, height: 900 },
        caminho: `/${idioma}/app/${SLUG_DA_DEMO}/catalogo` },
      { nome: 'kds-recorte-560', modo: 'recorte', ancora: '[data-teste="bilhete"]',
        visor: { width: 1280, height: 900 },
        caminho: `/${idioma}/kds/${DEMO.unidade}/${DEMO.estacaoQuente}` },
      // O salão em ecrã largo e o salão no tablet são composições diferentes do
      // MESMO ecrã, e é isso que o `altTablet` já diz: «o mesmo salão num
      // tablet». O que muda é o visor, não a página.
      { nome: 'sala-recorte-560', modo: 'recorte', ancora: 'h1',
        visor: { width: 1280, height: 900 },
        caminho: `/${idioma}/pos/${DEMO.unidade}` },
      { nome: 'sala-tablet-recorte-560', modo: 'recorte', ancora: 'h1',
        visor: { width: 834, height: 1112 },
        caminho: `/${idioma}/pos/${DEMO.unidade}` },
      { nome: 'carta-recorte-560', modo: 'recorte', ancora: 'h1',
        visor: { width: 1280, height: 900 },
        caminho: `/r/${SLUG_DA_DEMO}/${idioma}/menu` },
      // ── E a que faltava do lado estreito ────────────────────────────────
      { nome: 'tablet-estreito-390', modo: 'visor', ancora: 'h1',
        visor: VISOR_ESTREITO,
        caminho: `/${idioma}/pos/${DEMO.unidade}` },
      // ── E a do herói, que é a única que não cabia em nenhuma das duas ────
      //
      // A caixa do herói pinta 667 e a banda dela é [667, 849]. Nem 390 nem 560
      // lá cabem: 560 seria ampliado 1,19×. E encolher o herói para 477 esbarra
      // no §4.2, que escreve **captura de pelo menos 650 px** — enquanto deixar
      // o mestre de 1440 esbarra na outra frase do mesmo parágrafo, que manda o
      // utilizador ler os títulos sem ampliar a página. As duas frases juntas
      // não deixam escolha: **834**, que serve os 667 a 11,2 px.
      { nome: 'sala-heroi-834', modo: 'recorte', ancora: 'h1',
        largura: 834, altura: 520,
        visor: { width: 1280, height: 900 },
        caminho: `/${idioma}/pos/${DEMO.unidade}` },
    ] as const;

    mkdirSync(`${DESTINO}/${idioma}`, { recursive: true });

    for (const r of regioes) {
      await page.setViewportSize(r.visor);
      const resposta = await page.goto(r.caminho, { waitUntil: 'networkidle' });
      if (resposta && resposta.status() >= 400) {
        // Não aborta: RECOLHE. Um recorte que falta é pendência declarada, e
        // abortar aqui esconderia os que funcionam atrás do primeiro que não.
        // O que nunca acontece é capturar na mesma — uma composição tirada de
        // uma página de erro seria um recorte impecável do ecrã errado.
        faltaram.push(`${idioma}/${r.nome}: ${r.caminho} devolveu ${resposta.status()}`);
        continue;
      }
      // ── O estado não chega: tem de ser o ECRÃ CERTO ────────────────────
      //
      // `/app/bossa-demo/catalogo` devolveu **200** e serviu o selector de
      // organização — «Elige tu organización» — porque a conta de captura não
      // estava com âmbito naquele inquilino. O recorte saiu impecável, legível,
      // e do ecrã errado. Um `status < 400` não distingue as duas coisas.
      const endereco = new URL(page.url()).pathname;
      if (endereco !== r.caminho) {
        faltaram.push(`${idioma}/${r.nome}: pedi ${r.caminho} e estou em ${endereco}`
          + ' — foi desviado, e o recorte seria do ecrã errado');
        continue;
      }

      const principal = page.locator(r.ancora).first();
      const apareceu = await principal.waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true).catch(() => false);
      const caixa = apareceu ? await principal.boundingBox() : null;
      if (!caixa) {
        faltaram.push(`${idioma}/${r.nome}: a âncora \`${r.ancora}\` não apareceu`);
        continue;
      }

      // No modo `visor` não há recorte: o que se guarda é o que se vê a 390,
      // que é um desenho próprio do produto e não um terço de um ecrã largo.
      const largura = ('largura' in r ? r.largura : RECORTE.largura) as number;
      const altura = ('altura' in r ? r.altura : RECORTE.altura) as number;
      const janela = r.modo === 'recorte'
        ? { x: Math.round(caixa.x), y: Math.round(caixa.y), width: largura, height: altura }
        : undefined;
      await page.screenshot({
        path: `${DESTINO}/${idioma}/${r.nome}.png`,
        animations: 'disabled',
        ...(janela ? { clip: janela } : {}),
      });
      const medida = r.modo === 'recorte'
        ? `${largura}x${altura}`
        : `${r.visor.width}x${r.visor.height}`;
      console.log(`RECORTE ${idioma}/${r.nome}.png ${medida} de ${r.caminho}`);
    }
  }

  if (faltaram.length > 0) {
    throw new Error(`${faltaram.length} recorte(s) não foram tirados — e ficam`
      + ` por tirar, não por inventar:\n${faltaram.join('\n')}`);
  }
});

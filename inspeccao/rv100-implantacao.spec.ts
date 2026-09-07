import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * RV100 · a página de IMPLANTAÇÃO (MKT-006), medida antes e depois.
 *
 * ── O que esta página tem de provar, e que as outras já não provam ────────
 *
 * A home tem o bloco 9 com os quatro passos numa linha cada. A `/plans` tem o
 * bloco de implantação com o dinheiro por plano. Se esta página fosse um dos
 * dois outra vez, era o defeito que a `/product` tinha antes da L1e — repetir
 * a home chave por chave —, só que numa página onde chega quem **já decidiu** e
 * quer saber o que acontece na semana em que o sistema entra na casa.
 *
 * Por isso o que aqui se mede não é «tem passos». É o que ela dá a mais:
 *
 *   `seccoes`      quantas secções. A versão anterior tinha duas, e o `h1` e o
 *                  `h2` eram a MESMA chave (`comecamosTitulo`) — a página
 *                  dizia-se a si própria duas vezes antes de dizer o que faz.
 *   `blocosComPreco` / `blocosComIva`
 *                  o §6.5 diz «todos os valores» e a implantação é um deles.
 *                  Emparelha-se preço com nota; **não** se conta «IVA» na
 *                  página, que dá verde com uma nota solitária no rodapé.
 *   `ressalvas`    as três do §6.6, cada uma emparelhada com o TAMANHO DE LETRA
 *                  em que aparece. Ver o bloco abaixo.
 *   `imagens`      largura RENDERIZADA contra largura CAPTURADA. Ver abaixo.
 *   `passos`       os passos continuam lá — a `marketing.spec.ts` ancora o
 *                  MKT-006 em `.bo-mkt__passos` e essa âncora não se mexe.
 *
 * ── As ressalvas medem-se com o tamanho de letra ao lado, e é o ponto ─────
 *
 * O §6.6 obriga a três coisas: que nenhum modelo é compatível sem homologação,
 * que compra/garantia/rede/montagem/cabeamento **não** vão incluídos, e que não
 * se publica um kit fechado que não existe.
 *
 * Um contador de ocorrências dá **verde a uma nota de rodapé a 11 px**, que é
 * precisamente a forma de cumprir a letra e falhar a intenção: quem lê a página
 * e conclui que compra um pacote e fica servido descobre o contrário na semana
 * da instalação — e esta secção existe para evitar essa semana.
 *
 * Por isso cada ressalva devolve o **menor tamanho de letra** em que aparece e
 * se está num `<p>`/`<li>` dentro de uma secção. Corpo é corpo; letra pequena
 * é letra pequena, e o número di-lo.
 *
 * ── E as imagens medem-se pela escala, não pela presença ──────────────────
 *
 * O §6.4 diz «produto legível, não uma miniatura indecifrável». A L1e provou
 * que a forma de cumprir isso não é evitar a palavra «mockup»: é comparar a
 * largura a que a imagem é RENDERIZADA com a largura a que foi CAPTURADA. Lado
 * a lado dava 37%; empilhadas, 74% e 84%. O número é que decide a composição.
 */

const FASE = process.env.RV100_FASE ?? '';
const DESTINO = 'docs/visual/rv100/2026-09-06_e953a87/evidence/implantacao';

/** Um valor monetário no texto visível, em qualquer das três línguas. */
const MOEDA = /\d[\d.,]*\s*€|€\s*\d/;

/**
 * Os marcadores das três ressalvas do §6.6, escolhidos para atravessar as três
 * línguas com um padrão só e para **não** casar por acidente.
 *
 * `homologa`  — homologación · homologação · homologation. A mesma raiz nas
 *               três, o que é sorte e não desenho, mas é verificável.
 * `cablead|cabeament|cabling`
 *             — a última palavra da lista de «não incluídos». Escolhida por ser
 *               a menos reutilizável: «rede» e «montagem» aparecem noutros
 *               contextos comerciais; cabeamento não.
 * `kit cerrado|kit fechado|closed kit`
 *             — a frase inteira, e não `cerrad`, que casaria com «precio
 *               cerrado» dos adicionais e dava verde pela razão errada.
 */
const RESSALVAS = {
  homologacao: 'homologa',
  naoIncluido: 'cablead|cabeament|cabling',
  semKitFechado: 'kit cerrado|kit fechado|closed kit',
} as const;

async function medirImplantacao(pagina: import('@playwright/test').Page) {
  return pagina.evaluate(
    ({ padraoMoeda, ressalvas }) => {
      const moeda = new RegExp(padraoMoeda);
      const visivel = (el: Element) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        const s = getComputedStyle(el);
        return s.visibility !== 'hidden' && s.display !== 'none';
      };

      const seccoes = Array.from(document.querySelectorAll('main section')).filter(visivel);

      /**
       * O IVA junto do preço, emparelhado bloco a bloco.
       *
       * Para cada bloco mais INTERIOR que mostra um valor monetário, pergunta-se
       * se o mesmo bloco diz o imposto e a unidade de cobrança. Uma secção que
       * contém cartões é excluída, senão contava os preços dos filhos como seus
       * e um único aviso no fim tapava três cartões nus.
       */
      const blocosComPreco: string[] = [];
      let blocosComIva = 0;
      for (const bloco of Array.from(document.querySelectorAll<HTMLElement>('main article, main section'))) {
        if (!visivel(bloco)) continue;
        if (bloco.querySelector('article')) continue;
        const texto = (bloco.textContent ?? '').trim();
        if (!moeda.test(texto)) continue;
        blocosComPreco.push(texto.slice(0, 40));
        if (/IVA|VAT/i.test(texto) && /establecimiento|estabelecimento|venue/i.test(texto)) {
          blocosComIva++;
        }
      }

      /**
       * Cada ressalva, com o tamanho de letra em que aparece.
       *
       * `noCorpo` exige um `<p>` ou `<li>` dentro de uma `<section>` do `<main>`:
       * um `<small>` no rodapé, um `title=` ou um `aria-label` não são o corpo.
       * `menorFonte` é o menor tamanho computado entre os elementos que a
       * carregam — porque a pergunta não é «está lá», é «está lá a ler-se».
       */
      const corpo = Array.from(document.querySelectorAll<HTMLElement>('main section p, main section li'))
        .filter(visivel);
      const medirRessalva = (padrao: string) => {
        const re = new RegExp(padrao, 'i');
        const noCorpo = corpo.filter((e) => re.test(e.textContent ?? ''));
        const naPagina = re.test(document.querySelector('main')?.textContent ?? '');
        const tamanhos = noCorpo.map((e) => Math.round(parseFloat(getComputedStyle(e).fontSize)));
        return {
          naPagina,
          noCorpo: noCorpo.length > 0,
          ocorrenciasNoCorpo: noCorpo.length,
          menorFonte: tamanhos.length ? Math.min(...tamanhos) : null,
        };
      };
      const medidoPorRessalva: Record<string, ReturnType<typeof medirRessalva>> = {};
      for (const [nome, padrao] of Object.entries(ressalvas)) {
        medidoPorRessalva[nome] = medirRessalva(padrao);
      }

      /**
       * A escala de cada imagem: renderizada contra CAPTURADA.
       *
       * ── `naturalWidth` é o denominador ERRADO, e isto está medido ────────
       *
       * A primeira versão desta medição dividia pela `naturalWidth`. Deu 87%,
       * 88%, 94%, 102% e 91% nas cinco larguras — e o **102%** foi o que a
       * denunciou: nenhuma imagem se renderiza acima da escala a que foi
       * capturada.
       *
       * A causa é o `srcset`. Com `next/image`, a `naturalWidth` é a largura da
       * VARIANTE que o browser descarregou, que ele escolhe a partir do
       * `sizes` — por desenho, próxima da largura renderizada. Dividir uma pela
       * outra dá sempre ~100% e mede o **pipeline de entrega**, não a
       * legibilidade. O denominador andava com o numerador.
       *
       * O que o §6.4 pergunta é outra coisa: uma tela capturada a 834 px
       * mostrada a 300 px tem o texto a 36% do tamanho a que foi desenhado, e
       * isso não muda por o browser ter descarregado uma variante de 300.
       *
       * O denominador certo é a largura da CAPTURA, e ela está escrita no nome
       * do ficheiro por convenção — `sala-tablet-834.png`, `kds-cozinha-1280.png`
       * —, corroborada pelo `composicoes.json` que o motor de prova escreve. O
       * `next/image` mantém esse nome dentro do `url=` do endereço servido.
       *
       * Ficam as duas razões, porque respondem a perguntas diferentes:
       *   `escala`         renderizada ÷ largura da captura → legibilidade (§6.4)
       *   `escalaServida`  renderizada ÷ `naturalWidth`     → o `srcset` acertou
       */
      const larguraDaCaptura = (img: HTMLImageElement): number | null => {
        for (const candidato of [img.currentSrc, img.src, img.getAttribute('srcset') ?? '']) {
          if (!candidato) continue;
          let texto = candidato;
          try { texto = decodeURIComponent(candidato); } catch { /* fica o cru */ }
          // `<nome>-<largura>.<impressão>.<ext>` — a convenção das composições.
          //
          // A impressão do Next NÃO é hexadecimal: é base36 e leva `-` e `_`
          // (`carta-movel-390.2mmejxri9-fnb.png`). A primeira versão desta linha
          // exigia `[0-9a-f]{6,}` e não casava com nenhuma — e o sintoma foi
          // `capturada: null` em todas, ou seja NÃO MEDI. Que é o resultado
          // certo para um instrumento que não consegue ler: um zero teria dito
          // «escala zero» e passado por defeito da página.
          const m = texto.match(/-(\d{3,4})\.[A-Za-z0-9_-]{6,}\.(?:png|jpe?g|webp|avif)/);
          if (m) return Number(m[1]);
        }
        return null;
      };

      const imagens = Array.from(document.querySelectorAll('img'))
        .filter(visivel)
        .map((img) => {
          const renderizada = Math.round(img.getBoundingClientRect().width);
          const servida = img.naturalWidth || 0;
          const capturada = larguraDaCaptura(img);
          return {
            alt: (img.getAttribute('alt') ?? '').slice(0, 48),
            semAlt: !(img.getAttribute('alt') ?? '').trim(),
            renderizada,
            capturada,
            servida,
            // `null` e não um zero: uma imagem cujo nome não declara a largura da
            // captura é NÃO MEDI, e não «escala zero».
            escala: capturada ? Math.round((renderizada / capturada) * 100) : null,
            escalaServida: servida ? Math.round((renderizada / servida) * 100) : null,
          };
        });

      return {
        seccoes: seccoes.length,
        titulos: Array.from(document.querySelectorAll('main h1, main h2'))
          .filter(visivel).map((e) => (e.textContent ?? '').trim()),
        passos: document.querySelectorAll('.bo-mkt__passos .bo-mkt__passo').length,
        blocosComPreco: blocosComPreco.length,
        blocosComIva,
        ressalvas: medidoPorRessalva,
        imagens,
        alturaRolavel: document.documentElement.scrollHeight,
      };
    },
    { padraoMoeda: MOEDA.source, ressalvas: RESSALVAS as unknown as Record<string, string> },
  );
}

test.describe('RV100 · implantação e equipamentos', () => {
  test.skip(!FASE, 'define RV100_FASE=antes|depois para gravar evidência');

  test('a página de implantação, nas cinco larguras e nas três línguas', async ({ page }) => {
    test.setTimeout(180_000);
    const recolha: unknown[] = [];

    for (const idioma of ['es-ES', 'pt-BR', 'en'] as const) {
      for (const largura of LARGURAS) {
        await page.setViewportSize({ width: largura, height: 900 });
        const resposta = await page.goto(`/${idioma}/getting-started`, { waitUntil: 'networkidle' });
        expect(resposta?.status()).toBeLessThan(400);

        const medida = await medirImplantacao(page);

        // Controlo positivo: sem secções isto não é a página por medir, é uma
        // página que não carregou — e um zero em tudo o resto seria lido como
        // defeito quando é ausência de população.
        expect(medida.seccoes, `${idioma} a ${largura}px não tem secções`).toBeGreaterThan(0);

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

    mkdirSync(DESTINO, { recursive: true });
    writeFileSync(`${DESTINO}/${FASE}-implantacao.json`, JSON.stringify(recolha, null, 2) + '\n');
  });
});

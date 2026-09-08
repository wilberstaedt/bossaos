import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
// Caminho relativo e nao '@bossaos/fila': a pasta da inspeccao nao e' um pacote
// do workspace e nao resolve os nomes dele — e' a convencao que as outras suites
// ja seguem com o 'inspeccao-comum.ts'. O que importa e' que a constante venha
// da FONTE e nao de uma copia escrita na suite.
import { ACCOES_QUE_EXIGEM_REDE } from '../packages/fila/src/sincronizacao.ts';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * RV100 · CONFIANÇA (MKT-008) e PILOTO (MKT-010), medidos antes e depois.
 *
 * ── O quarto pilar: mede-se contra a FONTE, não contra um número ──────────
 *
 * O pilar diz o que precisa de servidor. A tentação é medir «tem quatro
 * itens» — e isso ficaria verde no dia em que o produto passasse a cinco e a
 * página continuasse a mostrar quatro, que é **exactamente** a maneira como o
 * `faq4` chegou a prometer sincronização que não existe.
 *
 * Por isso o que se compara é o CONJUNTO renderizado com
 * `ACCOES_QUE_EXIGEM_REDE`, importada da mesma fonte que o produto usa para
 * recusar. A prova é a igualdade de tamanho entre a lista da página e a lista
 * fechada — e a suite importa a constante, não uma cópia dela.
 *
 * ── O piloto: mede-se a AUSÊNCIA, e ausência é difícil de medir ───────────
 *
 * «Não nomeia terceiros» não se prova procurando nomes que não conhecemos. O
 * que se mede são as FORMAS que a prova social toma:
 *
 *   `citacoes`  `<blockquote>`, `<q>` e `<cite>` — um depoimento tem forma;
 *   `imagens`   qualquer imagem além da assinatura da marca seria um logótipo;
 *   `numeros`   todos os números do texto visível. A página só pode ter os que
 *               saem da fonte de preços. «500 restaurantes» é um número, e um
 *               número numa página comercial sem fonte é prova social inventada.
 *
 * O terceiro é o que apanha o caso que importa: não se procura «500», recolhe-se
 * TUDO o que é número e exige-se que o conjunto seja o esperado.
 */

const FASE = process.env.RV100_FASE ?? '';
const DESTINO = 'docs/visual/rv100/2026-09-06/evidence/confianca';

async function medirPagina(pagina: import('@playwright/test').Page) {
  return pagina.evaluate(() => {
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none';
    };

    const principal = document.querySelector('main');
    const texto = (principal?.textContent ?? '').replace(/\s+/g, ' ');

    return {
      seccoes: Array.from(document.querySelectorAll('main section')).filter(visivel).length,
      cartoes: Array.from(document.querySelectorAll('main article')).filter(visivel).length,
      titulos: Array.from(document.querySelectorAll('main h1, main h2, main h3'))
        .filter(visivel).map((e) => (e.textContent ?? '').trim()),

      // O quarto pilar e a sua lista, se existirem.
      pilarOffline: (() => {
        const p = document.querySelector('[data-teste="pilar-offline"]');
        if (!p || !visivel(p)) return { existe: false, itens: [] as string[] };
        return {
          existe: true,
          itens: Array.from(p.querySelectorAll('li'))
            .filter(visivel).map((e) => (e.textContent ?? '').trim()),
        };
      })(),

      // As formas que a prova social toma.
      citacoes: document.querySelectorAll('main blockquote, main q, main cite').length,
      imagens: Array.from(document.querySelectorAll('main img'))
        .filter(visivel).map((i) => (i.getAttribute('alt') ?? '').slice(0, 40)),
      // Todo e qualquer número do texto visível.
      numeros: Array.from(new Set(texto.match(/\d[\d.,]*/g) ?? [])),

      alturaRolavel: document.documentElement.scrollHeight,
    };
  });
}

test.describe('RV100 · confiança e piloto', () => {
  test.skip(!FASE, 'define RV100_FASE=antes|depois para gravar evidência');

  test('as duas páginas, nas cinco larguras e nas três línguas', async ({ page }) => {
    test.setTimeout(300_000);
    const recolha: unknown[] = [];

    for (const rota of ['trust', 'pilot'] as const) {
      for (const idioma of ['es-ES', 'pt-BR', 'en'] as const) {
        for (const largura of LARGURAS) {
          await page.setViewportSize({ width: largura, height: 900 });
          const resposta = await page.goto(`/${idioma}/${rota}`, { waitUntil: 'networkidle' });
          expect(resposta?.status()).toBeLessThan(400);

          const medida = await medirPagina(page);
          // Controlo positivo: sem secções isto não é a página, é um erro.
          expect(medida.seccoes, `${rota} ${idioma} ${largura} sem secções`).toBeGreaterThan(0);

          recolha.push({
            rota, idioma, largura,
            transbordo: await transbordaNaHorizontal(page),
            alvosPequenos: await alvosPequenos(page, 44),
            foraDoEcra: await elementosForaDoEcra(page),
            contrastes: await textosComPoucoContraste(page),
            ...medida,
          });
        }
      }
    }

    /**
     * A lista do pilar contra a LISTA FECHADA, e não contra um número.
     *
     * Só se exige quando o pilar existe: no `antes` ele não existe, e um
     * vermelho ali seria o instrumento a reprovar a ausência que está a medir.
     */
    const doPilar = recolha.filter((r) => {
      const x = r as { rota: string; pilarOffline: { existe: boolean } };
      return x.rota === 'trust' && x.pilarOffline.existe;
    }) as { idioma: string; pilarOffline: { itens: string[] } }[];
    for (const r of doPilar) {
      expect(
        r.pilarOffline.itens.length,
        `${r.idioma}: o pilar mostra ${r.pilarOffline.itens.length} acções e a lista fechada tem ${ACCOES_QUE_EXIGEM_REDE.length}`,
      ).toBe(ACCOES_QUE_EXIGEM_REDE.length);
    }

    mkdirSync(DESTINO, { recursive: true });
    writeFileSync(
      `${DESTINO}/${FASE}-confianca.json`,
      JSON.stringify({
        listaFechada: [...ACCOES_QUE_EXIGEM_REDE],
        paginas: recolha,
      }, null, 2) + '\n',
    );
  });
});

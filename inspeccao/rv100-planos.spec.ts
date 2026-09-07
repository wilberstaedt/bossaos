import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * RV100 · a página de PLANOS (MKT-005), medida antes e depois.
 *
 * ── O que esta página tem de provar, e que a home já não prova ────────────
 *
 * A home ganhou um bloco de planos com os doze valores. O risco desta página é
 * ser esse bloco outra vez com mais espaço — que é o defeito que a `/product`
 * tem hoje, a repetir os três cartões da home chave por chave. Por isso o que se
 * mede aqui não é «tem preços», é **o que ela dá a mais**:
 *
 *   `familias`   as três famílias do §6.5 na comparação: catálogo/site,
 *                operação e gestão avançada. Zero = a comparação não existe.
 *   `linhas`     linhas de capacidade na tabela.
 *   `precos`     ocorrências de valor monetário no texto visível.
 *   `ivaJunto`   há a nota de IVA/estabelecimento no mesmo bloco onde há preço?
 *                O §6.5 obriga, e uma nota no rodapé da página não é «junto».
 *   `tabelaRola` a tabela rola DENTRO da caixa e a página NÃO rola.
 *
 * ── A tabela é o caso que se mede nos dois sentidos ───────────────────────
 *
 * A régua reprova a PÁGINA a rolar na horizontal. Uma tabela com deslocamento
 * próprio não é isso: comprimir quatro colunas a 360 px tira-lhe a única coisa
 * que ela faz. Mede-se que a página não rola **e** que a caixa rola — as duas,
 * porque só a primeira passaria também com uma tabela esmagada ou vazia.
 */

const FASE = process.env.RV100_FASE ?? '';
const DESTINO = 'docs/visual/rv100/2026-09-06_e953a87/evidence/planos';

/** Um valor monetário no texto visível, em qualquer das três línguas. */
const MOEDA = /\d[\d.,]*\s*€|€\s*\d/;

async function medirPlanos(pagina: import('@playwright/test').Page) {
  return pagina.evaluate((padraoMoeda) => {
    const moeda = new RegExp(padraoMoeda);
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none';
    };

    const seccoes = Array.from(document.querySelectorAll('main section'));
    const caixa = document.querySelector('.bo-mkt__tabela-envolve');
    const tabela = caixa?.querySelector('table') ?? null;

    // As famílias: cabeçalhos de grupo dentro da tabela.
    const familias = Array.from(document.querySelectorAll('.bo-mkt__familia'))
      .filter(visivel).map((e) => (e.textContent ?? '').trim());

    // Linhas de capacidade: `th[scope=row]` dentro do corpo da tabela.
    const linhas = tabela
      ? Array.from(tabela.querySelectorAll('tbody th[scope="row"]')).length : 0;

    // Valores monetários no texto visível da página.
    const textos = Array.from(document.querySelectorAll<HTMLElement>('main p, main td, main th, main li'))
      .filter(visivel).map((e) => (e.textContent ?? '').trim());
    const precos = textos.filter((t) => moeda.test(t)).length;

    /**
     * O IVA tem de estar JUNTO do preço, e é isso que se mede.
     *
     * Para cada bloco que mostra um valor monetário, pergunta-se se o MESMO
     * bloco — o cartão, ou a secção quando não há cartão — também diz o imposto
     * e a unidade de cobrança. Uma nota solitária no fim da página passaria uma
     * contagem global e continuaria a deixar um preço sem contexto no ecrã.
     */
    const blocosComPreco: string[] = [];
    let blocosComIva = 0;
    for (const bloco of Array.from(document.querySelectorAll<HTMLElement>('main article, main section'))) {
      if (!visivel(bloco)) continue;
      // Só o bloco mais interior: uma secção que contém cartões contaria os
      // preços dos filhos como seus.
      if (bloco.querySelector('article')) continue;
      const texto = (bloco.textContent ?? '').trim();
      if (!moeda.test(texto)) continue;
      blocosComPreco.push(texto.slice(0, 40));
      // «IVA»/«VAT» e a unidade de cobrança, nas três línguas.
      if (/IVA|VAT/i.test(texto) && /establecimiento|estabelecimento|venue/i.test(texto)) {
        blocosComIva++;
      }
    }

    return {
      seccoes: seccoes.length,
      familias,
      linhas,
      precos,
      blocosComPreco: blocosComPreco.length,
      blocosComIva,
      tabela: caixa && tabela ? {
        existe: true,
        rolaDentro: caixa.scrollWidth > caixa.clientWidth,
        larguraDaCaixa: Math.round(caixa.clientWidth),
        larguraDaTabela: Math.round(caixa.scrollWidth),
      } : { existe: false, rolaDentro: false, larguraDaCaixa: 0, larguraDaTabela: 0 },
      alturaRolavel: document.documentElement.scrollHeight,
    };
  }, MOEDA.source);
}

test.describe('RV100 · planos comerciais', () => {
  test.skip(!FASE, 'define RV100_FASE=antes|depois para gravar evidência');

  test('a página de planos, nas cinco larguras e nas três línguas', async ({ page }) => {
    test.setTimeout(180_000);
    const recolha: unknown[] = [];

    for (const idioma of ['es-ES', 'pt-BR', 'en'] as const) {
      for (const largura of LARGURAS) {
        await page.setViewportSize({ width: largura, height: 900 });
        const resposta = await page.goto(`/${idioma}/plans`, { waitUntil: 'networkidle' });
        expect(resposta?.status()).toBeLessThan(400);

        const medida = await medirPlanos(page);

        // Controlo positivo: sem secções isto não é a página por medir, é uma
        // página que não carregou.
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
    writeFileSync(`${DESTINO}/${FASE}-planos.json`, JSON.stringify(recolha, null, 2) + '\n');
  });
});

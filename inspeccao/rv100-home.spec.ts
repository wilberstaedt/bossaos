import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  LARGURAS, alvosPequenos, elementosForaDoEcra, textosComPoucoContraste, transbordaNaHorizontal,
} from './ajudas.ts';

/**
 * RV100 · a HOME (MKT-001/002/003), medida antes e depois.
 *
 * ── A métrica do herói teve de mudar, e a razão é medível ─────────────────
 *
 * A régua deste lote é «o `x` onde o conteúdo do herói acaba»: a linha de base
 * deu **728 de 1440 em seis das oito páginas**, e se 728 voltar não houve
 * reconstrução. Concordo com a régua. **Só que na home ela não mede nada**, e
 * isso não é opinião:
 *
 * O `rv100-baseline.spec.ts` calcula o máximo `right` de **todos** os
 * descendentes do herói. O `.bo-mkt__chamada` é um `<p>` com `display: flex` —
 * um bloco, portanto largura toda do contentor — e por isso o número da home já
 * era **1256** antes de eu tocar em coisa nenhuma. É o número «por explicar» que
 * o `05_MARKETING_AND_CONVERSION.md` registou; a explicação é esta.
 *
 * Um herói vazio à direita e um herói cheio dão **o mesmo 1256**. Se eu
 * entregasse esse número como prova, entregava um verde sobre uma métrica cega.
 *
 * Por isso mede-se aqui o que a régua quer mesmo dizer:
 *
 *   `heroFolhaAteX`   máximo `right` das FOLHAS com conteúdo — elementos sem
 *                     filhos-elemento e com texto, mais as mídias. Um invólucro
 *                     esticado deixa de contar; o parágrafo de 68ch conta, e é
 *                     ele que dá os 728.
 *   `heroDireita`     existe conteúdo depois do MEIO do contentor? É a pergunta
 *                     literal do §10, «metade do herói vazia por falta de mídia
 *                     ou composição».
 *   `heroMedia`       quantas imagens/vídeos há dentro do herói.
 *
 * As três juntas distinguem os dois estados que o número antigo confundia.
 *
 * ── E o resto do §6.3 ─────────────────────────────────────────────────────
 *
 * Catorze blocos, e têm de ser **secções da MKT-001** e não rotas novas, senão
 * os 396 IDs do §12.5 deixam de ser 396. Conta-se as secções e verifica-se que
 * o `?section=` continua a isolar o bloco pedido — é dele que dependem o MKT-002
 * e o MKT-003, e três IDs a partilhar uma medição são duas medições a fingir.
 */

const FASE = process.env.RV100_FASE ?? '';
const DESTINO = 'docs/visual/rv100/2026-09-06_e953a87/evidence/home';

/** Onde a métrica do herói se mede, e o que ela ignora. */
async function medirHome(pagina: import('@playwright/test').Page) {
  return pagina.evaluate(() => {
    const arred = (n: number) => Math.round(n * 10) / 10;
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none';
    };

    const principal = document.querySelector('main');
    const seccoes = Array.from(document.querySelectorAll('main section'));
    const heroi = document.querySelector('.bo-mkt__heroi');

    // O contentor de referência: é contra a largura DELE que «metade vazia»
    // quer dizer alguma coisa. O viewport inclui margens que ninguém preenche.
    const cx = principal?.getBoundingClientRect();
    const meio = cx ? cx.left + cx.width / 2 : 0;

    const MIDIA = 'img, picture, video, canvas, svg';

    const folhasCom = (raiz: Element | null) => {
      if (!raiz) return [] as HTMLElement[];
      return Array.from(raiz.querySelectorAll<HTMLElement>('*')).filter((el) => {
        if (!visivel(el)) return false;
        if (el.matches(MIDIA)) return true;
        // Folha: sem filhos-elemento. Um invólucro esticado não conta como
        // conteúdo — é exactamente o `.bo-mkt__chamada` que cegava a métrica.
        if (el.children.length > 0) return false;
        return (el.textContent ?? '').trim().length > 0;
      });
    };

    const folhasDoHeroi = folhasCom(heroi);
    const midiaDoHeroi = heroi ? Array.from(heroi.querySelectorAll(MIDIA)).filter(visivel) : [];

    let heroFolhaAteX = 0;
    let heroDireita = false;
    for (const el of folhasDoHeroi) {
      const r = el.getBoundingClientRect();
      heroFolhaAteX = Math.max(heroFolhaAteX, arred(r.right));
      if (r.left > meio + 1) heroDireita = true;
    }

    // O ritmo vertical: o §4.4 pede 80-128 px de respiro entre secções no
    // desktop, e o D-4 mostrou que dois `--bo-espaco-gigante` adjacentes dão 128
    // sem token novo. Mede-se o que está pintado, não o que o CSS diz.
    const respiros: number[] = [];
    for (let i = 1; i < seccoes.length; i++) {
      const a = seccoes[i - 1]!.getBoundingClientRect();
      const b = seccoes[i]!.getBoundingClientRect();
      const anterior = getComputedStyle(seccoes[i - 1]!);
      const actual = getComputedStyle(seccoes[i]!);
      respiros.push(arred(
        (b.top - a.bottom)
        + parseFloat(anterior.paddingBottom || '0')
        + parseFloat(actual.paddingTop || '0'),
      ));
    }

    return {
      seccoes: seccoes.length,
      seccoesComId: seccoes.map((s) => s.id || null),
      midiaNaPagina: Array.from(document.querySelectorAll(MIDIA)).filter(visivel).length,
      alturaRolavel: document.documentElement.scrollHeight,
      rola: document.documentElement.scrollHeight > window.innerHeight + 4,
      heroi: heroi ? {
        caixa: (() => { const r = heroi.getBoundingClientRect(); return { largura: arred(r.width), altura: arred(r.height) }; })(),
        folhaAteX: heroFolhaAteX,
        ocupaDireita: heroDireita,
        media: midiaDoHeroi.length,
        // O que o instrumento ANTIGO teria dito, lado a lado — para se poder ver
        // que as duas métricas discordam e porquê, em vez de eu afirmar que sim.
        metricaAntiga: (() => {
          let m = 0;
          for (const f of Array.from(heroi.querySelectorAll('*'))) {
            const r = (f as HTMLElement).getBoundingClientRect();
            if (r.width > 0 && r.height > 0) m = Math.max(m, Math.round(r.right));
          }
          return m;
        })(),
      } : null,
      contentorMeio: arred(meio),
      respiros,
    };
  });
}

test.describe('RV100 · home comercial', () => {
  test.skip(!FASE, 'define RV100_FASE=antes|depois para gravar evidência');

  test('a home, nas cinco larguras e nas três línguas', async ({ page }) => {
    test.setTimeout(180_000);
    const recolha: unknown[] = [];

    for (const idioma of ['es-ES', 'pt-BR', 'en'] as const) {
      for (const largura of LARGURAS) {
        await page.setViewportSize({ width: largura, height: 900 });
        const resposta = await page.goto(`/${idioma}`, { waitUntil: 'networkidle' });
        expect(resposta?.status(), `/${idioma} respondeu ${resposta?.status()}`).toBeLessThan(400);

        const medida = await medirHome(page);

        // Controlo positivo: uma home sem secções não é uma home por medir, é
        // uma página que não carregou.
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
    writeFileSync(`${DESTINO}/${FASE}-home.json`, JSON.stringify(recolha, null, 2) + '\n');
  });

  /**
   * O `?section=` — MEDIDO, e não presumido.
   *
   * O código da home diz, em comentário, que o parâmetro «esconde tudo o resto»
   * e que é assim que o MKT-002 e o MKT-003 se medem um a um. **Não é o que
   * acontece na aplicação construída.** Medido a 07/09, e o md5 diz tudo:
   *
   *   /es-ES                  e703360c9ffb6d5947b32a13be389b7d
   *   /es-ES?section=product  e703360c9ffb6d5947b32a13be389b7d
   *   /es-ES?section=plans    e703360c9ffb6d5947b32a13be389b7d
   *
   * HTML **byte a byte igual** nos três endereços. A causa é uma linha:
   * `export const dynamic = 'force-static'`. Numa página forçada a estática o
   * Next entrega `searchParams` vazio na pré-renderização, o `section` é sempre
   * `undefined`, e os três ramos do `mostrar()` dão sempre verdadeiro.
   *
   * Consequência, e é a que interessa: **MKT-001, 002 e 003 não são três
   * medições.** São a mesma página medida três vezes. É literalmente o defeito
   * que o comentário da `marketing.spec.ts` diz que este mecanismo existe para
   * impedir — «sem isso, três IDs partilhariam uma medição e duas delas não
   * mediam nada».
   *
   * Por isso este caso **regista** em vez de afirmar. Um instrumento não deve
   * exigir uma propriedade que eu estou a pôr em causa: exige só o controlo
   * positivo — que o marcador de cada ID existe e está visível — e escreve o
   * resto para se poder discutir com os números à frente.
   */
  test('o que o ?section faz mesmo, medido nos três endereços', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const observado: Record<string, unknown> = {};

    for (const [nome, url, marcador] of [
      ['sem-parametro', '/es-ES', '.bo-mkt__heroi h1'],
      ['product', '/es-ES?section=product', '#t-product'],
      ['plans', '/es-ES?section=plans', '#t-plans'],
    ] as const) {
      await page.goto(url, { waitUntil: 'networkidle' });
      // Controlo positivo: o marcador daquele ID tem de estar mesmo no ecrã.
      // Sem isto, «três secções» tanto podia ser a página certa como um erro.
      await expect(page.locator(marcador).first()).toBeVisible();
      const m = await medirHome(page);
      observado[nome] = {
        url,
        seccoes: m.seccoes,
        ids: m.seccoesComId,
        // A impressão do corpo: dois endereços com a mesma impressão servem a
        // mesma página, e é isso que se quer poder afirmar ou negar.
        impressao: await page.evaluate(() => document.body.innerHTML.length),
      };
    }

    const s = observado as Record<string, { seccoes: number; impressao: number }>;
    observado['isola'] =
      s['product']!.seccoes < s['sem-parametro']!.seccoes
      && s['plans']!.seccoes < s['sem-parametro']!.seccoes;
    observado['servem_a_mesma_pagina'] =
      s['product']!.impressao === s['sem-parametro']!.impressao
      && s['plans']!.impressao === s['sem-parametro']!.impressao;

    mkdirSync(DESTINO, { recursive: true });
    writeFileSync(`${DESTINO}/${FASE}-seccoes.json`, JSON.stringify(observado, null, 2) + '\n');
  });
});

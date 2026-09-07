import { expect, test } from '@playwright/test';
import { resolverAlvos } from './alvos.ts';
import { classificar, endereçoDe } from './alcance.ts';

/**
 * A régua dos 14 px, medida sobre a POPULAÇÃO e não sobre uma amostra.
 *
 * ── O erro que esta prova existe para não repetir ─────────────────────────
 *
 * Recebi duas classes para corrigir e generalizei o CRITÉRIO — em vez de medir
 * as duas, medi todo o texto de corpo da página. Isso foi certo. Mas medi-o em
 * TRÊS ROTAS e escrevi «0», e são 382 telas: o predicado ficou bom e deu
 * confiança a um número que era de uma amostra.
 *
 * **Generalizar o critério e amostrar a população são movimentos opostos, e
 * fazer o primeiro bem esconde que se fez o segundo.** Por isso aqui a
 * população vem do mapa de alcance — todos os endereços que se conseguem
 * visitar — e o número que sai traz dentro da frase sobre o que foi medido.
 */

const MINIMO = 14;

test.describe('Tipografia: nada de corpo abaixo de 14 px', () => {
  test('medido em todos os endereços que abrem', async ({ page }) => {
    test.setTimeout(900_000);
    const alvos = await resolverAlvos();
    const enderecos = [...new Set(
      classificar(alvos).filter((c) => c.endereco !== null && c.falta.length === 0)
        .map((c) => c.endereco as string),
    )].sort();
    expect(enderecos.length, 'POPULACAO-ZERO: o mapa de alcance não deu endereços')
      .toBeGreaterThan(0);

    await page.setViewportSize({ width: 1440, height: 900 });
    const maus: string[] = [];
    let visitados = 0;

    for (const e of enderecos) {
      const url = endereçoDe(e, alvos, 'es-ES');
      if (url === null) continue;
      // Um ponto de API não é uma tela: o `qr.svg` devolve um ficheiro e o
      // `page.goto` rebenta com «Download is starting». Já me apanhou na guarda
      // de alcance, e a lição é a mesma — o que se navega são páginas.
      if (url.startsWith('/api/')) continue;
      const r = await page.goto(url, { waitUntil: 'domcontentloaded' });
      if (r?.status() !== 200) continue;
      visitados += 1;
      const achados = await page.evaluate((min) => Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .filter((el) => {
          if (el.children.length > 0) return false;
          // Um caractere já é texto. O limite de 4 estava aqui para saltar
          // glifos, e o glifo distingue-se por `aria-hidden` — que é o que a
          // linha abaixo faz. Com o limite, a lotação de uma mesa («4») era
          // invisível para a medição, e o controlo negativo não acendia: o
          // instrumento a decidir o que existe.
          if ((el.textContent ?? '').trim().length < 1) return false;
          // O que não se lê não conta: `aria-hidden` é glifo, não texto.
          if (el.closest('[aria-hidden="true"]')) return false;
          const c = el.getBoundingClientRect();
          return c.width > 1 && c.height > 1;
        })
        .map((el) => ({ t: (el.textContent ?? '').trim().slice(0, 24), px: parseFloat(getComputedStyle(el).fontSize) }))
        .filter((x) => x.px > 0 && x.px < min), MINIMO);
      for (const a of achados) maus.push(`${e} · «${a.t}» ${a.px}px`);
    }

    console.log(`AMBITO enderecos=${enderecos.length} visitados=${visitados} abaixoDe${MINIMO}=${maus.length}`);
    expect(visitados, `POPULACAO-ZERO: nenhum dos ${enderecos.length} endereços abriu`)
      .toBeGreaterThan(0);
    expect(maus, `texto de corpo abaixo de ${MINIMO}px, em ${visitados} endereços:\n${maus.slice(0, 12).join('\n')}`)
      .toEqual([]);
  });
});

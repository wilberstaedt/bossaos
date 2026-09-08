import { test, expect } from '@playwright/test';
import { PAGINAS, julgar, medirComposicoes } from './medir-ranhuras.ts';

/**
 * A matriz das ranhuras nos visores ESTREITOS — a metade que a de 1280 declarava
 * não medir.
 *
 * Era só 390, e 390 sozinho não é a matriz: eu próprio o declarei ao fechá-lo.
 * Agora são **quatro** — 360, 375, 390 e 430 — no mesmo ficheiro, porque duas
 * matrizes de telemóvel lado a lado acabariam por discordar uma da outra.
 *
 * ── A expectativa vem da fonte, e é de DOIS lados ────────────────────────
 *
 * `RANHURAS = { estreita: 380, larga: 477 }`, e abaixo de 1024 **a larga cai na
 * estreita de propósito**. Portanto a 390 os treze sítios colapsam para 380,
 * cuja banda é `[380, 484]`. Todos os ecrãs têm uma variante de 390.
 *
 * Se estiver tudo certo: `nitidez ≤ 1,0` e `px_efectivos ≈ 13,6` (14 × 380/390)
 * nos treze, e zero por decidir.
 *
 * **É isso que faz dela um teste de dois lados.** Sair 13,6 confirma o desenho.
 * Sair abaixo de 11, ou nitidez acima de 1, aponta a uma de duas coisas
 * concretas: **ou a caixa real não é 380, ou o navegador não escolheu o 390** —
 * que é exactamente a mentira que a ranhura declarada já pregou hoje, quando
 * dizia 390 e a caixa pintava 477.
 *
 * ── O que isto NÃO mede, declarado ───────────────────────────────────────
 *
 * **Quatro visores continuam a não ser todos os telefones.** 320, 412 e os
 * dobráveis existem. O que se pode dizer se isto passar é que passou **nestes
 * quatro**, e não «no telemóvel».
 *
 * ── E porque é que 375 está cá ───────────────────────────────────────────
 *
 * Porque a conta o punha a **11,1 px**, encostado ao limiar de 11. Um valor a um
 * décimo da fronteira é o que mais depressa a atravessa quando alguém mexer num
 * recuo — e um limiar nunca exercido perto da borda não se sabe se é limiar.
 */

/**
 * Os quatro visores estreitos. `largura` é o que importa; a altura é folga para
 * a página caber sem rolar mais do que o necessário.
 */
const VISORES = [360, 375, 390, 430] as const;
const ESPERADAS = 13;

test('as composições nos visores estreitos', async ({ page }) => {
  test.setTimeout(1_800_000);

  const acusadas: string[] = [];
  const populacao: string[] = [];

  for (const largura of VISORES) {
    await page.setViewportSize({ width: largura, height: 844 });
    const { medidas, falhas } = await medirComposicoes(page, PAGINAS);
    expect(falhas, `páginas que não abriram a ${largura}:\n${falhas.join('\n')}`)
      .toEqual([]);

    let comDefeito = 0;
    for (const m of medidas) {
      const { linha, problemas } = julgar(m);
      console.log(`ESTREITO ${largura} ${linha}`);
      if (problemas.length > 0) {
        comDefeito += 1;
        acusadas.push(`visor ${largura} · ${linha} — ${problemas.join(', ')}`);
      }
    }
    console.log(`AMBITO_ESTREITO visor=${largura} composicoes=${medidas.length}`
      + ` com_defeito=${comDefeito}`);

    // Guarda de população POR VISOR: menos de treze quer dizer que alguma
    // composição desapareceu do ecrã, e um verde sobre menos gente não é o mesmo
    // verde. Se este número mudar num visor e não noutro, é achado.
    if (medidas.length !== ESPERADAS) {
      populacao.push(`visor ${largura}: ${medidas.length} composições e esperavam-se ${ESPERADAS}`);
    }
  }

  console.log(`AMBITO_ESTREITOS visores=${VISORES.length}`
    + ` com_defeito=${acusadas.length}`);

  expect(populacao, `POPULACAO:\n${populacao.join('\n')}`).toEqual([]);
  expect(acusadas, `nos visores estreitos:\n${acusadas.join('\n')}`).toEqual([]);
});

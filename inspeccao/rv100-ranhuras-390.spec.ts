import { test, expect } from '@playwright/test';
import { PAGINAS, julgar, medirComposicoes } from './medir-ranhuras.ts';

/**
 * A matriz das ranhuras a **390 de visor** — a metade que a de 1280 declarava
 * não medir.
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
 * **Um visor só não é a matriz toda.** 360 e 430 existem e ficam por medir. Se
 * isto passar, passou **a 390** — nunca «no telemóvel».
 */

const VISOR = { width: 390, height: 844 };
const ESPERADAS = 13;

test('as composições a 390 de visor', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize(VISOR);

  const { medidas, falhas } = await medirComposicoes(page, PAGINAS);
  const acusadas: string[] = [];

  for (const m of medidas) {
    const { linha, problemas } = julgar(m);
    console.log(`RANHURA390 ${linha}`);
    if (problemas.length > 0) acusadas.push(`${linha} — ${problemas.join(', ')}`);
  }

  console.log(`AMBITO390 visor=${VISOR.width} composicoes=${medidas.length}`
    + ` com_defeito=${acusadas.length}`);

  expect(falhas, `páginas que não abriram:\n${falhas.join('\n')}`).toEqual([]);
  // Guarda de população: menos de treze quer dizer que alguma composição
  // desapareceu do ecrã estreito, e um verde sobre menos gente não é o mesmo
  // verde. A 390 há telas que se escondem — se este número mudar, é achado.
  expect(medidas.length,
    `POPULACAO: ${medidas.length} composições a 390 e esperavam-se ${ESPERADAS}`)
    .toBe(ESPERADAS);
  expect(acusadas, `a 390 de visor:\n${acusadas.join('\n')}`).toEqual([]);
});

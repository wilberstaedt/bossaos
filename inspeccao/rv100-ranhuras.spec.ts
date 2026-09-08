import { test, expect } from '@playwright/test';
import { PAGINAS, julgar, medirComposicoes } from './medir-ranhuras.ts';

/**
 * As ranhuras abençoadas, medidas em TODAS as composições do produto.
 *
 * ── Porque é que o tipo não chega ────────────────────────────────────────
 *
 * A união `Ranhura` impede que alguém **declare** uma ranhura sem variante. Não
 * impede que a caixa saia diferente da declaração — que foi exactamente o que o
 * bloco 4 mediu: o `sizes` prometia 390 e a caixa tinha 477. O tipo fecha a
 * porta da frente; isto mede a janela.
 *
 * Mede-se por composição, em cada página que tenha alguma:
 *
 *   nitidez       mostrado ÷ ficheiro servido — nunca acima de 1,00
 *   legibilidade  14 px × (mostrado ÷ captura de origem) — nunca abaixo de 11
 *
 * A medição vive em `medir-ranhuras.ts` e é a MESMA que a matriz de 390 usa.
 * Duas cópias do mesmo resumo concordam até ao dia em que uma muda.
 *
 * ── E o que fica DECLARADO em vez de escondido ───────────────────────────
 *
 * O herói da landing e as três largas da `/product` usam `ranhuraPorDecidir` e
 * **não cabem** nas duas abençoadas: encolher o herói de 720 para 477 tira-lhe a
 * imagem grande, e mantê-lo exige capturar `sala` a 834. As duas opções são
 * legíveis, portanto a régua não decide — é desenho, do Matheus e da Nathalia.
 *
 * Ficam VERMELHAS e nomeadas, que foi a ordem. A falha desta prova é a
 * declaração: enquanto a decisão não vier, isto acusa e diz exactamente quais.
 */

const VISOR = { width: 1280, height: 900 };

test('todas as composições, nas ranhuras que declaram', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize(VISOR);

  const { medidas, falhas } = await medirComposicoes(page, PAGINAS);
  const abencoadas: string[] = [];
  const porDecidir: string[] = [];

  for (const m of medidas) {
    const { linha, problemas } = julgar(m);
    console.log(`RANHURA ${linha}`);
    if (problemas.length === 0) continue;
    // A caixa TEM de bater com a ranhura declarada. Um sítio que declara 477 e
    // pinta 640 volta a ser a declaração a mentir, e o tipo não apanha isso.
    if (m.declarada === null) porDecidir.push(`${linha} — ${problemas.join(', ')}`);
    else abencoadas.push(`${linha} — ${problemas.join(', ')}`);
  }

  console.log(`AMBITO composicoes=${medidas.length}`
    + ` abencoadas_com_defeito=${abencoadas.length} por_decidir=${porDecidir.length}`);

  expect(falhas, `páginas que não abriram:\n${falhas.join('\n')}`).toEqual([]);
  expect(medidas.length, 'POPULACAO-ZERO: nenhuma composição foi medida')
    .toBeGreaterThan(0);
  expect(abencoadas, `ranhuras ABENÇOADAS a falhar — estas são defeito:\n${
    abencoadas.join('\n')}`).toEqual([]);
  expect(porDecidir, 'POR DECIDIR, e é desenho e não defeito.\n'
    + `Decisão do Matheus e da Nathalia:\n${porDecidir.join('\n')}`).toEqual([]);
});

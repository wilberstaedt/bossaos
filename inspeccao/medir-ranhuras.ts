import type { Page } from '@playwright/test';

/**
 * A medição das composições, **uma implementação e dois chamadores**.
 *
 * Existe porque a matriz passou a ter dois visores — 1280 e 390 — e copiar a
 * medição para o segundo daria duas implementações do mesmo resumo, que
 * concordam até ao dia em que uma muda. É a mesma razão pela qual o `carimbar`
 * da frescura vive num sítio só.
 */

export interface Medida {
  pagina: string;
  indice: number;
  /**
   * Largura da CAPTURA de onde o ficheiro servido veio — a base do texto de
   * 14 px. Nem sempre é o `width` do `<img>`: ver `origemDaCaptura`.
   */
  fonte: number;
  /** `true` quando quem serviu foi o `<source>` estreito e não o `next/image`. */
  peloEstreito: boolean;
  /** Largura REAL do ficheiro que o navegador recebeu e descodificou. */
  servido: number;
  /** A caixa pintada. */
  mostrada: number;
  /** A ranhura DECLARADA, quando o sítio declara uma. */
  declarada: string | null;
}

/**
 * ── Os píxeis REAIS, e nunca o `naturalWidth` ─────────────────────────────
 *
 * Num `<img>` com `srcset` o `naturalWidth` vem **corrigido pelo descritor** e
 * não é a largura do ficheiro: media 237 para uma fonte de 390, e 512 para
 * ficheiros de 1440, 1280 e 834 indistintamente. Descoberto a 08/09, ao
 * investigar um `1440` impossível num visor de 1280.
 *
 * Aqui busca-se o recurso e descodifica-se. É mais caro, e é o único número que
 * responde a «isto está a ser ampliado?».
 */
export async function medirComposicoes(
  page: Page, paginas: readonly string[],
): Promise<{ medidas: Medida[]; falhas: string[] }> {
  const medidas: Medida[] = [];
  const falhas: string[] = [];

  for (const caminho of paginas) {
    const resposta = await page.goto(caminho, { waitUntil: 'networkidle' });
    if (!resposta || resposta.status() >= 400) {
      falhas.push(`POPULACAO-ZERO: ${caminho} devolveu ${resposta?.status()}`);
      continue;
    }

    const n = await page.locator('img.bo-mkt__composicao:visible').count();
    for (let i = 0; i < n; i += 1) {
      // Traz a imagem ao ecrã e espera que ela chegue: uma composição abaixo da
      // dobra dava `servido=0` e saía como NÃO MEDI — resposta honesta, mas a
      // falha era da medição e não do produto.
      await page.locator('img.bo-mkt__composicao:visible').nth(i)
        .scrollIntoViewIfNeeded().catch(() => undefined);
      await page.waitForFunction((indice) => {
        const imgs = [...document.querySelectorAll('img.bo-mkt__composicao')]
          .filter((e) => (e as HTMLElement).offsetParent !== null) as HTMLImageElement[];
        const img = imgs[indice];
        return !!img && img.complete && img.naturalWidth > 0;
      }, i, { timeout: 20_000 }).catch(() => undefined);

      const m = await page.evaluate(async (indice) => {
        const imgs = [...document.querySelectorAll('img.bo-mkt__composicao')]
          .filter((e) => (e as HTMLElement).offsetParent !== null) as HTMLImageElement[];
        const img = imgs[indice];
        if (!img) return null;
        const servido = await fetch(img.currentSrc).then((r) => r.blob())
          .then((b) => createImageBitmap(b)).then((bm) => bm.width).catch(() => 0);
        // ── De QUE captura veio o ficheiro servido ────────────────────────
        //
        // O `width` do `<img>` é o do mestre largo. Mas abaixo de 768 quem serve
        // é o `<source>` estreito, e esse é **a original de 390 entregue tal e
        // qual**, sem passar pelo optimizador. Dividir os 358 px da caixa pelos
        // 834 do mestre dava 6,0 px efectivos sobre um ficheiro cujo texto é de
        // 14 px a 390 — media a captura errada.
        //
        // A distinção é verificável e não é heurística: o caminho do `next/image`
        // passa por `/_next/image`, e o do `<source>` estreito não.
        const peloEstreito = !img.currentSrc.includes('/_next/image');
        return {
          fonte: peloEstreito ? servido : Number(img.getAttribute('width') ?? 0),
          peloEstreito,
          servido,
          mostrada: Math.round(img.getBoundingClientRect().width),
          declarada: getComputedStyle(img).getPropertyValue('--bo-ranhura').trim() || null,
        };
      }, i);
      if (m) medidas.push({ pagina: caminho, indice: i + 1, ...m });
    }
  }

  return { medidas, falhas };
}

/** O veredicto de uma medida, com as duas perguntas separadas. */
export function julgar(m: Medida): { linha: string; problemas: string[] } {
  if (!m.fonte || !m.servido || !m.mostrada) {
    return {
      linha: `${m.pagina} #${m.indice}: NÃO MEDI`
        + ` (fonte=${m.fonte} servido=${m.servido} mostrada=${m.mostrada})`,
      problemas: ['NÃO MEDI'],
    };
  }
  // nitidez  — contra o ficheiro SERVIDO: acima de 1,00 está a ser ampliado.
  // legibilidade — contra a fonte ORIGINAL: é nela que o texto tinha 14 px.
  const nitidez = m.mostrada / m.servido;
  const efectivos = 14 * (m.mostrada / m.fonte);
  const via = m.peloEstreito ? ' via=estreito' : '';
  const problemas: string[] = [];
  if (nitidez > 1.0001) problemas.push(`AMPLIADO ${nitidez.toFixed(2)}×`);
  if (efectivos < 11) problemas.push(`ILEGÍVEL ${efectivos.toFixed(1)}px`);
  return {
    linha: `${m.pagina} #${m.indice}: ranhura=${m.declarada ?? 'POR DECIDIR'}`
      + ` fonte=${m.fonte} servido=${m.servido} mostrada=${m.mostrada}`
      + ` nitidez=${nitidez.toFixed(3)} px_efectivos=${efectivos.toFixed(1)}${via}`,
    problemas,
  };
}

export const PAGINAS = ['/es-ES', '/es-ES/product', '/es-ES/getting-started',
  '/es-ES/interno/ns2'] as const;

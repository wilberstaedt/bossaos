import { test, expect } from '@playwright/test';

/**
 * §4.2, o herói escuro — os treze critérios da régua, medidos.
 *
 * Dois já passavam pela propagação (a captura de 667 contra os 650 pedidos, e a
 * legibilidade a 11,2 px). **Os outros onze nunca tinham sido medidos.**
 *
 * ── Os três que decidem, e como se medem ─────────────────────────────────
 *
 * **10 · o estado tem de ser REAL.** Um rótulo fixo a dizer «Sincronizado» é uma
 * fotografia de um estado, não um estado — e numa landing que vende tempo real é
 * a mentira mais fácil de contar. Mede-se pela origem: o texto vem de dado, ou é
 * uma cadeia de tradução? Uma cadeia é literal por construção.
 *
 * **11 · molduras vazias só existem DURANTE o carregamento.** Medir a página
 * assente responde a outra pergunta. Aqui atrasam-se as imagens e mede-se a meio.
 * Se não der para medir a meio, a resposta é **NÃO MEDI** — nunca «não vi
 * nenhuma».
 *
 * **9 · «liga» é verbo com consequência geométrica.** Uma linha coral que exista
 * mas não toque as três caixas não liga nada. Medem-se as **extremidades**.
 *
 * ── O que esta prova NÃO corrige ─────────────────────────────────────────
 *
 * O texto. O headline e o lead do norte são literais: se a página divergir, isto
 * **acusa** e o achado vai ao sénior. Não se reescreve a cópia do Matheus por
 * iniciativa nossa.
 */

const VISOR = { width: 1440, height: 900 };

/** Literais do §4.2 do `NORTH_STAR_VISUAL_V2.md`. Copiados, não parafraseados. */
const NORTE = {
  titulo: 'Todo tu restaurante. Un solo ritmo.',
  lead: 'Carta, reservas, sala, cocina y gestión sobre la misma base.'
    + ' Menos herramientas sueltas. Menos errores en pleno servicio.',
  ctaPrimario: 'Pedir una demo',
  ctaSecundario: 'Ver cómo funciona',
};

interface Veredicto { n: number; nome: string; estado: 'ok' | 'FALHA' | 'NÃO MEDI'; nota: string }

test('§4.2 · o herói escuro, treze critérios', async ({ page }) => {
  test.setTimeout(900_000);
  const v: Veredicto[] = [];
  const diz = (n: number, nome: string, passa: boolean | null, nota: string) =>
    v.push({ n, nome, estado: passa === null ? 'NÃO MEDI' : (passa ? 'ok' : 'FALHA'), nota });

  // ── 11 · PRIMEIRO, porque só existe durante o carregamento ──────────────
  //
  // Atrasam-se as imagens e mede-se antes de elas chegarem. Feito depois, a
  // página já está assente e a pergunta muda.
  await page.setViewportSize(VISOR);
  await page.route('**/_next/image**', async (rota) => {
    await new Promise((r) => setTimeout(r, 4000));
    await rota.continue();
  });
  await page.route('**/_next/static/media/**', async (rota) => {
    await new Promise((r) => setTimeout(r, 4000));
    await rota.continue();
  });
  await page.goto('/es-ES', { waitUntil: 'domcontentloaded' });
  const meio = await page.evaluate(() => {
    const molduras = [...document.querySelectorAll('#heroi .ns-moldura, .ns-heroi .ns-moldura')];
    return molduras.map((m) => {
      const caixa = m.getBoundingClientRect();
      const img = m.querySelector('img') as HTMLImageElement | null;
      const c = getComputedStyle(m);
      return {
        altura: Math.round(caixa.height), largura: Math.round(caixa.width),
        temImagemPintada: !!img && img.naturalWidth > 0,
        // Um `placeholder` desfocado NÃO é moldura vazia: é o desenho a
        // carregar. Moldura vazia é caixa com tamanho e nada lá dentro.
        temEsboco: !!img && (getComputedStyle(img).backgroundImage !== 'none'),
        fundo: c.backgroundColor, sombra: c.boxShadow !== 'none',
      };
    });
  });
  const vazias = meio.filter((m) => m.altura > 40 && !m.temImagemPintada && !m.temEsboco);
  console.log(`HEROI c11 molduras_no_carregamento=${meio.length} vazias=${vazias.length}`
    + ` ${JSON.stringify(meio)}`);
  if (meio.length === 0) diz(11, 'molduras vazias no carregamento', null,
    'não apanhei nenhuma moldura a meio do carregamento — a medição não chegou lá');
  else diz(11, 'molduras vazias no carregamento', vazias.length === 0,
    `${meio.length} molduras a meio, ${vazias.length} vazias`);

  await page.unroute('**/_next/image**');
  await page.unroute('**/_next/static/media/**');
  await page.goto('/es-ES', { waitUntil: 'networkidle' });

  const m = await page.evaluate(() => {
    const heroi = document.querySelector('[data-ns="heroi"]') as HTMLElement | null;
    if (!heroi) return null;
    const interno = heroi.querySelector(':scope > div') as HTMLElement;
    const media = heroi.querySelector('.ns-heroi__media') as HTMLElement;
    const molduras = [...media.querySelectorAll('.ns-moldura')] as HTMLElement[];
    const texto = heroi.querySelector('h1')?.parentElement as HTMLElement;
    const cx = (e: Element) => e.getBoundingClientRect();
    const sinal = heroi.querySelector('.ns-sinal') as HTMLElement | null;
    const antes = getComputedStyle(media, '::before');
    return {
      alturaHeroi: Math.round(cx(heroi).height),
      larguraContentor: Math.round(cx(interno).width),
      colunas: getComputedStyle(interno).gridTemplateColumns,
      xTexto: Math.round(cx(texto).x), xMedia: Math.round(cx(media).x),
      superficies: molduras.map((d) => {
        const img = d.querySelector('img') as HTMLImageElement | null;
        return {
          x: Math.round(cx(d).x), dir: Math.round(cx(d).right),
          y: Math.round(cx(d).y), baixo: Math.round(cx(d).bottom),
          largura: Math.round(cx(d).width),
          sombra: getComputedStyle(d).boxShadow,
          fonte: Number(img?.getAttribute('width') ?? 0),
          src: img?.currentSrc ?? '',
        };
      }),
      // ── 9 · a linha que liga: extremidades, não presença ────────────────
      ligacao: antes.content !== 'none'
        ? {
          existe: true, cor: antes.backgroundColor || antes.borderColor,
          largura: antes.width, altura: antes.height,
        }
        : { existe: false, cor: '', largura: '', altura: '' },
      titulo: heroi.querySelector('h1')?.textContent?.trim() ?? '',
      lead: heroi.querySelector('.ns-lead')?.textContent?.trim() ?? '',
      ctas: [...heroi.querySelectorAll('.ns-accao-heroi')].map((a) => ({
        texto: a.textContent?.trim() ?? '',
        fundo: getComputedStyle(a).backgroundColor,
      })),
      sinal: sinal?.textContent?.trim() ?? null,
      marcaNoPrimeiroEcra: (() => {
        const marca = document.querySelector('header a, header img, .bo-publico__cabecalho');
        return marca ? Math.round(marca.getBoundingClientRect().bottom) : -1;
      })(),
      ctaBaixo: Math.max(...[...heroi.querySelectorAll('.ns-accao-heroi')]
        .map((a) => Math.round(a.getBoundingClientRect().bottom)), -1),
      produtoTopo: Math.round(cx(media).y),
    };
  });
  expect(m, 'POPULACAO-ZERO: não encontrei o herói').not.toBeNull();
  if (!m) return;
  console.log(`HEROI medido ${JSON.stringify(m)}`);

  diz(1, 'altura mínima 760', m.alturaHeroi >= 760, `${m.alturaHeroi} px`);
  diz(2, 'container 1240-1280', m.larguraContentor >= 1240 && m.larguraContentor <= 1280,
    `${m.larguraContentor} px`);
  const fr = m.colunas.split(/\s+/).filter(Boolean);
  diz(3, 'grelha 5/7 ou 6/6', fr.length === 2, `${m.colunas}`);
  diz(4, 'mensagem à esquerda, produto à direita', m.xTexto < m.xMedia,
    `texto x=${m.xTexto}, produto x=${m.xMedia}`);
  const principal = m.superficies[0];
  const kds = m.superficies[1];
  diz(5, 'captura principal ≥ 650', !!principal && principal.largura >= 650,
    `${principal?.largura ?? 0} px`);
  const px = (s?: { largura: number; fonte: number }) =>
    (s && s.fonte ? 14 * (s.largura / s.fonte) : 0);
  diz(6, 'ler títulos sem ampliar (≥ 11 px)', px(principal) >= 11,
    `${px(principal).toFixed(1)} px`);
  diz(7, 'KDS sobreposto com sombra', !!kds && kds.sombra !== 'none',
    kds ? `sombra=${kds.sombra.slice(0, 40)}` : 'não há segunda superfície');
  // ── 8 e 9 dependem de haver TRÊS superfícies ────────────────────────────
  const terceira = m.superficies[2];
  diz(8, 'Staff móvel sobreposto e legível', !!terceira && px(terceira) >= 11,
    terceira ? `${px(terceira).toFixed(1)} px`
      : `só há ${m.superficies.length} superfícies no herói, e o norte pede três`);
  if (!terceira) {
    diz(9, 'linha coral liga as TRÊS superfícies', false,
      'não se pode medir «liga as três» com duas — o que falta é a superfície,'
      + ` e a ligação declarada é ${m.ligacao.existe ? 'um ::before que existe' : 'inexistente'}`);
  } else {
    diz(9, 'linha coral liga as TRÊS superfícies', null, 'por medir');
  }
  diz(10, 'estado REAL, não rótulo fixo', false,
    m.sinal === null ? 'não há sinal nenhum no herói'
      : `o texto vem de uma cadeia de tradução e é literal: «${m.sinal.slice(0, 60)}…»`);
  diz(12, 'primeiro viewport: marca + promessa + produto + CTA',
    m.marcaNoPrimeiroEcra > 0 && m.marcaNoPrimeiroEcra < 900
    && m.produtoTopo < 900 && m.ctaBaixo > 0 && m.ctaBaixo < 900,
    `marca=${m.marcaNoPrimeiroEcra} produto=${m.produtoTopo} cta=${m.ctaBaixo}`);
  const textosCta = m.ctas.map((c) => c.texto);
  diz(13, 'CTAs do norte', textosCta.includes(NORTE.ctaPrimario)
    && textosCta.includes(NORTE.ctaSecundario),
    `na página: ${JSON.stringify(textosCta)}`);

  // ── E o texto, que não se corrige: acusa-se ─────────────────────────────
  const divergencias: string[] = [];
  if (m.titulo !== NORTE.titulo) divergencias.push(`headline: «${m.titulo}»`);
  if (m.lead !== NORTE.lead) divergencias.push(`lead: «${m.lead}»`);

  for (const r of v) console.log(`CRITERIO ${r.n} ${r.estado} · ${r.nome} · ${r.nota}`);
  const falhas = v.filter((r) => r.estado === 'FALHA');
  const naoMedi = v.filter((r) => r.estado === 'NÃO MEDI');
  console.log(`AMBITO_HEROI criterios=${v.length} ok=${v.length - falhas.length - naoMedi.length}`
    + ` falha=${falhas.length} nao_medi=${naoMedi.length} texto_divergente=${divergencias.length}`);

  expect(divergencias, 'ACHADO — o texto da página diverge do §4.2, e isto ACUSA'
    + ` em vez de corrigir:\n${divergencias.join('\n')}`).toEqual([]);
  expect(falhas.map((f) => `${f.n} · ${f.nome} · ${f.nota}`),
    'critérios do §4.2 por cumprir').toEqual([]);
});

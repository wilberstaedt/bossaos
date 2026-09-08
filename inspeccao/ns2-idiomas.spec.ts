import { expect, test } from '@playwright/test';

/**
 * As duas referências do North Star v2 nos TRÊS idiomas, mais zoom, foco e
 * teclado.
 *
 * ── Porque é que isto não estava coberto ──────────────────────────────────
 *
 * A maquinaria toda já existe neste repositório: o `larguras.spec.ts` mede
 * cinco larguras, o `superficies.spec.ts` mede contraste em onze superfícies,
 * o `foco.spec.ts` mede o regresso ao accionador. E nenhum dos três visita o
 * `/floor`. A cobertura estava verde sobre uma população que **não continha o
 * assunto** — que é a forma de verde vazio mais difícil de ver, porque nada
 * falha e o relatório parece completo.
 *
 * O que se mede aqui é o que muda com a língua: o COMPRIMENTO. A cor não muda
 * com o idioma, e por isso o contraste destas duas telas ficou onde já havia
 * motor — a `SALA-mesas` entrou na lista do `superficies.spec.ts`. Duas
 * opiniões sobre a mesma pergunta concordam até ao dia em que discordam.
 *
 * ── O que fica FORA, declarado ────────────────────────────────────────────
 *
 * Não se mede aqui se a tradução está CERTA. Mede-se que ela existe e que o
 * ecrã aguenta o comprimento dela. Uma tradução errada e curta passa aqui.
 */

const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;
const ORG = 'marina-oropesa';
const UNIDADE = 'puerto';

interface Referencia { id: string; caminho: (i: string) => string; principal: string }

const REFERENCIAS: Referencia[] = [
  { id: 'LANDING', caminho: (i) => `/${i}`, principal: '.ns-seccao' },
  {
    id: 'MESAS',
    caminho: (i) => `/${i}/app/${ORG}/${UNIDADE}/floor`,
    principal: '[data-teste="mapa-de-mesas"]',
  },
];

/** O corte horizontal de uma página. `1` de folga porque o navegador arredonda. */
async function transbordo(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const d = document.documentElement;
    return { rolagem: d.scrollWidth, janela: d.clientWidth };
  });
}

test.describe('North Star v2 — as duas referências em três idiomas', () => {
  test('comprimento: nenhuma das duas parte em nenhum dos três idiomas', async ({ page }) => {
    test.setTimeout(900_000);

    const falhas: string[] = [];
    let medidas = 0;
    const titulos: Record<string, Set<string>> = { LANDING: new Set(), MESAS: new Set() };

    // 390 é o telemóvel do empregado; 1440 é a secretária. As duas larguras
    // onde a captura obrigatória vive — medir noutra seria medir outra coisa.
    for (const [largura, altura] of [[390, 844], [1440, 900]] as const) {
      for (const ref of REFERENCIAS) {
        for (const idioma of IDIOMAS) {
          await page.setViewportSize({ width: largura, height: altura });
          const alvo = ref.caminho(idioma);
          const r = await page.goto(alvo, { waitUntil: 'networkidle' });
          const caminho = new URL(page.url()).pathname;

          // ── O controlo de população, antes de qualquer medida ───────────
          //
          // Uma rota que redireccionasse para o login media o login e dizia
          // verde. O endereço FINAL é que conta.
          if (r?.status() !== 200 || caminho !== alvo) {
            falhas.push(`POPULACAO-ZERO: ${ref.id} ${idioma} ${largura}px`
              + ` · estado=${r?.status()} caminho=${caminho}`);
            continue;
          }
          const quantos = await page.locator(ref.principal).count();
          if (quantos === 0) {
            falhas.push(`POPULACAO-ZERO: ${ref.id} ${idioma} ${largura}px`
              + ` · a tela abriu sem o seu assunto (${ref.principal})`);
            continue;
          }

          const lang = await page.locator('html').getAttribute('lang');
          const h1 = (await page.locator('h1').first().innerText()).trim();
          titulos[ref.id]?.add(h1);

          const t = await transbordo(page);
          const corte = t.rolagem - t.janela;
          medidas += 1;
          console.log(`IDIOMA ${ref.id} ${idioma} ${largura}px lang=${lang}`
            + ` corte=${corte}px blocos=${quantos}`);

          if (lang !== idioma) {
            falhas.push(`${ref.id} ${idioma} · <html lang="${lang}"> não declara o idioma servido`);
          }
          if (corte > 1) {
            falhas.push(`${ref.id} ${idioma} ${largura}px · corta ${corte}px na horizontal`);
          }
        }
      }
    }

    // ── A tradução ACONTECE? ────────────────────────────────────────────────
    //
    // Três idiomas que devolvem o mesmo H1 não são três idiomas: são um, três
    // vezes, e o teste de comprimento acima passava à mesma. Não se afirma que
    // a tradução está certa — afirma-se que ela existe.
    for (const ref of REFERENCIAS) {
      const distintos = titulos[ref.id]?.size ?? 0;
      console.log(`TRADUCAO ${ref.id} h1-distintos=${distintos}/3`);
      if (distintos < 2) {
        falhas.push(`${ref.id} · os três idiomas devolvem o mesmo H1 — a página não traduz`);
      }
    }

    console.log(`AMBITO idiomas=${IDIOMAS.length} referencias=${REFERENCIAS.length}`
      + ` larguras=2 esperadas=${IDIOMAS.length * REFERENCIAS.length * 2} medidas=${medidas}`);
    expect(medidas, 'POPULACAO-ZERO: nem todas as combinações foram medidas')
      .toBe(IDIOMAS.length * REFERENCIAS.length * 2);
    expect(falhas, `as referências não aguentam os três idiomas:\n${falhas.join('\n')}`).toEqual([]);
  });

  test('zoom a 200%: o conteúdo reflui e não corta', async ({ page }) => {
    test.setTimeout(900_000);

    // 200% de zoom com a janela de 1280 é, para efeitos de refluxo, uma janela
    // de 640 — é assim que a WCAG 1.4.10 o define, e é assim que se mede sem
    // depender de um gesto de navegador que o Playwright não tem.
    const falhas: string[] = [];
    let medidas = 0;
    for (const ref of REFERENCIAS) {
      await page.setViewportSize({ width: 640, height: 512 });
      const alvo = ref.caminho('es-ES');
      const r = await page.goto(alvo, { waitUntil: 'networkidle' });
      if (r?.status() !== 200 || new URL(page.url()).pathname !== alvo) {
        falhas.push(`POPULACAO-ZERO: ${ref.id} a 200% · estado=${r?.status()}`);
        continue;
      }
      const t = await transbordo(page);
      const corte = t.rolagem - t.janela;
      medidas += 1;
      console.log(`ZOOM ${ref.id} 1280@200% corte=${corte}px`);
      if (corte > 1) falhas.push(`${ref.id} a 200% · corta ${corte}px na horizontal`);
    }
    expect(medidas, 'POPULACAO-ZERO: nenhuma referência foi medida a 200%').toBe(REFERENCIAS.length);
    expect(falhas, `a 200% de zoom:\n${falhas.join('\n')}`).toEqual([]);
  });

  test('conteúdo longo: um nome de mesa que ninguém previu', async ({ page }) => {
    test.setTimeout(900_000);

    // O nome mais longo da semente tem 24 caracteres. O produto não impede um
    // nome de 90 — e uma grelha que só aguenta o que a semente tem está a ser
    // medida contra os seus próprios dados. O texto é INJECTADO no DOM, e isso
    // fica declarado: não se escreve na base, e a página não é recarregada.
    await page.setViewportSize({ width: 390, height: 844 });
    const alvo = `/es-ES/app/${ORG}/${UNIDADE}/floor`;
    const r = await page.goto(alvo, { waitUntil: 'networkidle' });
    expect(r?.status(), 'POPULACAO-ZERO: a sala não abriu').toBe(200);

    const antes = await transbordo(page);
    const nomes = page.locator('.ns-mesa__nome');
    const quantos = await nomes.count();
    expect(quantos, 'POPULACAO-ZERO: nenhum nome de mesa para alongar').toBeGreaterThan(0);

    const LONGO = 'Mesa de la terraza superior junto a la ventana grande del salón principal';
    await nomes.first().evaluate((el, txt) => { el.textContent = txt; }, LONGO);
    const depois = await transbordo(page);
    const corte = depois.rolagem - depois.janela;
    console.log(`LONGO nomes=${quantos} caracteres=${LONGO.length}`
      + ` corte-antes=${antes.rolagem - antes.janela}px corte-depois=${corte}px`);
    expect(corte, `um nome de ${LONGO.length} caracteres parte a sala em ${corte}px`)
      .toBeLessThanOrEqual(1);
  });

  /**
   * §3.3 — «cantos entre 14 e 24 px nas áreas de marketing», e a CONTENÇÃO.
   *
   * A revisão do sénior mediu treze elementos a 10 px na landing e escreveu a
   * nota que interessa: **imprimir um número não é verificá-lo.** O alvo
   * `raio:[14,24]` estava na fita desde o início e nunca era lido — treze
   * elementos passaram por baixo de doze linhas verdes.
   *
   * A cura foi redefinir o `--bo-raio-controlo` no âmbito comercial, e não na
   * raiz, porque esse token tem dezassete usos e mexer nele arrumava a landing
   * e mexia nas 396 telas. **Uma cura por âmbito só está certa se o âmbito
   * segurar**, e é por isso que este teste tem duas metades: a landing não pode
   * ter cantos pequenos, e o painel TEM de continuar a tê-los. Se as duas
   * ficarem iguais, o token vazou — e o verde da primeira metade estaria a
   * pagar-se com propagação silenciosa na segunda.
   */
  test('cantos: 14 a 24 no marketing, e o painel intacto', async ({ page }) => {
    test.setTimeout(900_000);

    const pequenos = async (caminho: string) => {
      const r = await page.goto(caminho, { waitUntil: 'networkidle' });
      expect(r?.status(), `POPULACAO-ZERO: ${caminho} deu ${r?.status()}`).toBe(200);
      return page.evaluate(() => {
        const fora: string[] = []; let comRaio = 0;
        document.querySelectorAll<HTMLElement>('div,article,section,a,button').forEach((el) => {
          const v = parseFloat(getComputedStyle(el).borderTopLeftRadius);
          if (!v) return;
          comRaio += 1;
          // Só o lado pequeno. A cápsula é um idioma declarado no §3.3, não um
          // canto por arrumar, e reprová-la seria inventar uma falha.
          if (v < 14) fora.push(`${el.tagName.toLowerCase()}.${el.className.toString().trim().split(/\s+/)[0] || '-'} ${v}px`);
        });
        return { fora, comRaio };
      });
    };

    const mkt = await pequenos('/es-ES');
    console.log(`CANTOS marketing comRaio=${mkt.comRaio} abaixoDe14=${mkt.fora.length}`);
    expect(mkt.comRaio, 'POPULACAO-ZERO: nenhum elemento com raio na landing').toBeGreaterThan(0);
    expect(mkt.fora, `§3.3 pede 14-24 nas áreas de marketing:\n${mkt.fora.join('\n')}`).toEqual([]);

    // ── A contenção, que é o controlo desta cura ──────────────────────────
    const painel = await pequenos(`/es-ES/app/${ORG}/${UNIDADE}/floor`);
    console.log(`CANTOS painel comRaio=${painel.comRaio} abaixoDe14=${painel.fora.length}`);
    expect(painel.comRaio, 'POPULACAO-ZERO: nenhum elemento com raio no painel').toBeGreaterThan(0);
    expect(painel.fora.length,
      'o painel deixou de ter cantos de controlo: ou o `--bo-raio-controlo` vazou do'
      + ' âmbito comercial para a raiz, ou alguém redesenhou as 396 telas. Nos dois'
      + ' casos o verde do marketing acima deixou de ser uma cura por âmbito.')
      .toBeGreaterThan(0);
  });

  test('foco e teclado: chega-se lá, e vê-se que se chegou', async ({ page }) => {
    test.setTimeout(900_000);

    const falhas: string[] = [];
    let examinados = 0;
    for (const ref of REFERENCIAS) {
      await page.setViewportSize({ width: 1440, height: 900 });
      const alvo = ref.caminho('es-ES');
      const r = await page.goto(alvo, { waitUntil: 'networkidle' });
      if (r?.status() !== 200) { falhas.push(`POPULACAO-ZERO: ${ref.id} deu ${r?.status()}`); continue; }

      // Vinte tabulações a partir do topo. Não é a página inteira, e é isso que
      // fica escrito: é o caminho que um teclado percorre antes de desistir.
      await page.locator('body').press('Tab');
      const vistos = new Set<string>();
      let semAnel = 0;
      for (let i = 0; i < 20; i += 1) {
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const s = getComputedStyle(el);
          const largura = parseFloat(s.outlineWidth) || 0;
          const solido = s.outlineStyle !== 'none' && largura >= 2;
          const sombra = s.boxShadow !== 'none' && s.boxShadow !== '';
          const r = el.getBoundingClientRect();
          return {
            chave: `${el.tagName}:${(el.textContent ?? '').trim().slice(0, 28)}`,
            anel: solido || sombra,
            visivel: r.width > 0 && r.height > 0,
          };
        });
        if (info === null) break;
        if (info.visivel) {
          examinados += 1;
          vistos.add(info.chave);
          if (!info.anel) { semAnel += 1; falhas.push(`${ref.id} · sem anel de foco: ${info.chave}`); }
        }
        await page.keyboard.press('Tab');
      }
      console.log(`TECLADO ${ref.id} alcancados=${vistos.size} sem-anel=${semAnel}`);
      if (vistos.size < 3) {
        falhas.push(`POPULACAO-ZERO: ${ref.id} · só ${vistos.size} elementos alcançados`
          + ' em 20 tabulações — ou a tela não tem foco, ou ele está preso');
      }
    }
    console.log(`AMBITO-TECLADO examinados=${examinados} falhas=${falhas.length}`);
    expect(examinados, 'POPULACAO-ZERO: nada foi examinado').toBeGreaterThan(0);
    expect(falhas, `foco e teclado:\n${falhas.join('\n')}`).toEqual([]);
  });
});

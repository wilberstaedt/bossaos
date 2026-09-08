import { test, expect } from '@playwright/test';

/**
 * RV100 · §4.5 «Para cada pessoa, a tela certa», medido no navegador.
 *
 * ── Porque é que esta prova não lê o HTML ─────────────────────────────────
 *
 * A régua (`docs/reviews/ALVO-BLOCO-4.md`, escrita antes de existir entrega)
 * diz duas coisas que decidem a forma deste ficheiro:
 *
 * **Um `role="tab"` no HTML não prova que o teclado funciona, e o teclado a
 * funcionar não prova que a mudança é anunciada.** Por isso aqui não se
 * pergunta se os atributos existem: **carrega-se `Tab` até ao selector** — a
 * partir do topo do documento, sem foco programado — e depois setas, e mede-se
 * o que mudou no ecrã.
 *
 * **E o critério 3 é o que separa isto de um carrossel:** ao trocar de papel
 * têm de trocar **o ecrã e o benefício, juntos**. Só a imagem faz uma galeria
 * com legendas; só o texto faz quatro parágrafos com uma fotografia decorativa.
 * Por isso a medição recolhe os dois de cada vez e exige **quatro `src`
 * distintos e quatro textos distintos** — não «mudou alguma coisa».
 *
 * ── O controlo negativo vive fora daqui ──────────────────────────────────
 *
 * `scripts/provar-rv100-papeis.sh` põe as quatro composições iguais na fonte e
 * exige que ISTO fique vermelho. Uma guarda que nunca recusou não provou nada,
 * e a que mais precisa disso é exactamente a que compara quatro coisas.
 */

const IDIOMAS = ['es-ES', 'pt-BR', 'en'] as const;

/** A largura a que o bloco é mostrado e a que as capturas se tiram. */
const LARGURA = 1280;

/** Quantos `Tab` se aceita gastar do topo até ao selector. */
const TABS_NO_MAXIMO = 80;

interface Estado { chave: string; imagem: string; beneficio: string }

test.describe('RV100 · §4.5 para cada pessoa, a tela certa', () => {
  test('trocar de papel troca o ecrã E o benefício, e chega-se lá por teclado', async ({ page }) => {
    test.setTimeout(600_000);

    const falhas: string[] = [];
    let idiomasMedidos = 0;

    for (const idioma of IDIOMAS) {
      await page.setViewportSize({ width: LARGURA, height: 900 });
      const resposta = await page.goto(`/${idioma}`, { waitUntil: 'networkidle' });
      if (resposta?.status() !== 200) {
        falhas.push(`POPULACAO-ZERO: /${idioma} devolveu ${resposta?.status()}`);
        continue;
      }

      const seccao = page.locator('#papeis');
      if (await seccao.count() === 0) {
        falhas.push(`POPULACAO-ZERO: ${idioma} · a secção #papeis não existe`);
        continue;
      }

      // ── 1 e 2 · quatro papéis, e um ecrã por papel ──────────────────────
      const separadores = seccao.locator('[role="tab"]');
      const nSep = await separadores.count();
      const nImg = await seccao.locator('img').count();
      if (nSep !== 4) falhas.push(`${idioma} · ${nSep} separadores e não 4`);
      if (nImg < 4) falhas.push(`${idioma} · ${nImg} imagens no bloco e não 4 ou mais`);
      if (nSep !== 4) continue;

      // ── 7 · um painel visível de cada vez ───────────────────────────────
      const visiveis = await seccao.locator('[role="tabpanel"]:not([hidden])').count();
      if (visiveis !== 1) falhas.push(`${idioma} · ${visiveis} painéis visíveis, e tem de ser 1`);

      // ── 4 · chega-se ao selector POR TAB, a partir do topo ──────────────
      //
      // Sem foco programado: `focus()` prova que o elemento aceita foco, não que
      // está no percurso do teclado. O que se mede é o percurso.
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
        window.scrollTo(0, 0);
      });
      let tabs = 0;
      let chegou = false;
      while (tabs < TABS_NO_MAXIMO) {
        await page.keyboard.press('Tab');
        tabs += 1;
        chegou = await page.evaluate(() =>
          document.activeElement?.getAttribute('role') === 'tab');
        if (chegou) break;
      }
      if (!chegou) {
        falhas.push(`${idioma} · o selector não foi alcançado em ${TABS_NO_MAXIMO} Tab —`
          + ' não está no percurso do teclado');
        continue;
      }
      console.log(`TECLADO ${idioma} tabs_ate_ao_selector=${tabs}`);

      // ── 3 · percorrer os quatro POR SETA, e recolher os dois de cada vez ─
      const lerEstado = async (): Promise<Estado> => page.evaluate(() => {
        const painel = document.querySelector('#papeis [role="tabpanel"]:not([hidden])');
        const activo = document.querySelector('#papeis [role="tab"][aria-selected="true"]');
        return {
          chave: activo?.textContent?.trim() ?? '',
          imagem: painel?.querySelector('img')?.getAttribute('src') ?? '',
          beneficio: painel?.querySelector('p')?.textContent?.trim() ?? '',
        };
      });

      const estados: Estado[] = [await lerEstado()];
      for (let i = 1; i < 4; i += 1) {
        await page.keyboard.press('ArrowRight');
        // O foco tem de acompanhar: com tabIndex rotativo, a seta move a
        // selecção E o foco. Se ficasse para trás, a tabulação seguinte saltava
        // para o sítio errado e ninguém dava por isso numa captura.
        const focoNoSeparador = await page.evaluate(() =>
          document.activeElement?.getAttribute('role') === 'tab'
          && document.activeElement?.getAttribute('aria-selected') === 'true');
        if (!focoNoSeparador) {
          falhas.push(`${idioma} · depois da seta ${i} o foco não está no separador seleccionado`);
        }
        estados.push(await lerEstado());
      }

      const imagens = new Set(estados.map((e) => e.imagem).filter(Boolean));
      const beneficios = new Set(estados.map((e) => e.beneficio).filter(Boolean));
      const nomes = new Set(estados.map((e) => e.chave).filter(Boolean));

      console.log(`AMBITO ${idioma} separadores=${nSep} imagens_no_bloco=${nImg}`
        + ` imagens_distintas=${imagens.size} beneficios_distintos=${beneficios.size}`
        + ` nomes_distintos=${nomes.size}`);

      if (imagens.size !== 4) {
        falhas.push(`${idioma} · ${imagens.size} imagens distintas nos quatro papéis —`
          + ' se o ecrã não troca, é um texto com fotografia decorativa');
      }
      if (beneficios.size !== 4) {
        falhas.push(`${idioma} · ${beneficios.size} benefícios distintos nos quatro papéis —`
          + ' se o texto não troca, é uma galeria com legendas');
      }
      if (nomes.size !== 4) falhas.push(`${idioma} · ${nomes.size} nomes de papel distintos`);

      // ── 5 · e os atributos, que sozinhos não bastavam mas fazem falta ────
      const coerencia = await page.evaluate(() => {
        const tabs2 = [...document.querySelectorAll('#papeis [role="tab"]')];
        const seleccionados = tabs2.filter((t) => t.getAttribute('aria-selected') === 'true').length;
        const semAlvo = tabs2.filter((t) => {
          const alvo = t.getAttribute('aria-controls');
          return !alvo || !document.getElementById(alvo);
        }).length;
        const listas = document.querySelectorAll('#papeis [role="tablist"]').length;
        return { seleccionados, semAlvo, listas };
      });
      if (coerencia.listas !== 1) falhas.push(`${idioma} · ${coerencia.listas} tablist na secção`);
      if (coerencia.seleccionados !== 1) {
        falhas.push(`${idioma} · ${coerencia.seleccionados} separadores com aria-selected=true`);
      }
      if (coerencia.semAlvo !== 0) {
        falhas.push(`${idioma} · ${coerencia.semAlvo} separadores cujo aria-controls não aponta`
          + ' a um painel que exista');
      }

      idiomasMedidos += 1;
    }

    expect(idiomasMedidos, `POPULACAO-ZERO: só ${idiomasMedidos} das ${IDIOMAS.length} línguas`
      + ' foram medidas').toBe(IDIOMAS.length);
    expect(falhas, `o §4.5 não cumpre a régua:\n${falhas.join('\n')}`).toEqual([]);
  });
});

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

/**
 * RV100 · diagnóstico do §2 — as quatro hipóteses de COMPOSIÇÃO.
 *
 * As outras nove mediram-se na fonte. Estas quatro não se leem no código:
 * «metade do hero vazia», «cinco páginas com a mesma estrutura», «o produto
 * repete a home» e «a demo está isolada» são afirmações sobre o que o navegador
 * COMPÕE, e a única maneira honesta de as medir é perguntar ao DOM.
 *
 * Isto não julga. Recolhe números e escreve-os. O julgamento fica no
 * 01_BASELINE.md, onde se pode discutir com os números à frente.
 */

const PAGINAS = [
  { rota: '', nome: 'home' },
  { rota: '/product', nome: 'produto' },
  { rota: '/plans', nome: 'planos' },
  { rota: '/getting-started', nome: 'implantacao' },
  { rota: '/pilot', nome: 'piloto' },
  { rota: '/trust', nome: 'confianca' },
  { rota: '/faq', nome: 'faq' },
  { rota: '/demo', nome: 'demo' },
] as const;

const DESTINO = 'docs/visual/rv100/2026-09-06';

test('as oito superfícies comerciais, medidas a 1440x900', async ({ page }) => {
  mkdirSync(`${DESTINO}/evidence/baseline`, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  const recolha: unknown[] = [];

  for (const p of PAGINAS) {
    await page.goto(`/es-ES${p.rota}`, { waitUntil: 'networkidle' });

    const medida = await page.evaluate(() => {
      const vw = window.innerWidth;
      const corpo = document.body.getBoundingClientRect();
      const seccoes = Array.from(document.querySelectorAll('section'));
      const media = Array.from(document.querySelectorAll('img, picture, video, canvas'));

      // A marca, medida como ela aparece — não como o componente diz.
      const marca = document.querySelector('header img, a img') as HTMLElement | null;
      const cm = marca?.getBoundingClientRect();

      // A primeira secção é o hero. Mede-se a LARGURA DO CONTEÚDO dentro dela:
      // o que interessa não é a secção (que costuma ocupar tudo), é até onde
      // vai a coisa mais larga lá dentro.
      const hero = seccoes[0] ?? document.querySelector('main')?.firstElementChild;
      let heroConteudo = 0;
      let heroAltura = 0;
      if (hero) {
        const rh = hero.getBoundingClientRect();
        heroAltura = Math.round(rh.height);
        for (const f of Array.from(hero.querySelectorAll('*'))) {
          const r = (f as HTMLElement).getBoundingClientRect();
          if (r.width > 0 && r.height > 0) heroConteudo = Math.max(heroConteudo, Math.round(r.right));
        }
      }

      return {
        vw,
        alturaPagina: Math.round(corpo.height),
        // `body.getBoundingClientRect()` devolve a CAIXA do body, que num layout
        // com altura 100% dá o viewport mesmo numa página longa. O que diz se a
        // página é curta é o scrollHeight — e a diferença entre os dois foi o
        // que me impediu de escrever «cabe num ecrã» sem ter medido isso.
        alturaRolavel: document.documentElement.scrollHeight,
        rola: document.documentElement.scrollHeight > window.innerHeight + 4,
        seccoes: seccoes.length,
        media: media.length,
        marca: cm ? { largura: Math.round(cm.width), altura: Math.round(cm.height) } : null,
        heroAltura,
        heroConteudoAteX: heroConteudo,
        // A "impressão" da estrutura: a sequência de etiquetas das secções.
        // Duas páginas com a mesma impressão são duas páginas com a mesma forma.
        impressao: seccoes.map((s) => {
          const t = s.querySelectorAll('h2,h3').length;
          const par = s.querySelectorAll('p').length;
          const li = s.querySelectorAll('li').length;
          const tab = s.querySelectorAll('table').length;
          const img = s.querySelectorAll('img,picture,video,canvas').length;
          return `t${t}p${par}l${li}b${tab}i${img}`;
        }).join('·'),
      };
    });

    await page.screenshot({
      path: `${DESTINO}/evidence/baseline/${p.nome}-1440.png`,
      fullPage: true,
    });
    recolha.push({ pagina: p.nome, rota: `/es-ES${p.rota}`, ...medida });

    // O controlo positivo desta recolha: se a página não tiver secção nenhuma,
    // não é uma medição de composição — é uma página que não carregou.
    expect(medida.seccoes, `${p.nome} não tem secções — não carregou`).toBeGreaterThan(0);
  }

  writeFileSync(`${DESTINO}/evidence/baseline/medidas-1440.json`,
    JSON.stringify(recolha, null, 2) + '\n');
  console.log(JSON.stringify(recolha, null, 1));
});

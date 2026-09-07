import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
// Caminho relativo, como as outras suites: a pasta da inspeccao nao resolve os
// nomes do workspace. O que importa e' vir da FONTE e nao de uma copia.
import { IDIOMAS } from '../packages/i18n/src/index.ts';
import { ROTAS_INDEXAVEIS } from '../apps/web/src/seo/rotas.ts';

/**
 * RV100 · metadados, hreflang e partilha (§6.8), medidos antes e depois.
 *
 * ── Isto mede o `<head>`, que é a parte que ninguém vê ────────────────────
 *
 * Um título errado não estraga um ecrã: estraga um resultado de pesquisa e uma
 * partilha, e descobre-se num relatório semanas depois. É por isso que se mede
 * aqui e não se revê a olho.
 *
 * ── O par que separa «tem metadados» de «tem os SEUS metadados» ───────────
 *
 * A medição central não é «a rota tem `<title>`». É **quantos títulos DISTINTOS
 * existem entre as nove rotas**. O defeito que existia dava nove títulos — todos
 * iguais, todos `'BossaOS'` — e passaria qualquer contagem de presença.
 *
 * O mesmo para a descrição, e com uma segunda volta: quantas descrições
 * distintas existem **entre as três línguas** da mesma rota. Uma só significa
 * a portuguesa servida também em espanhol, que era literalmente o caso.
 */

const FASE = process.env.RV100_FASE ?? '';
const DESTINO = 'docs/visual/rv100/2026-09-06_e953a87/evidence/seo';

async function lerCabeca(pagina: import('@playwright/test').Page) {
  return pagina.evaluate(() => {
    const meta = (n: string) =>
      document.querySelector<HTMLMetaElement>(`meta[name="${n}"]`)?.content ?? null;
    const prop = (p: string) =>
      document.querySelector<HTMLMetaElement>(`meta[property="${p}"]`)?.content ?? null;
    return {
      titulo: document.title || null,
      descricao: meta('description'),
      robots: meta('robots'),
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
      hreflang: Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]'))
        .map((l) => l.hreflang).sort(),
      ogTitulo: prop('og:title'),
      ogImagem: prop('og:image'),
      ogAlt: prop('og:image:alt'),
      ogLocale: prop('og:locale'),
      icones: Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
        .map((l) => l.getAttribute('href')),
    };
  });
}

test.describe('RV100 · metadados e partilha', () => {
  test.skip(!FASE, 'define RV100_FASE=antes|depois para gravar evidência');

  test('o <head> das rotas comerciais, nas três línguas', async ({ page }) => {
    test.setTimeout(300_000);
    const recolha: Record<string, unknown>[] = [];

    for (const idioma of IDIOMAS) {
      for (const rota of ROTAS_INDEXAVEIS) {
        const resposta = await page.goto(`/${idioma}${rota}`, { waitUntil: 'domcontentloaded' });
        expect(resposta?.status(), `${idioma}${rota}`).toBeLessThan(400);
        recolha.push({ idioma, rota: rota || '/', ...await lerCabeca(page) });
      }
    }

    // ── As rotas que NÃO se podem indexar ──────────────────────────────────
    const naoIndexaveis: Record<string, unknown>[] = [];
    for (const caminho of ['/demo/thanks', '/404', '/app', '/staff', '/auth/login']) {
      const r = await page.goto(`/es-ES${caminho}`, { waitUntil: 'domcontentloaded' });
      const estado = r?.status() ?? 0;
      naoIndexaveis.push({
        caminho, estado,
        // Um 404 ou um redireccionamento já basta; o que não pode é responder
        // 200 com `index` ligado.
        ...(estado < 400 ? await lerCabeca(page) : { robots: null, titulo: null }),
      });
    }

    // ── sitemap e robots ───────────────────────────────────────────────────
    const sitemap = await page.goto('/sitemap.xml', { waitUntil: 'domcontentloaded' });
    const sitemapTexto = sitemap && sitemap.status() < 400 ? await sitemap.text() : '';
    const robots = await page.goto('/robots.txt', { waitUntil: 'domcontentloaded' });
    const robotsTexto = robots && robots.status() < 400 ? await robots.text() : '';

    const distintos = (campo: string) =>
      Object.fromEntries(IDIOMAS.map((idi) => [
        idi,
        new Set(recolha.filter((r) => r.idioma === idi).map((r) => r[campo])).size,
      ]));

    // Quantas descrições distintas tem a MESMA rota entre as três línguas.
    // Uma só = a mesma cadeia servida nas três, que é o defeito que existia.
    const porRota = Object.fromEntries(ROTAS_INDEXAVEIS.map((rota) => [
      rota || '/',
      new Set(recolha.filter((r) => r.rota === (rota || '/')).map((r) => r.descricao)).size,
    ]));

    const resumo = {
      paginas: recolha.length,
      titulosDistintos: distintos('titulo'),
      descricoesDistintas: distintos('descricao'),
      descricoesDistintasPorRota: porRota,
      comCanonical: recolha.filter((r) => r.canonical).length,
      comHreflangCompleto: recolha.filter(
        (r) => Array.isArray(r.hreflang) && (r.hreflang as string[]).length >= IDIOMAS.length).length,
      comOgImagem: recolha.filter((r) => r.ogImagem).length,
      comIcone: recolha.filter((r) => Array.isArray(r.icones) && (r.icones as string[]).length > 0).length,
      sitemap: {
        estado: sitemap?.status() ?? 0,
        entradas: (sitemapTexto.match(/<url>/g) ?? []).length,
        comAlternates: (sitemapTexto.match(/hreflang=/g) ?? []).length,
      },
      robots: {
        estado: robots?.status() ?? 0,
        temSitemap: /Sitemap:/i.test(robotsTexto),
        disallows: (robotsTexto.match(/^Disallow:/gim) ?? []).length,
      },
      naoIndexaveis,
    };

    mkdirSync(DESTINO, { recursive: true });
    writeFileSync(`${DESTINO}/${FASE}-seo.json`,
      JSON.stringify({ resumo, paginas: recolha }, null, 2) + '\n');
  });
});

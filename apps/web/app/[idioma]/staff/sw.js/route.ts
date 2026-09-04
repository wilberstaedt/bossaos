import { NextResponse } from 'next/server';
import { eIdioma } from '@bossaos/i18n';

export const dynamic = 'force-dynamic';

/**
 * O *service worker* do Staff PWA, servido de dentro do próprio âmbito.
 *
 * ── Porque é que não está em `public/sw.js` ──────────────────────────────
 *
 * Um *service worker* servido da raiz controla **a origem inteira** — o painel,
 * as páginas públicas do restaurante, tudo. Podia então guardar-se de um `if` no
 * `fetch` a ignorar o que não é do Staff, e ficava tudo dependente desse `if`
 * estar certo hoje e daqui a seis meses.
 *
 * Servido daqui, o âmbito por omissão é `/<idioma>/staff/`, e o painel fica fora
 * do alcance **pela forma** e não pelo cuidado. É a mesma escolha da partição da
 * fila: uma chave não se esquece, um filtro esquece-se.
 *
 * ── E não guarda HTML autenticado. Nunca ─────────────────────────────────
 *
 * É a decisão que mais importa aqui, e é de segurança e não de desempenho. Um
 * tablet de sala é **partilhado**: guardar a página do turno da tarde e servi-la
 * ao turno da noite era a regra 3 do contrato quebrada pela porta das traseiras —
 * o operador seguinte a ler nome de cliente e totais do anterior, sem sessão
 * nenhuma e sem deixar rasto.
 *
 * Por isso a cache leva **só** o que não é de ninguém: os artefactos estáticos do
 * Next, que são imutáveis e têm o resumo no nome, e a casca de «sem rede». Uma
 * navegação sem rede não recebe uma página velha a fingir que é de agora —
 * recebe a casca, que diz o que se passa e mostra o que **este** aparelho tem
 * gravado.
 */
export async function GET(_pedido: Request, ctx: { params: Promise<{ idioma: string }> }) {
  const { idioma } = await ctx.params;
  if (!eIdioma(idioma)) return NextResponse.json({ erro: 'idioma' }, { status: 404 });

  const casca = `/${idioma}/staff/offline`;
  const js = `// gerado por app/[idioma]/staff/sw.js/route.ts — não editar no navegador
const CACHE = 'bossaos-staff-v1-${idioma}';
const CASCA = '${casca}';

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Só a casca. Nada de páginas com dados de ninguém.
    await cache.add(new Request(CASCA, { credentials: 'omit' }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nome of await caches.keys()) {
      if (nome.startsWith('bossaos-staff-') && nome !== CACHE) await caches.delete(nome);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  // Artefactos imutáveis do Next: o resumo está no nome, portanto a cache nunca
  // serve uma versão velha de uma coisa que mudou. E não são de ninguém.
  if (url.pathname.startsWith('/_next/static/')) {
    evento.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const guardado = await cache.match(pedido);
      if (guardado) return guardado;
      const resposta = await fetch(pedido);
      if (resposta.ok) await cache.put(pedido, resposta.clone());
      return resposta;
    })());
    return;
  }

  // Navegação: rede primeiro, SEMPRE, e a resposta NÃO se guarda. Sem rede, a
  // casca — que não tem dados de ninguém e mostra o que este aparelho gravou.
  if (pedido.mode === 'navigate') {
    evento.respondWith((async () => {
      try {
        return await fetch(pedido);
      } catch {
        const cache = await caches.open(CACHE);
        const casca = await cache.match(CASCA);
        if (casca) return casca;
        throw new Error('sem rede e sem casca');
      }
    })());
    return;
  }

  // Tudo o resto passa. Em particular as chamadas à API: uma resposta de API
  // guardada é um dado de inquilino em cache, e é exactamente o que não se faz.
});
`;

  return new NextResponse(js, {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      // Sem cache: um *service worker* velho é a coisa mais difícil de despejar
      // de um aparelho que já não está à mão.
      'cache-control': 'no-cache',
    },
  });
}

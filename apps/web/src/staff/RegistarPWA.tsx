'use client';

import { useEffect } from 'react';

/**
 * Regista o *service worker* do Staff.
 *
 * ── E desregista-o quando o navegador não o suporta ou falha ─────────────
 *
 * Não há aqui um `catch` mudo. Um registo falhado deixa a aplicação a funcionar
 * exactamente como antes — rede primeiro, sem casca offline — e isso é uma
 * degradação honesta, não um erro a esconder. O que **não** pode acontecer é o
 * registo falhar e alguém julgar que tem funcionamento offline: por isso a
 * mensagem vai para a consola, onde a prova de navegador a lê.
 */
export function RegistarPWA({ idioma }: { idioma: string }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.info('[staff] sem service worker neste navegador: sem casca offline');
      return;
    }
    navigator.serviceWorker
      // O âmbito vem do sítio de onde o guião é servido: `/<idioma>/staff/`. O
      // painel fica fora do alcance pela forma, e não por um `if` no `fetch`.
      .register(`/${idioma}/staff/sw.js`)
      .then(() => console.info('[staff] service worker registado'))
      .catch((erro: unknown) => {
        console.warn('[staff] service worker NÃO registado, sem casca offline:', erro);
      });
  }, [idioma]);

  return null;
}

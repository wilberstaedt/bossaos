import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

/**
 * O ícone do atalho. SVG, e desenhado aqui em vez de ser um binário no `public/`.
 *
 * Um `.png` no repositório é um ficheiro que ninguém revê e que envelhece sem
 * dar sinal. Isto é texto: entra na revisão como o resto do código, e `sizes:
 * "any"` num SVG cobre todos os tamanhos que o sistema peça.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" role="img" aria-label="BossaOS">
  <rect width="192" height="192" rx="36" fill="#1f2933"/>
  <path d="M52 60h48a26 26 0 0 1 0 52H52z" fill="none" stroke="#ffffff" stroke-width="14"
        stroke-linejoin="round"/>
  <path d="M52 112h56a26 26 0 0 1 0 52H52z" fill="none" stroke="#f5b400" stroke-width="14"
        stroke-linejoin="round"/>
</svg>`;

export function GET() {
  return new NextResponse(SVG, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=86400',
    },
  });
}

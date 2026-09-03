import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { IDIOMAS, eIdioma } from '@bossaos/i18n';
import '@bossaos/ui/estilos.css';

/**
 * Rubik e Noto Sans, servidas por nós.
 *
 * São **fontes variáveis**: um ficheiro por família cobre o intervalo de peso,
 * e por isso `weight` é um intervalo e não um número. Declarar dois pesos com o
 * mesmo binário faria o browser descarregar o mesmo ficheiro duas vezes.
 * Licenças ao lado dos ficheiros, em `src/fontes/` (SIL OFL 1.1).
 */
const rubik = localFont({
  src: [
    { path: '../../src/fontes/rubik-latin.woff2', weight: '500 700', style: 'normal' },
    { path: '../../src/fontes/rubik-latin-ext.woff2', weight: '500 700', style: 'normal' },
  ],
  variable: '--fonte-rubik',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

const noto = localFont({
  src: [
    { path: '../../src/fontes/noto-sans-latin.woff2', weight: '400 600', style: 'normal' },
    { path: '../../src/fontes/noto-sans-latin-ext.woff2', weight: '400 600', style: 'normal' },
  ],
  variable: '--fonte-noto',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'BossaOS',
  description: 'Sistema operativo do restaurante.',
};

/** Os três idiomas são gerados em build: não há negociação em tempo de pedido. */
export function generateStaticParams() {
  return IDIOMAS.map((idioma) => ({ idioma }));
}

export default async function LayoutRaiz({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ idioma: string }>;
}) {
  const { idioma } = await params;
  // Um idioma inventado no endereço dá 404 e não um ecrã em espanhol a fingir
  // que é o pedido — `/fr-FR/...` não existe, e dizê-lo é mais honesto.
  if (!eIdioma(idioma)) notFound();

  return (
    <html lang={idioma} className={`${rubik.variable} ${noto.variable}`}>
      <body>{children}</body>
    </html>
  );
}

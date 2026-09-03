import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { eIdioma } from '@bossaos/i18n';
import '@bossaos/ui/estilos.css';

/**
 * A moldura da carta pública.
 *
 * ── Isto faltava, e a inspecção de móvel foi quem o disse ──────────────────
 *
 * O `/r/` fica **fora** de `app/[idioma]/`, porque o idioma da carta vive no
 * segundo segmento — é o endereço que vai impresso num QR, e um QR não se
 * reimprime. O efeito lateral, que não estava à vista: a carta pública era
 * servida **sem a folha de estilos**. Nenhum `<html>`, nenhuma fonte, nenhum
 * token de cor.
 *
 * O sintoma foi um alvo de toque de 18 px onde o CSS declara 44, e apareceu na
 * primeira passagem da prova de móvel do E10. `pnpm build` estava verde, o
 * `validar-classes.sh` estava verde — todas as classes existiam no ficheiro,
 * simplesmente o ficheiro não chegava à página. É o mesmo padrão do
 * `var(--bo-primaria-texto)` do E02: o navegador não se queixa de estilo que não
 * chega, herda o que houver e desenha.
 *
 * ── Duas coisas que esta moldura faz e a do painel não ─────────────────────
 *
 * `robots: index` — a carta de um restaurante existe para ser encontrada, ao
 * contrário do painel. E o `<title>` leva o nome do sítio e não "BossaOS": quem
 * partilha o link partilha o restaurante, não o fornecedor de software.
 */

const rubik = localFont({
  src: [
    { path: '../../../../src/fontes/rubik-latin.woff2', weight: '500 700', style: 'normal' },
    { path: '../../../../src/fontes/rubik-latin-ext.woff2', weight: '500 700', style: 'normal' },
  ],
  variable: '--fonte-rubik',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

const noto = localFont({
  src: [
    { path: '../../../../src/fontes/noto-sans-latin.woff2', weight: '400 600', style: 'normal' },
    { path: '../../../../src/fontes/noto-sans-latin-ext.woff2', weight: '400 600', style: 'normal' },
  ],
  variable: '--fonte-noto',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'Carta',
  robots: { index: true, follow: true },
};

export default async function MolduraDaCartaPublica({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Um idioma inventado no endereço dá 404 e não uma carta em espanhol a fingir
  // que é o pedido.
  if (!eIdioma(locale)) notFound();

  return (
    <html lang={locale} className={`${rubik.variable} ${noto.variable}`}>
      <body>{children}</body>
    </html>
  );
}

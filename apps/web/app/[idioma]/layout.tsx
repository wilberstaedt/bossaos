import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { IDIOMAS, eIdioma } from '@bossaos/i18n';
import { ORIGEM } from '../../src/seo/origem.ts';
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

/**
 * O que esta moldura declara, e porque é tão pouco.
 *
 * ── O que estava aqui, e porque estava errado ─────────────────────────────
 *
 * Um objecto ESTÁTICO com `title: 'BossaOS'` e uma descrição **em português**,
 * para as rotas comerciais todas — a espanhola incluída, que é a língua do
 * piloto. Três construções estáticas (o `generateStaticParams` está três linhas
 * abaixo) a servir a mesma descrição na língua errada em duas delas.
 *
 * ── E porque é que agora a omissão é NÃO INDEXAR ──────────────────────────
 *
 * Debaixo de `/[idioma]` não vivem só as rotas comerciais: vivem `/app`,
 * `/staff`, `/kds`, `/pos`, `/kiosk`, `/auth`, `/interno`, `/platform` e
 * `/onboarding`. O §6.8 manda pôr «páginas autenticadas, previews e tokens fora
 * de indexação».
 *
 * Havia duas maneiras. Enumerar as autenticadas e negá-las uma a uma — e a
 * próxima nasce indexável, porque ninguém se lembra de a acrescentar a uma
 * lista de negação. Ou **negar por omissão e obrigar a comercial a pedir**, que
 * é o que está aqui: `metadadosDaRota` põe `index: true` explicitamente em cada
 * uma das nove.
 *
 * A diferença mede-se no defeito que cada uma deixa passar: com lista de
 * negação, uma rota de sessão nova aparece no Google; com negação por omissão,
 * uma rota comercial nova não aparece — e essa nota-se, porque alguém a quer lá.
 * **Entre os dois erros, escolho o que se descobre.**
 *
 * O `metadataBase` fica aqui porque é o mesmo para tudo, e sem ele o
 * `canonical` relativo de qualquer rota resolveria contra o endereço do pedido.
 */
export const metadata: Metadata = {
  title: 'BossaOS',
  description: 'Sistema operativo do restaurante.',
  metadataBase: new URL(ORIGEM),
  robots: { index: false, follow: false },
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

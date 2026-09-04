import type { Metadata } from 'next';
import type { Idioma } from '@bossaos/i18n';
import { NaoEncontrado } from '../../../src/componentes/NaoEncontrado.tsx';

/** MKT-012 · o endereço mensurável. O 404 a sério está em `not-found.tsx`. */
export const dynamic = 'force-static';

export const metadata: Metadata = {
  // Responde 200 de propósito, para poder ser medido. Um "não encontrado" com
  // 200 nos resultados de pesquisa é o pior dos dois mundos.
  robots: { index: false, follow: false },
};

export default async function Pagina404({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  return <NaoEncontrado idioma={idioma} />;
}

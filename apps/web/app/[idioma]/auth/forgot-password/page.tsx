import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { FormaRecuperar } from '../../../../src/componentes/FormasDeAcesso.tsx';

export const dynamic = 'force-static';

/** AUTH-003 · Recupera tu acceso */
export default async function Recuperar({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  return <FormaRecuperar textos={mensagensDe(idioma).recuperar} />;
}

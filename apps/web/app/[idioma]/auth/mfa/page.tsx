import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { FormaMfa } from '../../../../src/componentes/FormasDeAcesso.tsx';

export const dynamic = 'force-static';

/** AUTH-005 · Verificación en dos pasos */
export default async function Mfa({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  return <FormaMfa textos={mensagensDe(idioma).mfa} />;
}

import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { FormaNovaSenha } from '../../../../src/componentes/FormasDeAcesso.tsx';

export const dynamic = 'force-dynamic';

/**
 * AUTH-004 · Crea una nueva contraseña
 *
 * O token vem do endereço — é o que o email trouxe. Não é lido aqui para nada a
 * não ser reenviá-lo à biblioteca, que é quem o valida.
 */
export default async function NovaSenha({
  params,
  searchParams,
}: {
  params: Promise<{ idioma: Idioma }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { idioma } = await params;
  const { token } = await searchParams;
  return <FormaNovaSenha textos={mensagensDe(idioma).novaSenha} token={token ?? ''} />;
}

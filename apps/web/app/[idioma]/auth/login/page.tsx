import { IDIOMAS, NOME_DO_IDIOMA, mensagensDe, type Idioma } from '@bossaos/i18n';
import { FormaEntrar } from '../../../../src/componentes/FormasDeAcesso.tsx';

export const dynamic = 'force-static';

/** AUTH-001 · Accede a BossaOS */
export default async function Entrar({ params }: { params: Promise<{ idioma: Idioma }> }) {
  const { idioma } = await params;
  const m = mensagensDe(idioma);
  return (
    <FormaEntrar
      textos={m.entrar}
      hrefRecuperar="./forgot-password"
      idiomas={IDIOMAS.map((i) => ({ valor: i, rotulo: NOME_DO_IDIOMA[i] }))}
    />
  );
}

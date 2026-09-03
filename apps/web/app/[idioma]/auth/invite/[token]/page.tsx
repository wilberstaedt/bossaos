import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { FormaDeConvite } from '../../../../../src/componentes/FormaDeConvite.tsx';

export const dynamic = 'force-dynamic';

/**
 * AUTH-006 · Te han invitado a {organização}
 *
 * A tela mostra o que o convite diz. **Não deixa escolher nada disso** — e o que
 * garante isso não é o `readOnly` do campo, é o servidor: `aceitarConvite` não
 * tem por onde receber um papel.
 */
export default async function Convite({
  params,
}: {
  params: Promise<{ idioma: Idioma; token: string }>;
}) {
  const { idioma, token } = await params;
  const m = mensagensDe(idioma);

  const cabecalhos = await headers();
  const base = `${cabecalhos.get('x-forwarded-proto') ?? 'http'}://${cabecalhos.get('host')}`;
  const r = await fetch(`${base}/api/convites/${token}`, { cache: 'no-store' });
  if (!r.ok) notFound();

  const convite = (await r.json()) as {
    organizacao: string; papel: string; unidade: string | null;
    estado: string; expirado: boolean;
  };

  if (convite.estado !== 'PENDENTE' || convite.expirado) {
    const motivo =
      convite.estado === 'REVOGADO' ? m.convite.revogado
      : convite.estado === 'ACEITE' ? m.convite.jaUsado
      : m.convite.expirado;
    return (
      <>
        <h1>{m.convite.titulo.replace('{organizacao}', convite.organizacao)}</h1>
        <Aviso tom="aviso" titulo={motivo} />
      </>
    );
  }

  return (
    <FormaDeConvite
      token={token}
      convite={{ ...convite, email: '' }}
      textos={m.convite}
    />
  );
}

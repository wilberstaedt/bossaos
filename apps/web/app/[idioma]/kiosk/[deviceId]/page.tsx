import { redirect } from 'next/navigation';
import { Etiqueta } from '@bossaos/ui';
import { IDIOMAS, type Idioma } from '@bossaos/i18n';
import { carregarKiosk } from '../../../../src/kiosk/carregar-kiosk.ts';
import { CabecalhoDoKiosk, textosDoKiosk } from '../../../../src/kiosk/PecasDoKiosk.tsx';

export const dynamic = 'force-dynamic';

/**
 * KIOSK-001 · «Bienvenido a La Societat» (atlas p. 214)
 *
 * ── A primeira tela é a que separa dois clientes ───────────────────────────
 *
 * Chegar aqui é o acto que declara «sou outra pessoa». E a separação não se faz
 * aqui: já está feita pela estrutura — a sessão anterior fecha-se como
 * ABANDONADA quando esta abre, e a base não deixa duas vivas no mesmo aparelho.
 *
 * O que esta tela faz é só **oferecer a língua**, e nem isso é enfeite: um menu
 * na língua errada é uma pessoa a pedir o que não queria comer.
 */
export default async function KioskInicio({
  params,
}: {
  params: Promise<{ idioma: Idioma; deviceId: string }>;
}) {
  const { idioma, deviceId } = await params;
  const s = textosDoKiosk(idioma);
  const { kiosk, disponibilidade } = await carregarKiosk(deviceId);

  // O terminal pausado não mostra carta nenhuma. Uma cobrança por resolver
  // pausa a máquina, e deixar alguém começar um pedido por cima dela era
  // empilhar um problema de dinheiro em cima de outro.
  if (!disponibilidade.disponivel) redirect(`/${idioma}/kiosk/${deviceId}/pausado`);

  return (
    <div className="bo-pagina">
      <CabecalhoDoKiosk sobrancelha={kiosk.nome} titulo={s.bemVindo} tela="KIOSK-001" />

      <h2>{s.escolheIdioma}</h2>
      <ul className="bo-lista" data-teste="idiomas">
        {IDIOMAS.map((lingua) => (
          <li key={lingua}>
            <a
              className="bo-lista__ligacao"
              data-seccao="KIOSK-002"
              data-teste="idioma"
              href={`/${lingua}/kiosk/${deviceId}/menu`}
            >
              <span>{lingua}</span>
              {lingua === idioma ? <Etiqueta tom="neutro">{s.escolheIdioma}</Etiqueta> : null}
            </a>
          </li>
        ))}
      </ul>

      <p className="bo-campo__ajuda">{s.comecar}</p>
    </div>
  );
}

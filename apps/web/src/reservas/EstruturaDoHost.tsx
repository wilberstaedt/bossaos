import type { ReactNode } from 'react';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { NavegacaoDeReservas } from './NavegacaoDeReservas.tsx';

/**
 * O cabeçalho e a navegação que as onze telas do host partilham.
 *
 * Existe para que a navegação seja escrita UMA vez: a lição do E15 é que um
 * `data-tela` numa ligação faz cada página anunciar-se como todas as outras, e
 * onze cópias de um cabeçalho são onze sítios onde isso pode voltar.
 */
export function EstruturaDoHost({
  idioma, orgSlug, locationSlug, unidade, tela, titulo, activa, accao, children,
}: {
  idioma: Idioma; orgSlug: string; locationSlug: string; unidade: string;
  tela: string; titulo: string; activa: string; accao?: ReactNode; children: ReactNode;
}) {
  const m = mensagensDe(idioma);
  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade}</p>
          <h1 data-tela={tela}>{titulo}</h1>
        </div>
        {accao}
      </div>
      <NavegacaoDeReservas idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
                           activa={activa} rotulos={m.reservasE18} rotulosDoHost={m.hostE19} />
      {children}
    </div>
  );
}

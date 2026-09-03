import type { ReactNode } from 'react';

export interface EstruturaStaffProps {
  titulo: string;
  topoDireita?: ReactNode;
  rotuloSaltar: string;
  children: ReactNode;
}

/**
 * Estrutura do Staff (sala).
 *
 * Uma coluna, sem barra lateral, alvos de 48 px: usa-se de pé, com um
 * telemóvel numa mão. Tudo o que exigisse navegação lateral seria mexido com o
 * polegar a meio de um serviço.
 */
export function EstruturaStaff({ titulo, topoDireita, rotuloSaltar, children }: EstruturaStaffProps) {
  return (
    <div className="bo-staff">
      <a className="bo-saltar" href="#conteudo">
        {rotuloSaltar}
      </a>
      <header className="bo-staff__topo bo-inverso">
        <h1 style={{ fontSize: 20, lineHeight: '28px' }}>{titulo}</h1>
        {topoDireita}
      </header>
      <main className="bo-staff__conteudo" id="conteudo">
        {children}
      </main>
    </div>
  );
}

export interface EstruturaKdsProps {
  titulo: string;
  topoDireita?: ReactNode;
  children: ReactNode;
}

/**
 * Estrutura do KDS/TPV.
 *
 * Fundo escuro, corpo a 18 px, grelha de cartões e alvos de operação. O manual
 * (p. 17, "leitura a distância no KDS") pede inspecção **à distância real de
 * uso** — isso é uma verificação humana num ecrã de cozinha, e está declarada
 * como pendência no E02 em vez de dada por feita.
 */
export function EstruturaKds({ titulo, topoDireita, children }: EstruturaKdsProps) {
  return (
    <div className="bo-kds bo-inverso">
      <header className="bo-kds__topo">
        <h1 style={{ fontSize: 24, lineHeight: '30px' }}>{titulo}</h1>
        {topoDireita}
      </header>
      <div className="bo-kds__grelha">{children}</div>
    </div>
  );
}

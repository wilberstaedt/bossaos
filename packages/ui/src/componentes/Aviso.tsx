import type { ReactNode } from 'react';

export type TomDeAviso = 'info' | 'sucesso' | 'aviso' | 'perigo';

export interface AvisoProps {
  tom?: TomDeAviso;
  titulo: string;
  children?: ReactNode;
  /**
   * `alert` interrompe o leitor de ecrã; `status` espera a pausa seguinte.
   * Um erro que acabou de acontecer justifica interromper. Uma informação que
   * já estava na página, não — e usar `alert` para tudo treina as pessoas a
   * ignorá-lo.
   */
  urgente?: boolean;
}

export function Aviso({ tom = 'info', titulo, children, urgente = false }: AvisoProps) {
  return (
    <div className={`bo-aviso bo-aviso--${tom}`} role={urgente ? 'alert' : 'status'}>
      <div>
        <p className="bo-aviso__titulo">{titulo}</p>
        {children ? <div className="bo-aviso__corpo">{children}</div> : null}
      </div>
    </div>
  );
}

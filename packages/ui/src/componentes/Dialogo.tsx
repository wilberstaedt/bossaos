'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface DialogoProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  accoes?: ReactNode;
  /** Gaveta: entra pelo lado em ecrã largo e por baixo no telemóvel. */
  variante?: 'dialogo' | 'gaveta';
}

/**
 * Diálogo e gaveta, sobre o `<dialog>` nativo.
 *
 * `showModal()` dá de graça três coisas que quase toda a gente reimplementa mal:
 * o foco fica **preso** dentro do diálogo, `Escape` fecha, e ao fechar o foco
 * **volta ao elemento que o abriu**. Essa última é o aceite 2 do E02, e é a que
 * mais se perde numa implementação à mão — quem fecha um modal com o teclado
 * fica atirado para o topo da página e perde o sítio onde estava.
 *
 * O `cancel` (Escape) é encaminhado para `aoFechar` para o estado do React não
 * ficar a achar que o diálogo continua aberto depois de o browser o ter fechado.
 */
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  children,
  accoes,
  variante = 'dialogo',
}: DialogoProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const aoCancelar = (e: Event) => {
      e.preventDefault();
      aoFechar();
    };
    el.addEventListener('cancel', aoCancelar);
    return () => el.removeEventListener('cancel', aoCancelar);
  }, [aoFechar]);

  const classe = variante === 'gaveta' ? 'bo-gaveta' : 'bo-dialogo';
  const corpo = variante === 'gaveta' ? 'bo-gaveta__corpo' : 'bo-dialogo__corpo';

  return (
    <dialog ref={ref} className={classe} aria-labelledby={`${classe}-titulo`}>
      <div className={corpo}>
        <h2 id={`${classe}-titulo`}>{titulo}</h2>
        {children}
        {accoes ? <div className="bo-dialogo__accoes">{accoes}</div> : null}
      </div>
    </dialog>
  );
}

export function Gaveta(props: Omit<DialogoProps, 'variante'>) {
  return <Dialogo {...props} variante="gaveta" />;
}

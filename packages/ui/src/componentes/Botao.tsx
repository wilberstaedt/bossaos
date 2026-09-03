import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type TomDoBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma';
/** `publico` = alvo de 44 px, `operacao` = 48 px. Padrão interno, CT-13. */
export type Densidade = 'publico' | 'operacao';

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tom?: TomDoBotao;
  densidade?: Densidade;
  largo?: boolean;
  /** Em curso: marca `aria-busy` e desactiva, sem trocar o rótulo por um símbolo. */
  aCarregar?: boolean;
  children: ReactNode;
}

export function Botao({
  tom = 'primario',
  densidade = 'publico',
  largo = false,
  aCarregar = false,
  disabled,
  className,
  children,
  ...resto
}: BotaoProps) {
  const classes = [
    'bo-botao',
    `bo-botao--${tom}`,
    densidade === 'operacao' && 'bo-botao--operacao',
    largo && 'bo-botao--largo',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || aCarregar}
      aria-busy={aCarregar || undefined}
      {...resto}
    >
      {children}
    </button>
  );
}

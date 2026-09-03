import type { HTMLAttributes, ReactNode } from 'react';

export interface CartaoProps extends HTMLAttributes<HTMLDivElement> {
  variante?: 'elevado' | 'contornado' | 'suave';
  titulo?: ReactNode;
  children: ReactNode;
}

export function Cartao({ variante = 'elevado', titulo, className, children, ...resto }: CartaoProps) {
  const classes = [
    'bo-cartao',
    variante === 'contornado' && 'bo-cartao--contornado',
    variante === 'suave' && 'bo-cartao--suave',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...resto}>
      {titulo ? <h3 className="bo-cartao__titulo">{titulo}</h3> : null}
      {children}
    </div>
  );
}

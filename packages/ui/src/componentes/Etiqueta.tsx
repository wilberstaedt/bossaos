import type { ReactNode } from 'react';

export type TomDeEtiqueta = 'neutro' | 'sucesso' | 'aviso' | 'perigo' | 'info' | 'realce';

export interface EtiquetaProps {
  tom?: TomDeEtiqueta;
  children: ReactNode;
}

/**
 * Cápsula de estado.
 *
 * O conteúdo é sempre texto. O manual (p. 16) é explícito: "sempre combinar cor
 * com texto ou ícone" — uma cápsula que fosse só um ponto colorido não diria
 * nada a quem não distingue as cores, e num painel de pedidos isso é o sinal
 * mais importante do ecrã.
 */
export function Etiqueta({ tom = 'neutro', children }: EtiquetaProps) {
  const classe = tom === 'neutro' ? 'bo-etiqueta' : `bo-etiqueta bo-etiqueta--${tom}`;
  return <span className={classe}>{children}</span>;
}

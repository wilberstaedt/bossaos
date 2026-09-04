import type { ReactNode } from 'react';

/**
 * A casca do KDS.
 *
 * ── Lê-se a um metro e meio, com as mãos ocupadas ─────────────────────────
 *
 * Não é estética: é a superfície onde alguém de pé, com o restaurante cheio,
 * tem de saber num relance o que está mais atrasado. Uma coluna, corpo maior,
 * alvos de operação — e o mesmo `bo-kds` que o E02 já tinha desenhado para isto.
 */
export default function CascaDoKds({ children }: { children: ReactNode }) {
  return <div className="bo-kds">{children}</div>;
}

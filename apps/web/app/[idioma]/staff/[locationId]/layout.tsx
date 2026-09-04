import type { ReactNode } from 'react';

/**
 * A casca do Staff PWA (E15).
 *
 * ── Larga, com alvos grandes, e sem colunas ──────────────────────────────
 *
 * «O fluxo essencial cabe no telemóvel com toque amplo» é aceite, não estética.
 * Esta casca não tem barra lateral nem grelha: é uma coluna, com o conteúdo a
 * ocupar a largura toda e os controlos com 44 px de alvo. Medir isto só a 1280 px
 * seria não medir — a régua reprova-o à cabeça.
 */
export default function CascaDoStaff({ children }: { children: ReactNode }) {
  return <div className="bo-staff">{children}</div>;
}

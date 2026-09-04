import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { RegistarPWA } from '../../../../src/staff/RegistarPWA.tsx';

/**
 * A casca do Staff PWA (E15).
 *
 * ── Larga, com alvos grandes, e sem colunas ──────────────────────────────
 *
 * «O fluxo essencial cabe no telemóvel com toque amplo» é aceite, não estética.
 * Esta casca não tem barra lateral nem grelha: é uma coluna, com o conteúdo a
 * ocupar a largura toda e os controlos com 48 px de alvo. Medir isto só a
 * 1280 px seria não medir — a régua reprova-o à cabeça.
 *
 * ── E o manifesto é POR UNIDADE ──────────────────────────────────────────
 *
 * O atalho no telemóvel de quem trabalha naquela sala abre naquela sala. Um
 * manifesto único na raiz punha toda a gente a escolher a unidade outra vez em
 * cada turno, que é a diferença entre uma aplicação e um marcador.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ idioma: string; locationId: string }> },
): Promise<Metadata> {
  const { idioma, locationId } = await params;
  // O `viewport` NÃO vai aqui. Fui escrevê-lo e depois olhei para o HTML que já
  // se gera: o Next põe `width=device-width, initial-scale=1` por omissão em
  // todas as páginas. Acrescentá-lo era uma segunda declaração da mesma coisa —
  // e duas declarações da mesma coisa é como se descobre, um dia, que discordam.
  return { manifest: `/${idioma}/staff/${locationId}/manifest.webmanifest` };
}

export default async function CascaDoStaff({
  children, params,
}: {
  children: ReactNode;
  params: Promise<{ idioma: string; locationId: string }>;
}) {
  const { idioma } = await params;
  return (
    <div className="bo-staff">
      <RegistarPWA idioma={idioma} />
      {children}
    </div>
  );
}

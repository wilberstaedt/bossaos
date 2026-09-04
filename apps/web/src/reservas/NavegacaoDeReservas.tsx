import type { Idioma } from '@bossaos/i18n';

/**
 * As secções de reservas.
 *
 * ── `data-seccao` nas ligações, `data-tela` só no cabeçalho ────────────────
 *
 * A lição que o E15 pagou caro: a navegação aparece em TODAS as páginas, e um
 * `data-tela` numa ligação faz cada página anunciar-se como todas as outras. O
 * marcador da tela pertence ao `h1` — «esta página identifica-se a si própria» —
 * e as ligações levam outro atributo.
 */
export const SECCOES_DE_RESERVAS = [
  { rota: '/regras', chave: 'regras', tela: 'RES-B-012' },
  { rota: '/capacidade', chave: 'capacidade', tela: 'RES-B-013' },
  { rota: '/turnos', chave: 'turnos', tela: 'RES-B-014' },
  { rota: '/bloqueios', chave: 'bloqueios', tela: 'RES-B-015' },
  { rota: '/politicas', chave: 'politicas', tela: 'RES-B-016' },
] as const;

export function NavegacaoDeReservas({
  idioma, orgSlug, locationSlug, activa, rotulos,
}: {
  idioma: Idioma; orgSlug: string; locationSlug: string; activa: string;
  rotulos: { seccao: string } & Record<string, unknown>;
}) {
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/reservations`;
  return (
    <nav className="bo-publico__seccoes" aria-label={rotulos.seccao} data-teste="navegacao">
      {SECCOES_DE_RESERVAS.map((s) => (
        <a key={s.rota}
           data-seccao={s.tela}
           aria-current={activa === s.rota ? 'page' : undefined}
           href={`${base}${s.rota}`}>{String(rotulos[s.chave] ?? s.tela)}</a>
      ))}
    </nav>
  );
}

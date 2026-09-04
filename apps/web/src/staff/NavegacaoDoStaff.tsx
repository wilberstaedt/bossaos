import { mensagensDe, type Idioma } from '@bossaos/i18n';

/**
 * A navegação do Staff PWA, num sítio só.
 *
 * Mesma decisão das outras famílias: com a navegação copiada em dezanove
 * ficheiros, o vigésimo ecrã nasce inalcançável e ninguém repara, porque a rota
 * responde na mesma.
 */
export const SECCOES_DO_STAFF = [
  { rota: '', chave: 'turno' },
  { rota: '/zonas', chave: 'zonas' },
  { rota: '/mesas', chave: 'mesas' },
  { rota: '/avisos', chave: 'avisos' },
  { rota: '/procurar', chave: 'procurar' },
  { rota: '/perfil', chave: 'perfil' },
  { rota: '/ligacao', chave: 'ligacao' },
] as const;

export function NavegacaoDoStaff({
  idioma, locationId, actual,
}: {
  idioma: Idioma; locationId: string; actual: string;
}) {
  const s = mensagensDe(idioma).staffE15 as unknown as Record<string, string>;
  const base = `/${idioma}/staff/${locationId}`;
  return (
    <nav className="bo-publico__seccoes" aria-label={s.turno}>
      {SECCOES_DO_STAFF.map((x) => (
        <a key={x.rota} href={`${base}${x.rota}`}
           aria-current={actual === x.rota ? 'page' : undefined}>
          {s[x.chave]}
        </a>
      ))}
    </nav>
  );
}

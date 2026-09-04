import { mensagensDe, type Idioma } from '@bossaos/i18n';

/**
 * A navegação da família da sala (FLOOR-001 a 011, DEV-001 a 004).
 *
 * Uma lista, num sítio só — a mesma decisão que a `NavegacaoDoSite` do E10 e pela
 * mesma razão: com a navegação copiada em doze ficheiros, o décimo terceiro ecrã
 * nasce inalcançável e ninguém repara, porque a rota responde na mesma.
 */
export const SECCOES_DA_SALA = [
  { rota: '', chave: 'tempoReal' },
  { rota: '/zonas', chave: 'zonas' },
  { rota: '/mesas', chave: 'mesas' },
  { rota: '/plano', chave: 'plano' },
  { rota: '/combinacoes', chave: 'combinacoes' },
  { rota: '/abrir', chave: 'abrir' },
] as const;

export function NavegacaoDaSala({
  idioma, orgSlug, locationSlug, actual,
}: {
  idioma: Idioma; orgSlug: string; locationSlug: string; actual: string;
}) {
  const s = mensagensDe(idioma).salaE13 as unknown as Record<string, string>;
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/floor`;
  return (
    <nav className="bo-publico__seccoes" aria-label={s.sala}>
      {SECCOES_DA_SALA.map((x) => (
        <a key={x.rota} href={`${base}${x.rota}`}
           aria-current={actual === x.rota ? 'page' : undefined}>
          {s[x.chave]}
        </a>
      ))}
      <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/devices`}
         aria-current={actual === 'devices' ? 'page' : undefined}>
        {s.dispositivos}
      </a>
    </nav>
  );
}

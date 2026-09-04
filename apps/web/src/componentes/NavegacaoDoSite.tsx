import { mensagensDe, type Idioma } from '@bossaos/i18n';

/**
 * A navegação da família do site (WEB-001 a WEB-011 + INT-003).
 *
 * Uma lista, num sítio só. São doze ecrãs: com a navegação copiada em doze
 * ficheiros, o décimo terceiro nasce inalcançável e ninguém repara, porque a
 * rota responde na mesma. É o mesmo motivo por que a moldura pública é um
 * componente.
 */
export const SECCOES_DO_SITE = [
  { rota: '', chave: 'titulo' },
  { rota: '/paginas', chave: 'paginas' },
  { rota: '/inicio', chave: 'inicio' },
  { rota: '/sobre', chave: 'sobre' },
  { rota: '/contacto', chave: 'contacto' },
  { rota: '/novidades', chave: 'novidades' },
  { rota: '/redes', chave: 'redes' },
  { rota: '/seo', chave: 'seo' },
  { rota: '/dominio', chave: 'dominio' },
  { rota: '/previa', chave: 'previa' },
  { rota: '/publicar', chave: 'publicar' },
] as const;

export function NavegacaoDoSite({
  idioma, orgSlug, locationSlug, actual,
}: {
  idioma: Idioma; orgSlug: string; locationSlug: string; actual: string;
}) {
  const g = mensagensDe(idioma).gestaoSiteE10 as unknown as Record<string, string>;
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/website`;
  return (
    <nav className="bo-publico__seccoes" aria-label={g.titulo}>
      {SECCOES_DO_SITE.map((s) => (
        <a key={s.rota} href={`${base}${s.rota}`}
           aria-current={actual === s.rota ? 'page' : undefined}>
          {g[s.chave]}
        </a>
      ))}
      <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/integrations`}
         aria-current={actual === 'integrations' ? 'page' : undefined}>
        {g.integracoes}
      </a>
    </nav>
  );
}

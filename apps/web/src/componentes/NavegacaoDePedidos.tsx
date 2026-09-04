import { mensagensDe, type Idioma } from '@bossaos/i18n';

/** A navegação da família dos pedidos e dos relatórios (E14). Uma lista, num sítio só. */
export const SECCOES_DE_PEDIDOS = [
  { rota: '', chave: 'pedidos' },
  { rota: '/novo', chave: 'novo' },
  { rota: '/atencao', chave: 'atencao' },
] as const;

export function NavegacaoDePedidos({
  idioma, orgSlug, locationSlug, actual,
}: {
  idioma: Idioma; orgSlug: string; locationSlug: string; actual: string;
}) {
  const p = mensagensDe(idioma).pedidosE14 as unknown as Record<string, string>;
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/orders`;
  return (
    <nav className="bo-publico__seccoes" aria-label={p.pedidos}>
      {SECCOES_DE_PEDIDOS.map((s) => (
        <a key={s.rota} href={`${base}${s.rota}`}
           aria-current={actual === s.rota ? 'page' : undefined}>
          {p[s.chave]}
        </a>
      ))}
      <a href={`/${idioma}/app/${orgSlug}/${locationSlug}/reports`}
         aria-current={actual === 'reports' ? 'page' : undefined}>
        {p.servicoDeHoje}
      </a>
    </nav>
  );
}

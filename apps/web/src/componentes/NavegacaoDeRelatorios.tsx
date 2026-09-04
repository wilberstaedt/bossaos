import { mensagensDe, type Idioma } from '@bossaos/i18n';

/** A navegação dos relatórios do E14 (REP-002 a REP-007), num sítio só. */
export const SECCOES_DE_RELATORIOS = [
  { rota: '/servico', chave: 'servicoDeHoje' },
  { rota: '/canais', chave: 'vendas' },
  { rota: '/produtos', chave: 'produtosServidos' },
  { rota: '/categorias', chave: 'porCategoria' },
  { rota: '/franjas', chave: 'porFranja' },
  { rota: '/mesas', chave: 'porMesa' },
] as const;

export function NavegacaoDeRelatorios({
  idioma, orgSlug, locationSlug, actual,
}: {
  idioma: Idioma; orgSlug: string; locationSlug: string; actual: string;
}) {
  const p = mensagensDe(idioma).pedidosE14 as unknown as Record<string, string>;
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/reports`;
  return (
    <nav className="bo-publico__seccoes" aria-label={p.servicoDeHoje}>
      {SECCOES_DE_RELATORIOS.map((s) => (
        <a key={s.rota} href={`${base}${s.rota}`}
           aria-current={actual === s.rota ? 'page' : undefined}>
          {p[s.chave]}
        </a>
      ))}
    </nav>
  );
}

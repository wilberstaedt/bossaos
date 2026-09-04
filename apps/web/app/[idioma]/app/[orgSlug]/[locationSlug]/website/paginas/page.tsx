import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { NavegacaoDoSite } from '../../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../../src/site-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * WEB-002 · «Páginas de tu web» (atlas p. 246)
 *
 * A lista do que existe e do que está ligado. **Não** é um interruptor rápido:
 * ligar uma página leva-se para o ecrã dela, porque uma página ligada e vazia é
 * pior do que uma página que não existe — e é o que um interruptor solto
 * produzia, com um clique dado longe do conteúdo.
 */
const PAGINAS = [
  { tipo: 'INICIO', rota: '/inicio' },
  { tipo: 'SOBRE', rota: '/sobre' },
  { tipo: 'CONTACTO', rota: '/contacto' },
] as const;

export default async function PaginasDoSite({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const g = mensagensDe(idioma).gestaoSiteE10;
  const { unidade, rascunho } = await carregarSite(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/website`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.paginas}</h1>
        </div>
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/paginas" />
      <Aviso tom="info" titulo={g.estado}>{g.avisoRascunho}</Aviso>

      <ul className="bo-publico__lista">
        {PAGINAS.map((p) => {
          const guardada = rascunho?.paginas.find((x) => x.tipo === p.tipo);
          return (
            <li key={p.tipo} className="bo-publico__produto">
              <a href={`${base}${p.rota}`}>
                <span className="bo-publico__nome">
                  {p.tipo === 'INICIO' ? g.inicio : p.tipo === 'SOBRE' ? g.sobre : g.contacto}
                </span>
                <span className="bo-publico__preco">
                  {guardada?.visivel ? g.visivel : g.oculta}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

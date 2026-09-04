import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { NavegacaoDoSite } from '../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../src/site-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * WEB-001 · «Tu web de restaurante» (atlas p. 245)
 *
 * O painel da família: o estado do site, o endereço onde ele responde, e por
 * onde se lá chega. Não edita nada — editar é nas outras dez.
 *
 * ── O aviso que está em todos os ecrãs desta família ──────────────────────
 *
 * *«O que guardas aqui não muda a web pública até publicares.»* Aparece em cada
 * um, e não só aqui, porque quem entra por uma ligação directa a `/inicio` não
 * passou por este ecrã — e o aceite 1 do E10 é precisamente sobre não confundir
 * as duas coisas.
 */
export default async function PainelDoSite({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const g = mensagensDe(idioma).gestaoSiteE10;
  const { unidade, rascunho } = await carregarSite(idioma, orgSlug, locationSlug);

  const estado = rascunho?.estado ?? 'RASCUNHO';
  const rotuloEstado = estado === 'PUBLICADO' ? g.publicado
    : estado === 'RETIRADO' ? g.retirado : g.rascunho;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.titulo}</h1>
        </div>
        <Etiqueta tom={estado === 'PUBLICADO' ? 'sucesso' : 'neutro'}>{rotuloEstado}</Etiqueta>
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="" />

      <Aviso tom="info" titulo={g.estado}>{g.avisoRascunho}</Aviso>

      <dl className="bo-estado__factos">
        <dt>{g.estado}</dt>
        <dd>{rotuloEstado}</dd>
        <dt>{g.verPublico}</dt>
        <dd>
          {/* Sem endereço público não se inventa uma ligação: dizia-se que a web
              está no ar num sítio que devolve 404. O endereço define-se no
              CHAN-001, e o ecrã diz para onde ir. */}
          {unidade.publicSlug
            ? <a href={`/r/${unidade.publicSlug}/${idioma}`}>{`/r/${unidade.publicSlug}/${idioma}`}</a>
            : g.semEndereco}
        </dd>
        <dt>{g.paginas}</dt>
        <dd>{rascunho ? rascunho.paginas.filter((p) => p.visivel).length : 0}</dd>
        <dt>{g.novidades}</dt>
        <dd>{rascunho ? rascunho.posts.filter((p) => p.visivel).length : 0}</dd>
      </dl>
    </div>
  );
}

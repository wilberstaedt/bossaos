import { Aviso } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { projectarSite, type TipoDePagina } from '@bossaos/domain';
import { NavegacaoDoSite } from '../../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../../src/site-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * WEB-010 · «Vista previa del sitio» (atlas p. 254)
 *
 * ── Isto é o RASCUNHO, e o ecrã diz isso em voz alta ──────────────────────
 *
 * A régua do E10 reprova à cabeça um «verde sobre pré-visualização»: *«a
 * publicação prova-se na rota pública»*, porque a prévia é o mesmo processo a
 * olhar-se ao espelho.
 *
 * A prévia continua a valer para quem edita — é para isso que serve —, mas tem
 * de ser impossível confundi-la com o que está no ar. Por isso o aviso está no
 * topo e há uma ligação para o site público ao lado: quem quiser saber o que o
 * cliente vê, vai ver o que o cliente vê.
 *
 * A prévia usa a MESMA `projectarSite` que a publicação usa. Uma prévia com
 * lógica própria mostra uma coisa e publica outra — e é a segunda que o cliente
 * vê.
 */
export default async function PreviaDoSite({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const g = m.gestaoSiteE10;
  const s = m.sitioE10;
  const { unidade, rascunho } = await carregarSite(idioma, orgSlug, locationSlug);

  const previa = rascunho ? projectarSite({
    seoTitulo: rascunho.seoTitulo,
    seoDescricao: rascunho.seoDescricao,
    redes: rascunho.redes,
    paginas: rascunho.paginas.map((p) => ({
      tipo: p.tipo as TipoDePagina, visivel: p.visivel,
      titulo: p.titulo, corpo: p.corpo, contacto: p.contacto,
    })),
    posts: rascunho.posts,
  }) : null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.previa}</h1>
        </div>
        {unidade.publicSlug ? (
          <a className="bo-botao bo-botao--secundario" href={`/r/${unidade.publicSlug}/${idioma}`}>
            {g.verPublico}
          </a>
        ) : null}
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/previa" />
      <Aviso tom="aviso" titulo={g.previa}>{g.previaAviso}</Aviso>

      {previa && previa.paginas.length > 0 ? (
        previa.paginas.map((p) => (
          <section key={p.tipo} aria-labelledby={`p-${p.tipo}`}>
            <h2 id={`p-${p.tipo}`}>{p.titulo ?? p.tipo}</h2>
            <div className="bo-publico__texto">
              {p.corpo ? p.corpo.split('\n\n').map((t, i) => <p key={i}>{t}</p>) : <p>{s.semConteudo}</p>}
            </div>
          </section>
        ))
      ) : <p className="bo-publico__vazio">{s.semConteudo}</p>}

      {previa && previa.novidades.length > 0 ? (
        <section aria-labelledby="p-novidades">
          <h2 id="p-novidades">{s.novidades}</h2>
          <ul className="bo-publico__lista">
            {previa.novidades.map((n) => (
              <li key={n.slug} className="bo-publico__produto">
                <span className="bo-publico__nome">{n.titulo}</span>
                <span className="bo-publico__preco">
                  {n.publicadoEm ? n.publicadoEm.slice(0, 10) : s.semData}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

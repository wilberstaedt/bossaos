import { Aviso, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { NavegacaoDoSite } from '../../../../../../../src/componentes/NavegacaoDoSite.tsx';
import { carregarSite } from '../../../../../../../src/site-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * WEB-006 · «Novedades y eventos» (atlas p. 250)
 *
 * ── O endereço escreve-se e não se gera ───────────────────────────────────
 *
 * Um endereço derivado do título muda quando o título é corrigido, e um endereço
 * que muda parte as ligações já partilhadas — que é o que uma novidade tem de
 * mais valioso. Por isso o campo existe, e é obrigatório.
 *
 * ── Esconder e apagar são botões diferentes ───────────────────────────────
 *
 * Desmarcar `visível` tira a novidade da próxima publicação e guarda o texto.
 * Apagar remove a linha. Um botão só, chamado "remover", acabaria por fazer a
 * que quem carrega não espera — e uma delas não tem volta.
 */
export default async function NovidadesDoSite({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const { guardado, erro } = await searchParams;
  const m = mensagensDe(idioma);
  const g = m.gestaoSiteE10;
  const { unidade, rascunho } = await carregarSite(idioma, orgSlug, locationSlug);
  const accao = `/api/org/${orgSlug}/site/post`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{g.novidades}</h1>
        </div>
      </div>

      <NavegacaoDoSite idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/novidades" />
      <Aviso tom="info" titulo={g.estado}>{g.avisoRascunho}</Aviso>
      {guardado === '1' ? <Aviso tom="sucesso" titulo={m.comum.guardado}>{g.avisoRascunho}</Aviso> : null}
      {erro === 'slug' ? <Aviso tom="aviso" titulo={g.slugPost}>{g.dominioInvalido}</Aviso> : null}
      {erro === 'slug_repetido' ? <Aviso tom="aviso" titulo={g.slugPost}>{g.dominioEmUso}</Aviso> : null}

      <section aria-labelledby="lista">
        <h2 id="lista">{g.novidades}</h2>
        {rascunho && rascunho.posts.length > 0 ? (
          <ul className="bo-publico__lista">
            {rascunho.posts.map((p) => (
              <li key={p.id} className="bo-publico__produto">
                <span className="bo-publico__nome">{p.titulo}</span>
                <Etiqueta tom={p.visivel ? 'sucesso' : 'neutro'}>
                  {p.visivel ? g.visivel : g.oculta}
                </Etiqueta>
                <p className="bo-publico__descricao">/{p.slug}</p>
                <form method="post" action={accao}>
                  <input type="hidden" name="idioma" value={idioma} />
                  <input type="hidden" name="locationSlug" value={locationSlug} />
                  <input type="hidden" name="apagar" value={p.id} />
                  <button type="submit" className="bo-botao bo-botao--secundario">
                    {m.comum.cancelar}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : <p className="bo-publico__vazio">{mensagensDe(idioma).sitioE10.semNovidades}</p>}
      </section>

      <section aria-labelledby="nova">
        <h2 id="nova">{g.novoPost}</h2>
        <form method="post" action={accao} className="bo-publico__formulario">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />

          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="titulo">{g.tituloPost}</label>
            <input className="bo-campo__controlo" id="titulo" name="titulo" required maxLength={200} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="slug">{g.slugPost}</label>
            <input className="bo-campo__controlo" id="slug" name="slug" required
                   pattern="[a-z0-9]([a-z0-9-]{1,80}[a-z0-9])?" maxLength={82} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="resumo">{g.resumoPost}</label>
            <input className="bo-campo__controlo" id="resumo" name="resumo" maxLength={300} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="corpo">{g.corpo}</label>
            <textarea id="corpo" name="corpo" maxLength={8000} />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="publicadoEm">{g.dataPost}</label>
            {/* Sem data é ausência e não hoje: a página pública diz "sem data", e
                inventar a de hoje era pôr uma afirmação falsa numa página de
                eventos. */}
            <input className="bo-campo__controlo" id="publicadoEm" name="publicadoEm" type="date" />
          </div>
          <div className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="visivel">
              <input id="visivel" name="visivel" type="checkbox" />
              {' '}{g.visivel}
            </label>
          </div>

          <p><button type="submit" className="bo-botao bo-botao--primario">{g.guardar}</button></p>
        </form>
      </section>
    </div>
  );
}

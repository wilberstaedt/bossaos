import { notFound, redirect } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import {
  CAPACIDADE_DO_TEMA, destinosPublicos, estadoComercial, historicoDoTema, listarUnidades,
  podeCapacidade, rascunhoDoTema, temaActivo,
} from '@bossaos/db';
import { comEscopoDoPedido, resolverPedido } from '../../../../../../../../src/sessao.ts';

export const dynamic = 'force-dynamic';

/**
 * THEME-005 · «Publica tus nuevos colores» (atlas p. 383)
 *
 * ── O antes e o depois, lado a lado ───────────────────────────────────────
 *
 * A régua do E12 pede o par: *«uma tela que mostra o tema certo mas mostra o
 * mesmo tema para qualquer valor não está a ler nada»*. Aqui isso é literal —
 * duas colunas, o que está no ar e o que vai substituí-lo. Se forem iguais, não
 * há nada para publicar e o botão não aparece.
 *
 * ── Os destinos são CONTADOS ──────────────────────────────────────────────
 *
 * *«registre responsável e destinos»*. O responsável é quem carrega no botão — a
 * sessão, não um campo. Os destinos vêm de `destinosPublicos`, que conta o que
 * esta organização tem publicado. Uma organização sem endereço público não tem
 * destino nenhum, e a tela diz isso em vez de prometer «carta e site».
 *
 * ── E o histórico responde a "de que revisão veio" ────────────────────────
 *
 * A régua reprova à cabeça «tema aplicado sem dizer de que revisão veio». A
 * lista de baixo é a resposta: cada revisão com o seu autor, os seus destinos e
 * a nota de quando veio de um restauro.
 */
export default async function PublicarTema({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const t = m.temaE12;

  const sessao = await resolverPedido(orgSlug);
  if (!sessao.ok) redirect(`/${idioma}/auth/organizations`);

  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const unidades = await listarUnidades(db);
    return {
      unidade: unidades.find((u) => u.slug === locationSlug) ?? null,
      rascunho: await rascunhoDoTema(db, sessao.contexto.organizationId),
      activo: await temaActivo(db, sessao.contexto.organizationId),
      destinos: await destinosPublicos(db, sessao.contexto.organizationId),
      historico: await historicoDoTema(db, sessao.contexto.organizationId, 6),
      estado: await estadoComercial(db, sessao.contexto.organizationId),
    };
  });
  if (!dados.unidade) notFound();

  const podeCores = podeCapacidade(dados.estado, {
    capacidade: CAPACIDADE_DO_TEMA, intencao: 'usar',
  });
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/website/theme`;

  const linhas = [
    { rotulo: m.tema.primaria, antes: dados.activo.primaria, depois: dados.rascunho.primaria },
    { rotulo: m.tema.acento, antes: dados.activo.acento, depois: dados.rascunho.acento },
    { rotulo: m.tema.fundo, antes: dados.activo.fundo, depois: dados.rascunho.fundo },
  ];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{t.sobrancelha}</p>
          <h1>{t.publicarTitulo}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/editar`}>{t.editarAccao}</a>
      </div>

      {busca.publicado ? (
        <Aviso tom="sucesso" titulo={t.publicado}>
          {t.revisao}: {String(busca.publicado)}
        </Aviso>
      ) : null}

      <Cartao titulo={t.publicarTitulo}>
        <table className="bo-tabela">
          <thead>
            <tr>
              <th scope="col">{m.tema.sobrancelha}</th>
              <th scope="col">{t.origemPublicado}</th>
              <th scope="col">{t.origemRascunho}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.rotulo}>
                <th scope="row">{l.rotulo}</th>
                <td>
                  <span className="bo-tema__amostra bo-tema__amostra--pequena"
                        style={{ background: l.antes }} aria-hidden="true" />
                  <code className="bo-tema__valor">{l.antes.toUpperCase()}</code>
                </td>
                <td>
                  <span className="bo-tema__amostra bo-tema__amostra--pequena"
                        style={{ background: l.depois }} aria-hidden="true" />
                  <code className="bo-tema__valor">{l.depois.toUpperCase()}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="bo-estado__factos">
          <dt>{t.publicarDestinos}</dt>
          <dd>{dados.destinos.length > 0 ? dados.destinos.join(' · ') : t.publicarSemDestino}</dd>
          <dt>{t.publicarResponsavel}</dt>
          <dd>{sessao.actor.email}</dd>
        </dl>

        {dados.rascunho.porPublicar && podeCores.permitido ? (
          <form method="post" action={`/api/org/${orgSlug}/tema/rascunho`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="publicar" />
            <button className="bo-botao bo-botao--primario" type="submit">{t.publicarAccao}</button>
          </form>
        ) : (
          // Sem nada por publicar não há botão. Um botão que não faz nada ensina
          // a carregar em botões que não fazem nada.
          <p className="bo-campo__ajuda">{t.semAlteracoes}</p>
        )}
      </Cartao>

      <section aria-labelledby="historico">
        <h2 id="historico">{t.historico}</h2>
        {dados.historico.length === 0 ? (
          <p className="bo-campo__ajuda">{t.semHistorico}</p>
        ) : (
          <ul className="bo-lista">
            {dados.historico.map((r) => (
              <li key={r.id}>
                <code className="bo-tema__valor">{r.primaria.toUpperCase()}</code>
                {' · '}{formatarData(r.createdAt, idioma)}
                {' · '}{r.publicadaPor || '—'}
                {r.destinos.length > 0 ? ` · ${r.destinos.join(' ')}` : ''}
                {r.padrao ? ` · ${t.origemPadrao}` : ''}
                {r.activa ? ` · ${t.origemPublicado}` : ''}
                {r.restauraDeId ? ` · ${t.restauroDe}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

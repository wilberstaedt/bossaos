import { listarPedidos, listarProdutos, salaAgora } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import {
  CabecalhoDoStaff, porChave, textosDoStaff,
} from '../../../../../src/staff/PecasDoStaff.tsx';
import {
  SECCOES_DO_STAFF, TELAS_COM_IDENTIFICADOR,
} from '../../../../../src/staff/NavegacaoDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-022 · «Encuentra lo que necesitas» (atlas p. 181)
 *
 * ── E é também o índice de TODAS as telas do Staff ───────────────────────
 *
 * A barra do topo leva sete secções, porque dezassete a 360 px empurram o
 * conteúdo para fora do primeiro ecrã. A resposta preguiçosa a isso é escolher
 * sete e deixar as outras dez sem entrada em lado nenhum — e uma tela sem
 * caminho de navegação está tão morta como uma que não existe, com a diferença
 * de que responde a quem souber o endereço de cor e por isso ninguém repara.
 *
 * A lista sai da mesma tabela que alimenta a barra. Não há duas listas a manter
 * de acordo, e a prova de navegador caminha por ela.
 */
export default async function ProcurarDoStaff({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, locationId } = await params;
  const busca = (await searchParams) ?? {};
  const s = textosDoStaff(idioma);
  const termo = typeof busca.q === 'string' ? busca.q.trim() : '';
  const { sessao, unidade } = await carregarStaff(idioma, locationId);
  const base = `/${idioma}/staff/${locationId}`;


  const achados = termo === '' ? null : await comEscopoDoPedido(sessao, async (db) => {
    const [mesas, produtos, pedidos] = await Promise.all([
      salaAgora(db, unidade.id, sessao.contexto.organizationId),
      listarProdutos(db, { texto: termo }),
      listarPedidos(db, unidade.id),
    ]);
    const baixo = termo.toLowerCase();
    return {
      mesas: mesas.filter((m) => m.codigo.toLowerCase().includes(baixo)),
      produtos,
      pedidos: pedidos.filter((p: { numero: string }) =>
        p.numero.toLowerCase().includes(baixo)),
    };
  });
  const quantos = achados
    ? achados.mesas.length + achados.produtos.length + achados.pedidos.length : 0;

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.procurar} tela="STAFF-022" actual="/procurar" />

      <form method="get" data-teste="procurar">
        <span className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="q">{s.procurarCampo}</label>
          <input className="bo-campo__controlo" id="q" name="q" type="search"
                 defaultValue={termo} placeholder={s.procurarAjuda} />
        </span>
        <div className="bo-estado__accoes">
          <button className="bo-botao bo-botao--primario" type="submit">{s.accaoProcurar}</button>
        </div>
      </form>

      {achados === null ? null : (
        <section aria-labelledby="resultados">
          <h2 id="resultados">{s.accaoProcurar}</h2>
          {/* Contado antes de afirmar. Zero resultados diz-se por palavras: uma
              lista vazia é indistinguível de uma página que não carregou. */}
          <p data-teste="quantos">{quantos}</p>
          {quantos === 0 ? (
            <p className="bo-campo__ajuda" data-teste="sem-resultados">{s.semResultados}</p>
          ) : (
            <>
              {achados.mesas.length > 0 ? (
                <>
                  <h3>{s.resultadosMesas}</h3>
                  <ul className="bo-lista" data-teste="resultados-mesas">
                    {achados.mesas.map((m) => (
                      <li key={m.id}>
                        {m.sessao
                          ? <a href={`${base}/mesas/${m.sessao.id}`}>{m.codigo}</a>
                          : m.codigo}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {achados.produtos.length > 0 ? (
                <>
                  <h3>{s.resultadosProdutos}</h3>
                  <ul className="bo-lista" data-teste="resultados-produtos">
                    {achados.produtos.map((p: { id: string; nome: string }) => (
                      <li key={p.id}><a href={`${base}/catalogo/${p.id}`}>{p.nome}</a></li>
                    ))}
                  </ul>
                </>
              ) : null}
              {achados.pedidos.length > 0 ? (
                <>
                  <h3>{s.resultadosPedidos}</h3>
                  <ul className="bo-lista" data-teste="resultados-pedidos">
                    {achados.pedidos.map((p: { id: string; numero: string }) => (
                      <li key={p.id}><a href={`${base}/andamento`}>{p.numero}</a></li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          )}
        </section>
      )}

      <section aria-labelledby="todas">
        <h2 id="todas">{s.turno}</h2>
        <ul className="bo-lista" data-teste="todas-as-telas">
          {SECCOES_DO_STAFF.map((x) => (
            <li key={x.rota}>
              <a href={`${base}${x.rota}`} data-seccao={x.id}>{porChave(s, x.chave) ?? x.id}</a>
            </li>
          ))}
          {/* As duas com identificador entram pela lista, e não por endereço
              fixo: um `[sessionId]` escrito à mão apontava para nada. */}
          {TELAS_COM_IDENTIFICADOR.map((x) => (
            <li key={x.rota} data-teste="tela-com-identificador" data-seccao={x.id}>
              {porChave(s, x.chave) ?? x.id}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

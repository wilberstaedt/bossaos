import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { listarEstacoes, listarRegras, listarProdutos } from '@bossaos/db';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-005 · «Cada producto a su estación» (atlas p. 324)
 *
 * ── Não há regra por omissão, e esta tela di-lo ───────────────────────────
 *
 * *«Qual estação faz o quê é do restaurante. É configuração, não código.»* E a
 * consequência que interessa: **ausência de regra não é «cozinha por omissão»**.
 * Um item sem roteamento aparece como não encaminhado, visível a quem configura.
 *
 * Por isso a tela sem regras nenhumas não mostra uma lista vazia: diz, por
 * palavras, o que vai acontecer se ficar assim.
 *
 * ── E TODAS as regras que casam aplicam-se ────────────────────────────────
 *
 * Não há precedência entre produto e categoria: as duas valem, e o resultado são
 * duas tarefas. É o que faz um hambúrguer com batata ser grelha **e**
 * fritadeira. Quem quer uma estação só põe uma regra só.
 */
export default async function EstacoesEEncaminhamento({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.kdsE16;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const { estacoes, regras, produtos } = await comEscopoDoPedido(sessao, async (db) => ({
    estacoes: await listarEstacoes(db, unidade.id),
    regras: await listarRegras(db, unidade.id),
    produtos: await listarProdutos(db, { estado: 'ACTIVO' }),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="SET-005">{s.cadaProdutoASuaEstacao}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      {busca.guardada === '1' ? <Aviso tom="sucesso" titulo={s.accaoCriarRegra} /> : null}
      {busca.erro === 'alvo_invalido' ? (
        <div data-teste="alvo-invalido">
          <Aviso tom="perigo" titulo={s.alvoDaRegra}>{s.semRegras}</Aviso>
        </div>
      ) : null}

      {estacoes.length === 0 ? (
        <div data-teste="sem-estacoes">
          <Aviso tom="aviso" titulo={s.ecras}>{s.semEstacoes}</Aviso>
        </div>
      ) : null}

      {/* Contado antes de afirmar. E zero regras diz-se por palavras: uma lista
          vazia lê-se como «ainda não carregou», e aqui quer dizer que tudo o que
          for pedido vai aparecer como não encaminhado. */}
      <p data-teste="quantas-regras">{regras.length}</p>
      {regras.length === 0 ? (
        <div data-teste="sem-regras">
          <Aviso tom="aviso" titulo={s.naoEncaminhado}>{s.semRegras}</Aviso>
        </div>
      ) : (
        <ul className="bo-publico__lista" data-teste="regras">
          {regras.map((r) => (
            <li key={r.id} className="bo-publico__produto" data-teste="regra">
              <span className="bo-publico__nome">
                {r.produto?.nome ?? r.categoria?.nome ?? '—'}
              </span>
              <span className="bo-publico__preco">
                <Etiqueta tom="neutro">{r.estacao.nome}</Etiqueta>
              </span>
              <p className="bo-publico__descricao">
                {r.produto ? s.produto : s.categoria}
              </p>
              <form method="post" action={`/api/org/${orgSlug}/kds`}>
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="locationId" value={unidade.id} />
                <input type="hidden" name="locationSlug" value={locationSlug} />
                <input type="hidden" name="accao" value="apagar_regra" />
                <input type="hidden" name="regraId" value={r.id} />
                <button className="bo-botao bo-botao--secundario" type="submit"
                        data-teste="apagar-regra">{s.accaoApagarRegra}</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {estacoes.length > 0 && produtos.length > 0 ? (
        <Cartao titulo={s.accaoCriarRegra}>
          <form method="post" action={`/api/org/${orgSlug}/kds`} data-teste="nova-regra">
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationId" value={unidade.id} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="guardar_regra" />
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="stationId">{s.estacao}</label>
              <select className="bo-campo__controlo" id="stationId" name="stationId" required>
                {estacoes.map((e: { id: string; nome: string }) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </span>
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="alvo">{s.alvoDaRegra}</label>
              {/* O alvo vai como `produto:<id>`. Um campo só, porque a base
                  recusa uma regra com dois alvos — e dois campos aqui deixavam
                  alguém preencher os dois e receber uma excepção de restrição. */}
              <select className="bo-campo__controlo" id="alvo" name="alvo" required>
                {produtos.map((p: { id: string; nome: string }) => (
                  <option key={p.id} value={`produto:${p.id}`}>{p.nome}</option>
                ))}
              </select>
            </span>
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--primario" type="submit">
                {s.accaoCriarRegra}
              </button>
            </div>
          </form>
        </Cartao>
      ) : null}
    </div>
  );
}

import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { listarEstacoes } from '@bossaos/db';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-006 · «Ajusta las pantallas de cocina» (atlas p. 325)
 *
 * ── O limite é de ECRÃ, e está escrito ao lado do campo ───────────────────
 *
 * Quem baixa este número está a arrumar o ecrã, não a limitar a fila. Se a frase
 * não estivesse aqui, alguém baixava-o a pensar que estava a «reduzir a carga» —
 * e o produto tem de garantir que isso não descarta nada. Garante: o limite não
 * entra na consulta, e há um controlo negativo que o prova.
 */
export default async function EcrasDeCozinhaNoPainel({
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
  const estacoes = await comEscopoDoPedido(sessao, (db) => listarEstacoes(db, unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="SET-006">{s.ajustarEcras}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={s.accaoGuardar} /> : null}
      {busca.erro === 'limite_invalido' ? (
        <div data-teste="limite-invalido">
          <Aviso tom="perigo" titulo={s.limiteVisivel}>{s.limiteVisivelAjuda}</Aviso>
        </div>
      ) : null}

      <p data-teste="quantas">{estacoes.length}</p>
      {estacoes.length === 0 ? (
        <div data-teste="sem-estacoes">
          <Aviso tom="aviso" titulo={s.ecras}>{s.semEstacoes}</Aviso>
        </div>
      ) : (
        <ul className="bo-publico__lista" data-teste="estacoes">
          {estacoes.map((e: { id: string; nome: string; tipo: string; limiteVisivel: number }) => (
            <li key={e.id} className="bo-publico__produto" data-teste="estacao">
              <span className="bo-publico__nome">{e.nome}</span>
              <span className="bo-publico__preco">
                <Etiqueta tom="neutro">{e.limiteVisivel}</Etiqueta>
              </span>
              <p className="bo-publico__descricao">
                <a href={`/${idioma}/kds/${unidade.id}/${e.id}/ajustes`} data-seccao="KDS-014">
                  {s.ajustarEstacao}
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}

      <Cartao titulo={s.accaoCriarEstacao}>
        <form method="post" action={`/api/org/${orgSlug}/kds`} data-teste="nova-estacao">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={unidade.id} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="guardar_estacao" />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="nome">{s.nomeDaEstacao}</label>
            <input className="bo-campo__controlo" id="nome" name="nome" required />
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="tipo">{s.tipoDaEstacao}</label>
            <select className="bo-campo__controlo" id="tipo" name="tipo" defaultValue="PREPARACAO">
              <option value="PREPARACAO">{s.tipoPREPARACAO}</option>
              <option value="EXPO">{s.tipoEXPO}</option>
            </select>
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="limiteVisivel">{s.limiteVisivel}</label>
            <input className="bo-campo__controlo" id="limiteVisivel" name="limiteVisivel"
                   type="text" inputMode="numeric" defaultValue="12" />
            <span className="bo-campo__ajuda">{s.limiteVisivelAjuda}</span>
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">
              {s.accaoCriarEstacao}
            </button>
          </div>
        </form>
      </Cartao>
    </div>
  );
}

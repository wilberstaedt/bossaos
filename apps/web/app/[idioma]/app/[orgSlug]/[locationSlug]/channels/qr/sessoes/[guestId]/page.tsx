import { notFound } from 'next/navigation';
import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { estadoDoVisitante, listarPedidos, visitantesDaUnidade } from '@bossaos/db';
import { formatarDataHora, formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * QR-007 · «Sesión de la mesa 07» (atlas p. 88)
 *
 * ── É daqui que se revoga UMA mesa, sabendo o que ela pediu ───────────────
 *
 * O caso que faz esta tela existir é o cliente que se queixa de pedidos que não
 * fez. Quem vai revogar precisa de ver o que aquela sessão pediu — senão está a
 * decidir às cegas sobre a palavra de alguém.
 *
 * E o motivo é obrigatório: um acto de excepção sem razão escrita é uma decisão
 * que ninguém consegue rever depois do turno. Mesma regra do cancelamento no
 * E16 e da revogação de dispositivo no E13.
 */
export default async function SessaoDeVisitante({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; guestId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, guestId } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.visitanteE17;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const { visitante, pedidos } = await comEscopoDoPedido(sessao, async (db) => {
    const todos = await visitantesDaUnidade(db, unidade.id);
    const achado = todos.find((v: { id: string }) => v.id === guestId) ?? null;
    if (!achado) return { visitante: null, pedidos: [] };
    const daUnidade = await listarPedidos(db, unidade.id);
    return {
      visitante: achado,
      pedidos: daUnidade.filter((p: { tableSessionId: string | null }) =>
        p.tableSessionId === achado.tableSessionId),
    };
  });
  if (!visitante) notFound();

  const estado = estadoDoVisitante(visitante);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/channels/qr`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome} · {visitante.mesa.codigo}</p>
          <h1 data-tela="QR-007">{s.sessaoDaMesa} {visitante.mesa.codigo}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/sessoes`}>{m.comum.voltar}</a>
      </div>

      {busca.revogadas !== undefined ? (
        <div data-teste="revogada">
          <Aviso tom="sucesso" titulo={s.revogar}>{s.visitanteREVOGADA}</Aviso>
        </div>
      ) : null}

      <p data-teste="estado">
        <Etiqueta tom={estado === 'ACTIVA' ? 'sucesso' : estado === 'REVOGADA' ? 'perigo' : 'neutro'}>
          {(s as unknown as Record<string, string>)[`visitante${estado}`] ?? estado}
        </Etiqueta>
      </p>

      <dl className="bo-publico__contacto">
        <div>
          <dt>{s.abertaEm}</dt>
          <dd data-teste="aberta-em">{formatarDataHora(visitante.abertaEm, idioma)}</dd>
        </div>
        <div>
          <dt>{s.ultimaVez}</dt>
          <dd data-teste="ultima-vez">
            {visitante.ultimaVezEm
              ? formatarDataHora(visitante.ultimaVezEm, idioma)
              : s.nuncaPediu}
          </dd>
        </div>
        {visitante.revogadaMotivo ? (
          <div>
            <dt>{s.revogar}</dt>
            <dd data-teste="motivo">{visitante.revogadaMotivo}</dd>
          </div>
        ) : null}
      </dl>

      {/* O que esta MESA pediu. É o que quem vai revogar precisa de ver — decidir
          sobre uma queixa sem olhar para os pedidos é decidir às cegas. */}
      <h2>{s.oTeuPedido}</h2>
      <p data-teste="quantos-pedidos">{pedidos.length}</p>
      {pedidos.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-pedidos">{s.semPedidos}</p>
      ) : (
        <ul className="bo-publico__lista" data-teste="pedidos">
          {pedidos.map((p) => (
            <li key={p.id} className="bo-publico__produto" data-teste="pedido" data-canal={p.canal}>
              <span className="bo-publico__nome">{p.numero}</span>
              <span className="bo-publico__preco">{formatarHora(p.createdAt, idioma)}</span>
              <p className="bo-publico__descricao">
                {p.linhas.map((l: { nome: string; quantidade: number }) =>
                  `${l.quantidade}× ${l.nome}`).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}

      {estado === 'ACTIVA' ? (
        <Cartao titulo={s.revogar}>
          <p className="bo-campo__ajuda">{s.revogarAjuda}</p>
          <form method="post" action={`/api/org/${orgSlug}/qr`} data-teste="revogar">
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="tableId" value={visitante.tableId} />
            <input type="hidden" name="accao" value="revogar" />
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="motivo">{m.salaE13.accaoRevogar}</label>
              <input className="bo-campo__controlo" id="motivo" name="motivo" required />
            </span>
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--perigo" type="submit">{s.revogar}</button>
            </div>
          </form>
        </Cartao>
      ) : null}
    </div>
  );
}

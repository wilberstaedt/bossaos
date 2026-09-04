import { notFound } from 'next/navigation';
import { Aviso, Etiqueta } from '@bossaos/ui';
import { historicoDaSessao, listarPedidos, totalDoPedido } from '@bossaos/db';
import { formatarHora, type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import {
  CabecalhoDoStaff, porChave, LinhaDoPedido, TotalDoPedido, textosDoStaff,
} from '../../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-005 · «Mesa 07» (atlas p. 164) — e a casa do STATE-008.
 *
 * ── Porque é que o STATE-008 mora aqui ───────────────────────────────────
 *
 * «Otra persona ha actualizado este producto» não é uma ilustração: é o que
 * acontece quando duas pessoas têm a mesma mesa aberta, que numa sala é o caso
 * normal e não a excepção. Desenhá-lo num ecrã de demonstração fazia dele um
 * cartaz — e um cartaz passa o aceite sem que o conflito exista.
 *
 * Chega-se aqui pelo caminho real: a porta do Staff devolve `?conflito=<versão>`
 * quando a gravação optimista perde a corrida, e o que se mostra é **o que
 * existe agora**, para se seguir daí em vez de refazer.
 */
export default async function MesaDoStaff({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; sessionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, locationId, sessionId } = await params;
  const busca = (await searchParams) ?? {};
  const s = textosDoStaff(idioma);
  const { sessao, unidade } = await carregarStaff(idioma, locationId);

  const { sessaoDeMesa, pedidos, historia } = await comEscopoDoPedido(sessao, async (db) => {
    const linha = await db.tableSession.findFirst({
      where: { id: sessionId },
      select: {
        id: true, estado: true, comensais: true, abertaEm: true,
        mesa: { select: { codigo: true } },
      },
    });
    if (!linha) return { sessaoDeMesa: null, pedidos: [], historia: [] };
    const todos = await listarPedidos(db, unidade.id);
    return {
      sessaoDeMesa: linha,
      pedidos: todos.filter((p: { tableSessionId: string | null }) => p.tableSessionId === linha.id),
      historia: await historicoDaSessao(db, linha.id),
    };
  });

  // Ausência é ausência, e é 404 — não «proibido». A diferença entre os dois é um
  // oráculo de existência, e a regra é a mesma do E04.
  if (!sessaoDeMesa) notFound();

  const base = `/${idioma}/staff/${locationId}`;
  const conflito = typeof busca.conflito === 'string' ? busca.conflito : null;

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={`${s.mesa} ${sessaoDeMesa.mesa.codigo}`} tela="STAFF-005"
                        actual="/mesas" />

      {busca.aberta === '1' ? (
        <div data-teste="aberta"><Aviso tom="sucesso" titulo={s.mesa}>{s.aberta}</Aviso></div>
      ) : null}

      {/* STATE-008 · outra pessoa mexeu nisto. Não é um erro seco: diz o que
          existe agora, porque «recuperável» quer dizer poder seguir daqui. */}
      {conflito ? (
        <section className="bo-aviso bo-aviso--aviso" role="status" data-teste="conflito"
                 data-tela="STATE-008">
          <h2>{s.outraPessoaActualizou}</h2>
          <p>{s.outraPessoaAjuda}</p>
          <p><strong>{s.versaoActual}</strong>: <span data-teste="versao">{conflito}</span></p>
        </section>
      ) : null}

      <p data-teste="estado-da-mesa">
        <Etiqueta tom={sessaoDeMesa.estado === 'ABERTA' ? 'sucesso' : 'aviso'}>
          {porChave(s, `sessao${sessaoDeMesa.estado}`) ?? sessaoDeMesa.estado}
        </Etiqueta>
        {' · '}{s.comensais}: {sessaoDeMesa.comensais}
      </p>

      <div className="bo-estado__accoes">
        <a className="bo-botao bo-botao--secundario" href={`${base}/catalogo`}>{s.catalogo}</a>
        <a className="bo-botao bo-botao--secundario" href={`${base}/mover`}>{s.moverMesa}</a>
        <a className="bo-botao bo-botao--secundario" href={`${base}/conta`}>{s.conta}</a>
      </div>

      <h2>{s.linhas}</h2>
      {pedidos.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-pedidos">{s.semPedidos}</p>
      ) : (
        pedidos.map((pedido) => (
          <section key={pedido.id} data-teste="pedido">
            <h3>
              {pedido.numero}{' '}
              <Etiqueta tom="neutro">{porChave(s, `pedido${pedido.estado}`) ?? pedido.estado}</Etiqueta>
            </h3>
            {pedido.linhas.length === 0 ? (
              <p className="bo-campo__ajuda">{s.semLinhas}</p>
            ) : (
              <ul className="bo-publico__lista">
                {pedido.linhas.map((l) => (
                  <LinhaDoPedido key={l.id} linha={l} idioma={idioma} s={s} />
                ))}
              </ul>
            )}
            <TotalDoPedido total={totalDoPedido(pedido.linhas)} idioma={idioma} s={s} />
          </section>
        ))
      )}

      <h2>{s.andamento}</h2>
      <ul className="bo-lista" data-teste="historia">
        {historia.map((e: { id: string; accao: string; createdAt: Date; actorEmail: string }) => (
          <li key={e.id}>
            {formatarHora(e.createdAt, idioma)} · {e.accao} · {e.actorEmail}
          </li>
        ))}
      </ul>
    </div>
  );
}

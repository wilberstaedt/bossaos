import { Etiqueta } from '@bossaos/ui';
import { listarPedidos, totalDoPedido } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import {
  CabecalhoDoStaff, porChave, LinhaDoPedido, TotalDoPedido, textosDoStaff,
} from '../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-010 · «Pedido en marcha» (atlas p. 169) — e onde a divergência do E14 se vê.
 *
 * ── A linha rejeitada FICA, e mostra os dois preços ──────────────────────
 *
 * A régua do E15 é explícita: *«se a divergência só aparecer num log, o E14 foi
 * bem implementado e mal entregue»*. Um rascunho escrito offline traz o preço de
 * quando foi escrito; o servidor confere contra a carta ao aceitar; e quando não
 * batem, a linha é rejeitada **com o carrinho preservado** e os dois números
 * lado a lado, para alguém decidir antes de cobrar.
 *
 * Esconder a linha rejeitada seria pior do que reprecificar em silêncio: pelo
 * menos a reprecificação deixa rasto no total.
 */
export default async function AndamentoDoStaff({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, locationId } = await params;
  const busca = (await searchParams) ?? {};
  const s = textosDoStaff(idioma);
  const { sessao, unidade } = await carregarStaff(idioma, locationId);
  const pedidos = await comEscopoDoPedido(sessao, (db) => listarPedidos(db, unidade.id));
  const emCurso = pedidos.filter((p: { estado: string }) =>
    p.estado !== 'ENTREGUE' && p.estado !== 'CANCELADO');
  const conflito = typeof busca.conflito === 'string' ? busca.conflito : null;

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.andamento} tela="STAFF-010" actual="/andamento" />

      {conflito ? (
        <section className="bo-aviso bo-aviso--aviso" role="status" data-teste="conflito">
          <h2>{s.outraPessoaActualizou}</h2>
          <p>{s.outraPessoaAjuda}</p>
          <p><strong>{s.versaoActual}</strong>: <span data-teste="versao">{conflito}</span></p>
        </section>
      ) : null}

      {/* Contado ANTES de afirmar seja o que for sobre o que está em marcha. */}
      <p data-teste="quantos">{emCurso.length}</p>

      {emCurso.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-pedidos">{s.semPedidos}</p>
      ) : (
        emCurso.map((pedido) => (
          <section key={pedido.id} data-teste="pedido" data-estado={pedido.estado}>
            <h2>
              {pedido.numero}{' '}
              <Etiqueta tom="neutro">{porChave(s, `pedido${pedido.estado}`) ?? pedido.estado}</Etiqueta>
            </h2>
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
    </div>
  );
}

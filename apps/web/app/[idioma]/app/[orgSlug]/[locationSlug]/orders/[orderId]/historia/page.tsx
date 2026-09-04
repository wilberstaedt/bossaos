import { notFound } from 'next/navigation';
import { Cartao } from '@bossaos/ui';
import { formatarData, formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { historicoDoPedido, obterPedido } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarPedidos } from '../../../../../../../../src/pedido-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * ORD-009 · «Historia de un pedido» (atlas p. 145)
 *
 * ── Append-only por privilégio, e é isso que a torna história ────────────
 *
 * O runtime não tem `UPDATE` nem `DELETE` em `order_events` — está na migração.
 * Uma história que se possa reescrever não é história: é uma versão dos factos, e
 * a pergunta que se faz a esta página («o que aconteceu a este pedido?») deixaria
 * de ter resposta fiável exactamente quando alguém precisa dela.
 *
 * Os envios aparecem com o `command_id` porque é por ele que se responde à outra
 * pergunta da noite: «isto foi enviado duas vezes?».
 */
export default async function HistoriaDoPedido({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; orderId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, orderId } = await params;
  const m = mensagensDe(idioma);
  const p = m.pedidosE14;
  const { sessao, unidade } = await carregarPedidos(idioma, orgSlug, locationSlug);
  const { pedido, historico } = await comEscopoDoPedido(sessao, async (db) => ({
    pedido: await obterPedido(db, orderId),
    historico: await historicoDoPedido(db, orderId),
  }));
  if (!pedido || pedido.locationId !== unidade.id) notFound();
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/orders`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{pedido.numero}</p>
          <h1>{p.historia}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/${orderId}`}>{m.comum.voltar}</a>
      </div>

      <Cartao titulo={p.mudou}>
        <ul className="bo-lista">
          {historico.map((e) => (
            <li key={e.id}>
              {formatarData(e.createdAt, idioma)} {formatarHora(e.createdAt, idioma)}
              {' · '}<strong>{e.accao}</strong>{' · '}{e.actorEmail}
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao titulo={p.envios}>
        <ul className="bo-lista">
          {pedido.envios.map((s) => (
            <li key={s.id}>
              <code className="bo-tema__valor">{s.commandId}</code>
              {' · '}{formatarHora(s.createdAt, idioma)}{' · '}{s.criadoPor}
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}

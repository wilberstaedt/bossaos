import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { notFound } from 'next/navigation';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * ORD-007 · «Reabre un pedido cerrado» (atlas)
 *
 * ── Reabrir um pedido não devolve dinheiro ────────────────────────────────
 *
 * «Cancelar comida não devolve dinheiro nenhum por si só»: são dois actos, com
 * autorizações diferentes. Este ecrã mexe no pedido e mostra o que a conta já
 * recebeu — mas não tem botão de devolver, e isso é a decisão, não uma omissão.
 *
 * A tentativa por reconciliar aparece aqui pela mesma razão que aparece no TPV:
 * enquanto ela existir, não se cobra outra vez.
 */
export default async function ReabrirPedido({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; orderId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, orderId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const dados = await comEscopoDoPedido(sessao, async (db) => {
    const pedido = await db.order.findFirst({
      where: { id: orderId, locationId: unidade.id },
      select: { id: true, numero: true, estado: true },
    });
    if (!pedido) return null;
    const linhas = await db.billLine.findMany({
      where: { linhaDoPedido: { orderId } },
      select: { id: true, nome: true, quantidade: true, unitarioMenor: true, billId: true },
    });
    const contas = await db.bill.findMany({
      where: { id: { in: [...new Set(linhas.map((l) => l.billId))] } },
      select: {
        id: true, numero: true, moeda: true, devidoMenor: true,
        tentativas: {
          where: { estado: { in: ['CRIADA', 'PROCESSANDO', 'INDETERMINADA'] } },
          select: { id: true },
        },
      },
    });
    return { pedido, linhas, contas };
  });
  if (!dados) notFound();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{dados.pedido.numero}</p>
          <h1 data-tela="ORD-007">{t.reabrirPedido}</h1>
        </div>
      </div>
      <p data-teste="estado-pedido">{dados.pedido.estado}</p>
      <p data-teste="anular-ajuda">{t.anularAjuda}</p>
      {dados.contas.length === 0 ? <p data-teste="sem-contas">{t.semContas}</p> : (
        <ul className="bo-lista" data-teste="contas">
          {dados.contas.map((c) => (
            <li key={c.id}>
              <span>{c.numero}</span>
              <span>{formatarDinheiro({ montanteMenor: c.devidoMenor, moeda: c.moeda }, idioma)}</span>
              {c.tentativas.length > 0 && (
                <span data-teste="por-reconciliar">{t.porReconciliar}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p data-teste="reconciliar-ajuda">{t.reconciliarAjuda}</p>
    </div>
  );
}

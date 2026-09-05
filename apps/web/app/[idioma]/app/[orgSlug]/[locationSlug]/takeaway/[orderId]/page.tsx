import { notFound } from 'next/navigation';
import { Botao } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarLevar } from '../../../../../../../src/levar/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * TAKE-002 · «Confirmación de recogida» (atlas)
 *
 * ── Retirado UMA vez ──────────────────────────────────────────────────────
 *
 * «Takeaway chega à estação correta, é preparado e retirado uma vez.» O botão
 * desaparece depois de o pedido sair: um segundo toque não faz nada, e a tela
 * di-lo mostrando a hora em vez do botão.
 *
 * A hora que aparece é a de RETIRADA, e não a de produção. Quem está ao balcão
 * combina uma hora com o cliente; o momento em que a cozinha começou é assunto
 * da cozinha.
 */
export default async function ConfirmarRetirada({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; orderId: string }> }) {
  const { idioma, orgSlug, locationSlug, orderId } = await params;
  const t = mensagensDe(idioma).levarE20;
  const { sessao, unidade } = await carregarLevar(idioma, orgSlug, locationSlug);

  const pedido = await comEscopoDoPedido(sessao, (db) => db.order.findFirst({
    where: { id: orderId, locationId: unidade.id },
    select: { id: true, numero: true, estado: true, entregarAs: true, producaoEm: true },
  }));
  if (!pedido) notFound();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="TAKE-002">{t.retirada}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/takeaway`}>{t.voltar}</a>
      </div>

      <dl className="bo-estado__factos">
        <dt>{t.numero}</dt><dd data-teste="numero">{pedido.numero}</dd>
        <dt>{t.hora}</dt>
        <dd>{pedido.entregarAs ? formatarHora(pedido.entregarAs, idioma) : '—'}</dd>
        <dt>{t.estado}</dt><dd data-teste="estado">{pedido.estado}</dd>
      </dl>

      {pedido.estado === 'ENTREGUE' ? (
        <p data-teste="ja-retirado">{t.entregue}</p>
      ) : (
        <form method="post" action={`/api/org/${orgSlug}/levar`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={unidade.id} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="marcar_saida" />
          <input type="hidden" name="canal" value="TAKEAWAY" />
          <input type="hidden" name="orderId" value={pedido.id} />
          <Botao type="submit" data-teste="marcar-retirado">{t.entregue}</Botao>
        </form>
      )}
    </div>
  );
}

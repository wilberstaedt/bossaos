import { notFound } from 'next/navigation';
import { Botao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { reservaPorId } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-007 · «El grupo ha llegado» (atlas p. 143)
 *
 * ── E a tela diz que marcar a chegada NÃO senta ───────────────────────────
 *
 * «Chegar não é estar sentado.» O botão faz uma coisa só, e a frase por baixo
 * diz qual — senão o host carrega à espera de que a mesa fique atribuída, e fica
 * sem perceber porque é que ela continua livre no mapa.
 */
export default async function CheckIn({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; reservaId: string }> }) {
  const { idioma, orgSlug, locationSlug, reservaId } = await params;
  const h = mensagensDe(idioma).hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const r = await comEscopoDoPedido(sessao, (db) => reservaPorId(db, unidade.id, reservaId));
  if (!r) notFound();

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-007" titulo={h.chegada} activa="">
      <dl className="bo-estado__factos">
        <dt>{h.nome}</dt><dd>{r.nome}</dd>
        <dt>{h.pessoas}</dt><dd>{r.pessoas}</dd>
      </dl>
      <form method="post" action={`/api/org/${orgSlug}/reservas`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="chegou" />
        <input type="hidden" name="reservaId" value={r.id} />
        <Botao type="submit" data-teste="marcar-chegada">{h.chegou}</Botao>
      </form>
      {/* A frase que impede o host de esperar que isto senta o grupo. */}
      <p className="bo-campo__ajuda" data-teste="chegada-ajuda">{h.chegadaAjuda}</p>
    </EstruturaDoHost>
  );
}

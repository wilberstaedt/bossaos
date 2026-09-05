import { notFound } from 'next/navigation';
import { Botao, Etiqueta } from '@bossaos/ui';
import { formatarData, formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { reservaPorId } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-004 · «Reserva R-0821» (atlas p. 140)
 *
 * A ficha, e as três acções que o host tem: marcar a chegada, mover, e registar
 * que não compareceu. **Nenhuma delas acontece sozinha** — é a mesma decisão que
 * mantém o varredor fora desta etapa.
 */
export default async function DetalheDaReserva({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; reservaId: string }> }) {
  const { idioma, orgSlug, locationSlug, reservaId } = await params;
  const m = mensagensDe(idioma);
  const h = m.hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const r = await comEscopoDoPedido(sessao, (db) => reservaPorId(db, unidade.id, reservaId));
  if (!r) notFound();
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/reservations`;

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-004" titulo={`${h.detalhe} · ${r.nome}`} activa="">
      <dl className="bo-estado__factos">
        <dt>{h.hora}</dt><dd>{formatarData(r.inicio, idioma)} {formatarHora(r.inicio, idioma)}</dd>
        <dt>{h.pessoas}</dt><dd>{r.pessoas}</dd>
        <dt>{h.contacto}</dt><dd>{r.contacto}</dd>
        <dt>{h.mesas}</dt><dd data-teste="mesas">{r.mesas.map((x) => x.codigo).join(' + ') || '—'}</dd>
        <dt>{h.origem}</dt><dd data-teste="origem">{r.origem}</dd>
        <dt>{h.estado}</dt><dd><Etiqueta tom="neutro">{r.estado}</Etiqueta></dd>
        <dt>{h.notas}</dt><dd>{r.notas ?? '—'}</dd>
      </dl>

      <div className="bo-forma">
        <a className="bo-botao" href={`${base}/${r.id}/chegada`}>{h.chegou}</a>
        <a className="bo-botao bo-botao--secundario" href={`${base}/${r.id}/mover`}>{h.mover}</a>
        <a className="bo-botao bo-botao--secundario" href={`${base}/${r.id}/mesa`}>{h.mesa}</a>
        <form method="post" action={`/api/org/${orgSlug}/reservas`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={unidade.id} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="nao_compareceu" />
          <input type="hidden" name="reservaId" value={r.id} />
          <Botao type="submit" tom="perigo" densidade="operacao">{h.naoCompareceu}</Botao>
        </form>
      </div>
    </EstruturaDoHost>
  );
}

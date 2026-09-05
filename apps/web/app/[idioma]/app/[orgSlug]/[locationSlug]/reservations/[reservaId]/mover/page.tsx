import { notFound } from 'next/navigation';
import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { reservaPorId } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-006 · «Cambia la reserva» (atlas p. 142)
 *
 * ── Se a hora nova não couber, a ANTERIOR sobrevive ───────────────────────
 *
 * «Um cliente que pediu para mudar de hora e ficou sem mesa nenhuma é pior do que
 * um cliente que não conseguiu mudar.» O motor do E18 garante-o dentro de uma
 * transacção; esta tela existe para o dizer a quem carrega no botão, e para
 * mostrar a hora actual ao lado da nova — senão «não deu» lê-se como «perdeu-se».
 */
export default async function MoverReserva({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; reservaId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, reservaId } = await params;
  const busca = (await searchParams) ?? {};
  const h = mensagensDe(idioma).hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const r = await comEscopoDoPedido(sessao, (db) => reservaPorId(db, unidade.id, reservaId));
  if (!r) notFound();

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-006" titulo={h.mover} activa="">
      {busca.erro ? <p data-teste="erro">{String(busca.erro)}</p> : null}
      <dl className="bo-estado__factos">
        <dt>{h.hora}</dt>
        <dd data-teste="hora-actual">{r.inicio.toISOString().slice(0, 16).replace('T', ' ')}</dd>
        <dt>{h.mesas}</dt><dd>{r.mesas.map((x) => x.codigo).join(' + ') || '—'}</dd>
      </dl>
      <form method="post" action={`/api/org/${orgSlug}/reservas`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="mover" />
        <input type="hidden" name="reservaId" value={r.id} />
        <Campo rotulo={h.dia} name="dia" type="date"
               defaultValue={r.inicio.toISOString().slice(0, 10)} required />
        <Campo rotulo={h.hora} name="hora" type="time"
               defaultValue={r.inicio.toISOString().slice(11, 16)} required />
        <Botao type="submit" data-teste="mover">{h.guardar}</Botao>
      </form>
    </EstruturaDoHost>
  );
}

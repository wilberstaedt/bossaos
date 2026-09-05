import { Botao, Campo } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { reservasAChegar, salaAgora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-009 · «Un grupo sin reserva» (atlas p. 145)
 *
 * ── As mesas com reserva a chegar aparecem MARCADAS, e não escondidas ─────
 *
 * Esconder era decidir pelo host: às vezes o grupo come em quarenta minutos e a
 * mesa das 21h fica a tempo. O que o produto deve é dizer o que sabe — «esta tem
 * reserva às 21h» — e deixar a escolha a quem está lá.
 */
export default async function NovoWalkIn({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const h = m.hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);

  const { mesas, aChegar } = await comEscopoDoPedido(sessao, async (db) => ({
    mesas: await salaAgora(db, unidade.id, sessao.contexto.organizationId),
    aChegar: await reservasAChegar(db, unidade.id, 120),
  }));
  const livres = mesas.filter((x) => !x.sessao);

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-009" titulo={h.walkin} activa="/mapa">
      {busca.erro ? <p data-teste="erro">{h.mesaOcupada}</p> : null}
      <form method="post" action={`/api/org/${orgSlug}/reservas`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <input type="hidden" name="accao" value="walk_in" />
        <Campo rotulo={h.pessoas} name="pessoas" type="text" inputMode="numeric" defaultValue="2" />
        <label className="bo-campo">
          <span className="bo-campo__rotulo">{h.mesas}</span>
          <select name="tableId" className="bo-campo__controlo" data-teste="mesas-livres">
            {livres.map((mesa) => {
              const proxima = aChegar.get(mesa.id);
              return (
                <option key={mesa.id} value={mesa.id}>
                  {mesa.codigo} ({mesa.capacidade})
                  {proxima ? ` — ${h.aChegar} ${proxima.inicio.toISOString().slice(11, 16)}` : ''}
                </option>
              );
            })}
          </select>
        </label>
        <Botao type="submit" data-teste="abrir-walkin">{h.sentar}</Botao>
      </form>
    </EstruturaDoHost>
  );
}

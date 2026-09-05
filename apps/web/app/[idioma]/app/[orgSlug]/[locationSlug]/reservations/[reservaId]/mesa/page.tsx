import { notFound } from 'next/navigation';
import { Botao } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { reservaPorId, reservasAChegar, salaAgora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-011 · «Encuentra la mesa adecuada» (atlas p. 147)
 *
 * ── A sugestão diz PORQUÊ, e é recusável ──────────────────────────────────
 *
 * «Se o sistema sugerir um próximo, sugere dizendo porquê — cabe na mesa 4, que
 * vaga agora — e a sugestão é recusável. Um host que não percebe a sugestão deixa
 * de a usar em duas noites.»
 *
 * Por isso as mesas aparecem TODAS, com o motivo ao lado de cada uma: quantos
 * lugares tem, se está ocupada, e se tem reserva a chegar. Filtrar as que não
 * servem era decidir por ele — e às vezes seis pessoas cabem numa mesa de quatro
 * com uma cadeira a mais, coisa que o software não sabe e o host sabe.
 */
export default async function AlocarMesa({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; reservaId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, reservaId } = await params;
  const busca = (await searchParams) ?? {};
  const h = mensagensDe(idioma).hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);

  const { r, mesas, aChegar } = await comEscopoDoPedido(sessao, async (db) => ({
    r: await reservaPorId(db, unidade.id, reservaId),
    mesas: await salaAgora(db, unidade.id, sessao.contexto.organizationId),
    aChegar: await reservasAChegar(db, unidade.id, 120),
  }));
  if (!r) notFound();

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-011" titulo={h.mesa} activa="">
      {busca.erro === 'NAO_CHEGOU' ? <p data-teste="nao-chegou">{h.naoChegou}</p> : null}
      {busca.erro === 'MESA_OCUPADA' ? <p data-teste="mesa-ocupada">{h.mesaOcupada}</p> : null}
      <p className="bo-campo__ajuda">{h.sugestoes} · {r.pessoas}</p>

      <ul className="bo-publico__lista" data-teste="mesas">
        {mesas.map((mesa) => {
          const proxima = aChegar.get(mesa.id);
          return (
            <li key={mesa.id} className="bo-publico__produto">
              <span className="bo-publico__nome">{mesa.codigo} · {mesa.area.nome}</span>
              {/* O PORQUÊ, ao lado de cada mesa. Sem isto a lista é um sorteio. */}
              <p className="bo-publico__descricao" data-teste="porque">
                {`${h.cabeNa}: ${mesa.capacidade}`}
                {mesa.sessao ? ` · ${h.ocupada}` : ''}
                {proxima && !mesa.sessao
                  ? ` · ${h.aChegar} ${formatarHora(proxima.inicio, idioma)}` : ''}
              </p>
              <form method="post" action={`/api/org/${orgSlug}/reservas`}>
                <input type="hidden" name="idioma" value={idioma} />
                <input type="hidden" name="locationId" value={unidade.id} />
                <input type="hidden" name="locationSlug" value={locationSlug} />
                <input type="hidden" name="accao" value="sentar" />
                <input type="hidden" name="reservaId" value={r.id} />
                <input type="hidden" name="tableId" value={mesa.id} />
                <Botao type="submit" densidade="operacao"
                       tom={mesa.sessao ? 'secundario' : 'primario'}>{h.sentar}</Botao>
              </form>
            </li>
          );
        })}
      </ul>
    </EstruturaDoHost>
  );
}

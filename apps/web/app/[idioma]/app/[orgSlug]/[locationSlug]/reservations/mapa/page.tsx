import { Etiqueta } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { reservasAChegar, salaAgora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { EstruturaDoHost } from '../../../../../../../src/reservas/EstruturaDoHost.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-010 · «El salón a la vista» (atlas p. 146)
 *
 * ── Uma mesa livre com reserva a chegar NÃO é uma mesa livre ──────────────
 *
 * «Uma reserva confirmada para as 20h tem de aparecer na sala antes das 20h,
 * senão o host vê a mesa livre e senta lá um walk-in.»
 *
 * A mesa está mesmo livre — não há sessão aberta — e é essa a armadilha: um mapa
 * que só olha para o presente diz a verdade e esconde o que aí vem. É por aqui
 * que a reserva se perde entre o motor e a sala.
 */
export default async function MapaDoHost({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const h = mensagensDe(idioma).hostE19;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/reservations`;

  const { mesas, aChegar } = await comEscopoDoPedido(sessao, async (db) => ({
    mesas: await salaAgora(db, unidade.id, sessao.contexto.organizationId),
    aChegar: await reservasAChegar(db, unidade.id, 120),
  }));

  return (
    <EstruturaDoHost idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
      unidade={unidade.nome} tela="RES-B-010" titulo={h.mapa} activa="/mapa"
      accao={<a className="bo-botao" href={`${base}/walk-in`}>{h.walkin}</a>}>
      <p className="bo-campo__ajuda">{h.aChegarAjuda}</p>
      <ul className="bo-publico__lista">
        {mesas.map((mesa) => {
          const proxima = aChegar.get(mesa.id);
          return (
            <li key={mesa.id} className="bo-publico__produto"
                data-teste={proxima && !mesa.sessao ? 'mesa-reservada' : undefined}>
              <span className="bo-publico__nome">{mesa.codigo} · {mesa.area.nome}</span>
              <span className="bo-publico__preco">
                {mesa.sessao ? <Etiqueta tom="perigo">{h.ocupada}</Etiqueta>
                  : proxima ? <Etiqueta tom="aviso">{h.aChegar}</Etiqueta>
                  : <Etiqueta tom="sucesso">{h.livre}</Etiqueta>}
              </span>
              <p className="bo-publico__descricao">
                {proxima && !mesa.sessao
                  ? `${proxima.nome} · ${proxima.pessoas} · ${formatarHora(proxima.inicio, idioma)}`
                  : `${h.pessoas}: ${mesa.capacidade}`}
              </p>
            </li>
          );
        })}
      </ul>
    </EstruturaDoHost>
  );
}

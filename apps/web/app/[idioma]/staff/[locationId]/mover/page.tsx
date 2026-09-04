import { Aviso } from '@bossaos/ui';
import { salaAgora } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import {
  CabecalhoDoStaff, motivoDaRecusa, textosDoStaff,
} from '../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-014 · «Cambia de mesa» (atlas p. 173)
 *
 * ── A origem não «liberta»: a sessão muda de mesa ────────────────────────
 *
 * É uma escrita só, e é isso que impede a sala de ficar com uma sessão no ar e
 * uma mesa ocupada por ninguém. O destino ocupado é recusado pelo **mesmo**
 * índice que recusa a abertura dupla — não há segunda regra a manter alinhada
 * com a primeira. Esta lista só evita oferecer o que vai ser recusado.
 */
export default async function MoverDoStaff({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, locationId } = await params;
  const busca = (await searchParams) ?? {};
  const s = textosDoStaff(idioma);
  const { sessao, unidade, orgSlug } = await carregarStaff(idioma, locationId);
  const mesas = await comEscopoDoPedido(sessao, (db) =>
    salaAgora(db, unidade.id, sessao.contexto.organizationId));
  const abertas = mesas.filter((m) => m.sessao !== null);
  const livres = mesas.filter((m) => m.sessao === null);

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.moverMesa} tela="STAFF-014" actual="/mover" />

      {motivoDaRecusa(idioma, busca.erro) ? (
        <div data-teste="recusa">
          <Aviso tom="perigo" titulo={s.moverMesa}>{motivoDaRecusa(idioma, busca.erro)}</Aviso>
        </div>
      ) : null}

      {abertas.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-sessoes">{s.semSessoesAbertas}</p>
      ) : livres.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-destinos">{s.semDestinos}</p>
      ) : (
        <form method="post" action={`/api/org/${orgSlug}/staff`} data-teste="mover">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={locationId} />
          <input type="hidden" name="accao" value="mover" />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="sessionId">{s.mesa}</label>
            <select className="bo-campo__controlo" id="sessionId" name="sessionId" required>
              {abertas.map((m) => (
                <option key={m.id} value={m.sessao?.id ?? ''}>
                  {m.codigo} · {s.comensais} {m.sessao?.comensais ?? 0}
                </option>
              ))}
            </select>
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="tableId">{s.escolherDestino}</label>
            <select className="bo-campo__controlo" id="tableId" name="tableId" required>
              {livres.map((m) => (
                <option key={m.id} value={m.id}>{m.codigo} · {m.area.nome}</option>
              ))}
            </select>
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{s.accaoMover}</button>
          </div>
        </form>
      )}
    </div>
  );
}

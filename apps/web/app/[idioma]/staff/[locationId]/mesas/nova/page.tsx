import { Aviso } from '@bossaos/ui';
import { salaAgora } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import {
  CabecalhoDoStaff, motivoDaRecusa, textosDoStaff,
} from '../../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-004 · «Nueva mesa» (atlas p. 163)
 *
 * ── A lista de destinos é de mesas SEM sessão activa ─────────────────────
 *
 * E `EM_LIMPEZA` conta como ocupada, porque é. O índice único da base recusa a
 * segunda abertura de qualquer maneira — esta lista existe para não oferecer o
 * que vai ser recusado, e não para substituir a garantia. As duas falham por
 * motivos diferentes, que é o que faz uma redundância valer alguma coisa.
 */
export default async function NovaMesaDoStaff({
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
  const livres = mesas.filter((m) => m.sessao === null);

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.novaMesa} tela="STAFF-004" actual="/mesas/nova" />

      {motivoDaRecusa(idioma, busca.erro) ? (
        <div data-teste="recusa">
          <Aviso tom="perigo" titulo={s.novaMesa}>{motivoDaRecusa(idioma, busca.erro)}</Aviso>
        </div>
      ) : null}

      {livres.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-mesas-livres">{s.semMesasLivres}</p>
      ) : (
        <form method="post" action={`/api/org/${orgSlug}/staff`} data-teste="abrir-mesa">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={locationId} />
          <input type="hidden" name="accao" value="abrir_mesa" />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="tableId">{s.escolherMesa}</label>
            <select className="bo-campo__controlo" id="tableId" name="tableId" required>
              {livres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo} · {m.area.nome} · {s.capacidade} {m.capacidade}
                </option>
              ))}
            </select>
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="comensais">{s.comensais}</label>
            {/* `type="text"` com `inputMode`: o `type="number"` recusa valores
                pela validação nativa antes de o servidor os ver — decisão do E07. */}
            <input className="bo-campo__controlo" id="comensais" name="comensais"
                   type="text" inputMode="numeric" defaultValue="2" />
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{s.accaoAbrirMesa}</button>
          </div>
        </form>
      )}
    </div>
  );
}

import { Aviso, Etiqueta } from '@bossaos/ui';
import { listarPedidos } from '@bossaos/db';
import { type Idioma } from '@bossaos/i18n';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import {
  CabecalhoDoStaff, motivoDaRecusa, textosDoStaff,
} from '../../../../../src/staff/PecasDoStaff.tsx';

export const dynamic = 'force-dynamic';

/**
 * STAFF-017 · «Cancela un artículo» (atlas p. 176)
 *
 * ── Cancelar muda o ESTADO, e nunca o preço ──────────────────────────────
 *
 * O instantâneo da linha fica como está — é o gatilho da base que o garante, não
 * o cuidado desta tela. E a linha cancelada continua a existir: a história do
 * pedido guarda quem cancelou o quê. Apagá-la era limpar o rasto de uma decisão
 * que alguém tomou sobre comida que outra pessoa pediu.
 */
export default async function CancelarDoStaff({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, locationId } = await params;
  const busca = (await searchParams) ?? {};
  const s = textosDoStaff(idioma);
  const { sessao, unidade, orgSlug } = await carregarStaff(idioma, locationId);
  const pedidos = await comEscopoDoPedido(sessao, (db) => listarPedidos(db, unidade.id));
  const cancelaveis = pedidos.flatMap((p) => p.linhas
    .filter((l: { estado: string }) => l.estado === 'ACEITE' || l.estado === 'PROPOSTA')
    .map((l: { id: string; nome: string; quantidade: number }) => ({ ...l, numero: p.numero })));

  return (
    <div className="bo-pagina">
      <CabecalhoDoStaff idioma={idioma} locationId={locationId} unidade={unidade.nome}
                        titulo={s.cancelarArtigo} tela="STAFF-017" actual="/cancelar" />

      {busca.cancelada === '1' ? (
        <div data-teste="cancelada">
          <Aviso tom="sucesso" titulo={s.cancelarArtigo}>{s.linhaCANCELADA}</Aviso>
        </div>
      ) : null}
      {motivoDaRecusa(idioma, busca.erro) ? (
        <div data-teste="recusa">
          <Aviso tom="perigo" titulo={s.cancelarArtigo}>{motivoDaRecusa(idioma, busca.erro)}</Aviso>
        </div>
      ) : null}

      <p className="bo-campo__ajuda">{s.cancelarAjuda}</p>
      <p data-teste="quantos">{cancelaveis.length}</p>

      {cancelaveis.length === 0 ? (
        <p className="bo-campo__ajuda" data-teste="sem-cancelaveis">{s.semArtigosCancelaveis}</p>
      ) : (
        <form method="post" action={`/api/org/${orgSlug}/staff`} data-teste="cancelar">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={locationId} />
          <input type="hidden" name="accao" value="cancelar_linha" />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="linhaId">{s.escolherArtigo}</label>
            <select className="bo-campo__controlo" id="linhaId" name="linhaId" required>
              {cancelaveis.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.numero} · {l.quantidade}× {l.nome}
                </option>
              ))}
            </select>
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--perigo" type="submit">
              {s.accaoCancelarArtigo}
            </button>
          </div>
        </form>
      )}

      <ul className="bo-publico__lista" data-teste="canceladas">
        {pedidos.flatMap((p) => p.linhas
          .filter((l: { estado: string }) => l.estado === 'CANCELADA')
          .map((l: { id: string; nome: string; quantidade: number }) => (
            <li key={l.id} className="bo-publico__produto" data-teste="linha-cancelada">
              <span className="bo-publico__nome">{p.numero} · {l.quantidade}× {l.nome}</span>
              <span className="bo-publico__preco">
                <Etiqueta tom="neutro">{s.linhaCANCELADA}</Etiqueta>
              </span>
            </li>
          )))}
      </ul>
    </div>
  );
}

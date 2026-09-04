import { notFound } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { salaAgora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-009 · «Traslada la mesa» (atlas p. 121)
 *
 * ── O que o ecrã promete, e o que a base garante ─────────────────────────
 *
 * A lista de destinos mostra as mesas livres **neste instante**. Não é uma
 * reserva: entre desenhar isto e alguém escolher, outra pessoa pode abrir a mesa
 * de destino. Quem recusa é o mesmo índice único que recusa a abertura dupla —
 * não há segunda regra a manter alinhada com a primeira.
 *
 * E quando recusa, **a origem fica exactamente como estava**: a transferência é
 * uma única escrita dentro de uma transacção, e o `ROLLBACK` leva consigo a
 * mudança de mesa e a linha de histórico ao mesmo tempo. A régua avisa do
 * contrário — *«se a origem liberta e o destino falha, a sala fica com uma sessão
 * no ar e uma mesa ocupada por ninguém»* — e é um defeito que só existe em
 * modelos onde a ocupação é uma segunda linha a concordar com a primeira.
 */
export default async function TransferirSessao({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; sessionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, sessionId } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.salaE13;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const mesas = await comEscopoDoPedido(sessao, (db) => salaAgora(db, unidade.id, sessao.contexto.organizationId));

  const origem = mesas.find((x) => x.sessao?.id === sessionId) ?? null;
  if (!origem?.sessao) notFound();
  const destinos = mesas.filter((x) => !x.sessao);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/floor`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{origem.codigo} · {origem.area.nome}</p>
          <h1>{s.accaoTransferir}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={`${base}/sessoes/${sessionId}`}>
          {m.comum.voltar}
        </a>
      </div>

      {busca.erro === 'mesa_destino_ocupada' ? (
        <Aviso tom="aviso" urgente titulo={s.accaoTransferir}>{s.mesaDestinoOcupada}</Aviso>
      ) : null}
      {busca.erro && busca.erro !== 'mesa_destino_ocupada' ? (
        <Aviso tom="perigo" titulo={s.accaoTransferir}>{m.comum.tenteOutraVez}</Aviso>
      ) : null}

      {destinos.length === 0 ? (
        <Aviso titulo={s.destino}>{s.ocupada}</Aviso>
      ) : (
        <Cartao titulo={s.destino}>
          <form method="post" action={`/api/org/${orgSlug}/sala`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="transferir" />
            <input type="hidden" name="sessaoId" value={sessionId} />
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="destinoId">{s.destino}</label>
              <select className="bo-campo__controlo" id="destinoId" name="destinoId"
                      defaultValue={destinos[0]?.id} required>
                {destinos.map((mesa) => (
                  <option key={mesa.id} value={mesa.id}>
                    {mesa.codigo} · {mesa.area.nome} · {s.capacidade} {mesa.capacidade}
                  </option>
                ))}
              </select>
            </span>
            <p className="bo-campo__ajuda">{s.comensais}: {origem.sessao.comensais}</p>
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--primario" type="submit">{s.accaoTransferir}</button>
            </div>
          </form>
        </Cartao>
      )}
    </div>
  );
}

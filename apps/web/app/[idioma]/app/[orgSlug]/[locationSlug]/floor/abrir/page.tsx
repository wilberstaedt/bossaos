import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { salaAgora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';
import { NavegacaoDaSala } from '../../../../../../../src/componentes/NavegacaoDaSala.tsx';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-007 · «Abre una nueva mesa» (atlas p. 119)
 *
 * ── A lista mostra as livres, e isso NÃO é a garantia ────────────────────
 *
 * As mesas ocupadas não aparecem no selector porque oferecer uma mesa ocupada é
 * convidar ao erro. Mas isso é **cortesia**: entre desenhar esta página e alguém
 * carregar no botão passam segundos, e nesses segundos outro empregado abre a
 * mesa no tablet dele.
 *
 * Quem garante é o índice único na base, e a recusa que volta — «essa mesa já
 * tem serviço aberto» — é a prova de que a lista era um retrato e não uma
 * reserva. É o mesmo raciocínio do endereço público do E09: *«não se consulta
 * antes; duas pessoas a escolher no mesmo segundo leem ambas que está livre»*.
 */
export default async function AbrirMesa({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.salaE13;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const mesas = await comEscopoDoPedido(sessao, (db) => salaAgora(db, unidade.id));
  const livres = mesas.filter((x) => !x.sessao);
  const escolhida = typeof busca.mesa === 'string' ? busca.mesa : undefined;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{s.abrir}</h1>
        </div>
      </div>

      <NavegacaoDaSala idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/abrir" />

      {busca.erro === 'mesa_ocupada' ? (
        // A recusa que veio do servidor, com as palavras do que aconteceu: outra
        // pessoa chegou primeiro. Não é uma avaria.
        <Aviso tom="aviso" urgente titulo={s.abrir}>{s.mesaOcupada}</Aviso>
      ) : null}
      {busca.erro === 'mesa_arquivada' || busca.erro === 'mesa_desconhecida' ? (
        <Aviso tom="perigo" titulo={s.abrir}>{m.comum.tenteOutraVez}</Aviso>
      ) : null}

      {livres.length === 0 ? (
        <Aviso titulo={s.mesas}>{mesas.length === 0 ? s.semMesas : s.ocupada}</Aviso>
      ) : (
        <Cartao titulo={s.abrir}>
          <form method="post" action={`/api/org/${orgSlug}/sala`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="abrir" />
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="tableId">{s.mesas}</label>
              <select className="bo-campo__controlo" id="tableId" name="tableId"
                      defaultValue={escolhida ?? livres[0]?.id} required>
                {livres.map((mesa) => (
                  <option key={mesa.id} value={mesa.id}>
                    {mesa.codigo} · {mesa.area.nome} · {s.capacidade} {mesa.capacidade}
                  </option>
                ))}
              </select>
            </span>
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="comensais">{s.comensais}</label>
              <input className="bo-campo__controlo" id="comensais" name="comensais"
                     type="text" inputMode="numeric" defaultValue="2" />
            </span>
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--primario" type="submit">{s.accaoAbrir}</button>
            </div>
          </form>
        </Cartao>
      )}
    </div>
  );
}

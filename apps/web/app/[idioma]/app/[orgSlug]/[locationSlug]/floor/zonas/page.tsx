import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarZonas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';
import { NavegacaoDaSala } from '../../../../../../../src/componentes/NavegacaoDaSala.tsx';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-001 · «Zonas del restaurante» (atlas p. 113) — e ONB-007 vive na mesma
 * lógica, com outro enquadramento.
 *
 * A zona vem antes da mesa porque uma mesa **vive sempre numa zona**: o modelo
 * exige `areaId`, e não por arrumação — «mesa 7» quer dizer coisas diferentes na
 * sala e no terraço, e a lista de sala mistura-as se elas não tiverem sítio.
 */
export default async function ZonasDaSala({
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
  const zonas = await comEscopoDoPedido(sessao, (db) => listarZonas(db, unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{s.zonas}</h1>
        </div>
      </div>

      <NavegacaoDaSala idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/zonas" />

      {busca.erro === 'sem_nome' ? (
        <Aviso tom="perigo" titulo={s.zonas}>{m.comum.tenteOutraVez}</Aviso>
      ) : null}

      {zonas.length === 0 ? (
        <Aviso titulo={s.zonas}>{s.semZonas}</Aviso>
      ) : (
        <ul className="bo-lista">
          {zonas.map((z) => (
            <li key={z.id}>
              <strong>{z.nome}</strong> · {z.tipo}
            </li>
          ))}
        </ul>
      )}

      <Cartao titulo={s.zonas}>
        <form method="post" action={`/api/org/${orgSlug}/sala`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="criar_zona" />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="nome">{s.nome}</label>
            <input className="bo-campo__controlo" id="nome" name="nome" required />
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="tipo">{s.zona}</label>
            <select className="bo-campo__controlo" id="tipo" name="tipo" defaultValue="SALA">
              <option value="SALA">SALA</option>
              <option value="TERRACO">TERRACO</option>
              <option value="BARRA">BARRA</option>
              <option value="PRIVADO">PRIVADO</option>
            </select>
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{s.accaoGuardar}</button>
          </div>
        </form>
      </Cartao>
    </div>
  );
}

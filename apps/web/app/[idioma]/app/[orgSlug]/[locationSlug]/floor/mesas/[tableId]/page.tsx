import { notFound } from 'next/navigation';
import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMesas, listarZonas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-003 · «Edita la mesa 07» (atlas p. 115)
 *
 * ── Arquivar é uma acção com resposta, e a resposta pode ser não ──────────
 *
 * «Arquivamento respeita sessões abertas» é do aceite 3. Aqui isso é literal: o
 * botão existe sempre, e o servidor recusa quando há gente sentada — dizendo
 * **qual** é a sessão. Esconder o botão fazia o ecrã ser a guarda, e um ecrã não
 * guarda nada de quem chame a rota directamente.
 */
export default async function EditarMesa({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; tableId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug, tableId } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.salaE13;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);

  const { mesa, zonas } = await comEscopoDoPedido(sessao, async (db) => {
    const mesas = await listarMesas(db, unidade.id);
    return {
      mesa: mesas.find((x) => x.id === tableId) ?? null,
      zonas: await listarZonas(db, unidade.id),
    };
  });
  if (!mesa) notFound();

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{mesa.area.nome}</p>
          <h1>{mesa.codigo}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/floor/mesas`}>{m.comum.voltar}</a>
      </div>

      {busca.erro === 'sessao_aberta' ? (
        <Aviso tom="perigo" urgente titulo={s.accaoArquivar}>{s.sessaoAberta}</Aviso>
      ) : null}
      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={s.mesas}>{m.comum.guardado}</Aviso> : null}

      <Cartao titulo={s.mesas}>
        <form method="post" action={`/api/org/${orgSlug}/sala`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="guardar_mesa" />
          <input type="hidden" name="tableId" value={mesa.id} />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="codigo">{s.codigo}</label>
            <input className="bo-campo__controlo" id="codigo" name="codigo" defaultValue={mesa.codigo} />
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="areaId">{s.zona}</label>
            <select className="bo-campo__controlo" id="areaId" name="areaId" defaultValue={mesa.areaId}>
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.nome}</option>)}
            </select>
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="capacidade">{s.capacidade}</label>
            <input className="bo-campo__controlo" id="capacidade" name="capacidade"
                   type="text" inputMode="numeric" defaultValue={String(mesa.capacidade)} />
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="posX">{s.posicao} X</label>
            <input className="bo-campo__controlo" id="posX" name="posX" type="text"
                   inputMode="numeric" defaultValue={mesa.posX === null ? '' : String(mesa.posX)} />
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="posY">{s.posicao} Y</label>
            <input className="bo-campo__controlo" id="posY" name="posY" type="text"
                   inputMode="numeric" defaultValue={mesa.posY === null ? '' : String(mesa.posY)} />
          </span>
          <p className="bo-campo__ajuda">{s.semPosicao}</p>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{s.accaoGuardar}</button>
          </div>
        </form>
      </Cartao>

      <Cartao titulo={s.accaoArquivar}>
        <form method="post" action={`/api/org/${orgSlug}/sala`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="arquivar_mesa" />
          <input type="hidden" name="tableId" value={mesa.id} />
          <button className="bo-botao bo-botao--secundario" type="submit">{s.accaoArquivar}</button>
        </form>
      </Cartao>
    </div>
  );
}

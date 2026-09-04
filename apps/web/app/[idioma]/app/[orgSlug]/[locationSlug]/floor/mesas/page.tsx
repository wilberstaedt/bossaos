import { Aviso, Cartao, Etiqueta } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarMesas, listarZonas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';
import { NavegacaoDaSala } from '../../../../../../../src/componentes/NavegacaoDaSala.tsx';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-002 · «Todas tus mesas» (atlas p. 114)
 *
 * A lista de mobiliário, e não a lista de serviço — essa é o FLOOR-006. A
 * separação importa: aqui uma mesa arquivada deixa de aparecer, e no tempo real
 * uma mesa ocupada aparece com quem lá está.
 */
export default async function MesasDaSala({
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
  const { mesas, zonas } = await comEscopoDoPedido(sessao, async (db) => ({
    mesas: await listarMesas(db, unidade.id),
    zonas: await listarZonas(db, unidade.id),
  }));
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/floor`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{s.mesas}</h1>
        </div>
      </div>

      <NavegacaoDaSala idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/mesas" />

      {busca.arquivada === '1' ? <Aviso tom="sucesso" titulo={s.mesas}>{s.accaoArquivar}</Aviso> : null}

      {zonas.length === 0 ? <Aviso titulo={s.zonas}>{s.semZonas}</Aviso> : null}

      {mesas.length === 0 ? (
        <Aviso titulo={s.mesas}>{s.semMesas}</Aviso>
      ) : (
        <ul className="bo-publico__lista">
          {mesas.map((mesa) => (
            <li key={mesa.id} className="bo-publico__produto">
              <a href={`${base}/mesas/${mesa.id}`}>
                <span className="bo-publico__nome">{mesa.codigo}</span>
                <span className="bo-publico__preco">
                  <Etiqueta tom="neutro">{mesa.area.nome}</Etiqueta>
                </span>
              </a>
              <p className="bo-publico__descricao">
                {s.capacidade}: {mesa.capacidade}
                {' · '}
                {/* «Sem colocar» é um estado real e diz-se por palavras. Um
                    `0, 0` no lugar de uma posição por definir punha todas as
                    mesas por colocar no mesmo canto do desenho. */}
                {mesa.posX === null || mesa.posY === null
                  ? s.semPosicao
                  : `${s.posicao}: ${mesa.posX}, ${mesa.posY}`}
              </p>
            </li>
          ))}
        </ul>
      )}

      {zonas.length > 0 ? (
        <Cartao titulo={s.mesas}>
          <form method="post" action={`/api/org/${orgSlug}/sala`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="criar_mesa" />
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="codigo">{s.codigo}</label>
              <input className="bo-campo__controlo" id="codigo" name="codigo" required />
            </span>
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="areaId">{s.zona}</label>
              <select className="bo-campo__controlo" id="areaId" name="areaId" required>
                {zonas.map((z) => <option key={z.id} value={z.id}>{z.nome}</option>)}
              </select>
            </span>
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="capacidade">{s.capacidade}</label>
              {/* `type="text"` com `inputMode`: o `type="number"` recusa valores
                  pela validação nativa antes de o servidor os ver. É a decisão do
                  E07, e a razão é a mesma. */}
              <input className="bo-campo__controlo" id="capacidade" name="capacidade"
                     type="text" inputMode="numeric" defaultValue="2" />
            </span>
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--primario" type="submit">{s.accaoGuardar}</button>
            </div>
          </form>
        </Cartao>
      ) : null}
    </div>
  );
}

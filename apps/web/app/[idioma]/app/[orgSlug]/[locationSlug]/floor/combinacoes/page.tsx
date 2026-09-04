import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarCombinacoes, listarMesas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';
import { NavegacaoDaSala } from '../../../../../../../src/componentes/NavegacaoDaSala.tsx';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-005 · «Combinaciones de mesas» (atlas p. 117)
 *
 * ── Uma lista do que É permitido, e não um cálculo de proximidade ────────
 *
 * A tentação é juntar mesas por coordenadas: se estão ao lado uma da outra,
 * juntam-se. Não é verdade na sala — duas mesas encostadas com um pilar pelo
 * meio não se juntam, e isso não está nas coordenadas. Quem sabe é quem lá
 * trabalha, e por isso a combinação é declarada.
 *
 * ── A capacidade é SOMADA, e não escrita ─────────────────────────────────
 *
 * Um número escrito à mão diverge das mesas no dia em que uma delas mudar de
 * tamanho, e ninguém volta cá para o corrigir. A soma vive na rota que grava.
 */
export default async function CombinacoesDeMesas({
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
  const { combinacoes, mesas } = await comEscopoDoPedido(sessao, async (db) => ({
    combinacoes: await listarCombinacoes(db, unidade.id),
    mesas: await listarMesas(db, unidade.id),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{s.combinacoes}</h1>
        </div>
      </div>

      <NavegacaoDaSala idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="/combinacoes" />

      {busca.erro === 'combinacao_curta' ? (
        <Aviso tom="perigo" titulo={s.combinacoes}>{m.comum.tenteOutraVez}</Aviso>
      ) : null}

      {combinacoes.length === 0 ? (
        <Aviso titulo={s.combinacoes}>{s.semCombinacoes}</Aviso>
      ) : (
        <ul className="bo-lista">
          {combinacoes.map((c) => (
            <li key={c.id}>
              <strong>{c.nome}</strong> · {s.capacidade}: {c.capacidade}
              {' · '}
              {c.membros.map((x) => x.mesa.codigo).join(' + ')}
            </li>
          ))}
        </ul>
      )}

      {mesas.length >= 2 ? (
        <Cartao titulo={s.combinacoes}>
          <form method="post" action={`/api/org/${orgSlug}/sala`}>
            <input type="hidden" name="idioma" value={idioma} />
            <input type="hidden" name="locationSlug" value={locationSlug} />
            <input type="hidden" name="accao" value="criar_combinacao" />
            <span className="bo-campo">
              <label className="bo-campo__rotulo" htmlFor="nome">{s.nome}</label>
              <input className="bo-campo__controlo" id="nome" name="nome" required />
            </span>
            <fieldset className="bo-campo">
              <legend className="bo-campo__rotulo">{s.mesas}</legend>
              {mesas.map((mesa) => (
                <label key={mesa.id} className="bo-campo__rotulo">
                  <input type="checkbox" name="mesas" value={mesa.id} />
                  {' '}{mesa.codigo} · {mesa.area.nome}
                </label>
              ))}
            </fieldset>
            <div className="bo-estado__accoes">
              <button className="bo-botao bo-botao--primario" type="submit">{s.accaoGuardar}</button>
            </div>
          </form>
        </Cartao>
      ) : (
        <Aviso titulo={s.combinacoes}>{s.semMesas}</Aviso>
      )}
    </div>
  );
}

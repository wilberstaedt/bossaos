import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarTiposDeServico } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * SET-003 · «Tipos de servicio» (atlas p. 322)
 *
 * ── Minutos locais, e não instantes ──────────────────────────────────────
 *
 * «O almoço começa às 13:00» é uma hora de parede que se repete todos os dias.
 * Guardar um instante obrigava a recalcular a linha em cada mudança de hora, e a
 * primeira que se esquecesse punha o almoço a começar às 12:00. O fuso é da
 * unidade e vive no `Location`, como nos horários do E06.
 */
export default async function TiposDeServico({
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
  const tipos = await comEscopoDoPedido(sessao, (db) => listarTiposDeServico(db, unidade.id));

  const relogio = (minutos: number) =>
    `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{s.tiposDeServico}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={s.tiposDeServico}>{m.comum.guardado}</Aviso> : null}
      {busca.erro ? <Aviso tom="perigo" titulo={s.tiposDeServico}>{m.comum.tenteOutraVez}</Aviso> : null}

      {/* O fuso da unidade dito por extenso: sem ele, «13:00» não quer dizer
          nada — é a mesma regra que o E06 escreveu para os horários. */}
      <p className="bo-campo__ajuda">
        {/* Sem fuso, «13:00» não quer dizer nada — e a ausência diz-se, em vez
            de se assumir o do servidor. É a regra do E06 para os horários. */}
        {unidade.fuso ?? s.semFuso}
      </p>

      {tipos.length === 0 ? (
        <Aviso titulo={s.tiposDeServico}>{s.semTipos}</Aviso>
      ) : (
        <ul className="bo-lista">
          {tipos.map((t) => (
            <li key={t.id}>
              <strong>{t.nome}</strong> · {s.inicio} {relogio(t.inicioMinutos)} · {s.fim} {relogio(t.fimMinutos)}
            </li>
          ))}
        </ul>
      )}

      <Cartao titulo={s.tiposDeServico}>
        <form method="post" action={`/api/org/${orgSlug}/sala`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="guardar_tipo" />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="nome">{s.nome}</label>
            <input className="bo-campo__controlo" id="nome" name="nome" required />
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="inicio">{s.inicio}</label>
            <input className="bo-campo__controlo" id="inicio" name="inicio" type="time" required />
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="fim">{s.fim}</label>
            <input className="bo-campo__controlo" id="fim" name="fim" type="time" required />
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{s.accaoGuardar}</button>
          </div>
        </form>
      </Cartao>
    </div>
  );
}

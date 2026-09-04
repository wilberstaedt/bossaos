import { Aviso, Cartao } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { MINUTOS_DE_PAREAMENTO } from '@bossaos/domain';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * DEV-002 · «Conecta un dispositivo» (atlas p. 130)
 *
 * ── O código aparece UMA vez ─────────────────────────────────────────────
 *
 * A base guarda o resumo, nunca o token — como os convites do E04 e pela mesma
 * razão: quem tiver a base não fica com os pareamentos em aberto. Quem fechar a
 * página sem copiar gera outro, e é isso que se quer em vez de um código
 * recuperável que fica a valer para sempre.
 *
 * ── E o dispositivo nasce PENDENTE ───────────────────────────────────────
 *
 * Parear é um pedido; aprovar é um acto de gerência. Um dispositivo que nascesse
 * activo era um tablet que qualquer pessoa liga à rede do restaurante e passa a
 * ver a sala.
 */
export default async function PearearDispositivo({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const s = m.salaE13;
  const { unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const codigo = typeof busca.codigo === 'string' ? busca.codigo : null;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{s.parear}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/devices`}>{m.comum.voltar}</a>
      </div>

      {busca.erro ? <Aviso tom="perigo" titulo={s.parear}>{m.comum.tenteOutraVez}</Aviso> : null}

      {codigo ? (
        <Aviso tom="sucesso" titulo={s.accaoParear}>
          <p><code className="bo-tema__valor">{codigo}</code></p>
          <p>{s.codigoUnico.replace('{minutos}', String(MINUTOS_DE_PAREAMENTO))}</p>
        </Aviso>
      ) : null}

      <Cartao titulo={s.parear}>
        <form method="post" action={`/api/org/${orgSlug}/dispositivos`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="parear" />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="nome">{s.nome}</label>
            <input className="bo-campo__controlo" id="nome" name="nome" required />
          </span>
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="estacao">{s.estacao}</label>
            <select className="bo-campo__controlo" id="estacao" name="estacao" defaultValue="SALA">
              <option value="SALA">SALA</option>
              <option value="COZINHA">COZINHA</option>
              <option value="BALCAO">BALCAO</option>
              <option value="GERENCIA">GERENCIA</option>
            </select>
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{s.accaoParear}</button>
          </div>
        </form>
      </Cartao>

      <Cartao titulo={s.accaoAprovar}>
        <form method="post" action={`/api/org/${orgSlug}/dispositivos`}>
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="aprovar" />
          <span className="bo-campo">
            <label className="bo-campo__rotulo" htmlFor="token">{s.accaoParear}</label>
            <input className="bo-campo__controlo" id="token" name="token" required
                   autoComplete="off" spellCheck={false} />
          </span>
          <div className="bo-estado__accoes">
            <button className="bo-botao bo-botao--primario" type="submit">{s.accaoAprovar}</button>
          </div>
        </form>
      </Cartao>
    </div>
  );
}

import { notFound } from 'next/navigation';
import { Aviso, CabecalhoDePagina } from '@bossaos/ui';
import { type Idioma } from '@bossaos/i18n';
import { carregarKds, estacaoDaUnidade } from '../../../../../../src/kds/carregar-kds.ts';
import { textosDoKds } from '../../../../../../src/kds/PecasDoKds.tsx';
import { NavegacaoDoKds } from '../../../../../../src/kds/NavegacaoDoKds.tsx';

export const dynamic = 'force-dynamic';

/**
 * KDS-014 · «Ajusta la estación» (atlas p. 197)
 *
 * ── O limite é de ECRÃ, e a tela di-lo em voz alta ────────────────────────
 *
 * Quem mexe neste número tem de saber que **não está a limitar a fila**. É a
 * confusão que produz o defeito que o contrato descreve: alguém baixa o limite
 * para «arrumar o ecrã» e, se o número entrasse na consulta, oito bilhetes
 * deixavam de existir. Aqui a frase está ao lado do campo, e não numa
 * documentação que ninguém abre a meio de um serviço.
 */
export default async function AjustesDaEstacao({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; locationId: string; stationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, locationId, stationId } = await params;
  const busca = (await searchParams) ?? {};
  const s = textosDoKds(idioma);
  const { unidade, estacoes, orgSlug } = await carregarKds(idioma, locationId);
  const estacao = estacaoDaUnidade(estacoes, stationId);
  if (!estacao) notFound();

  return (
    <div className="bo-pagina">
      <CabecalhoDePagina sobrancelha={`${unidade.nome} · ${estacao.nome}`}
                      titulo={s.ajustarEstacao} tela="KDS-014" />
      <NavegacaoDoKds idioma={idioma} locationId={locationId} stationId={stationId}
                      actual="/ajustes" />

      {busca.guardado === '1' ? (
        <div data-teste="guardado">
          <Aviso tom="sucesso" titulo={s.ajustarEstacao}>{s.accaoGuardar}</Aviso>
        </div>
      ) : null}
      {busca.erro === 'limite_invalido' ? (
        <div data-teste="limite-invalido">
          <Aviso tom="perigo" titulo={s.limiteVisivel}>{s.limiteVisivelAjuda}</Aviso>
        </div>
      ) : null}

      <form method="post" action={`/api/org/${orgSlug}/kds`} data-teste="ajustes">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="locationId" value={locationId} />
        <input type="hidden" name="accao" value="guardar_estacao" />
        <input type="hidden" name="stationId" value={estacao.id} />
        <span className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="nome">{s.nomeDaEstacao}</label>
          <input className="bo-campo__controlo" id="nome" name="nome"
                 defaultValue={estacao.nome} required />
        </span>
        <span className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="tipo">{s.tipoDaEstacao}</label>
          <select className="bo-campo__controlo" id="tipo" name="tipo" defaultValue={estacao.tipo}>
            <option value="PREPARACAO">{s.tipoPREPARACAO}</option>
            <option value="EXPO">{s.tipoEXPO}</option>
          </select>
        </span>
        <span className="bo-campo">
          <label className="bo-campo__rotulo" htmlFor="limiteVisivel">{s.limiteVisivel}</label>
          {/* `type="text"` com `inputMode`: o `type="number"` recusa valores pela
              validação nativa antes de o servidor os ver — decisão do E07. */}
          <input className="bo-campo__controlo" id="limiteVisivel" name="limiteVisivel"
                 type="text" inputMode="numeric" defaultValue={String(estacao.limiteVisivel)} />
          <span className="bo-campo__ajuda">{s.limiteVisivelAjuda}</span>
        </span>
        <div className="bo-estado__accoes">
          <button className="bo-botao bo-botao--primario" type="submit">{s.accaoGuardar}</button>
        </div>
      </form>
    </div>
  );
}

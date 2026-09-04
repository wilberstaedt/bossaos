import { Aviso, Botao, Campo, Cartao, Tabela } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarTurnos } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { NavegacaoDeReservas } from '../../../../../../../src/reservas/NavegacaoDeReservas.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-014 · «Turnos de reserva» (atlas p. 150)
 *
 * ── Hora LOCAL, e é de propósito ───────────────────────────────────────────
 *
 * «Instantes em UTC; regras recorrentes em fuso IANA.» Um turno é uma regra
 * recorrente: as 20h de sábado são as 20h de sábado em Março e em Novembro,
 * mesmo que o instante UTC mude entre os dois. Guardar o turno em UTC fá-lo-ia
 * andar uma hora duas vezes por ano, e ninguém perceberia porquê.
 *
 * E o turno que acaba antes de começar **atravessa a meia-noite** — o serviço de
 * sexta que acaba no sábado. A tela mostra-o em vez de o recusar como erro.
 */
export default async function TurnosDeReserva({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const p = m.reservasE18;
  const dias = m.reservasE18.dias;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);
  const turnos = await comEscopoDoPedido(sessao, (db) => listarTurnos(db, unidade.id));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="RES-B-014">{p.turnos}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      <NavegacaoDeReservas idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
                           activa="/turnos" rotulos={p} />

      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={p.turnos}>{p.guardado}</Aviso> : null}

      <Cartao titulo={p.turnos}>
        <p className="bo-campo__ajuda">{p.turnosAjuda}</p>
        <Tabela
          legenda={p.turnos}
          vazio={<p data-teste="sem-turnos">{p.semTurnos}</p>}
          colunas={[
            { chave: 'nome', rotulo: p.nome },
            { chave: 'dia', rotulo: p.dia },
            { chave: 'inicio', rotulo: p.inicio },
            { chave: 'fim', rotulo: p.fim },
            { chave: 'accoes', rotulo: p.apagar },
          ]}
          linhas={turnos.map((t) => ({
            id: t.id, nome: t.nome, dia: dias[t.diaDaSemana] ?? String(t.diaDaSemana),
            inicio: t.horaInicio, fim: t.horaFim, accoes: '',
          }))}
          celula={(linha, coluna) => (coluna.chave !== 'accoes' ? linha[coluna.chave] : (
            <form method="post" action={`/api/org/${orgSlug}/reservas`}>
              <input type="hidden" name="idioma" value={idioma} />
              <input type="hidden" name="locationId" value={unidade.id} />
              <input type="hidden" name="locationSlug" value={locationSlug} />
              <input type="hidden" name="accao" value="apagar_turno" />
              <input type="hidden" name="turnoId" value={linha.id} />
              <Botao type="submit" tom="perigo" densidade="operacao">{p.apagar}</Botao>
            </form>
          ))}
        />
      </Cartao>

      <Cartao titulo={p.adicionar}>
        <form method="post" action={`/api/org/${orgSlug}/reservas`} className="bo-forma">
          <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="locationId" value={unidade.id} />
          <input type="hidden" name="locationSlug" value={locationSlug} />
          <input type="hidden" name="accao" value="guardar_turno" />
          <Campo rotulo={p.nome} name="nome" type="text" defaultValue="" />
          <label className="bo-campo">
            <span className="bo-campo__rotulo">{p.dia}</span>
            <select name="diaDaSemana" className="bo-campo__controlo" defaultValue="6">
              {dias.map((d, i) => <option key={d} value={String(i)}>{d}</option>)}
            </select>
          </label>
          <Campo rotulo={p.inicio} name="horaInicio" type="text" inputMode="numeric" defaultValue="20:00" />
          <Campo rotulo={p.fim} name="horaFim" type="text" inputMode="numeric" defaultValue="23:00" />
          <Botao type="submit">{p.adicionar}</Botao>
        </form>
      </Cartao>
    </div>
  );
}

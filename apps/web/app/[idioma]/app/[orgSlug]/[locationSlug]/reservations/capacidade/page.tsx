import { Aviso, Botao, Campo, Cartao, Tabela } from '@bossaos/ui';
import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarCapacidades, listarTurnos } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { NavegacaoDeReservas } from '../../../../../../../src/reservas/NavegacaoDeReservas.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-013 · «Capacidad por zona» (atlas p. 149)
 *
 * ── O tecto é de COMENSAIS, e a tela di-lo ─────────────────────────────────
 *
 * É a regra que nenhuma restrição da base exprime, e a única desta etapa que
 * precisa de serialização para valer: duas confirmações em mesas diferentes
 * passam ambas na exclusão e lêem ambas a mesma soma antiga.
 *
 * Um tecto de MESAS seria outra regra e mais fácil de guardar — e errada, porque
 * a sala enche-se de gente, não de tampos.
 */
export default async function CapacidadePorZona({
  params, searchParams,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const busca = (await searchParams) ?? {};
  const m = mensagensDe(idioma);
  const p = m.reservasE18;
  const { sessao, unidade } = await carregarReservas(idioma, orgSlug, locationSlug);

  const { regras, zonas, turnos } = await comEscopoDoPedido(sessao, async (db) => ({
    regras: await listarCapacidades(db, unidade.id),
    zonas: await db.serviceArea.findMany({
      where: { locationId: unidade.id, archivedAt: null },
      select: { id: true, nome: true }, orderBy: { ordem: 'asc' },
    }),
    turnos: await listarTurnos(db, unidade.id),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="RES-B-013">{p.capacidade}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      <NavegacaoDeReservas idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
                           activa="/capacidade" rotulos={p} />

      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={p.capacidade}>{p.guardado}</Aviso> : null}

      <Cartao titulo={p.capacidade}>
        <p className="bo-campo__ajuda">{p.capacidadeAjuda}</p>
        <Tabela
          legenda={p.capacidade}
          vazio={<p data-teste="sem-regras">{p.semRegras}</p>}
          colunas={[
            { chave: 'zona', rotulo: p.zona },
            { chave: 'turno', rotulo: p.turno },
            { chave: 'max', rotulo: p.maxComensais, numero: true },
            { chave: 'accoes', rotulo: p.apagar },
          ]}
          linhas={regras.map((r) => ({
            id: r.id,
            zona: r.zona?.nome ?? p.todas,
            turno: r.turno?.nome ?? p.todos,
            max: String(r.maxComensais),
            accoes: '',
          }))}
          celula={(linha, coluna) => (coluna.chave !== 'accoes' ? linha[coluna.chave] : (
            <form method="post" action={`/api/org/${orgSlug}/reservas`}>
              <input type="hidden" name="idioma" value={idioma} />
              <input type="hidden" name="locationId" value={unidade.id} />
              <input type="hidden" name="locationSlug" value={locationSlug} />
              <input type="hidden" name="accao" value="apagar_capacidade" />
              <input type="hidden" name="regraId" value={linha.id} />
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
          <input type="hidden" name="accao" value="guardar_capacidade" />
          <label className="bo-campo">
            <span className="bo-campo__rotulo">{p.zona}</span>
            <select name="areaId" className="bo-campo__controlo" defaultValue="">
              <option value="">{p.todas}</option>
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.nome}</option>)}
            </select>
          </label>
          <label className="bo-campo">
            <span className="bo-campo__rotulo">{p.turno}</span>
            <select name="windowId" className="bo-campo__controlo" defaultValue="">
              <option value="">{p.todos}</option>
              {turnos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>
          <Campo rotulo={p.maxComensais} name="maxComensais"
                 type="text" inputMode="numeric" defaultValue="40" />
          <Botao type="submit">{p.adicionar}</Botao>
        </form>
      </Cartao>
    </div>
  );
}

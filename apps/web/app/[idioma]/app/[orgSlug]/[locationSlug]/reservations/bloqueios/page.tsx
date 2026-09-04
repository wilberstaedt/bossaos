import { Aviso, Botao, Campo, Cartao, Tabela } from '@bossaos/ui';
import { formatarData, mensagensDe, type Idioma } from '@bossaos/i18n';
import { listarBloqueios } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarReservas } from '../../../../../../../src/reservas/pagina.ts';
import { NavegacaoDeReservas } from '../../../../../../../src/reservas/NavegacaoDeReservas.tsx';

export const dynamic = 'force-dynamic';

/**
 * RES-B-015 · «Bloqueos especiales» (atlas p. 151)
 *
 * ── Um alvo, e um só ───────────────────────────────────────────────────────
 *
 * A unidade inteira, uma zona, ou uma mesa. Nunca duas coisas ao mesmo tempo:
 * «zona bar E mesa 3» não tem leitura única, e a leitura que cada um faz é a que
 * lhe convém. A base recusa-o com um `CHECK`; a tela oferece uma escolha só, que
 * é a mesma decisão vista do lado de quem a usa.
 */
export default async function Bloqueios({
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

  const { bloqueios, zonas, mesas } = await comEscopoDoPedido(sessao, async (db) => ({
    bloqueios: await listarBloqueios(db, unidade.id),
    zonas: await db.serviceArea.findMany({
      where: { locationId: unidade.id, archivedAt: null },
      select: { id: true, nome: true }, orderBy: { ordem: 'asc' } }),
    mesas: await db.serviceTable.findMany({
      where: { locationId: unidade.id, archivedAt: null },
      select: { id: true, codigo: true }, orderBy: { codigo: 'asc' } }),
  }));

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="RES-B-015">{p.bloqueios}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario"
           href={`/${idioma}/app/${orgSlug}/${locationSlug}/settings`}>{m.comum.voltar}</a>
      </div>

      <NavegacaoDeReservas idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug}
                           activa="/bloqueios" rotulos={p} />

      {busca.guardado === '1' ? <Aviso tom="sucesso" titulo={p.bloqueios}>{p.guardado}</Aviso> : null}

      <Cartao titulo={p.bloqueios}>
        <p className="bo-campo__ajuda">{p.bloqueiosAjuda}</p>
        <Tabela
          legenda={p.bloqueios}
          vazio={<p data-teste="sem-bloqueios">{p.semBloqueios}</p>}
          colunas={[
            { chave: 'alvo', rotulo: p.alvo },
            { chave: 'inicio', rotulo: p.inicio },
            { chave: 'fim', rotulo: p.fim },
            { chave: 'motivo', rotulo: p.motivo },
            { chave: 'accoes', rotulo: p.apagar },
          ]}
          linhas={bloqueios.map((b) => ({
            id: b.id,
            alvo: b.mesa?.codigo ?? b.zona?.nome ?? p.todas,
            inicio: formatarData(b.inicio, idioma),
            fim: formatarData(b.fim, idioma),
            motivo: b.motivo,
            accoes: '',
          }))}
          celula={(linha, coluna) => (coluna.chave !== 'accoes' ? linha[coluna.chave] : (
            <form method="post" action={`/api/org/${orgSlug}/reservas`}>
              <input type="hidden" name="idioma" value={idioma} />
              <input type="hidden" name="locationId" value={unidade.id} />
              <input type="hidden" name="locationSlug" value={locationSlug} />
              <input type="hidden" name="accao" value="apagar_bloqueio" />
              <input type="hidden" name="bloqueioId" value={linha.id} />
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
          <input type="hidden" name="accao" value="guardar_bloqueio" />
          {/* ── Uma lista só, e é isso que impede os dois alvos ───────────── */}
          <label className="bo-campo">
            <span className="bo-campo__rotulo">{p.alvo}</span>
            <select name="alvo" className="bo-campo__controlo" defaultValue="">
              <option value="">{p.todas}</option>
              {zonas.map((z) => <option key={z.id} value={`zona:${z.id}`}>{p.zona}: {z.nome}</option>)}
              {mesas.map((t) => <option key={t.id} value={`mesa:${t.id}`}>{p.mesa}: {t.codigo}</option>)}
            </select>
          </label>
          <Campo rotulo={p.inicio} name="inicio" type="datetime-local" defaultValue="" />
          <Campo rotulo={p.fim} name="fim" type="datetime-local" defaultValue="" />
          <Campo rotulo={p.motivo} name="motivo" type="text" defaultValue="" />
          <Botao type="submit">{p.adicionar}</Botao>
        </form>
      </Cartao>
    </div>
  );
}

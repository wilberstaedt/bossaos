import { Aviso, Etiqueta } from '@bossaos/ui';
import { formatarHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { reservasAChegar, salaAgora } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../src/sala-da-pagina.ts';
import { NavegacaoDaSala } from '../../../../../../src/componentes/NavegacaoDaSala.tsx';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-006 · «Mesas en tiempo real» (atlas p. 118)
 *
 * ── Um retrato, e não dois ────────────────────────────────────────────────
 *
 * `salaAgora` faz **uma** consulta. Duas — as mesas, e depois as sessões — dão um
 * retrato composto de dois instantes, e numa sala a mudar é assim que um ecrã
 * mostra livre uma mesa que acabou de abrir. O erro não aparece em testes: só
 * aparece à sexta-feira às nove da noite.
 *
 * ── Cada mesa tem UMA sessão, e isso não é uma escolha deste ecrã ─────────
 *
 * É o índice único parcial `uma_sessao_activa_por_mesa`. O ecrã lê `sessao` e não
 * `sessoes[]` porque duas não existem — se existissem, era um defeito da base e
 * não uma coisa para a interface resolver com um `[0]`.
 */
export default async function SalaEmTempoReal({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const s = m.salaE13;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  // ── E19 · uma mesa livre com reserva a chegar NÃO é uma mesa livre ─────
  //
  // «Uma reserva confirmada para as 20h tem de aparecer na sala antes das 20h,
  // senão o host vê a mesa livre e senta lá um walk-in.»
  //
  // A mesa está mesmo livre — não há sessão aberta — e é essa a armadilha: este
  // ecrã dizia a verdade sobre o presente e escondia o que aí vinha. É por aqui
  // que a reserva se perde entre o motor e a sala.
  const { mesas, aChegar } = await comEscopoDoPedido(sessao, async (db) => ({
    mesas: await salaAgora(db, unidade.id, sessao.contexto.organizationId),
    aChegar: await reservasAChegar(db, unidade.id, 120),
  }));
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/floor`;

  const abertas = mesas.filter((x) => x.sessao).length;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1>{s.tempoReal}</h1>
        </div>
        <a className="bo-botao bo-botao--primario" href={`${base}/abrir`}>{s.accaoAbrir}</a>
      </div>

      <NavegacaoDaSala idioma={idioma} orgSlug={orgSlug} locationSlug={locationSlug} actual="" />

      {mesas.length === 0 ? (
        <Aviso titulo={s.mesas}>{s.semMesas}</Aviso>
      ) : (
        <>
          {/* Os dois números são CONTADOS da mesma lista que se desenha em baixo.
              Um resumo lido de outro sítio é o mesmo defeito do retrato duplo,
              com o agravante de o cabeçalho e o corpo se contradizerem no ecrã. */}
          <dl className="bo-estado__factos">
            <dt>{s.sessoesAbertas}</dt>
            <dd>{abertas}</dd>
            <dt>{s.mesasLivres}</dt>
            <dd>{mesas.length - abertas}</dd>
          </dl>

          <ul className="bo-publico__lista">
            {mesas.map((mesa) => (
              <li key={mesa.id} className="bo-publico__produto">
                <a href={mesa.sessao ? `${base}/sessoes/${mesa.sessao.id}` : `${base}/abrir?mesa=${mesa.id}`}>
                  <span className="bo-publico__nome">
                    {mesa.codigo} · {mesa.area.nome}
                  </span>
                  <span className="bo-publico__preco">
                    {mesa.sessao ? (
                      <Etiqueta tom={mesa.sessao.estado === 'ABERTA' ? 'perigo' : 'aviso'}>
                        {mesa.sessao.estado === 'A_ENCERRAR' ? s.aEncerrar
                          : mesa.sessao.estado === 'EM_LIMPEZA' ? s.emLimpeza : s.ocupada}
                      </Etiqueta>
                    ) : (
                      <Etiqueta tom="sucesso">{s.livre}</Etiqueta>
                    )}
                  </span>
                </a>
                <p className="bo-publico__descricao">
                  {mesa.sessao
                    ? `${s.comensais}: ${mesa.sessao.comensais} · ${s.abertaEm} ${formatarHora(mesa.sessao.abertaEm, idioma)} · ${mesa.sessao.abertaPor}`
                    : `${s.capacidade}: ${mesa.capacidade}`}
                </p>
                {!mesa.sessao && aChegar.get(mesa.id) ? (
                  <p className="bo-publico__descricao" data-teste="reserva-a-chegar">
                    {`${m.hostE19.aChegar}: ${aChegar.get(mesa.id)!.nome} · `
                     + `${aChegar.get(mesa.id)!.pessoas} · `
                     + formatarHora(aChegar.get(mesa.id)!.inicio, idioma)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

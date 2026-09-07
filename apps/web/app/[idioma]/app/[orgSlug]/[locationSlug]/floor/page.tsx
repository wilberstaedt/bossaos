import { Aviso } from '@bossaos/ui';
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

  /**
   * ── DE LISTA A MAPA, e a razão está na lista de reprovação ─────────────
   *
   * Isto era um `<ul>` de `<li>` com as classes da CARTA PÚBLICA —
   * `bo-publico__produto`, `bo-publico__nome`, `bo-publico__preco`. Duas coisas
   * erradas ao mesmo tempo: o §8 do norte reprova «Mesas em tempo real
   * continuar sendo essencialmente uma lista», e a sala vestia a folha de uma
   * superfície que não é a dela — a mesma doença que o Staff teve.
   *
   * Agora é uma grelha espacial: cada mesa tem forma, capacidade e estado. Os
   * DADOS são exactamente os mesmos, as ligações são as mesmas e os factos são
   * os mesmos — o que muda é a forma, que era o que estava reprovado.
   *
   * ── O estado não vive só na cor ───────────────────────────────────────
   *
   * Cada mesa leva o rótulo escrito. Cor sozinha não é informação para quem não
   * a distingue, e o manual da casa já o exigia noutros sítios.
   */
  const estadoDa = (mesa: (typeof mesas)[number]) => {
    if (!mesa.sessao) return aChegar.get(mesa.id) ? 'reservada' : 'livre';
    return mesa.sessao.estado === 'ABERTA' ? 'ocupada' : 'atencao';
  };
  const conta = (qual: string) => mesas.filter((x) => estadoDa(x) === qual).length;
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
          {/* Os números são CONTADOS da mesma lista que se desenha em baixo. Um
              resumo lido de outro sítio é o retrato duplo outra vez, com o
              agravante de o cabeçalho e o corpo se contradizerem no ecrã. */}
          <p className="ns-resumo" data-teste="resumo-da-sala">
            <span>{s.mesasLivres}: {conta('livre')}</span>
            <span>{s.sessoesAbertas}: {abertas}</span>
            <span>{m.hostE19.aChegar}: {conta('reservada')}</span>
            <span>{s.aEncerrar} / {s.emLimpeza}: {conta('atencao')}</span>
          </p>

          <div className="ns-mesas" data-teste="mapa-de-mesas">
            {mesas.map((mesa) => {
              const estado = estadoDa(mesa);
              const reserva = aChegar.get(mesa.id);
              return (
                <a
                  key={mesa.id}
                  className={`ns-mesa ns-mesa--${estado}`}
                  data-estado={estado}
                  href={mesa.sessao ? `${base}/sessoes/${mesa.sessao.id}` : `${base}/abrir?mesa=${mesa.id}`}
                >
                  <span className="ns-mesa__nome">{mesa.codigo}</span>
                  <span className="ns-mesa__capacidade">
                    {mesa.area.nome} · {mesa.capacidade} pax
                  </span>
                  <span className="ns-mesa__estado">
                    {mesa.sessao ? (
                      <>
                        {mesa.sessao.estado === 'A_ENCERRAR' ? s.aEncerrar
                          : mesa.sessao.estado === 'EM_LIMPEZA' ? s.emLimpeza : s.ocupada}
                        {' · '}
                        {formatarHora(mesa.sessao.abertaEm, idioma)}
                        {' · '}
                        {mesa.sessao.abertaPor}
                      </>
                    ) : reserva ? (
                      /* A reserva mostra a HORA e as pessoas. O nome continua
                         aqui porque é o que o host usa para receber — tirá-lo é
                         uma decisão de produto e não de composição, e o §7.2 do
                         norte pede «sem PII indevida» sem dizer qual. Fica
                         levantado, não decidido. */
                      <>{m.hostE19.aChegar}: {formatarHora(reserva.inicio, idioma)} · {reserva.pessoas}</>
                    ) : (
                      <>{s.livre} · {s.capacidade}: {mesa.capacidade}</>
                    )}
                  </span>
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

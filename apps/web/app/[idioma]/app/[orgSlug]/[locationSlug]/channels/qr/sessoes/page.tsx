import { Aviso, Etiqueta } from '@bossaos/ui';
import { estadoDoVisitante, visitantesDaUnidade } from '@bossaos/db';
import { formatarDataHora, mensagensDe, type Idioma } from '@bossaos/i18n';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * QR-006 · «Sesiones activas» (atlas p. 87)
 *
 * ── Três estados, e são três porque uma pessoa os distingue ───────────────
 *
 * «A decorrer», «fechada pela equipa» e «terminou com a conta» são situações
 * diferentes para quem está a olhar: a primeira é trabalho a acontecer, a
 * segunda é uma decisão que alguém tomou, e a terceira é o curso normal das
 * coisas. Colapsá-las num «inactiva» fazia desaparecer a única que precisa de
 * ser revista.
 *
 * O estado é **derivado** — `estadoDoVisitante` — e não uma coluna. Guardá-lo
 * criava a segunda verdade que o E16 proibiu.
 */
export default async function SessoesDeVisitante({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }>;
}) {
  const { idioma, orgSlug, locationSlug } = await params;
  const m = mensagensDe(idioma);
  const s = m.visitanteE17;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const visitantes = await comEscopoDoPedido(sessao,
    (db) => visitantesDaUnidade(db, unidade.id));
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/channels/qr`;

  const activas = visitantes.filter((v) => estadoDoVisitante(v) === 'ACTIVA');

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="QR-006">{s.sessoesActivas}</h1>
        </div>
        <a className="bo-botao bo-botao--secundario" href={base}>{m.comum.voltar}</a>
      </div>

      {/* Os dois números: quantas estão a decorrer e quantas existem no total.
          «Há sessões» não é uma resposta a quem quer saber se pode revogar. */}
      <p className="bo-kds__contagem">
        <span>{s.visitanteACTIVA}: <strong data-teste="activas">{activas.length}</strong></span>
        <span>{s.sessoesActivas}: <strong data-teste="total">{visitantes.length}</strong></span>
      </p>

      {visitantes.length === 0 ? (
        <div data-teste="sem-visitantes">
          <Aviso tom="info" titulo={s.sessoesActivas}>{s.semVisitantes}</Aviso>
        </div>
      ) : (
        <ul className="bo-publico__lista" data-teste="visitantes">
          {visitantes.map((v) => {
            const estado = estadoDoVisitante(v);
            return (
              <li key={v.id} className="bo-publico__produto" data-teste="visitante"
                  data-estado={estado}>
                <a href={`${base}/sessoes/${v.id}`}>
                  <span className="bo-publico__nome">{v.mesa.codigo}</span>
                  <span className="bo-publico__preco">
                    <Etiqueta tom={estado === 'ACTIVA' ? 'sucesso'
                      : estado === 'REVOGADA' ? 'perigo' : 'neutro'}>
                      {(s as unknown as Record<string, string>)[`visitante${estado}`] ?? estado}
                    </Etiqueta>
                  </span>
                </a>
                <p className="bo-publico__descricao">
                  {s.abertaEm}: {formatarDataHora(v.abertaEm, idioma)}
                  {' · '}
                  {/* «Nunca pediu nada» é diferente de «pediu há uma hora», e a
                      diferença importa a quem decide se aquilo é uma pessoa. */}
                  {v.ultimaVezEm
                    ? `${s.ultimaVez}: ${formatarDataHora(v.ultimaVezEm, idioma)}`
                    : s.nuncaPediu}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

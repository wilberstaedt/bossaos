import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { porLinhaMenor } from '@bossaos/domain';
import { carregarComparacao } from '../../../../src/analitica/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * REP-016 · «Compara tus restaurantes» (atlas) — e a raiz da organização.
 *
 * ── Duas decisões de rota, e as duas declaradas ───────────────────────────
 *
 * A matriz sugere `/app/[orgSlug]/[locationSlug]/reports`. Comparar unidades de
 * **dentro de uma delas** é uma contradição: a tela existe para pôr as unidades
 * lado a lado, e o endereço obrigava a escolher uma antes de as ver todas.
 *
 * E é esta tela que fecha a **última entrada morta do menu de gestão**, o
 * `início`. Um painel de quem gere várias casas começa aqui, e com uma casa só
 * mostra essa — com a mesma distinção entre ausência e zero.
 */
export default async function InicioDaOrganizacao({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string }> }) {
  const { idioma, orgSlug } = await params;
  const t = mensagensDe(idioma).analiticaE30;
  const b = await carregarComparacao(idioma, orgSlug);
  const semDados = b.unidades.filter((u) => !u.agregado.medido);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.periodo.de} — {b.periodo.ate}</p>
          <h1 data-tela="REP-016">{t.comparar}</h1>
        </div>
      </div>
      {/* As três frases que esta etapa existe para respeitar. */}
      <p data-teste="ausencia-nao-e-zero">{t.ausenciaNaoEZero}</p>
      <p data-teste="denominador">{t.denominador}</p>
      <p data-teste="nao-consolida">{t.naoConsolida}</p>

      {/* ── Os números com o nome do que são ────────────────────────────
          Aqui estavam nove `<p>` e `<span>` sem rótulo: a tela mostrava «1»,
          «1» e «Sala principal Europe/Madrid Sin datos» em texto corrido. Os
          rótulos existiam no dicionário — `fuso`, `linhas`, `media`, `moeda` —
          e ninguém os chamava, e a `.bo-tabela` e o `.bo-estado__numero` já são
          usados noutros ecrãs. Nada disto é novo: o que faltava era usar. */}
      <dl className="bo-estado__factos">
        <div>
          <dt className="bo-estado__rotulo">{t.unidade}</dt>
          <dd className="bo-estado__numero" data-teste="quantas-unidades">{b.unidades.length}</dd>
        </div>
        <div>
          <dt className="bo-estado__rotulo">{t.semDados}</dt>
          <dd className="bo-estado__numero" data-teste="quantas-sem-dados">{semDados.length}</dd>
        </div>
      </dl>

      <table className="bo-tabela" data-teste="unidades">
        <thead>
          <tr>
            <th scope="col">{t.unidade}</th>
            <th scope="col">{t.fuso}</th>
            <th scope="col">{t.montante}</th>
            <th scope="col">{t.linhas}</th>
            <th scope="col">{t.moeda}</th>
            <th scope="col">{t.media}</th>
          </tr>
        </thead>
        <tbody>
          {b.unidades.map((u) => (
            <tr key={u.locationId}>
              <th scope="row" data-teste="unidade">{u.nome}</th>
              <td data-teste="fuso">{u.fuso}</td>
              {/* ── Ausência e zero medido escrevem-se DIFERENTE ───────────
                  É o aceite que a régua põe em primeiro lugar: quem lê «0 €»
                  fecha o turno de almoço; se o que lá estava era «sem dados»,
                  fechou-o por engano. A tabela não apaga a distinção: a linha
                  sem dados atravessa as quatro colunas com a frase inteira, em
                  vez de as encher de trações que se leem como zeros. */}
              {u.agregado.medido ? (
                <>
                  <td data-teste="medido">{String(u.agregado.valor.somaMenor)}</td>
                  <td data-teste="linhas">{u.agregado.valor.contagem}</td>
                  <td data-teste="moeda">{u.agregado.valor.moeda}</td>
                  <td data-teste="media">{String(porLinhaMenor(u.agregado.valor))}</td>
                </>
              ) : (
                <td colSpan={4} data-teste="sem-dados">{t.semDados}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t.total}</h2>
      {b.total.medido ? (
        <dl className="bo-estado__factos">
          <div>
            <dt className="bo-estado__rotulo">{t.montante}</dt>
            <dd className="bo-estado__numero" data-teste="total-medido">{String(b.total.valor.somaMenor)}</dd>
          </div>
          <div>
            <dt className="bo-estado__rotulo">{t.linhas}</dt>
            <dd className="bo-estado__numero" data-teste="total-linhas">{b.total.valor.contagem}</dd>
          </div>
          <div>
            <dt className="bo-estado__rotulo">{t.media}</dt>
            <dd className="bo-estado__numero" data-teste="total-media">{String(porLinhaMenor(b.total.valor))}</dd>
          </div>
        </dl>
      ) : <p data-teste="total-sem-dados">{t.semDados}</p>}
      <p data-teste="sem-dados-explica">{t.semDadosExplica}</p>
      <p data-teste="zero-explica">{t.zeroExplica}</p>
      <p data-teste="por-unidade">{t.porUnidade}</p>
      <p data-teste="sem-demonstracao">{t.semDemonstracao}</p>
    </div>
  );
}

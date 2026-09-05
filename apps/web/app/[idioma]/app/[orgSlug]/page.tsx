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

      <p data-teste="quantas-unidades">{b.unidades.length}</p>
      <p data-teste="quantas-sem-dados">{semDados.length}</p>

      <ul className="bo-lista bo-lista--colunas" data-teste="unidades">
        {b.unidades.map((u) => (
          <li key={u.locationId}>
            <span data-teste="unidade">{u.nome}</span>
            <span data-teste="fuso">{u.fuso}</span>
            {/* ── Ausência e zero medido escrevem-se DIFERENTE ───────────
                É o aceite que a régua põe em primeiro lugar: quem lê «0 €»
                fecha o turno de almoço; se o que lá estava era «sem dados»,
                fechou-o por engano. */}
            {u.agregado.medido ? (
              <>
                <span data-teste="medido">{String(u.agregado.valor.somaMenor)}</span>
                <span data-teste="linhas">{u.agregado.valor.contagem}</span>
                <span data-teste="moeda">{u.agregado.valor.moeda}</span>
                <span data-teste="media">{String(porLinhaMenor(u.agregado.valor))}</span>
              </>
            ) : (
              <span data-teste="sem-dados">{t.semDados}</span>
            )}
          </li>
        ))}
      </ul>

      <h2>{t.total}</h2>
      {b.total.medido ? (
        <>
          <p data-teste="total-medido">{String(b.total.valor.somaMenor)}</p>
          <p data-teste="total-linhas">{b.total.valor.contagem}</p>
          <p data-teste="total-media">{String(porLinhaMenor(b.total.valor))}</p>
        </>
      ) : <p data-teste="total-sem-dados">{t.semDados}</p>}
      <p data-teste="sem-dados-explica">{t.semDadosExplica}</p>
      <p data-teste="zero-explica">{t.zeroExplica}</p>
      <p data-teste="por-unidade">{t.porUnidade}</p>
      <p data-teste="sem-demonstracao">{t.semDemonstracao}</p>
    </div>
  );
}

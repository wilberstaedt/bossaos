import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { converterTotal, RecusaDoFinanceiro } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarCentros } from '../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/** FIN-007 · «Centros de coste» (atlas) */
export default async function Centros({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarCentros(idioma, orgSlug, locationSlug);
  // ── O total noutra moeda só se mostra COM fonte e data ─────────────────
  //
  // E se não houver taxa carimbada, não se mostra nada: um número em euros que
  // veio de dólares sem dizer a que câmbio é uma opinião com aspecto de facto.
  // Recusar é a resposta certa — e a ausência aparece como ausência.
  const noutraMoeda = b.totalResultado.filter((x) => x.moeda !== 'EUR');
  const convertidos = await comEscopoDoPedido(b.sessao, async (db) => {
    const saida = [];
    for (const total of noutraMoeda) {
      try {
        saida.push(await converterTotal(db, {
          organizationId: b.sessao.contexto.organizationId,
          total, para: 'EUR', em: b.periodo.ate,
        }));
      } catch (e) {
        if (!(e instanceof RecusaDoFinanceiro)) throw e;
        // Sem taxa: fica de fora, e a tela di-lo.
      }
    }
    return saida;
  });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.periodo.de} — {b.periodo.ate}</p>
          <h1 data-tela="FIN-007">{t.centros}</h1>
        </div>
      </div>
      <p data-teste="moedas-nao-somam">{t.moedasNaoSomam}</p>
      <p data-teste="quantos-centros">{b.centros.length}</p>
      <p data-teste="quantos-convertidos">{convertidos.length}</p>
      <p data-teste="sem-taxa">{noutraMoeda.length - convertidos.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="convertidos">
        {convertidos.map((c) => (
          <li key={`${c.moeda}-${c.fonte}`}>
            <span data-teste="total">{String(c.totalMenor)}</span>
            <span data-teste="moeda">{c.moeda}</span>
            {/* A fonte e a data da taxa, à vista. Sem elas não se mostra. */}
            <span data-teste="fonte">{c.fonte}</span>
            <span data-teste="taxa-de">{c.emVigorDe.toISOString().slice(0, 10)}</span>
          </li>
        ))}
      </ul>
      {b.centros.length === 0 ? <p data-teste="sem-movimentos">{t.semMovimentos}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="centros">
          {b.centros.map((c) => (
            <li key={`${c.centro}-${c.moeda}`}>
              <span data-teste="centro">{c.centro}</span>
              {/* Cada linha traz a sua moeda: nunca se somam entre si. */}
              <span data-teste="moeda">{c.moeda}</span>
              <span data-teste="total">{String(c.totalMenor)}</span>
              <span data-teste="linhas">{c.linhas}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { mensagensDe, formatarHora, type Idioma } from '@bossaos/i18n';
import { carregarStock } from '../../../../../../../../src/stock/pagina.ts';
import { comEscopoDoPedido } from '../../../../../../../../src/sessao.ts';
import { movimentosDoInsumo } from '@bossaos/db';

export const dynamic = 'force-dynamic';

/**
 * INV-010 · «Reconciliar contagem» (atlas)
 *
 * ── Reconciliar é LER os ajustes, não apagar a diferença ─────────────────
 *
 * A tentação desta tela é «acertar o stock»: pôr o número certo e seguir. Isso
 * apaga o rasto de quando é que deixou de bater — que é a única informação útil
 * que uma contagem produz.
 *
 * O que se vê aqui são os ajustes lançados, com a razão de cada um. A diferença
 * fica escrita; o que muda é que passa a ter explicação.
 */
export default async function ReconciliarContagem({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).stockE25;
  const base = await carregarStock(idioma, orgSlug, locationSlug);
  const ajustes = await comEscopoDoPedido(base.sessao, async (db) => {
    const saida = [];
    for (const i of base.insumos.slice(0, 30)) {
      const movimentos = await movimentosDoInsumo(db, i.id);
      const dele = movimentos.filter((m) => m.tipo === 'AJUSTE');
      if (dele.length > 0) saida.push({ insumo: i, ajustes: dele });
    }
    return saida;
  });

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{base.unidade.nome}</p>
          <h1 data-tela="INV-010">{t.reconciliar}</h1>
        </div>
      </div>
      <p data-teste="saldo-derivado">{t.saldoDerivado}</p>
      <p data-teste="quantos-ajustes">{ajustes.length}</p>
      {ajustes.length === 0 ? <p data-teste="sem-movimentos">{t.semMovimentos}</p> : (
        <ul className="bo-lista" data-teste="ajustes">
          {ajustes.map(({ insumo, ajustes: linhas }) => (
            <li key={insumo.id}>
              <span>{insumo.nome}</span>
              <span data-teste="saldo">{String(insumo.saldoMili)}</span>
              <ul>
                {linhas.map((m) => (
                  <li key={m.id}>
                    <span data-teste="diferenca">{String(m.quantidadeMili)}</span>
                    <span data-teste="motivo">{m.motivo}</span>
                    <span>{formatarHora(m.criadoEm, idioma)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

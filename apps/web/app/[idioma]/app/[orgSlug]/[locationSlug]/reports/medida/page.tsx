import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { porLinhaMenor } from '@bossaos/domain';
import { carregarRelatorio } from '../../../../../../../src/analitica/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * REP-017 · «Tu informe a medida» (atlas)
 *
 * ── A exportação é o que está na tela, e por isso vive na mesma tela ──────
 *
 * Um ficheiro que não corresponde ao que a pessoa viu é pior do que não haver
 * exportação: ela vai defender números que não viu. Aqui a lista exportável é a
 * **mesma variável** que a lista mostrada — não há duas consultas que possam
 * divergir.
 */
export default async function InformeAMedida({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).analiticaE30;
  const b = await carregarRelatorio(idioma, orgSlug, locationSlug);
  const desta = b.vendas.find((u) => u.locationId === b.unidade.id);
  // Uma variável só: o que se mostra e o que se exporta são a mesma coisa.
  const linhas = desta?.linhas ?? [];

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.unidade.nome}</p>
          <h1 data-tela="REP-017">{t.medida}</h1>
        </div>
      </div>
      <p data-teste="ausencia-nao-e-zero">{t.ausenciaNaoEZero}</p>
      <p data-teste="desce-a-origem">{t.desceAOrigem}</p>
      {/* Os filtros e a definição, à vista, sem sair da tela. */}
      <p data-teste="filtros">{t.periodo}: {b.periodo.de} — {b.periodo.ate}</p>
      <p data-teste="definicao">{t.definicao}: {t.total} — {t.media}</p>

      {desta && desta.agregado.medido ? (
        <>
          <p data-teste="medido">{String(desta.agregado.valor.somaMenor)}</p>
          <p data-teste="linhas-do-agregado">{desta.agregado.valor.contagem}</p>
          <p data-teste="media">{String(porLinhaMenor(desta.agregado.valor))}</p>
        </>
      ) : (
        <>
          <p data-teste="sem-dados">{t.semDados}</p>
          <p data-teste="sem-dados-explica">{t.semDadosExplica}</p>
        </>
      )}

      <h2>{t.exportar}</h2>
      <p data-teste="exporta-o-que-ve">{t.exportaOQueVe}</p>
      <p data-teste="quantas-linhas-exportadas">{linhas.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="exportacao">
        {linhas.map((l, i) => (
          <li key={i}>
            <span data-teste="conceito">{l.conceito}</span>
            <span data-teste="montante">{String(l.montanteMenor)}</span>
            <span data-teste="moeda">{l.moeda}</span>
            {/* De cada linha desce-se à transacção. */}
            <span data-teste="origem">{l.origemTipo ?? '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo } from '@bossaos/ui';
import { carregarConta } from '../../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * O extracto de uma conta — com o conciliado **derivado**.
 *
 * Não há caixinha nenhuma nesta tela que se marque: existe correspondência
 * confirmada, logo a linha aparece conciliada.
 */
export default async function Extracto({
  params,
}: {
  params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string; accountId: string }>;
}) {
  const { idioma, orgSlug, locationSlug, accountId } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarConta(idioma, orgSlug, locationSlug, accountId);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/finance`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{t.conta}</p>
          <h1 data-tela="FIN-003-CONTA">{b.conta.nome}</h1>
        </div>
      </div>
      <p data-teste="conciliado-derivado">{t.conciliadoDerivado}</p>
      <p data-teste="quantas-linhas">{b.linhas.length}</p>
      <p data-teste="quantas-importacoes">{b.importacoes.length}</p>
      <ul className="bo-lista bo-lista--colunas" data-teste="importacoes">
        {b.importacoes.map((i) => (
          <li key={i.id}>
            <span data-teste="ficheiro">{i.ficheiro}</span>
            <span data-teste="novas">{t.novas}: {i.novas}</span>
            {/* O silêncio é o defeito: diz-se quantas foram ignoradas. */}
            <span data-teste="ja-vistas">{t.jaVistas}: {i.jaVistas}</span>
          </li>
        ))}
      </ul>
      <ul className="bo-lista bo-lista--colunas" data-teste="linhas">
        {b.linhas.map((l) => (
          <li key={l.id}>
            <span data-teste="data">{l.dataValor.toISOString().slice(0, 10)}</span>
            <span data-teste="montante">{String(l.montanteMenor)}</span>
            <span data-teste="moeda">{l.moeda}</span>
            <span data-teste={l.conciliada ? 'conciliada' : 'por-conciliar'}>
              {l.conciliada ? t.conciliada : t.porConciliar}
            </span>
          </li>
        ))}
      </ul>
      <nav className="bo-lista">
        <a className="bo-botao" data-seccao="conciliar" href={`${base}/conciliar/${accountId}`}>
          {t.conciliar}
        </a>
      </nav>

      {/* ── O extracto entra por aqui, e a contagem volta ao ecrã ─────────
          Formato cru — `AAAA-MM-DD;montante;referência` — de propósito: um
          leitor de formatos de banco é outra etapa, e inventar um agora era
          prometer que se lê o que não se leu. */}
      <form method="post" action={`/api/org/${orgSlug}/financeiro`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="importar" />
        <input type="hidden" name="accountId" value={accountId} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.ficheiro} name="ficheiro" maxLength={120} />
        <Campo rotulo={t.extracto} name="linhas" maxLength={4000} required />
        <Botao type="submit">{t.importar}</Botao>
      </form>
    </div>
  );
}

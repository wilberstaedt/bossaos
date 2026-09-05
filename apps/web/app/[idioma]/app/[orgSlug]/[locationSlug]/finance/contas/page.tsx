import { mensagensDe, type Idioma } from '@bossaos/i18n';
import { Botao, Campo } from '@bossaos/ui';
import { carregarFinanceiro } from '../../../../../../../src/financeiro/pagina.ts';

export const dynamic = 'force-dynamic';

/** FIN-003 · «Cobros y liquidaciones» (atlas) */
export default async function Contas({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).financeiroE29;
  const b = await carregarFinanceiro(idioma, orgSlug, locationSlug);
  const base = `/${idioma}/app/${orgSlug}/${locationSlug}/finance`;

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{b.unidade.nome}</p>
          <h1 data-tela="FIN-003">{t.contas}</h1>
        </div>
      </div>
      <p data-teste="silencio-e-defeito">{t.silencioEhDefeito}</p>
      <p data-teste="quantas-contas">{b.contas.length}</p>
      {b.contas.length === 0 ? <p data-teste="sem-contas">{t.semContas}</p> : (
        <ul className="bo-lista bo-lista--colunas" data-teste="contas">
          {b.contas.map((c) => (
            <li key={c.id}>
              <a className="bo-lista__ligacao" href={`${base}/contas/${c.id}`}>{c.nome}</a>
              <span data-teste="moeda">{c.moeda}</span>
            </li>
          ))}
        </ul>
      )}
      <form method="post" action={`/api/org/${orgSlug}/financeiro`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
        <input type="hidden" name="accao" value="criar_conta" />
        <input type="hidden" name="locationId" value={b.unidade.id} />
        <input type="hidden" name="locationSlug" value={locationSlug} />
        <Campo rotulo={t.nome} name="nome" required maxLength={80} />
        <Campo rotulo={t.moeda} name="moeda" maxLength={3} defaultValue="EUR" />
        <Botao type="submit">{t.guardar}</Botao>
      </form>
    </div>
  );
}

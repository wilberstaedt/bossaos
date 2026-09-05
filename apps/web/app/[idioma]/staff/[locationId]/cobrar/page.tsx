import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contasAbertas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../src/sessao.ts';
import { carregarStaff } from '../../../../../src/staff/carregar-staff.ts';

export const dynamic = 'force-dynamic';

/**
 * STAFF-019 · «Cobra la cuenta» (atlas)
 *
 * Quem está na sala cobra a partir daqui, e o que vê é o que falta — não o
 * total. A diferença importa: numa conta parcialmente paga, mostrar o total faz
 * cobrar duas vezes a mesma metade.
 */
export default async function CobrarNaSala({
  params,
}: { params: Promise<{ idioma: Idioma; locationId: string }> }) {
  const { idioma, locationId } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const p = mensagensDe(idioma).pagamentoE23;
  const { sessao, unidade } = await carregarStaff(idioma, locationId);
  const contas = await comEscopoDoPedido(sessao, (db) => contasAbertas(db, unidade.id));

  return (
    <div className="bo-staff">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="STAFF-019">{t.dinheiro}</h1>
        </div>
      </div>
      <p data-teste="quantas">{contas.length}</p>
      {contas.length === 0 ? <p data-teste="sem-contas">{t.semContas}</p> : (
        <ul className="bo-lista" data-teste="contas">
          {contas.map((c) => (
            <li key={c.id}>
              <span>{c.numero}</span>
              <span data-teste="falta">{formatarDinheiro(
                { montanteMenor: c.devidoMenor - c.pagoMenor, moeda: c.moeda }, idioma)}</span>
              <a className="bo-botao" data-seccao="cobrar"
                 href={`/${idioma}/pos/${locationId}/conta/${c.id}/cobrar`}>{t.aplicar}</a>
            </li>
          ))}
        </ul>
      )}
      <p data-teste="nao-prova">{p.retornoNaoProva}</p>
    </div>
  );
}

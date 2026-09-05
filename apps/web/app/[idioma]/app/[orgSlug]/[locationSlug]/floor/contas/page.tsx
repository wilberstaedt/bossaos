import { Botao, Seletor } from '@bossaos/ui';
import { mensagensDe, formatarDinheiro, type Idioma } from '@bossaos/i18n';
import { contasAbertas } from '@bossaos/db';
import { comEscopoDoPedido } from '../../../../../../../src/sessao.ts';
import { carregarSala } from '../../../../../../../src/sala-da-pagina.ts';

export const dynamic = 'force-dynamic';

/**
 * FLOOR-010 · «Junta o separa cuentas» (atlas)
 *
 * ── Juntar contas é mover linhas, e não somar duas contas numa terceira ───
 *
 * Somar era criar um total novo ao lado de dois totais antigos, e três números
 * onde havia dois é o sítio onde eles passam a discordar. Aqui as linhas mudam
 * de conta e os devidos acompanham por gatilho — a soma continua a ser uma só.
 *
 * As contas com pagamento não aparecem para juntar: «itens já liquidados não
 * podem ser movidos silenciosamente», e a base recusa na mesma se alguém chegar
 * por outro caminho.
 */
export default async function ContasDaSala({
  params,
}: { params: Promise<{ idioma: Idioma; orgSlug: string; locationSlug: string }> }) {
  const { idioma, orgSlug, locationSlug } = await params;
  const t = mensagensDe(idioma).tpvE22;
  const { sessao, unidade } = await carregarSala(idioma, orgSlug, locationSlug);
  const contas = await comEscopoDoPedido(sessao, (db) => contasAbertas(db, unidade.id));
  const juntáveis = contas.filter((c) => c.pagoMenor === 0);

  return (
    <div className="bo-pagina">
      <div className="bo-estado__cabecalho">
        <div>
          <p className="bo-estado__sobrancelha">{unidade.nome}</p>
          <h1 data-tela="FLOOR-010">{t.juntar}</h1>
        </div>
      </div>
      <p data-teste="quantas">{contas.length}</p>
      <p data-teste="transferir-ajuda">{t.transferirAjuda}</p>
      {contas.length === 0 ? <p data-teste="sem-contas">{t.semContas}</p> : (
        <ul className="bo-lista" data-teste="contas">
          {contas.map((c) => (
            <li key={c.id}>
              <span>{c.numero}</span>
              <span>{formatarDinheiro({ montanteMenor: c.devidoMenor, moeda: c.moeda }, idioma)}</span>
              {c.pagoMenor > 0 && <span data-teste="conta-paga">{t.estadoParcial}</span>}
            </li>
          ))}
        </ul>
      )}
      {juntáveis.length > 1 && (
        <form method="post" action={`/api/org/${orgSlug}/tpv`} className="bo-forma">
        <input type="hidden" name="idioma" value={idioma} />
          <input type="hidden" name="accao" value="juntar_contas" />
          <input type="hidden" name="locationId" value={unidade.id} />
          <Seletor rotulo={t.movimento} name="deBillId">
            {juntáveis.map((c) => <option key={c.id} value={c.id}>{c.numero}</option>)}
          </Seletor>
          <Seletor rotulo={t.movimento} name="paraBillId">
            {juntáveis.map((c) => <option key={c.id} value={c.id}>{c.numero}</option>)}
          </Seletor>
          <Botao type="submit">{t.juntar}</Botao>
        </form>
      )}
    </div>
  );
}
